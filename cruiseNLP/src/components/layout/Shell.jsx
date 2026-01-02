import TopNav from "./TopNav";
import Sidebar from "./Sidebar";

export default function Shell({ children }) {
  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 min-h-0 p-4">{children}</main>
      </div>
    </div>
  );
}
