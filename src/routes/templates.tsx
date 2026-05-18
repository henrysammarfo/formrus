import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardList } from "lucide-react";
import { getFormTemplates } from "@/lib/form-templates";

export const Route = createFileRoute("/templates")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Templates - FORMRUS" },
      {
        name: "description",
        content:
          "Start a Walrus-native form from templates for applications, bug reports, feature requests, surveys, and session submissions.",
      },
      { property: "og:title", content: "FORMRUS Templates" },
      {
        property: "og:description",
        content: "Choose a ready form workflow and publish it to Walrus.",
      },
    ],
  }),
  component: Templates,
});

const templates = getFormTemplates();

function Templates() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Form templates
          </p>
          <h1
            className="mt-2 text-3xl font-semibold text-foreground"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Start from a complete workflow
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Pick a production-ready structure, then customize fields, roles, branding, deadlines,
            and storage settings in the builder.
          </p>
        </div>
        <Link
          to="/builder"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          Blank form <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <article
            key={template.id}
            className="flex min-h-[250px] flex-col rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
                <ClipboardList size={21} />
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                {template.category}
              </span>
            </div>
            <h2
              className="text-xl font-semibold text-foreground"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {template.name}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
              {template.summary}
            </p>
            <div className="mt-5 grid gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary" />
                {template.fields.filter((field) => field.type !== "section").length} response fields
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary" />
                Roles and Walrus storage ready
              </span>
            </div>
            <Link
              to="/builder"
              search={{ template: template.id }}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
            >
              Use template <ArrowRight size={15} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
