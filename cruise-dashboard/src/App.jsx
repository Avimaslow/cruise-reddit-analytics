import "./index.css";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import PortsPage from "./features/ports/PortsPage";
import LinePage from "./pages/lines/LinePage";
import ShipPage from "./pages/Ships/ShipPage";
import HelpPage from "./pages/help/HelpPage";

function pageLabel(pathname) {
  if (pathname.startsWith("/lines/")) return "Cruise Line";
  if (pathname.startsWith("/ships/")) return "Cruise Ship";
  if (pathname.startsWith("/help")) return "Help";
  return "Cruise Port Intelligence";
}

function AppChrome() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isHelp = location.pathname.startsWith("/help");

  const tabClassName = (active) =>
    active
      ? "rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition"
      : "rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10";

  return (
    <div className="sticky top-0 z-[1000] border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          {!isHome ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/10"
            >
              Back
            </button>
          ) : null}
          <Link
            to="/"
            className={tabClassName(isHome)}
          >
            Home
          </Link>
          <Link
            to="/help"
            className={tabClassName(isHelp)}
          >
            Help
          </Link>
        </div>

        <div className="hidden text-sm text-slate-300 md:block">{pageLabel(location.pathname)}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <AppChrome />
      <Routes>
        <Route path="/" element={<PortsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/lines/:lineId" element={<LinePage />} />
        <Route path="/ships/:shipId" element={<ShipPage />} />
        <Route path="*" element={<PortsPage />} />
      </Routes>
    </div>
  );
}
