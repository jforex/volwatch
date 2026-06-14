"use client";

import { useState } from "react";
import Link from "next/link";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://volwatch.vercel.app";

type Widget = {
  slug: string;
  name: string;
  description: string;
  recommendedHeight: number;
};

const WIDGETS: Widget[] = [
  {
    slug: "vol-surface",
    name: "3D Vol Surface",
    description: "Live implied volatility surface (strike × expiry → IV) streamed from DeepBook Predict's oracle::OracleSVIUpdated events. Rotate, zoom, hover for precise values.",
    recommendedHeight: 540,
  },
  {
    slug: "skew",
    name: "Skew Curve",
    description: "Implied vol vs log-moneyness for the nearest active expiry. Classified as SMILE / SKEW / SMIRK based on SVI ρ parameter.",
    recommendedHeight: 380,
  },
  {
    slug: "plp-health",
    name: "PLP Health",
    description: "Real-time PLP vault health: balance, NAV per share, utilization, max payout coverage, composite risk score, trading status.",
    recommendedHeight: 280,
  },
];

export default function EmbedDocs() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="font-mono text-xs uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors">
            ← VWATCH
          </Link>
          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Embeddable widgets.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-neutral-300 max-w-2xl leading-relaxed">
            Drop VWATCH's live vol surface, skew curve, and PLP health monitor into any Sui frontend with a single <code className="font-mono text-blue-300 bg-neutral-900 px-1.5 py-0.5 rounded">{`<iframe>`}</code>. No SDK. No build step. Live on-chain data from DeepBook Predict on Sui testnet.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="rounded border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 px-2.5 py-1 font-bold">● LIVE DATA</span>
            <span className="rounded border border-blue-500/40 bg-blue-950/40 text-blue-300 px-2.5 py-1 font-bold">SUI TESTNET</span>
            <span className="rounded border border-neutral-700 bg-neutral-900 text-neutral-300 px-2.5 py-1">NO API KEY</span>
            <span className="rounded border border-neutral-700 bg-neutral-900 text-neutral-300 px-2.5 py-1">CORS-FRIENDLY</span>
          </div>
        </div>

        {/* Widgets */}
        <div className="space-y-12">
          {WIDGETS.map((w) => <WidgetSection key={w.slug} widget={w} />)}
        </div>

        {/* Footer note */}
        <div className="mt-16 rounded border border-neutral-800 bg-neutral-900 px-5 py-4">
          <p className="font-mono text-xs text-neutral-300 leading-relaxed">
            <span className="text-blue-400 font-bold">/ NOTES</span><br />
            · All widgets connect directly to VWATCH's WebSocket backend and stream live SVI updates from Sui testnet.<br />
            · Widgets are self-contained. They include their own data layer, no host-side configuration needed.<br />
            · The host page's theme doesn't affect the widget. Widgets always render in their own dark terminal aesthetic.<br />
            · Source code: <a href="https://github.com/jforex/volwatch" className="text-blue-400 hover:text-blue-300">github.com/jforex/volwatch</a>
          </p>
        </div>
      </div>
    </main>
  );
}

function WidgetSection({ widget }: { widget: Widget }) {
  const [copied, setCopied] = useState(false);
  const embedUrl = `${BASE_URL}/embed/${widget.slug}`;
  const iframeCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="${widget.recommendedHeight}"
  frameborder="0"
  allow="fullscreen"
  style="border-radius: 8px; border: 1px solid #262626;"
></iframe>`;

  function copyToClipboard() {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      {/* Section header */}
      <div className="border-b border-neutral-800 px-5 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-xs uppercase tracking-widest text-blue-400 font-bold">/ {widget.slug.toUpperCase()}</span>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white">{widget.name}</h2>
        </div>
        <Link
          href={`/embed/${widget.slug}`}
          target="_blank"
          className="shrink-0 font-mono text-xs uppercase tracking-widest text-neutral-300 border border-neutral-700 bg-neutral-900 hover:border-blue-500 hover:text-blue-300 transition-colors px-3 py-1.5 rounded"
        >
          OPEN ↗
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
        {/* Description + iframe code */}
        <div className="p-5">
          <p className="text-sm text-neutral-300 leading-relaxed">{widget.description}</p>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs uppercase tracking-widest text-neutral-400 font-bold">HTML</span>
              <button
                onClick={copyToClipboard}
                className="font-mono text-xs uppercase tracking-widest text-neutral-300 border border-neutral-700 bg-neutral-900 hover:border-blue-500 hover:text-blue-300 transition-colors px-2 py-1 rounded"
              >
                {copied ? "✓ COPIED" : "COPY"}
              </button>
            </div>
            <pre className="font-mono text-xs text-neutral-200 bg-neutral-950 border border-neutral-800 rounded p-3 overflow-x-auto whitespace-pre">{iframeCode}</pre>
          </div>

          <div className="mt-4 flex items-center gap-2 font-mono text-xs">
            <span className="text-neutral-400">URL:</span>
            <code className="text-blue-300 break-all">{embedUrl}</code>
          </div>
        </div>

        {/* Live preview */}
        <div className="p-5 bg-neutral-950">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 font-bold mb-2">PREVIEW</p>
          <iframe
            src={`/embed/${widget.slug}`}
            width="100%"
            height={widget.recommendedHeight}
            style={{ border: "1px solid #262626", borderRadius: 8 }}
            title={`${widget.name} preview`}
          />
        </div>
      </div>
    </section>
  );
}