const DEFAULT_BASE_PATH = "/";

function ensureLeadingSlash(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function ensureTrailingSlash(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}

export const APP_BASE_PATH = ensureTrailingSlash(
  ensureLeadingSlash(import.meta.env.BASE_URL || DEFAULT_BASE_PATH)
);

export const ROUTER_BASENAME =
  APP_BASE_PATH === DEFAULT_BASE_PATH
    ? DEFAULT_BASE_PATH
    : APP_BASE_PATH.replace(/\/$/, "");

export function getAssetUrl(assetPath: string) {
  return `${APP_BASE_PATH}${assetPath.replace(/^\/+/, "")}`;
}

export function getAuthRedirectUrl() {
  if (typeof window === "undefined") {
    return APP_BASE_PATH;
  }

  return new URL(APP_BASE_PATH, window.location.origin).toString();
}
