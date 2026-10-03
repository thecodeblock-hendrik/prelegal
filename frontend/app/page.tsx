"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { authenticate, AuthMode, fetchMe } from "@/lib/auth";

const COPY = {
  signin: { title: "Welcome back", action: "Sign in", switchText: "New to Prelegal?", switchAction: "Create an account" },
  signup: { title: "Create your account", action: "Create account", switchText: "Already have an account?", switchAction: "Sign in" },
};

/** Sign in or sign up, then continue to the user's documents. */
export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const copy = COPY[mode];

  useEffect(() => {
    fetchMe()
      .then(() => router.replace("/documents/"))
      .catch(() => {}); // Signed out visitors stay here.
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await authenticate(mode, String(form.get("email")), String(form.get("password")));
      router.push("/documents/");
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-navy p-12 text-white lg:flex">
        <Logo light />
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-semibold leading-tight">
            Draft legal agreements in minutes, <span className="text-accent">not days.</span>
          </h2>
          <p className="text-slate-300">
            Chat with an AI assistant that picks the right Common Paper template and fills in every detail with you.
          </p>
        </div>
        <p className="text-xs text-slate-400">Documents are drafts and subject to legal review.</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-navy">{copy.title}</h1>
            <p className="mt-1 text-sm text-muted">Draft, save and revisit your agreements.</p>
          </div>
          <label className="block text-sm font-medium text-navy">
            Email
            <input required type="email" name="email" autoComplete="email" className="input mt-1" />
          </label>
          <label className="block text-sm font-medium text-navy">
            Password
            <input
              required
              type="password"
              name="password"
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="input mt-1"
            />
            {mode === "signup" && <span className="mt-1 block text-xs font-normal text-muted">At least 8 characters.</span>}
          </label>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={pending} className="btn-submit w-full">
            {pending ? "Please wait..." : copy.action}
          </button>
          <p className="text-center text-sm text-muted">
            {copy.switchText}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
              }}
              className="font-medium text-primary hover:underline"
            >
              {copy.switchAction}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
