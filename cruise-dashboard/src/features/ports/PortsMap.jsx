import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import portsGeo from "./ports_geo.json";

function toMarkerSize(mentions) {
  const m = Math.max(1, mentions || 1);
  const r = 4 + Math.log10(m) * 3.5;
  return Math.max(4, Math.min(16, r));
}

export default function PortsMap({ ports, selectedPort, onSelect }) {
  // portsGeo expected shape: { "miami": { lat, lon, name }, ... }
  const markers = (ports || [])
    .map((p) => {
      const g = portsGeo[p.id];
      if (!g?.lat || !g?.lon) return null;
      return {
        id: p.id,
        name: g.name || p.name || p.id,
        lat: g.lat,
        lon: g.lon,
        mentions: p.mentions || 0,
      };
    })
    .filter(Boolean);

  return (
    <div className="h-full w-full rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/40">
      <MapContainer
        center={[20, -30]}
        zoom={2}
        minZoom={2}
        maxZoom={10}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />

        {markers.map((m) => {
          const active = m.id === selectedPort;
          const radius = toMarkerSize(m.mentions);

          return (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lon]}
              radius={active ? radius + 3 : radius}
              pathOptions={{
                color: active ? "#22c55e" : "#60a5fa",
                weight: active ? 2 : 1,
                fillColor: active ? "#22c55e" : "#60a5fa",
                fillOpacity: active ? 0.85 : 0.55,
              }}
              eventHandlers={{
                click: () => onSelect?.(m.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1} sticky>
                <div className="text-xs">
                  <div className="font-semibold">{m.name}</div>
                  <div className="opacity-80">{m.mentions} mentions</div>
                  <div className="opacity-70 text-[11px]">id: {m.id}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
