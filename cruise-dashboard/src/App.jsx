import "./index.css";
import { Routes, Route } from "react-router-dom";

import PortsPage from "./features/ports/PortsPage";
import LinePage from "./pages/Lines/LinePage";
import ShipPage from "./pages/Ships/ShipPage";

export default function App() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <Routes>
        <Route path="/" element={<PortsPage />} />
        <Route path="/lines/:lineId" element={<LinePage />} />
        <Route path="/ships/:shipId" element={<ShipPage />} />
        <Route path="*" element={<PortsPage />} />
      </Routes>
    </div>
  );
}
