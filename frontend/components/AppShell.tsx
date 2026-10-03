"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMe, User } from "@/lib/auth";
import { AppHeader } from "./AppHeader";

/** Wraps signed in pages: sends signed out visitors to the sign in page, otherwise adds the header. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => router.replace("/"));
  }, [router]);

  if (!user) return null;
  return (
    <>
      <AppHeader user={user} />
      {children}
    </>
  );
}
