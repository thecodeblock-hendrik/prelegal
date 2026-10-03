"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, User } from "@/lib/auth";
import { Logo } from "./Logo";

/** Top bar for signed in pages: logo, navigation, the user's email and sign out. */
export function AppHeader({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <header className="bg-primary">
      <div className="mx-auto flex max-w-page items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link href="/documents/" className="rounded-md focus-visible:outline-surface">
          <Logo light />
        </Link>
        <nav>
          <Link href="/documents/" className="nav-link" aria-current={pathname.startsWith("/documents") ? "page" : undefined}>
            My documents
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <span className="hidden text-caption text-on-primary-muted sm:inline">{user.email}</span>
          <button type="button" onClick={handleSignOut} className="nav-link">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
