
import { and, eq, isNull } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { devices, powerOutages } from '../db/schema.js';
import { discoverIpByMac, ping } from './network.js';

export type PowerStatus = 'online' | 'offline' | 'unknown';

type Plug = {
    id: string;
    macAddress: string | null;
    ipAddress: string | null;
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
        ip: device.ipAddress,
        verifiedAt: 0,
        lastDiscoveryAt: 0,
        failures: 0,
    };

    states.set(device.id, state);

    if (!device.macAddress) {
        setStatus(device.id, 'unknown');
        return;
    }

    const now = Date.now();

    const needsDiscovery =
        !state.ip ||
        now - state.verifiedAt >= VERIFY_INTERVAL_MS ||
        state.failures > 0;

    // Refresh MAC/IP mapping when necessary.
    if (
        needsDiscovery &&
        now - state.lastDiscoveryAt >= DISCOVERY_RETRY_MS
    ) {
        state.lastDiscoveryAt = now;

        try {
            const discoveredIp = await discoverIpByMac(
                device.macAddress,
            );

            if (discoveredIp) {
                if (discoveredIp !== state.ip) {
                    db.update(devices)
                        .set({
                            ipAddress: discoveredIp,
                            updatedAt: new Date(),
                        })
                        .where(eq(devices.id, device.id))
                        .run();
                }

                state.ip = discoveredIp;
                state.verifiedAt = Date.now();
                state.failures = 0;
            }

            // No discovery result does not invalidate
            // the last confirmed IP.
        } catch (error) {
            console.error(
                '[PowerMonitor] Discovery failed:',
                error,
            );
        }
    }

    // No previously confirmed IP: status cannot
    // be determined reliably.
    if (!state.ip) {
        setStatus(device.id, 'unknown');
        return;
    }

    // Plug is reachable.
    if (await ping(state.ip)) {
        state.failures = 0;
        setStatus(device.id, 'online');
        return;
    }

    // Verify that the local network is available.
    if (!(await ping(env.networkGatewayIp))) {
        state.failures = 0;
        setStatus(device.id, 'unknown');
        return;
    }

    // Gateway is reachable, but plug is not.
    state.failures++;

    if (state.failures >= FAILURE_LIMIT) {
        setStatus(device.id, 'offline');
        return;
    }

    // Preserve previous status until the
    // second failed check.
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
                    ipAddress: devices.ipAddress,
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
