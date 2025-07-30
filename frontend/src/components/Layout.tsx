import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 ml-0 md:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}