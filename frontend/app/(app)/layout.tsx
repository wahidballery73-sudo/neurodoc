import Sidebar from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
