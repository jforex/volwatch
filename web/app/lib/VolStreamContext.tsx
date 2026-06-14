"use client";

import { createContext, useContext, ReactNode } from "react";
import { useVolStream } from "./useVolStream";
import { useSmileAlerts } from "./useSmileAlerts";

type StreamPart = ReturnType<typeof useVolStream>;
type AlertsPart = ReturnType<typeof useSmileAlerts>;
type VolStreamValue = StreamPart & AlertsPart;

const VolStreamContext = createContext<VolStreamValue | null>(null);

export function VolStreamProvider({ children }: { children: ReactNode }) {
  const stream = useVolStream();
  const alertsApi = useSmileAlerts(stream.oracles);

  return (
    <VolStreamContext.Provider value={{ ...stream, ...alertsApi }}>
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