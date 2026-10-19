import { buildApp } from './app.js';
import { startPowerMonitor } from './services/powerMonitor.js';

const app = buildApp();

let stopPowerMonitor: (() => void) | undefined;

app.addHook('onClose', async () => {
  stopPowerMonitor?.();
});

try {
  await app.listen({
    host: '0.0.0.0',
    port: 3000,
  });
  stopPowerMonitor = startPowerMonitor(app.log);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
  await app.close();
}