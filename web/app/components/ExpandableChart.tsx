"use client";

import { useEffect, useState, ReactNode } from "react";

type Props = {
  children: ReactNode;
  title: string;
};

export function ExpandableChart({ children, title }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Esc to close
  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    // Prevent body scroll while modal open
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  return (
    <>
      {/* Expand button — positioned absolutely inside the chart container */}
      <button
        onClick={() => setExpanded(true)}
        className="absolute top-2 right-2 z-10 rounded border border-neutral-700 bg-neutral-950/80 backdrop-blur p-1.5 font-mono text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white hover:border-blue-500 transition-colors group"
        aria-label={`Expand ${title}`}
        title="Expand"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:scale-110 transition-transform">
          <path d="M1 5V1H5M9 1H13V5M13 9V13H9M5 13H1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* The inline rendering — children render normally where they sit */}
      {!expanded && children}

      {/* Fullscreen modal — same children re-rendered, just bigger */}
      {expanded && (
        <>
          {/* Placeholder where the chart was, so the page layout doesn't collapse */}
          <div className="flex h-full min-h-[400px] items-center justify-center font-mono text-xs text-neutral-500">
            (expanded view active — press Esc or close button to return)
          </div>

          <div
            className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-sm flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-chart-title"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-widest text-blue-400 font-bold">/ EXPANDED VIEW</span>
                <span className="text-neutral-700">·</span>
                <span id="expanded-chart-title" className="font-mono text-sm text-white font-bold uppercase tracking-widest">{title}</span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white hover:border-blue-500 transition-colors"
                aria-label="Close expanded view"
              >
                ✕ CLOSE (ESC)
              </button>
            </div>

            {/* Chart body — fills remaining space */}
            <div className="flex-1 overflow-auto p-6">
              <div className="h-full min-h-[500px] w-full">
                {children}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
