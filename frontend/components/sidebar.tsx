"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Library, MessageSquare, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  const links = [
    { href: "/library", label: "Library", icon: Library },
    { href: "/chat", label: "Chat", icon: MessageSquare },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col h-screen">
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
                  ? "bg-bg text-text font-medium"
                  : "text-muted hover:text-text hover:bg-bg"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border space-y-2">
        {session?.user?.email && (
          <div className="flex items-center justify-between px-3 py-1">
            <span
              className="text-xs text-muted truncate max-w-[120px]"
              title={session.user.email}
            >
              {session.user.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-muted hover:text-text flex items-center gap-1 px-1.5 py-1 rounded hover:bg-bg transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        )}
        <p className="text-xs text-muted px-3">
          RAG demo · Built with Gemini
        </p>
      </div>
    </aside>
  );
}