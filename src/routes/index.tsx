import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Lock } from "lucide-react";
import { MarqueeLogos } from "@/components/MarqueeLogos";
import { AnimatedGradientCTA } from "@/components/AnimatedGradientCTA";
import walrusHero from "@/assets/walrus/walrus-hero.jpg";
import walrusSessionIllustration from "@/assets/walrus/walrus-session-illustration.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FORMRUS - Forms that live on Walrus, forever" },
      {
        name: "description",
        content:
          "Build beautiful forms, collect responses, store everything on Walrus decentralized storage. No servers. No databases. Just blobs.",
      },
      { property: "og:title", content: "FORMRUS - Forms that live on Walrus" },
      {
        property: "og:description",
        content: "Decentralized form builder powered by Walrus Protocol.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const features = [
    {
      kind: "builder",
      title: "Custom builder",
      desc: "Rich text, dropdowns, checkboxes, ratings, URLs, screenshots, videos, and required fields.",
    },
    {
      kind: "share",
      title: "Shareable forms",
      desc: "Every published form gets a clean public link backed by its form blob ID.",
    },
    {
      kind: "blob",
      title: "Walrus blobs",
      desc: "Schemas, responses, media uploads, and imported response IDs follow the Walrus storage path.",
    },
    {
      kind: "triage",
      title: "Admin triage",
      desc: "Search, sort, star, mark reviewed, bulk export, and CSV output for teams.",
    },
  ];

  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="px-5 pt-10">
        <div className="relative mx-auto flex min-h-[640px] w-full max-w-[1400px] flex-col overflow-hidden rounded-[48px] border border-slate-200/50 bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)]">
          <div className="absolute inset-0 z-0 select-none overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-sky-100 pointer-events-none" />
          <div
            className="absolute inset-0 z-0 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 20% 30%, #0EA5E9 0%, transparent 40%), radial-gradient(circle at 80% 70%, #67e8f9 0%, transparent 45%)",
            }}
          />

          <div className="relative z-20 grid flex-1 gap-8 px-8 pb-28 pt-12 md:px-16 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/80 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Powered by Walrus Protocol
              </div>
              <h1
                className="max-w-3xl text-[42px] font-medium leading-[1.05] tracking-tight text-foreground md:text-[64px]"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Forms that live on
                <br />
                Walrus. <span className="text-primary">Forever.</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm text-muted-foreground md:text-base">
                Build beautiful forms, collect responses, store everything on Walrus decentralized
                storage. No servers. No databases. Just blobs.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/builder"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
                >
                  Start Building <ChevronRight size={16} />
                </Link>
                <Link
                  to="/my-forms"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-all hover:bg-white"
                >
                  View Demo Form
                </Link>
              </div>
            </div>
            <div className="relative hidden min-h-[360px] lg:block">
              <div className="absolute inset-x-0 top-0 overflow-hidden rounded-[36px] border border-white/70 bg-[#090b14] shadow-[0_32px_80px_rgba(14,165,233,0.22)]">
                <img
                  src={walrusHero}
                  alt="Walrus ecosystem visual"
                  className="h-[290px] w-full object-cover"
                />
                <div className="border-t border-white/10 bg-[#090b14] p-5 text-white">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Mainnet-ready flow
                  </div>
                  <div
                    className="mt-2 text-xl font-semibold"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Normal forms, Walrus storage underneath.
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Inspired by the Walrus AMA direction: hide wallet and fee complexity for
                    respondents while keeping storage status visible for builders.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating navbar */}
          <div className="absolute bottom-10 left-1/2 z-30 -translate-x-1/2">
            <nav className="flex items-center gap-1 rounded-full border border-slate-200/40 bg-white/90 px-1.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-sm shadow-sm">
                *
              </div>
              <Link
                to="/builder"
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Builder
              </Link>
              <Link
                to="/docs"
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Docs
              </Link>
              <Link
                to="/my-forms"
                className="ml-1 inline-flex items-center gap-1 rounded-full border border-slate-200/60 bg-white px-5 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:border-slate-300"
              >
                My Forms <ChevronRight size={12} />
              </Link>
            </nav>
          </div>
        </div>
      </section>

      <MarqueeLogos />

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Product workflow
            </p>
            <h2
              className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-foreground md:text-4xl"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              A feedback loop built around blobs, links, and review.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            FORMRUS is focused on the judging path: create a real form, collect a real response,
            prove the blob, and show useful admin review.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            >
              <FeatureMark kind={f.kind} />
              <h3
                className="mb-2 text-base font-semibold text-foreground"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A0F1E] text-white">
                <Lock size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Seal-ready private mode</div>
                <div className="text-sm text-muted-foreground">
                  Sensitive forms keep a clear privacy flag for the encryption path while still
                  using Walrus blob storage.
                </div>
              </div>
            </div>
            <Link
              to="/builder"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              Try builder
            </Link>
          </div>
        </div>

        <div className="mt-4 grid overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:grid-cols-[260px_1fr]">
          <img
            src={walrusSessionIllustration}
            alt="Walrus Session form workflow illustration"
            className="h-full min-h-[210px] w-full object-cover"
          />
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Submission-ready template
            </p>
            <h3
              className="mt-3 text-2xl font-semibold text-foreground"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Build the official Walrus Session form in one click.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              The builder includes a template based on the Airtable registration fields: project
              details, session selection, links, visuals, demo video, Walrus feedback, SUI address,
              GitHub, and rule confirmation.
            </p>
            <Link
              to="/builder"
              className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Open template
            </Link>
          </div>
        </div>
      </section>

      <AnimatedGradientCTA />
    </div>
  );
}

function FeatureMark({ kind }: { kind: string }) {
  return (
    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(14,165,233,0.14)]">
      {kind === "builder" && (
        <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
          <rect x="8" y="9" width="32" height="30" rx="8" fill="#EAF8FF" />
          <path
            d="M16 18h16M16 25h10M16 32h14"
            stroke="#0A0F1E"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="34" cy="17" r="5" fill="#0EA5E9" />
        </svg>
      )}
      {kind === "share" && (
        <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
          <rect x="7" y="7" width="34" height="34" rx="12" fill="#0A0F1E" />
          <path
            d="M17 25c5-8 12-8 18-2"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M31 17h7v7"
            stroke="#0EA5E9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="16" cy="30" r="4" fill="#0EA5E9" />
        </svg>
      )}
      {kind === "blob" && (
        <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
          <path d="M24 6c9 0 17 7 17 16 0 12-8 20-17 20S7 34 7 22C7 13 15 6 24 6Z" fill="#0EA5E9" />
          <path
            d="M15 25c4-8 14-10 21-2"
            stroke="#fff"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M17 31h14" stroke="#0A0F1E" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      )}
      {kind === "triage" && (
        <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
          <rect
            x="8"
            y="10"
            width="32"
            height="28"
            rx="8"
            fill="#F8FAFC"
            stroke="#0A0F1E"
            strokeWidth="3"
          />
          <path d="M16 19h16M16 27h8" stroke="#0A0F1E" strokeWidth="3" strokeLinecap="round" />
          <path
            d="m29 30 3 3 6-8"
            stroke="#0EA5E9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
    </div>
  );
}
