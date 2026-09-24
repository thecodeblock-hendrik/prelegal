"use client";

import { useRouter } from "next/navigation";

/** Placeholder login: accepts any input and enters the platform. Real auth comes later. */
export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          router.push("/nda/");
        }}
        className="w-full max-w-sm space-y-4 rounded-lg border-t-4 border-accent bg-white p-6 shadow"
      >
        <div>
          <h1 className="text-2xl font-semibold text-navy">Prelegal</h1>
          <p className="text-sm text-muted">Sign in to draft your agreements.</p>
        </div>
        <label className="block text-sm font-medium text-navy">
          Email
          <input type="email" name="email" className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-primary" />
        </label>
        <label className="block text-sm font-medium text-navy">
          Password
          <input type="password" name="password" className="mt-1 w-full rounded-md border px-3 py-2 focus:outline-primary" />
        </label>
        <button type="submit" className="w-full rounded-md bg-secondary px-4 py-2 font-medium text-white hover:opacity-90">
          Sign in
        </button>
      </form>
    </div>
  );
}
