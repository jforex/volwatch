"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useVolStreamContext } from "../lib/VolStreamContext";

export function AppNav() {
  const pathname = usePathname();
  const { status } = useVolStreamContext();

  const links = [
    { href: "/app", label: "Home" },
    { href: "/app/surface", label: "Vol Surface" },
    { href: "/app/plp", label: "PLP" },
  ];

  function isActive(href: string) {
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/75">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link href="/app" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Image src="/logo.png" alt="VWATCH" width={32} height={32} className="object-contain rounded sm:h-9 sm:w-9" />
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg sm:text-xl font-bold tracking-tight text-white">VWATCH</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-2 sm:px-4 text-sm sm:text-base font-semibold whitespace-nowrap transition-colors ${
                    active ? "text-white" : "text-neutral-200 hover:text-white"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute inset-x-3 sm:inset-x-4 -bottom-px h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.7)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className={`inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${
            status === "open" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse"
            : status === "connecting" ? "bg-amber-400"
            : "bg-red-400"
          }`} />
          <span className="text-xs sm:text-sm font-semibold text-neutral-300">
            {status === "open" ? "Live" : status === "connecting" ? "Connecting…" : "Disconnected"}
          </span>
          <span className="hidden md:inline text-xs uppercase tracking-widest text-neutral-300 font-semibold ml-2 border-l border-neutral-800 pl-3">
            Sui testnet
          </span>
        </div>
      </div>
    </nav>
  );
}