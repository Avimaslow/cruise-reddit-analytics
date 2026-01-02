import { createBrowserRouter } from "react-router-dom";
import Shell from "../components/layout/Shell.jsx";
import PortsPage from "../features/ports/PortsPage.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Shell>
        <PortsPage />
      </Shell>
    ),
  },
]);
