"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";

export default function GlobalNav() {
  const pathname = usePathname();

  // The homepage and the full-screen interview room have their own chrome.
  if (pathname === "/" || pathname.startsWith("/interview/")) return null;

  const link = "text-sm font-medium text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-full";

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-5 py-3 border-b border-violet-500/15 bg-[#08080c]/80 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-white mr-3">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-cyan-400 to-violet-600 shadow-[0_0_12px_#22d3ee]" />
          Loop
        </Link>
        <Link href="/problems" className={link}>Problems</Link>
        <Link href="/dashboard" className={link}>Dashboard</Link>
        <Link href="/history" className={link}>History</Link>
        <Link href="/profile" className={link}>Profile</Link>
      </div>
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="text-sm font-medium text-zinc-300 hover:text-white">Sign in</button>
          </SignInButton>
          <SignUpButton>
            <button className="text-sm font-semibold px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-violet-400 text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.8)]">
              Sign up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </nav>
  );
}
