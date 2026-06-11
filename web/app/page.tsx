"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <main
      className="min-h-screen bg-white text-neutral-900 relative"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Image src="/logo.png" alt="VWATCH" width={36} height={36} className="object-contain sm:h-11 sm:w-11 rounded" />
          <span className="font-[family-name:var(--font-space-grotesk)] text-lg sm:text-xl font-bold tracking-tight">VWATCH</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <a href="https://github.com/jforex/volwatch" target="_blank" rel="noreferrer" className="hidden sm:inline text-base font-medium text-neutral-600 hover:text-neutral-900 transition-colors">GitHub</a>
          <Link href="/app" className="rounded-md bg-blue-600 px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold text-white hover:bg-blue-500 transition-colors shadow-sm">Open Terminal</Link>
        </div>
      </nav>

      <section className="w-full px-6 sm:px-10 lg:px-16 pb-16 sm:pb-24 pt-8 sm:pt-16 lg:pt-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-8 lg:items-center max-w-[1400px] mx-auto">
          <div>
            <h1 className="mt-6 sm:mt-8 text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
              <TypingHeadline />
            </h1>
            <p className="mt-6 sm:mt-8 text-base sm:text-xl leading-relaxed text-neutral-600">
              VWATCH is the real-time volatility terminal for DeepBook Predict. Live smile curves, on-chain PLP vault risk, arbitrage detection, and AI-readable explanations — decoded from real Sui events.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-wrap gap-3 sm:gap-4">
              <Link href="/app" className="rounded-md bg-blue-600 px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-bold text-white hover:bg-blue-500 transition-colors shadow-sm">Open Terminal</Link>
              <a href="https://github.com/jforex/volwatch" target="_blank" rel="noreferrer" className="rounded-md border-2 border-neutral-200 bg-white px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-bold text-neutral-900 hover:bg-neutral-50 transition-colors">View on GitHub</a>
            </div>
            <div className="mt-10 sm:mt-12 grid grid-cols-3 gap-4 sm:gap-8 border-t border-neutral-200 pt-8 sm:pt-10">
              <Stat label="Live oracles" value="up to 19" />
              <Stat label="Refresh rate" value="3s ticks" />
              <Stat label="Modules" value="3 + arb" />
            </div>
          </div>
          <EagleHero />
        </div>
      </section>

      <LivePreview />
      <HowItWorks />
      <BuiltForSection />

      <section className="bg-neutral-50 border-y border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
          >
            Built for traders. Powered by <span className="text-blue-600">on-chain truth.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="mt-4 sm:mt-6 max-w-3xl text-base sm:text-xl text-neutral-600"
          >
            Every number in VWATCH is read directly from Sui testnet. No mock data. No interpolation. The protocol speaks; the terminal listens.
          </motion.p>
          <div className="mt-10 sm:mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            <Feature index={0} title="Vol Smile Viewer" description="Decodes Predict's SVI parameters (a, b, m, rho, sigma) directly from on-chain events and renders the live implied vol smile per expiry. Click any oracle to focus." />
            <Feature index={1} title="PLP Risk Dashboard" description="Reads vault balance, PLP supply, total max payout, and utilization directly from the Predict object on-chain. LP NAV per share, computed in real-time." />
            <Feature index={2} title="Arbitrage Detection" description="Runs Gatheral's butterfly arb-free condition on every smile and checks calendar monotonicity across expiries. Flags violations the protocol itself doesn't surface." />
          </div>
          <div className="mt-5 sm:mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Feature index={3} title="Term Structure View" description="Live oracle list sorted by expiry, each showing ATM IV. See contango, backwardation, and skew shifts instantly across all active expiries." />
            <Feature index={4} title="Surface Explainer" description="Plain-English observations of what a trader should notice right now: crash skew, term structure shape, vault stress, arb violations. Updates live." />
          </div>
        </div>
      </section>

      <StatsBand />

      <section className="w-full bg-neutral-950 text-white py-24 sm:py-32 lg:py-40">
        <div className="w-full px-6 sm:px-10 lg:px-16">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex items-center gap-3 mb-8 sm:mb-12">
              <span className="h-px w-12 bg-blue-500" />
              <span className="font-mono text-xs sm:text-sm uppercase tracking-[0.3em] text-blue-400">/ THE TERMINAL</span>
            </div>

            <h2 className="font-[family-name:var(--font-space-grotesk)] text-6xl sm:text-8xl lg:text-[12rem] xl:text-[14rem] font-black tracking-tighter leading-[0.85]">
              VOL-WATCH.
            </h2>
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-6xl sm:text-8xl lg:text-[12rem] xl:text-[14rem] font-black tracking-tighter leading-[0.85] text-blue-500 mt-2 sm:mt-4">
              DECODED.
            </h2>

            <div className="mt-12 sm:mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
              <div className="lg:col-span-7">
                <p className="text-xl sm:text-2xl lg:text-3xl text-neutral-300 leading-snug max-w-2xl">
                  No mock prices. No login walls. No marketing fluff. <span className="text-white">Just the protocol — readable.</span>
                </p>
              </div>
              <div className="lg:col-span-5 flex flex-col sm:flex-row lg:justify-end gap-4">
                <Link
                  href="/app"
                  className="group inline-flex items-center justify-between gap-4 rounded-none border-2 border-white bg-white px-6 py-4 sm:px-8 sm:py-5 text-base sm:text-lg font-bold text-neutral-950 hover:bg-blue-500 hover:border-blue-500 hover:text-white transition-all"
                >
                  <span>Open Terminal</span>
                  <span className="font-mono text-xl group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>

            <div className="mt-16 sm:mt-20 pt-8 border-t border-neutral-800 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Network</p>
                <p className="mt-1 font-mono text-sm sm:text-base text-white">Sui Testnet</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Protocol</p>
                <p className="mt-1 font-mono text-sm sm:text-base text-white">DeepBook Predict</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Asset</p>
                <p className="mt-1 font-mono text-sm sm:text-base text-white">BTC-USD</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Status</p>
                <p className="mt-1 font-mono text-sm sm:text-base text-emerald-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-neutral-950 text-neutral-300">
        <div className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-20">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
              <div className="md:col-span-5">
                <div className="flex items-center gap-3">
                  <Image src="/logo.png" alt="VWATCH" width={40} height={40} className="object-contain rounded" />
                  <span className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tracking-tight text-white">VWATCH</span>
                </div>
                <p className="mt-4 text-base text-neutral-400 leading-relaxed max-w-sm">
                  Real-time volatility terminal for DeepBook Predict. Sees from far. Sharper than the rest.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-widest text-emerald-300 font-semibold">Live on Sui testnet</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-widest text-white mb-4">Product</p>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/app" className="text-neutral-400 hover:text-white transition-colors">Open Terminal</Link></li>
                  <li><a href="https://github.com/jforex/volwatch" target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white transition-colors">Source code</a></li>
                  <li><a href="https://github.com/jforex/volwatch#readme" target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white transition-colors">Documentation</a></li>
                </ul>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-widest text-white mb-4">Ecosystem</p>
                <ul className="space-y-3 text-sm">
                  <li><a href="https://sui.io" target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white transition-colors">Sui</a></li>
                  <li><a href="https://docs.sui.io/onchain-finance/deepbook-predict/" target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white transition-colors">DeepBook Predict</a></li>
                  <li><a href="https://sui.io/overflow" target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-white transition-colors">Sui Overflow 2026</a></li>
                </ul>
              </div>

              <div className="md:col-span-3">
                <p className="text-xs font-bold uppercase tracking-widest text-white mb-4">Built on</p>
                <div className="flex flex-col gap-3">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="font-semibold text-white">Sui Network</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="font-semibold text-white">DeepBook Predict</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 sm:mt-16 pt-8 border-t border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-neutral-500">
                <span>© 2026 VWATCH</span>
                <span className="hidden sm:inline">·</span>
                <span>No data stored. No login. No mock prices.</span>
              </div>
              <div className="text-xs font-mono text-neutral-500">
                v0.2.0 · built for Sui Overflow 2026
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function LivePreview() {
  return (
    <section className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-4">The Terminal</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Built for speed. <span className="text-blue-600">Designed for clarity.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 bg-neutral-50">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <span className="ml-3 font-mono text-xs text-neutral-500">vwatch.app/app</span>
            <span className="ml-auto flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              {[
                { label: "ATM IV", value: "68.4%", tone: "amber" },
                { label: "Skew", value: "−12.3", tone: "red" },
                { label: "Term", value: "Contango", tone: "emerald" },
                { label: "Vault", value: "Healthy", tone: "emerald" },
                { label: "Arb", value: "Clean", tone: "emerald" },
              ].map((v, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{v.label}</p>
                  <p className={`mt-1 font-mono text-sm sm:text-base font-bold ${
                    v.tone === "amber" ? "text-amber-600" :
                    v.tone === "red" ? "text-red-600" :
                    "text-emerald-600"
                  }`}>{v.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-lg border border-neutral-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">BTC Spot</span>
                  <span className="font-mono text-lg font-bold">$108,450</span>
                </div>
                <svg viewBox="0 0 400 80" className="w-full h-16">
                  <polyline
                    points="0,60 30,55 60,58 90,40 120,45 150,30 180,35 210,25 240,28 270,15 300,20 330,12 360,18 400,10"
                    fill="none"
                    stroke="rgb(37, 99, 235)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Vol Smile</span>
                <svg viewBox="0 0 200 80" className="w-full h-16 mt-3">
                  <path
                    d="M 10 30 Q 50 55, 100 50 Q 150 45, 190 25"
                    fill="none"
                    stroke="rgb(37, 99, 235)"
                    strokeWidth="2"
                  />
                  <circle cx="100" cy="50" r="3" fill="rgb(37, 99, 235)" />
                </svg>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-neutral-200 overflow-hidden">
              <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Live event tape</span>
              </div>
              <div className="divide-y divide-neutral-100 font-mono text-xs">
                {[
                  { kind: "prices", id: "0x7681…3c43", detail: "spot $108,450" },
                  { kind: "svi", id: "0x4a92…b8e1", detail: "a=24343" },
                  { kind: "prices", id: "0x9f12…ac7d", detail: "spot $108,442" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2">
                    <span className={`w-14 rounded border px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider ${
                      e.kind === "prices" ? "bg-sky-50 text-sky-700 border-sky-200" :
                      "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>{e.kind}</span>
                    <span className="text-neutral-500">{e.id}</span>
                    <span className="ml-auto font-semibold text-neutral-900">{e.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-center mt-8"
        >
          <Link href="/app" className="inline-flex items-center gap-2 text-base font-bold text-blue-600 hover:text-blue-700 transition-colors">
            Open the live terminal →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: "01", title: "Read Sui events", desc: "Backend subscribes to DeepBook Predict's event stream on Sui testnet. Every prices, svi, activation, and settlement event is captured at source." },
    { num: "02", title: "Parse SVI parameters", desc: "Raw on-chain SVI calibration data (a, b, m, rho, sigma) is decoded, normalized, and converted into implied vol curves per oracle, per expiry." },
    { num: "03", title: "Render the surface", desc: "The terminal renders smile curves, vault risk metrics, term structure, and arbitrage checks — all in plain English alongside the math." },
  ];
  return (
    <section className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 bg-white">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-12 sm:mb-16"
        >
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-4">How it works</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-3xl">
            From on-chain bytes to <span className="text-blue-600">readable vol.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <p className="font-[family-name:var(--font-space-grotesk)] text-6xl sm:text-7xl font-bold text-blue-600/20 leading-none">{step.num}</p>
              <h3 className="mt-4 text-2xl font-bold tracking-tight">{step.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-neutral-600">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BuiltForSection() {
  const personas = [
    {
      label: "For LPs",
      title: "Understand vault risk before you deposit.",
      desc: "See utilization, headroom, and exposure ceiling in real time. Know exactly how much risk PLP is taking before your USDC goes in.",
    },
    {
      label: "For Traders",
      title: "Spot anomalies. Find edge.",
      desc: "Live smile shapes, term-structure curves, and butterfly arb violations — flagged the moment they appear, decoded from raw protocol state.",
    },
    {
      label: "For Researchers",
      title: "Inspect live SVI calibration.",
      desc: "Watch the surface evolve on a real DEX. Every parameter, every event, every oracle — directly readable from on-chain events.",
    },
  ];
  return (
    <section className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-24 bg-neutral-50 border-y border-neutral-200">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-12 sm:mb-16"
        >
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-4">Who it's for</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            One terminal. <span className="text-blue-600">Three audiences.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {personas.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 hover:border-blue-300 hover:shadow-lg"
            >
              <span className="inline-block rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">{p.label}</span>
              <h3 className="mt-5 text-2xl font-bold tracking-tight">{p.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-neutral-700">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  const stats = [
    { num: "19", label: "Active oracles" },
    { num: "3s", label: "Tick rate" },
    { num: "0", label: "Mock data" },
    { num: "∞", label: "On-chain truth" },
  ];
  return (
    <section className="w-full px-6 sm:px-10 lg:px-16 py-16 sm:py-20 bg-white">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
              className="text-center"
            >
              <p className="font-[family-name:var(--font-space-grotesk)] text-5xl sm:text-6xl lg:text-7xl font-bold text-blue-600">{s.num}</p>
              <p className="mt-2 sm:mt-4 text-sm sm:text-base font-semibold uppercase tracking-wider text-neutral-600">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TypingHeadline() {
  const lines = [
    "See risk. Find edge.",
    "Deploy.",
  ];
  const blueLineIdx = 1;

  let globalIdx = 0;

  return (
    <span aria-label="See risk. Find edge. Deploy." className="block">
      {lines.map((line, lineIdx) => (
        <span key={lineIdx} className={`block ${lineIdx === blueLineIdx ? "text-blue-600" : ""}`}>
          {line.split("").map((char, charIdx) => {
            const i = globalIdx++;
            return (
              <motion.span
                key={`${lineIdx}-${charIdx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.05,
                  delay: i * 0.04,
                  ease: "easeOut",
                }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

function EagleHero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const targetTimeRef = useRef<number>(2.5);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      video.pause();
      const dur = video.duration || 5;
      video.currentTime = dur / 2;
      targetTimeRef.current = dur / 2;
    };
    video.addEventListener("loadedmetadata", onLoaded);

    function onMouseMove(e: MouseEvent) {
      if (!video || !video.duration) return;
      const x = e.clientX / window.innerWidth;
      const clamped = Math.max(0.05, Math.min(0.95, x));
      targetTimeRef.current = clamped * video.duration;
    }

    function onMouseLeave() {
      if (!video || !video.duration) return;
      targetTimeRef.current = video.duration / 2;
    }

    function tick() {
      if (video && video.duration) {
        const current = video.currentTime;
        const target = targetTimeRef.current;
        const next = current + (target - current) * 0.15;
        video.currentTime = next;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseleave", onMouseLeave);
      video.removeEventListener("loadedmetadata", onLoaded);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="relative flex items-center justify-center lg:justify-end order-first lg:order-last lg:pr-0">
      <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
      <video
        ref={videoRef}
        src="/hero/eagle.mp4"
        muted
        playsInline
        preload="auto"
        className="relative w-48 sm:w-64 lg:w-[400px] h-auto invert mix-blend-multiply"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs sm:text-sm uppercase tracking-wider text-neutral-500 font-semibold">{label}</p>
      <p className="mt-1 sm:mt-2 font-mono text-lg sm:text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function Feature({ title, description, index = 0 }: { title: string; description: string; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 hover:border-blue-300 hover:shadow-lg"
    >
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">{title}</h3>
      <p className="mt-3 sm:mt-4 text-base sm:text-lg leading-relaxed text-neutral-700">{description}</p>
    </motion.div>
  );
}