"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || loading || demoLoading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setError("Invalid email or password");
      } else {
        router.push("/library");
        router.refresh();
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    if (loading || demoLoading) return;
    setError(null);
    setDemoLoading(true);

    try {
      const res = await signIn("credentials", {
        email: "demo@neurodoc.app",
        password: "demo1234",
        redirect: false,
      });

      if (!res || res.error) {
        setError("Failed to sign in with demo account");
      } else {
        router.push("/library");
        router.refresh();
      }
    } catch (err: any) {
      setError("Failed to sign in with demo account");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 h-screen w-full overflow-hidden">
      {/* LEFT PANEL */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-[#0A0A0A] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_var(--tw-gradient-stops))] from-zinc-800/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10">
          <span className="text-[18px] font-semibold tracking-tight">
            NeuroDoc
          </span>
        </div>

        <div className="relative z-10 max-w-md space-y-3">
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight">
            Chat with your documents.
          </h1>
          <p className="text-[16px] text-zinc-400 font-normal leading-relaxed">
            Answers with citations. Every claim traceable to the source.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-zinc-500 font-mono">
            Built with Gemini · FastAPI · ChromaDB
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center p-8 bg-bg">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-[24px] font-semibold tracking-tight text-text">
              Welcome back
            </h2>
            <p className="text-[14px] text-muted mt-1">
              Sign in to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full h-10 rounded-md bg-text text-bg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-bg px-2 text-xs text-muted uppercase tracking-wider">
              or
            </span>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || demoLoading}
            className="w-full h-10 rounded-md border border-border bg-transparent hover:bg-surface text-sm font-medium text-text transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {demoLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in demo…
              </>
            ) : (
              "Try demo account"
            )}
          </button>

          <p className="text-center text-xs text-muted">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-text hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
