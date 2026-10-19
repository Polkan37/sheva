import 'dotenv/config';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  databaseFile: getRequiredEnv('DB_FILE_NAME'),
  networkCidr: getRequiredEnv('NETWORK_CIDR'),
  networkGatewayIp: getRequiredEnv('NETWORK_GATEWAY_IP'),
  powerMonitorDeviceUid: getRequiredEnv('POWER_MONITOR_DEVICE_UID'),
} as const;