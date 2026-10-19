import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import { healthRoutes } from './routes/health.routes.js';
import { roomRoutes } from './routes/rooms.routes.js';
import { deviceRoutes } from './routes/devices.routes.js';
import { measurementRoutes } from './routes/measurements.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { integrationsRoutes } from './routes/integrations.routes.js';
import { powerRoutes } from './routes/power.routes.js';
  
export function buildApp() {
  const app = Fastify({
    logger: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.register(healthRoutes);
  app.register(roomRoutes);
  app.register(deviceRoutes);
  app.register(measurementRoutes);
  app.register(analyticsRoutes);
  app.register(integrationsRoutes);
  app.register(powerRoutes);
  
  return app;
}