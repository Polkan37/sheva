
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isIP } from 'node:net';
import { env } from '../config/env.js';

const exec = promisify(execFile);

const MAC_PATTERN = /(?:[0-9a-f]{2}:){5}[0-9a-f]{2}/i;

export function normalizeMac(mac: string): string {
    return mac.replace(/-/g, ':').toLowerCase();
}

async function run(
    command: string,
    args: string[],
    timeout = 5000,
): Promise<string> {
    const { stdout } = await exec(command, args, {
        timeout,
        maxBuffer: 1024 * 1024,
    });

    return stdout;
}

export async function ping(ip: string): Promise<boolean> {
    if (isIP(ip) !== 4) return false;

    const args = process.platform === 'darwin'
        ? ['-c', '1', '-W', '2000', ip]
        : ['-c', '1', '-W', '2', ip];

    try {
        await run('ping', args, 4000);
        return true;
    } catch {
        return false;
    }
}

export async function resolveIpByMac(
    mac: string,
): Promise<string | null> {
    const target = normalizeMac(mac);
    const macOS = process.platform === 'darwin';

    const output = await run(
        macOS ? 'arp' : 'ip',
        macOS ? ['-an'] : ['neigh', 'show'],
    );

    for (const line of output.split('\n')) {
        const foundMac = line.match(MAC_PATTERN)?.[0];

        if (!foundMac || normalizeMac(foundMac) !== target) {
            continue;
        }

        // Ignore invalid neighbor entries.
        if (/\b(FAILED|INCOMPLETE)\b/i.test(line)) {
            continue;
        }

        const ip = line.match(
            /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
        )?.[0];

        if (ip && isIP(ip) === 4) return ip;
    }

    return null;
}

export async function discoverIpByMac(
    mac: string,
): Promise<string | null> {
    const subnet = env.networkCidr;

    if (!subnet) {
        throw new Error('NETWORK_CIDR is not configured');
    }

    // Refresh network discovery rather than trusting
    // the existing ARP cache.
    const output = await run(
        'sudo',
        [
            '-n',
            '/opt/homebrew/bin/nmap',
            '-sn',
            '-n',
            subnet,
        ],
        30000,
    );

    const target = normalizeMac(mac);
    let currentIp: string | null = null;

    // Prefer MAC/IP pairs obtained from this scan.
    for (const line of output.split('\n')) {
        const report = line.match(
            /^Nmap scan report for (\d{1,3}(?:\.\d{1,3}){3})/,
        );

        if (report?.[1]) {
            currentIp = report[1];
            continue;
        }

        const foundMac = line.match(
            /MAC Address:\s*([0-9a-f:]+)/i,
        )?.[1];

        if (
            currentIp &&
            foundMac &&
            normalizeMac(foundMac) === target
        ) {
            return currentIp;
        }
    }

    // Some systems only populate the neighbor table.
    // This is a fallback, not proof that the entry is fresh.
    return resolveIpByMac(mac);
}
