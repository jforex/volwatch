import Link from "next/link";
import Image from "next/image";

export default function Landing() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="VolWatch" width={44} height={44} className="object-contain" />
          <span className="font-mono text-xl font-bold tracking-tight">VolWatch</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/jforex/volwatch" target="_blank" rel="noreferrer" className="hidden sm:inline text-base font-medium text-neutral-600 hover:text-neutral-900 transition-colors">GitHub</a>
          <Link href="/app" className="rounded-md bg-indigo-600 px-5 py-2.5 text-base font-bold text-white hover:bg-indigo-500 transition-colors shadow-sm">Open Terminal</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pt-24">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm">

            </div>
            <h1 className="mt-8 text-6xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
              The real-time <span className="text-indigo-600">vol terminal</span> for on-chain options.
            </h1>
            <p className="mt-8 text-xl leading-relaxed text-neutral-600">
              VolWatch decodes DeepBook Predict&apos;s SVI surface tick-by-tick. Live smile curves, on-chain PLP vault risk, arbitrage detection, and trader-readable explanations — all from real Sui events.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/app" className="rounded-md bg-indigo-600 px-8 py-4 text-lg font-bold text-white hover:bg-indigo-500 transition-colors shadow-sm">Open Terminal</Link>
              <a href="https://github.com/jforex/volwatch" target="_blank" rel="noreferrer" className="rounded-md border-2 border-neutral-200 bg-white px-8 py-4 text-lg font-bold text-neutral-900 hover:bg-neutral-50 transition-colors">View on GitHub</a>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-8 border-t border-neutral-200 pt-10">
              <Stat label="Live oracles" value="up to 19" />
              <Stat label="Refresh rate" value="3s ticks" />
              <Stat label="Modules" value="3 + arb" />
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 bg-indigo-200/40 blur-3xl rounded-full" />
            <Image src="/logo.png" alt="VolWatch logo" width={520} height={520} priority className="relative object-contain" />
          </div>
        </div>
      </section>

      <section className="bg-neutral-50 border-y border-neutral-200">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Built for traders. Powered by <span className="text-indigo-600">on-chain truth.</span>
          </h2>
          <p className="mt-6 max-w-3xl text-xl text-neutral-600">
            Every number in VolWatch is read directly from Sui testnet. No mock data. No interpolation. The protocol speaks; the terminal listens.
          </p>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Feature title="Vol Smile Viewer" description="Decodes Predict's SVI parameters (a, b, m, rho, sigma) directly from on-chain events and renders the live implied vol smile per expiry. Click any oracle to focus." />
            <Feature title="PLP Risk Dashboard" description="Reads vault balance, PLP supply, total max payout, and utilization directly from the Predict object on-chain. LP NAV per share, computed in real-time." />
            <Feature title="Arbitrage Detection" description="Runs Gatheral's butterfly arb-free condition on every smile and checks calendar monotonicity across expiries. Flags violations the protocol itself doesn't surface." />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Feature title="Term Structure View" description="Live oracle list sorted by expiry, each showing ATM IV. See contango, backwardation, and skew shifts instantly across all active expiries." />
            <Feature title="Surface Explainer" description="Plain-English observations of what a trader should notice right now: crash skew, term structure shape, vault stress, arb violations. Updates live." />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-12 sm:p-20 text-center shadow-xl">
          <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Live data. Real protocol. Open it now.</h2>
          <p className="mt-6 text-xl text-indigo-100">No login. No wallet. The terminal is reading Sui testnet right now.</p>
          <Link href="/app" className="mt-10 inline-block rounded-md bg-white px-10 py-5 text-lg font-bold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-md">Open VolWatch Terminal</Link>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="VolWatch" width={28} height={28} className="object-contain" />
            <span className="font-mono text-base font-bold">VolWatch</span>
            <span className="text-sm text-neutral-500">· built for Sui Overflow 2026</span>
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
      <p className="text-sm uppercase tracking-wider text-neutral-500 font-semibold">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-8 transition-all hover:border-indigo-300 hover:shadow-md">
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-4 text-base leading-relaxed text-neutral-600">{description}</p>
    </div>
  );
}
