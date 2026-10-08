import type {
  IntegrationsResponse,
  YasnoIntegration,
} from "../../entities/Integration/types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function getIntegrations(
  signal?: AbortSignal,
): Promise<IntegrationsResponse> {
  const response = await fetch(`${API_URL}/api/integrations`, {
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to load integrations");
  }

  return response.json();
}

export async function getYasno(
  signal?: AbortSignal,
): Promise<YasnoIntegration> {
  const data = await getIntegrations(signal);

  const yasno = data.integrations.find(
    (integration) => integration.uid === "yasno",
  );

  if (!yasno) {
    throw new Error("Yasno integration not found");
  }

  return yasno;
}