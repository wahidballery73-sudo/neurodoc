"use client";

import { useEffect, useState } from "react";
import { PanelLeft } from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("neurodoc:sidebar");
      if (saved !== null) setOpen(saved === "open");
    } catch {}
    setMounted(true);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem("neurodoc:sidebar", next ? "open" : "closed");
    } catch {}
  }

  const isOpen = mounted ? open : true;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar open={isOpen} onToggle={toggle} />
      <main className="relative flex-1 min-w-0 overflow-hidden pb-16 md:pb-0">
        {!isOpen && (
          <button
            onClick={toggle}
            className="hidden md:flex absolute top-3 left-3 z-40 h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-bg hover:text-text transition-colors"
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
        {children}
      </main>
      <MobileNav />
    </div>
  );
}