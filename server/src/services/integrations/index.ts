import { getYasnoIntegrationData } from "./yasno.js";
import { getUkrHmcWeather } from "./ukrhmc.js";

type IntegrationHandler = {
  type: string;
  handler: (integrationId: string) => Promise<object>;
};


const integrationRegistry: IntegrationHandler[] = [
  {
    type: "power_outages",
    handler: async (_integrationId) =>
      getYasnoIntegrationData(),
  },
  {
    type: "weather",
    handler: async (_integrationId) =>
      getUkrHmcWeather(),
  },
];

export async function getIntegrations(
   type: string,
  integrationId: string,
) {
  const integration = integrationRegistry.find(
    (item) => item.type === type,
  );

  if (!integration) {
    return {};
  }

  return integration.handler(integrationId);
}