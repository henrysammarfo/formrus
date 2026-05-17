import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Database, FileText, Lock, Share2, Sparkles } from "lucide-react";
import walrusHero from "@/assets/walrus/walrus-hero.jpg";

export const Route = createFileRoute("/one-pager")({
  head: () => ({
    meta: [
      { title: "FORMRUS One-Pager" },
      {
        name: "description",
        content: "A one-page pitch for FORMRUS, a Walrus-native form and feedback platform.",
      },
    ],
  }),
  component: OnePager,
});

const highlights = [
  {
    icon: FileText,
    title: "Custom forms",
    copy: "Create bug reports, feature requests, surveys, applications, and event submission forms.",
  },
  {
    icon: Database,
    title: "Walrus-backed records",
    copy: "Publish schemas, responses, screenshots, videos, and files as verifiable decentralized blobs.",
  },
  {
    icon: Lock,
    title: "Private responses",
    copy: "Encrypt sensitive submissions client-side, with the Seal path ready for policy-gated admin access.",
  },
  {
    icon: Share2,
    title: "Share and review",
    copy: "Generate public form links, review responses, prioritize feedback, add notes, and export CSV.",
  },
];

function OnePager() {
  return (
    <div className="bg-white">
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles size={14} /> Walrus Sessions submission
          </p>
          <h1
            className="mt-6 text-[clamp(3rem,8vw,6.5rem)] font-semibold leading-[0.95] tracking-normal text-foreground"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            FORMRUS
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-9 text-muted-foreground">
            A Walrus-native form platform that lets teams collect structured community feedback,
            store every important record on decentralized storage, and turn raw submissions into
            reviewable action.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/builder"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20"
            >
              Build a form <ArrowRight size={16} />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground hover:border-primary"
            >
              Read docs
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-[28px] border border-border bg-white shadow-[0_28px_90px_rgba(15,23,42,0.14)]">
          <img src={walrusHero} alt="Walrus visual" className="h-72 w-full object-cover" />
          <div className="p-6">
            <div className="rounded-2xl border border-border bg-secondary/50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Workflow
              </div>
              <div className="mt-3 grid gap-2 text-sm text-foreground sm:grid-cols-3">
                <span className="rounded-xl bg-white px-3 py-2 font-semibold">Create</span>
                <span className="rounded-xl bg-white px-3 py-2 font-semibold">Collect</span>
                <span className="rounded-xl bg-white px-3 py-2 font-semibold">Review</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-border bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
                <item.icon size={20} />
              </div>
              <h2
                className="text-lg font-semibold text-foreground"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <div className="rounded-[28px] bg-slate-950 p-8 text-white md:p-10">
          <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Why it wins
              </p>
              <h2
                className="mt-3 text-3xl font-semibold"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Forms become portable, verifiable feedback objects.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Public form links backed by Walrus blob IDs.",
                "Response receipts that admins can import across browsers.",
                "Media-rich submissions for screenshots, videos, and files.",
                "Admin triage with review status, priority, notes, and CSV export.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-2xl bg-white/8 p-4 text-sm leading-6 text-slate-200"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-sky-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
