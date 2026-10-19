
import { and, eq, isNull } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { devices, powerOutages } from '../db/schema.js';
import { discoverIpByMac, ping } from './network.js';

export type PowerStatus = 'online' | 'offline' | 'unknown';

type Plug = {
    id: string;
    macAddress: string | null;
    sampleIntervalSec: number;
};

type MonitorState = {
    ip: string | null;
    verifiedAt: number;
    lastDiscoveryAt: number;
    failures: number;
};

const VERIFY_INTERVAL_MS = 360 * 60_000;
const DISCOVERY_RETRY_MS = 5 * 60_000;
const FAILURE_LIMIT = 2;

const states = new Map<string, MonitorState>();

function setStatus(
    deviceId: string,
    status: PowerStatus,
    at = new Date(),
): void {
    db.transaction((tx) => {
        const active = tx
            .select()
            .from(powerOutages)
            .where(
                and(
                    eq(powerOutages.deviceId, deviceId),
                    isNull(powerOutages.endedAt),
                ),
            )
            .get();

        if (active?.status === status) {
            tx.update(powerOutages)
                .set({ lastCheckedAt: at })
                .where(eq(powerOutages.id, active.id))
                .run();

            return;
        }

        if (active) {
            tx.update(powerOutages)
                .set({
                    endedAt: at,
                    lastCheckedAt: at,
                })
                .where(eq(powerOutages.id, active.id))
                .run();
        }

        tx.insert(powerOutages)
            .values({
                deviceId,
                status,
                startedAt: at,
                lastCheckedAt: at,
            })
            .run();
    });
}

function recoverInterruptedMonitoring(deviceId: string): void {
    const active = db
        .select()
        .from(powerOutages)
        .where(
            and(
                eq(powerOutages.deviceId, deviceId),
                isNull(powerOutages.endedAt),
            ),
        )
        .get();

    if (!active) return;

    const lastChecked = active.lastCheckedAt ?? active.startedAt;

    db.transaction((tx) => {
        tx.update(powerOutages)
            .set({ endedAt: lastChecked })
            .where(eq(powerOutages.id, active.id))
            .run();

        tx.insert(powerOutages)
            .values({
                deviceId,
                status: 'unknown',
                startedAt: lastChecked,
                lastCheckedAt: new Date(),
            })
            .run();
    });
}

async function checkPlug(device: Plug): Promise<void> {
    const state = states.get(device.id) ?? {
        ip: null,
        verifiedAt: 0,
        lastDiscoveryAt: 0,
        failures: 0,
    };

    states.set(device.id, state);

    if (!device.macAddress) {
        setStatus(device.id, 'unknown');
        return;
    }

    const gateway = env.networkGatewayIp;

    if (!gateway) {
        setStatus(device.id, 'unknown');
        return;
    }

    const now = Date.now();

    try {
        // First discovery or scheduled 6-hour verification.
        if (
            !state.ip ||
            now - state.verifiedAt >= VERIFY_INTERVAL_MS
        ) {
            if (
                now - state.lastDiscoveryAt >= DISCOVERY_RETRY_MS
            ) {
                state.lastDiscoveryAt = now;

                const ip = await discoverIpByMac(
                    device.macAddress,
                );

                if (ip) {
                    state.ip = ip;
                    state.verifiedAt = Date.now();
                    state.failures = 0;
                } else if (
                    state.ip &&
                    now - state.verifiedAt >= VERIFY_INTERVAL_MS
                ) {
                    // Do not trust an expired IP/MAC mapping.
                    state.ip = null;
                }
            }

            if (!state.ip) {
                setStatus(device.id, 'unknown');
                return;
            }
        }

        if (await ping(state.ip)) {
            state.failures = 0;
            setStatus(device.id, 'online');
            return;
        }

        // A failed ping may mean that the router is down.
        if (!(await ping(gateway))) {
            state.failures = 0;
            setStatus(device.id, 'unknown');
            return;
        }

        state.failures++;

        // Look for a new IP after failure.
        if (
            now - state.lastDiscoveryAt >= DISCOVERY_RETRY_MS
        ) {
            state.lastDiscoveryAt = now;

            const ip = await discoverIpByMac(
                device.macAddress,
            );

            if (ip && ip !== state.ip) {
                state.ip = ip;
                state.verifiedAt = Date.now();
                state.failures = 0;

                if (await ping(ip)) {
                    setStatus(device.id, 'online');
                    return;
                }

                state.failures = 1;
            }
        }

        if (state.failures >= FAILURE_LIMIT) {
            setStatus(device.id, 'offline');
        } else {
            // Keep previous status until failure is confirmed.
            // If no previous observation exists, record unknown.
            const active = db
                .select({ status: powerOutages.status })
                .from(powerOutages)
                .where(
                    and(
                        eq(powerOutages.deviceId, device.id),
                        isNull(powerOutages.endedAt),
                    ),
                )
                .get();

            setStatus(device.id, active?.status ?? 'unknown');
        }
    } catch (error) {
        console.error('[PowerMonitor] Check failed:', error);
        state.failures = 0;
        setStatus(device.id, 'unknown');
    }
}

export function startPowerMonitor(
    log: {
        info: (message: string) => void;
        error: (error: unknown) => void;
    },
): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const device = db
        .select({
            id: devices.id,
        })
        .from(devices)
        .where(eq(devices.uid, env.powerMonitorDeviceUid))
        .get();

    if (!device) {
        throw new Error(
            `Power monitor device not found: ${env.powerMonitorDeviceUid}`,
        );
    }

    recoverInterruptedMonitoring(device.id);

    async function tick(): Promise<void> {
        try {
            const plug = db
                .select({
                    id: devices.id,
                    macAddress: devices.macAddress,
                    sampleIntervalSec: devices.sampleIntervalSec,
                })
                .from(devices)
                .where(eq(devices.uid, env.powerMonitorDeviceUid))
                .get();

            if (!plug) {
                log.error(
                    `Power monitor device not found: ${env.powerMonitorDeviceUid}`,
                );
                return;
            }

            if (!stopped) {
                await checkPlug(plug);
            }
        } catch (error) {
            log.error(error);
        } finally {
            if (!stopped) {
                timer = setTimeout(tick, 60_000);
            }
        }
    }

    log.info('Power monitor started');

    void tick();

    return () => {
        stopped = true;

        if (timer) clearTimeout(timer);

        log.info('Power monitor stopped');
    };
}
