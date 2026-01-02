import { apiGet } from "./client";

export function fetchPorts(limit = 50) {
  return apiGet(`/ports?limit=${limit}`);
}

export function fetchPortSummary(portId) {
  return apiGet(`/ports/${encodeURIComponent(portId)}`);
}

export function fetchPortThemes(portId) {
  return apiGet(`/ports/${encodeURIComponent(portId)}/themes`);
}

export function fetchPortFeed(portId) {
  return apiGet(`/ports/${encodeURIComponent(portId)}/feed`);
}
