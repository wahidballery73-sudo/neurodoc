"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Library,
  MessageSquare,
  PanelLeft,
  SquarePen,
  Sun,
  Moon,
} from "lucide-react";
import MorphingUserPill from "@/components/morphing-user-pill";

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const links = [
    { href: "/library", label: "Library", icon: Library },
    { href: "/chat", label: "Chat", icon: MessageSquare },
  ];

  const email = session?.user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "?";

  const current = mounted ? resolvedTheme || theme : "light";
  const isDark = current === "dark";

  function handleNewChat() {
    router.push("/chat");
    router.refresh();
  }

  return (
    <aside
      className={`hidden md:flex h-screen shrink-0 flex-col border-r border-border bg-surface overflow-hidden transition-[width,border-color] duration-200 ease-out ${
        open ? "w-60" : "w-0 border-r-0"
      }`}
    >
      {/* Brand + collapse */}
      <div className="flex h-14 w-60 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-text">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-3.5 w-3.5 text-bg"
            >
              <rect
                x="4.5"
                y="4.5"
                width="15"
                height="15"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M8.5 10h7M8.5 13h5M8.5 16h3"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-[14px] font-semibold tracking-tight">
            NeuroDoc
          </span>
        </div>
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-bg hover:text-text"
          aria-label="Close sidebar"
          title="Close sidebar"
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* New chat */}
      <div className="w-60 shrink-0 px-3 pt-3">
        <button
          onClick={handleNewChat}
          className="flex w-full items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2 text-[13.5px] font-medium text-text transition-colors hover:bg-bg"
        >
          <SquarePen className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          New chat
        </button>
      </div>

      {/* Nav */}
      <nav className="w-60 flex-1 space-y-0.5 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] transition-colors ${
                active
                  ? "bg-bg font-medium text-text"
                  : "text-muted hover:bg-bg hover:text-text"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle + user pill */}
      {email && (
        <div className="w-60 shrink-0 space-y-2 border-t border-border p-3">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted transition-colors hover:bg-bg hover:text-text"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            ) : (
              <Moon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            )}
            {isDark ? "Light mode" : "Dark mode"}
          </button>
          <MorphingUserPill email={email} initial={initial} />
        </div>
      )}
    </aside>
  );
}