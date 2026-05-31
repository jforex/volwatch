import Link from "next/link";
import Image from "next/image";

export default function Landing() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Image src="/logo.png" alt="VolWatch" width={36} height={36} className="object-contain sm:h-11 sm:w-11" />
          <span className="font-mono text-lg sm:text-xl font-bold tracking-tight">VolWatch</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <a href="https://github.com/jforex/volwatch" target="_blank" rel="noreferrer" className="hidden sm:inline text-base font-medium text-neutral-600 hover:text-neutral-900 transition-colors">GitHub</a>
          <Link href="/app" className="rounded-md bg-indigo-600 px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold text-white hover:bg-indigo-500 transition-colors shadow-sm">Open Terminal</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16 sm:pb-24 pt-8 sm:pt-16 lg:pt-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="font-mono uppercase tracking-widest text-indigo-700 font-semibold">Sui Overflow 2026 · DeepBook Predict</span>
            </div>
            <h1 className="mt-6 sm:mt-8 text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
              The real-time <span className="text-indigo-600">vol terminal</span> for on-chain options.
            </h1>
            <p className="mt-6 sm:mt-8 text-base sm:text-xl leading-relaxed text-neutral-600">
              VolWatch decodes DeepBook Predict&apos;s SVI surface tick-by-tick. Live smile curves, on-chain PLP vault risk, arbitrage detection, and trader-readable explanations, all from real Sui events.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-wrap gap-3 sm:gap-4">
              <Link href="/app" className="rounded-md bg-indigo-600 px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-bold text-white hover:bg-indigo-500 transition-colors shadow-sm">Open Terminal</Link>
              <a href="https://github.com/jforex/volwatch" target="_blank" rel="noreferrer" className="rounded-md border-2 border-neutral-200 bg-white px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-bold text-neutral-900 hover:bg-neutral-50 transition-colors">View on GitHub</a>
            </div>
            <div className="mt-10 sm:mt-12 grid grid-cols-3 gap-4 sm:gap-8 border-t border-neutral-200 pt-8 sm:pt-10">
              <Stat label="Live oracles" value="up to 19" />
              <Stat label="Refresh rate" value="3s ticks" />
              <Stat label="Modules" value="3 + arb" />
            </div>
          </div>
          <div className="relative flex items-center justify-center order-first lg:order-last">
            <div className="absolute inset-0 bg-indigo-200/40 blur-3xl rounded-full" />
            <Image src="/logo.png" alt="VolWatch logo" width={520} height={520} priority className="relative object-contain w-64 sm:w-96 lg:w-[520px] h-auto" />
          </div>
        </div>
      </section>

      <section className="bg-neutral-50 border-y border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Built for traders. Powered by <span className="text-indigo-600">on-chain truth.</span>
          </h2>
          <p className="mt-4 sm:mt-6 max-w-3xl text-base sm:text-xl text-neutral-600">
            Every number in VolWatch is read directly from Sui testnet. No mock data. No interpolation. The protocol speaks; the terminal listens.
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-8 sm:p-12 lg:p-20 text-center shadow-2xl">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
          <div
            className="absolute top-0 right-0 h-full w-1/2 opacity-10 hidden sm:block"
            style={{
              backgroundImage: "linear-gradient(135deg, transparent 40%, white 40%, white 41%, transparent 41%, transparent 50%, white 50%, white 50.5%, transparent 50.5%, transparent 60%, white 60%, white 60.3%, transparent 60.3%)",
            }}
          />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur px-4 py-1.5 text-xs sm:text-sm mb-6">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono uppercase tracking-widest text-white font-semibold">Live on testnet now</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Live data. Real protocol. <span className="block sm:inline">Open it now.</span>
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-xl text-indigo-100">No login. No wallet. The terminal is reading Sui testnet right now.</p>
            <Link
              href="/app"
              className="mt-8 sm:mt-10 inline-block rounded-md bg-white px-8 py-4 sm:px-10 sm:py-5 text-base sm:text-lg font-bold text-indigo-700 hover:bg-indigo-50 shadow-xl hover:shadow-2xl transition-all"
            >
              Open VolWatch Terminal →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white py-8 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="VolWatch" width={28} height={28} className="object-contain" />
            <span className="font-mono text-sm sm:text-base font-bold">VolWatch</span>
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
    <div className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 transition-all hover:border-indigo-300 hover:shadow-md">
      <h3 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed text-neutral-600">{description}</p>
    </div>
  );
}