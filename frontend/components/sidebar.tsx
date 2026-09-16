"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Library, MessageSquare, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { href: "/library", label: "Library", icon: Library },
    { href: "/chat", label: "Chat", icon: MessageSquare },
  ];

  const email = session?.user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "?";

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-text">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-bg">
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

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-3">
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

      {/* User footer */}
      {email && (
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg text-[11px] font-semibold text-muted">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[12.5px] leading-tight text-text"
                title={email}
              >
                {email}
              </p>
              <p className="text-[11px] leading-tight text-muted">
                Signed in
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              aria-label="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-bg hover:text-text"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}