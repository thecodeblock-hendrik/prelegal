"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, User } from "@/lib/auth";
import { Logo } from "./Logo";

/** Top bar for signed in pages: logo, navigation, the user's email and sign out. */
export function AppHeader({ user }: { user: User }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link href="/documents/">
          <Logo />
        </Link>
        <nav className="text-sm font-medium">
          <Link href="/documents/" className="text-muted hover:text-navy">
            My documents
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="hidden text-muted sm:inline">{user.email}</span>
          <button type="button" onClick={handleSignOut} className="font-medium text-muted hover:text-navy">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
