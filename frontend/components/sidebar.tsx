"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, MessageSquare } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/library", label: "Library", icon: Library },
    { href: "/chat", label: "Chat", icon: MessageSquare },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="px-5 py-4 border-b border-border">
        <span className="text-base font-semibold tracking-tight">
          NeuroDoc
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-bg text-text"
                  : "text-muted hover:text-text hover:bg-bg"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted px-3">
          RAG demo · Built with Gemini
        </p>
      </div>
    </aside>
  );
}