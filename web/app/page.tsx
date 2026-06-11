"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
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

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16 sm:pb-24 pt-8 sm:pt-16 lg:pt-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">
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

      <section className="bg-neutral-50 border-y border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Built for traders. Powered by <span className="text-blue-600">on-chain truth.</span>
          </h2>
          <p className="mt-4 sm:mt-6 max-w-3xl text-base sm:text-xl text-neutral-600">
            Every number in VWATCH is read directly from Sui testnet. No mock data. No interpolation. The protocol speaks; the terminal listens.
          </p>
          <div className="mt-10 sm:mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            <Feature title="Vol Smile Viewer" description="Decodes Predict's SVI parameters (a, b, m, rho, sigma) directly from on-chain events and renders the live implied vol smile per expiry. Click any oracle to focus." />
            <Feature title="PLP Risk Dashboard" description="Reads vault balance, PLP supply, total max payout, and utilization directly from the Predict object on-chain. LP NAV per share, computed in real-time." />
            <Feature title="Arbitrage Detection" description="Runs Gatheral's butterfly arb-free condition on every smile and checks calendar monotonicity across expiries. Flags violations the protocol itself doesn't surface." />
          </div>
          <div className="mt-5 sm:mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Feature title="Term Structure View" description="Live oracle list sorted by expiry, each showing ATM IV. See contango, backwardation, and skew shifts instantly across all active expiries." />
            <Feature title="Surface Explainer" description="Plain-English observations of what a trader should notice right now: crash skew, term structure shape, vault stress, arb violations. Updates live." />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-8 sm:p-12 lg:p-20 text-center shadow-2xl">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur px-4 py-1.5 text-xs sm:text-sm mb-6">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono uppercase tracking-widest text-white font-semibold">Live on testnet now</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Live data. Real protocol. <span className="block sm:inline">Open it now.</span>
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-xl text-blue-100">No login. No wallet. The terminal is reading Sui testnet right now.</p>
            <Link
              href="/app"
              className="mt-8 sm:mt-10 inline-block rounded-md bg-white px-8 py-4 sm:px-10 sm:py-5 text-base sm:text-lg font-bold text-blue-700 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all"
            >
              Open VWATCH Terminal →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white py-8 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="VWATCH" width={28} height={28} className="object-contain rounded" />
            <span className="font-[family-name:var(--font-space-grotesk)] text-sm sm:text-base font-bold">VWATCH</span>
            <span className="text-xs sm:text-sm text-neutral-500">· built for Sui Overflow 2026</span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-neutral-600">
            <a href="https://github.com/jforex/volwatch" target="_blank" rel="noreferrer" className="hover:text-neutral-900">GitHub</a>
            <a href="https://docs.sui.io/onchain-finance/deepbook-predict/" target="_blank" rel="noreferrer" className="hover:text-neutral-900">Predict docs</a>
          </div>
        </div>
      </footer>
    </main>
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
    <div className="relative flex items-center justify-center lg:justify-end order-first lg:order-last lg:pr-8">
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

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 transition-all hover:border-blue-300 hover:shadow-md">
      <h3 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed text-neutral-600">{description}</p>
    </div>
  );
}