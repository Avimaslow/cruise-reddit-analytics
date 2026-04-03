// src/api/cruiseApi.js

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${path}`);
  return res.json();
}

export const CruiseAPI = {
  ports: (limit = 200) => getJson(`/ports?limit=${limit}`),
  portsIntelligence: (limit = 100) => getJson(`/ports/intelligence?limit=${limit}`),

  portSummary: (portId) => getJson(`/ports/${encodeURIComponent(portId)}`),
  portOverview: (portId) => getJson(`/ports/${encodeURIComponent(portId)}/overview`),
  portPulse: (portId) => getJson(`/ports/${encodeURIComponent(portId)}/pulse`),
  portKeywords: (portId, limit = 12) =>
    getJson(`/ports/${encodeURIComponent(portId)}/keywords?limit=${limit}`),

  portThemes: (portId, limit = 15, min_n = 30) =>
    getJson(
      `/ports/${encodeURIComponent(portId)}/themes?limit=${limit}&min_n=${min_n}`
    ),

  portTrend: (portId) => getJson(`/ports/${encodeURIComponent(portId)}/trend`),

  portLines: (portId, limit = 30) =>
    getJson(`/ports/${encodeURIComponent(portId)}/lines?limit=${limit}`),

  portLineShares: (portId, limit = 10) =>
    getJson(`/ports/${encodeURIComponent(portId)}/line-shares?limit=${limit}`),

  portShips: (portId, limit = 30) =>
    getJson(`/ports/${encodeURIComponent(portId)}/ships?limit=${limit}`),

  lineSummary: (lineId) => getJson(`/lines/${encodeURIComponent(lineId)}`),
  lineThemes: (lineId, limit = 15, min_n = 30) =>
    getJson(`/lines/${encodeURIComponent(lineId)}/themes?limit=${limit}&min_n=${min_n}`),
  lineFeed: (lineId, limit = 25) =>
    getJson(`/lines/${encodeURIComponent(lineId)}/feed?limit=${limit}`),
  linePorts: (lineId, limit = 20) =>
    getJson(`/lines/${encodeURIComponent(lineId)}/ports?limit=${limit}`),
  lineTopComments: (lineId, limit = 20) =>
    getJson(`/lines/${encodeURIComponent(lineId)}/top-comments?limit=${limit}`),
  lineWorstComments: (lineId, limit = 20) =>
    getJson(`/lines/${encodeURIComponent(lineId)}/worst-comments?limit=${limit}`),
  lineTrend: (lineId) => getJson(`/lines/${encodeURIComponent(lineId)}/trend`),

  shipSummary: (shipId) => getJson(`/ships/${encodeURIComponent(shipId)}`),
  shipPorts: (shipId, limit = 80) =>
    getJson(`/ships/${encodeURIComponent(shipId)}/ports?limit=${limit}`),
  shipThemes: (shipId, limit = 15, min_n = 30) =>
    getJson(`/ships/${encodeURIComponent(shipId)}/themes?limit=${limit}&min_n=${min_n}`),
  shipTrend: (shipId) => getJson(`/ships/${encodeURIComponent(shipId)}/trend`),
  shipTopComments: (shipId, limit = 15) =>
    getJson(`/ships/${encodeURIComponent(shipId)}/top-comments?limit=${limit}`),
  shipWorstComments: (shipId, limit = 15) =>
    getJson(`/ships/${encodeURIComponent(shipId)}/worst-comments?limit=${limit}`),

  portFeed: (portId, limit = 25, theme = null) => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (theme) params.set("theme", theme);

    return getJson(
      `/ports/${encodeURIComponent(portId)}/feed?${params.toString()}`
    );
  },
  portPosts: (portId, sort = "top", limit = 20) => {
    const params = new URLSearchParams();
    params.set("sort", sort);
    params.set("limit", String(limit));
    return getJson(`/ports/${encodeURIComponent(portId)}/posts?${params.toString()}`);
  },
};
