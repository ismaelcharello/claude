/** True when the office gateway URL points at the Savana backend adapter. */
export const isSavanaGatewayUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    return new URL(url).pathname.replace(/\/+$/, "") === "/gateway";
  } catch {
    return false;
  }
};

const STATUS_PT: Record<string, string> = {
  connected: "conectado",
  connecting: "conectando",
  disconnected: "desconectado",
};

export const formatOfficeConnectionLabel = (params: {
  gatewayUrl: string | null | undefined;
  adapterType: string;
  status: string;
}): string =>
  isSavanaOfficeEnabled(params.gatewayUrl)
    ? `savana • ${STATUS_PT[params.status] ?? params.status}`
    : `${params.adapterType} • ${params.status}`;

/**
 * Set by `npm run savana` (NEXT_PUBLIC_SAVANA_OFFICE=1). Inlined at build
 * time, so it is known on the first render — unlike the gateway URL, which
 * loads asynchronously.
 */
export const SAVANA_OFFICE_ENABLED = process.env.NEXT_PUBLIC_SAVANA_OFFICE === "1";

export const isSavanaOfficeEnabled = (gatewayUrl: string | null | undefined): boolean =>
  SAVANA_OFFICE_ENABLED || isSavanaGatewayUrl(gatewayUrl);
