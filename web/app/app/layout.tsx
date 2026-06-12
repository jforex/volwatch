"use client";

import { ReactNode } from "react";
import { VolStreamProvider } from "../lib/VolStreamContext";
import { AppNav } from "../components/AppNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <VolStreamProvider>
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <AppNav />
        {children}
      </div>
    </VolStreamProvider>
  );
}
