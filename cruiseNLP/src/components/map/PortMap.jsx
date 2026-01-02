import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function PortMap({ portsGeo = [], mentionsById = {}, onSelect }) {
  return (
    <div className="h-[520px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/30">
      <MapContainer center={[20, -45]} zoom={2} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution=""
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {portsGeo.map(p => {
          const mentions = mentionsById[p.port_id]?.mentions || 0;
          const radius = Math.min(18, Math.max(6, Math.log10(mentions + 1) * 6));
          return (
            <CircleMarker
              key={p.port_id}
              center={[p.lat, p.lon]}
              radius={radius}
              pathOptions={{ opacity: 0.9 }}
              eventHandlers={{ click: () => onSelect(p.port_id) }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                <div className="text-xs">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-zinc-300">Mentions: {mentions}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
