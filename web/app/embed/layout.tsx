"use client";

import { VolStreamProvider } from "../lib/VolStreamContext";

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <VolStreamProvider>
      <div className="min-h-screen bg-transparent">
        {children}
      </div>
    </VolStreamProvider>
  );
}