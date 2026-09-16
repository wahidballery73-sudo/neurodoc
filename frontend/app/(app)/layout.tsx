import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden pb-16 md:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}