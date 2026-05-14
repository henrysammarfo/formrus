import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Lock, Infinity as InfinityIcon, BarChart3 } from "lucide-react";
import { MarqueeLogos } from "@/components/MarqueeLogos";
import { AnimatedGradientCTA } from "@/components/AnimatedGradientCTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FORMRUS — Forms that live on Walrus, forever" },
      { name: "description", content: "Build beautiful forms, collect responses, store everything on Walrus decentralized storage. No servers. No databases. Just blobs." },
      { property: "og:title", content: "FORMRUS — Forms that live on Walrus" },
      { property: "og:description", content: "Decentralized form builder powered by Walrus Protocol." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="px-5 pt-10">
        <div className="relative mx-auto flex h-[600px] w-full max-w-[1400px] flex-col overflow-hidden rounded-[48px] border border-slate-200/50 bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)]">
          <div className="absolute inset-0 z-0 select-none overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-sky-100 pointer-events-none" />
          <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{
            background: 'radial-gradient(circle at 20% 30%, #0EA5E9 0%, transparent 40%), radial-gradient(circle at 80% 70%, #67e8f9 0%, transparent 45%)'
          }} />

          <div className="relative z-20 flex flex-1 flex-col items-start px-8 pt-12 md:px-16 md:pt-20">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Powered by Walrus Protocol
            </div>
            <h1
              className="max-w-3xl text-[42px] font-medium leading-[1.05] tracking-tight text-foreground md:text-[64px]"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Forms that live on<br />Walrus. <span className="text-primary">Forever.</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm text-muted-foreground md:text-base">
              Build beautiful forms, collect responses, store everything on Walrus decentralized storage. No servers. No databases. Just blobs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/builder" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5">
                Start Building <ChevronRight size={16} />
              </Link>
              <Link to="/my-forms" className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-all hover:bg-white">
                View Demo Form
              </Link>
            </div>
          </div>

          {/* Floating navbar */}
          <div className="absolute bottom-10 left-1/2 z-30 -translate-x-1/2">
            <nav className="flex items-center gap-1 rounded-full border border-slate-200/40 bg-white/90 px-1.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-sm shadow-sm">✦</div>
              <Link to="/builder" className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">Builder</Link>
              <Link to="/docs" className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">Docs</Link>
              <Link to="/my-forms" className="ml-1 inline-flex items-center gap-1 rounded-full border border-slate-200/60 bg-white px-5 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:border-slate-300">
                My Forms <ChevronRight size={12} />
              </Link>
            </nav>
          </div>
        </div>
      </section>

      <MarqueeLogos />

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: <Lock size={22} />, title: 'Private with Seal', desc: 'Encrypt sensitive responses end-to-end. Only you hold the keys.' },
            { icon: <InfinityIcon size={22} />, title: 'Stored on Walrus', desc: 'Decentralized, permanent blob storage. No servers to maintain.' },
            { icon: <BarChart3 size={22} />, title: 'Smart Dashboard', desc: 'Filter, export, and analyze responses with a built-in admin panel.' },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <AnimatedGradientCTA />
    </div>
  );
}
