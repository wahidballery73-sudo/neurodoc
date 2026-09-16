"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Library, MessageSquare, LogOut } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/library", label: "Library", icon: Library },
    { href: "/chat", label: "Chat", icon: MessageSquare },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors ${
              active ? "text-text" : "text-muted"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
            {label}
          </Link>
        );
      })}
      <button
        onClick={async () => {
          await signOut({ redirect: false });
          router.push("/login");
        }}
        className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-muted transition-colors hover:text-text"
      >
        <LogOut className="h-5 w-5" strokeWidth={1.75} />
        Sign out
      </button>
    </nav>
  );
}