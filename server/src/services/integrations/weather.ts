export async function getWeatherIntegrationData(
  integrationId: string,
) {
  return {
    temperature: null,
    humidity: null,
    condition: null,
  };
}