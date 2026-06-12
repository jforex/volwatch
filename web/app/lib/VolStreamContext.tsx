"use client";

import { createContext, useContext, ReactNode } from "react";
import { useVolStream } from "./useVolStream";

type VolStreamValue = ReturnType<typeof useVolStream>;

const VolStreamContext = createContext<VolStreamValue | null>(null);

export function VolStreamProvider({ children }: { children: ReactNode }) {
  const stream = useVolStream();
  return (
    <VolStreamContext.Provider value={stream}>
      {children}
    </VolStreamContext.Provider>
  );
}

export function useVolStreamContext(): VolStreamValue {
  const ctx = useContext(VolStreamContext);
  if (!ctx) {
    throw new Error("useVolStreamContext must be used inside VolStreamProvider");
  }
  return ctx;
}