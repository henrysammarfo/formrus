import type { ReactNode } from "react";

type Logo = {
  name: string;
  detail: string;
  render: () => ReactNode;
};

const logos: Logo[] = [
  {
    name: "Walrus",
    detail: "Decentralized blob storage",
    render: () => (
      <svg viewBox="0 0 96 96" className="h-11 w-11" aria-hidden="true">
        <rect width="96" height="96" rx="24" fill="#0EA5E9" />
        <path d="M24 49c7-18 41-18 48 0 1 14-9 25-24 25S23 63 24 49Z" fill="#fff" />
        <path
          d="M33 48c3-6 9-10 15-10s12 4 15 10"
          stroke="#0A0F1E"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M36 56h24" stroke="#0A0F1E" strokeWidth="5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Sui",
    detail: "On-chain coordination",
    render: () => (
      <svg viewBox="0 0 96 96" className="h-11 w-11" aria-hidden="true">
        <rect width="96" height="96" rx="24" fill="#4DA2FF" />
        <path
          d="M48 18c12 16 25 29 25 45 0 14-11 24-25 24S23 77 23 63c0-16 13-29 25-45Z"
          fill="#fff"
        />
        <path
          d="M35 61c5 8 21 8 26 0"
          stroke="#4DA2FF"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ),
  },
  {
    name: "Seal",
    detail: "Private data path",
    render: () => (
      <svg viewBox="0 0 96 96" className="h-11 w-11" aria-hidden="true">
        <rect width="96" height="96" rx="24" fill="#0A0F1E" />
        <rect x="27" y="42" width="42" height="31" rx="9" fill="#fff" />
        <path
          d="M35 42V32c0-8 6-14 13-14s13 6 13 14v10"
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="48" cy="57" r="4" fill="#0EA5E9" />
      </svg>
    ),
  },
  {
    name: "Mysten Labs",
    detail: "Core ecosystem",
    render: () => (
      <svg viewBox="0 0 96 96" className="h-11 w-11" aria-hidden="true">
        <rect width="96" height="96" rx="24" fill="#111827" />
        <path d="M22 68V28h10l16 20 16-20h10v40H62V47L48 64 34 47v21H22Z" fill="#fff" />
      </svg>
    ),
  },
  {
    name: "Walrus Sites",
    detail: "Shareable app links",
    render: () => (
      <svg viewBox="0 0 96 96" className="h-11 w-11" aria-hidden="true">
        <rect width="96" height="96" rx="24" fill="#EAF8FF" />
        <path d="M25 32h46v32H25z" fill="#0EA5E9" />
        <path d="M33 72h30" stroke="#0A0F1E" strokeWidth="6" strokeLinecap="round" />
        <path d="M38 44h20M38 54h13" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "CSV Export",
    detail: "Team workflows",
    render: () => (
      <svg viewBox="0 0 96 96" className="h-11 w-11" aria-hidden="true">
        <rect width="96" height="96" rx="24" fill="#F8FAFC" />
        <path d="M30 18h27l13 13v47H30z" fill="#fff" stroke="#0A0F1E" strokeWidth="5" />
        <path d="M56 19v14h14" fill="none" stroke="#0A0F1E" strokeWidth="5" />
        <path d="M39 55h18M39 65h12" stroke="#0EA5E9" strokeWidth="5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function MarqueeLogos() {
  return (
    <section className="mx-auto mt-8 w-full max-w-[1400px] px-5">
      <div className="mb-4 flex items-center justify-center">
        <p className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Built for the Walrus feedback stack
        </p>
      </div>
      <div
        className="overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div className="marquee-track flex w-max gap-4 py-2">
          {[...logos, ...logos].map((logo, index) => (
            <div
              key={`${logo.name}-${index}`}
              className="group flex h-20 w-[232px] shrink-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="shrink-0">{logo.render()}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{logo.name}</div>
                <div className="truncate text-xs font-medium text-muted-foreground">
                  {logo.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
