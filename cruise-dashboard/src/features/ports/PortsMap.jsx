import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function markerRadius(mentions) {
  const scaled = 6 + Math.log10((mentions || 1) + 1) * 4.5;
  return Math.max(6, Math.min(18, scaled));
}

function markerColor(avgSentiment) {
  if (typeof avgSentiment !== "number") return "#60a5fa";
  if (avgSentiment >= 0.2) return "#34d399";
  if (avgSentiment <= -0.15) return "#fb7185";
  return "#fbbf24";
}

function moodLabel(avgSentiment) {
  if (typeof avgSentiment !== "number") return "Mixed";
  if (avgSentiment >= 0.2) return "Traveler favorite";
  if (avgSentiment <= -0.15) return "Concern-heavy";
  return "Mixed signal";
}

function positiveShare(port) {
  const mentions = Number(port.mentions || 0);
  if (!mentions) return "n/a";
  return `${Math.round(((Number(port.pos_count || 0) / mentions) || 0) * 100)}% positive`;
}

export default function PortsMap({ ports, selectedPortId, onSelect }) {
  return (
    <div className="h-[28rem] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
      <MapContainer
        center={[23, -52]}
        zoom={3}
        minZoom={2}
        maxZoom={8}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />

        {(ports || []).map((port) => {
          const active = port.port_id === selectedPortId;
          const color = markerColor(port.avg_sentiment);
          const radius = markerRadius(port.mentions);

          return (
            <CircleMarker
              key={port.port_id}
              center={[port.lat, port.lon]}
              radius={active ? radius + 4 : radius}
              pathOptions={{
                color: active ? "#f8fafc" : color,
                weight: active ? 2 : 1,
                fillColor: color,
                fillOpacity: active ? 0.95 : 0.72,
              }}
              eventHandlers={{ click: () => onSelect?.(port.port_id) }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="min-w-[14rem] space-y-2 text-xs">
                  <div>
                    <div className="font-semibold">{port.name}</div>
                    <div className="text-slate-300">
                      {port.country} • {port.region}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <div className="text-slate-500">References</div>
                      <div>{port.mentions}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Cruise posts</div>
                      <div>{port.post_mentions || 0}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Pulse</div>
                      <div>{port.pulse_score}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Sentiment</div>
                      <div>{typeof port.avg_sentiment === "number" ? port.avg_sentiment.toFixed(2) : "n/a"}</div>
                    </div>
                  </div>
                  <div className="text-slate-200">
                    {moodLabel(port.avg_sentiment)} • {positiveShare(port)}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
