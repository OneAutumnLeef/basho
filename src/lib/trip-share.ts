import { PlannedStop, PlannerSettings, RouteMode } from "@/types/places";
import { ShareableTripPayload, ShareableTripStop } from "@/types/trips";

function toBase64Url(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);

  let base64: string;
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    base64 = btoa(binary);
  }

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);

  let bytes: Uint8Array;
  if (typeof Buffer !== "undefined") {
    bytes = new Uint8Array(Buffer.from(padded, "base64"));
  } else {
    const binary = atob(padded);
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

export function buildShareableTripPayload(params: {
  name: string;
  settings: PlannerSettings;
  routeMode: RouteMode;
  score: number;
  stops: PlannedStop[];
}): ShareableTripPayload {
  const shareStops: ShareableTripStop[] = params.stops.map((stop) => ({
    id: stop.itemId,
    name: stop.place.name,
    address: stop.place.address,
    lat: stop.place.lat,
    lng: stop.place.lng,
    category: stop.place.category,
    arrivalTime: stop.arrivalTime,
    departureTime: stop.departureTime,
    dwellMinutes: stop.dwellMinutes,
    travelMinutesFromPrevious: stop.travelMinutesFromPrevious,
  }));

  return {
    version: 1,
    name: params.name,
    createdAt: new Date().toISOString(),
    settings: {
      city: params.settings.city,
      vibe: params.settings.vibe,
      timeWindow: params.settings.timeWindow,
      startTime: params.settings.startTime,
      pace: params.settings.pace,
    },
    routeMode: params.routeMode,
    score: params.score,
    stops: shareStops,
  };
}

export function encodeShareableTrip(payload: ShareableTripPayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeShareableTrip(token: string): ShareableTripPayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as ShareableTripPayload;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.name !== "string" ||
      !Array.isArray(parsed.stops)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function buildShareableTripUrl(token: string, baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("plan", token);
  return url.toString();
}

export function buildShareMapPreviewUrl(stops: ShareableTripStop[]): string {
  if (stops.length === 0) {
    return "";
  }

  const markers = stops
    .slice(0, 8)
    .map((stop) => `${stop.lat},${stop.lng},lightblue1`)
    .join("|");

  return `https://staticmap.openstreetmap.de/staticmap.php?size=900x360&markers=${encodeURIComponent(markers)}`;
}
