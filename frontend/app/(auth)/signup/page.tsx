"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    let ok = true;
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setServerError("");

    if (!email || !email.includes("@")) {
      setEmailError("Please enter a valid email address.");
      ok = false;
    }
    if (!password || password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      ok = false;
    }
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      ok = false;
    }
    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setServerError("An account with this email already exists.");
        } else {
          setServerError(data.error || "Something went wrong. Please try again.");
        }
        setLoading(false);
        return;
      }

      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!loginRes || loginRes.error) {
        setServerError("Account created, but sign-in failed. Please log in.");
        router.push("/login");
      } else {
        router.push("/library");
      }
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* LEFT: brand panel */}
      <div className="relative hidden overflow-hidden bg-[#0A0A0A] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 50% at 15% 15%, rgba(59,130,246,0.18), transparent 60%), radial-gradient(45% 45% at 85% 35%, rgba(96,165,250,0.10), transparent 60%), radial-gradient(60% 60% at 50% 100%, rgba(59,130,246,0.06), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white">
              <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
              <path d="M8.5 10h7M8.5 13h5M8.5 16h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">NeuroDoc</span>
        </div>

        <div className="relative z-10 max-w-[440px]">
          <h2 className="text-[36px] font-semibold leading-[1.12] tracking-[-0.025em]">
            Chat with your documents.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/55">
            Ask anything about your PDFs. Every answer cites the exact
            page it came from — no guessing.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-[12.5px] tracking-wide text-white/40">
          <span>Gemini</span>
          <span className="h-3 w-px bg-white/15" />
          <span>FastAPI</span>
          <span className="h-3 w-px bg-white/15" />
          <span>ChromaDB</span>
        </div>
      </div>

      {/* RIGHT: form */}
      <div className="flex items-center justify-center bg-bg px-6 py-12">
        <div className="w-full max-w-[360px]">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-text">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-bg">
                <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
                <path d="M8.5 10h7M8.5 13h5M8.5 16h3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">NeuroDoc</span>
          </div>

          <h1 className="text-[24px] font-semibold tracking-[-0.015em] text-text">
            Create an account
          </h1>
          <p className="mt-1.5 text-[14px] text-muted">
            Start chatting with your documents in under a minute.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-text">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-text placeholder:text-muted/50 outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
              {emailError && (
                <p className="mt-1 text-[12px] text-red-500">{emailError}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-text">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-text placeholder:text-muted/50 outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
              {passwordError && (
                <p className="mt-1 text-[12px] text-red-500">{passwordError}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-text">
                Confirm password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-text placeholder:text-muted/50 outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
              {confirmError && (
                <p className="mt-1 text-[12px] text-red-500">{confirmError}</p>
              )}
            </div>

            {serverError && (
              <div className="rounded-md border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[13px] text-red-500">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-text text-[14px] font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-10 text-center text-[13px] text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-text hover:text-accent">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
