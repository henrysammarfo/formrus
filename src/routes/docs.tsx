import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs - FORMRUS" },
      {
        name: "description",
        content:
          "FORMRUS product docs for creating, publishing, reviewing, and exporting Walrus-backed forms.",
      },
      { property: "og:title", content: "Docs - FORMRUS" },
    ],
  }),
  component: Docs,
});

const sections = [
  { id: "overview", label: "Overview" },
  { id: "builder", label: "Builder" },
  { id: "publishing", label: "Publishing" },
  { id: "responses", label: "Responses" },
  { id: "seal", label: "Seal" },
  { id: "admin", label: "Admin" },
  { id: "deployment", label: "Deployment" },
  { id: "submission", label: "Hackathon" },
];

const envRows = [
  [
    "WALRUS_PUBLISHER_URL",
    "Server-only Nami/Walrus publisher endpoint for schemas, responses, and uploaded media.",
  ],
  ["WALRUS_EPOCHS", "Server-side default storage duration for published blobs."],
  ["WALRUS_MAX_PUBLISH_BYTES", "Server-side hard cap for each Walrus publish request body."],
  [
    "WALRUS_RATE_LIMIT_MAX_WRITES",
    "Maximum writes allowed per client IP within the rate-limit window.",
  ],
  ["WALRUS_RATE_LIMIT_WINDOW_MS", "Rate-limit window used by the server-side publisher proxy."],
  [
    "WALRUS_ALLOWED_CONTENT_TYPES",
    "Server-side content type allowlist for sponsored Walrus writes.",
  ],
  ["VITE_WALRUS_AGGREGATOR_URL", "Walrus read endpoint for public blob retrieval."],
  ["VITE_WALRUS_EPOCHS", "Client-requested storage duration sent to the server publisher proxy."],
  ["VITE_MAX_FILE_MB", "Default non-video upload size limit."],
  ["VITE_MAX_VIDEO_MB", "Default video upload size limit."],
  ["VITE_MAX_FILES_PER_RESPONSE", "Default maximum uploaded files per response."],
  ["VITE_SUI_FULLNODE_URL", "Sui RPC endpoint used by the optional Seal path."],
  [
    "VITE_SEAL_PACKAGE_ID",
    "Seal policy/package namespace when private responses use official Seal.",
  ],
  ["VITE_SEAL_KEY_SERVERS", "Seal key server object IDs or JSON config."],
  [
    "VITE_SEAL_APPROVE_TARGET",
    "Move function called in the Seal approval PTB, for example 0xpackage::module::seal_approve.",
  ],
  [
    "VITE_SEAL_REGISTER_TARGET",
    "Move function used when a private form registers its per-form admin list.",
  ],
  [
    "VITE_SEAL_ADD_ADMIN_TARGET",
    "Move function used by the admin dashboard to add another Seal admin after publish.",
  ],
  [
    "VITE_SEAL_APPROVE_POLICY_OBJECT_ID",
    "Optional policy or allowlist object passed to the approval function.",
  ],
  [
    "VITE_SEAL_APPROVE_ARGUMENTS",
    "Approval function argument layout. Seal requires id first; FORMRUS uses id,policy.",
  ],
];

function Docs() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            FORMRUS Docs
          </div>
          <nav className="mt-4 space-y-1">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {section.label}
              </a>
            ))}
          </nav>
          <Link
            to="/builder"
            className="mt-4 block rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
          >
            Create form
          </Link>
        </div>
      </aside>

      <article className="min-w-0 space-y-6">
        <section id="overview" className="rounded-3xl border border-border bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Overview</p>
          <h1
            className="mt-2 text-4xl font-semibold text-foreground"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Build forms that feel simple, then store the important records on Walrus.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            FORMRUS is a form builder for feedback, bug reports, surveys, applications, and event
            submissions. Builders design the form, publish a shareable version, collect media-rich
            responses, review submissions, and export CSV/JSON/Excel without making respondents
            understand storage fees or blockchain objects.
          </p>
        </section>

        <DocSection id="builder" title="Builder">
          <DocList
            items={[
              "Set a form title and description.",
              "Add reviewer wallet addresses for your team or judging group.",
              "Choose whether respondents are public, optionally wallet-attributed, or wallet-required.",
              "Choose whether respondents can submit again after success.",
              "Choose whether unfinished responses resume on the same browser or connected wallet.",
              "Set a submission deadline so public forms automatically close after the cutoff.",
              "Set upload guardrails for file size, video size, and files per response.",
              "Toggle private responses when sensitive answers should be encrypted before storage.",
              "Upload a cover image, logo/icon, and success image or GIF.",
              "Choose whether the cover appears as a top banner, page background, or stays hidden.",
              "Choose a full-form response flow or a one-question-at-a-time flow.",
              "Choose a clean, confetti, or full-screen success moment after submission.",
              "Use templates for applications, bug reports, feature requests, community surveys, and session submissions.",
              "Drag fields to reorder them. The preview and final submission order follow the same sequence.",
            ]}
          />
        </DocSection>

        <DocSection id="publishing" title="Publishing And Versions">
          <p className="text-sm leading-7 text-muted-foreground">
            Drafts stay local until you publish. Publishing writes an immutable form schema blob and
            gives you a shareable `/form/[blobId]` link. If you edit later and publish again,
            FORMRUS creates a new version instead of mutating the existing public form. My Forms
            groups those versions together and lets you edit the latest version into a new draft
            while keeping older public links valid.
          </p>
        </DocSection>

        <DocSection id="responses" title="Responses And Receipts">
          <DocList
            items={[
              "Respondents fill a normal web form or a guided one-question flow, depending on the creator setting.",
              "If enabled, unfinished text, choice, rating, date, and uploaded blob receipt values are saved locally while the respondent fills the form.",
              "If repeat submissions are disabled, the public form keeps the previous response receipt on that browser or connected wallet instead of showing the form again.",
              "If a deadline is set, the public form shows a closed state and blocks new submissions after that time.",
              "Required fields, emails, URLs, numbers, dates, ratings, options, and uploads are validated before submission.",
              "Screenshots, videos, and files are uploaded as blobs.",
              "After submission, the user sees a response receipt blob ID.",
              "Each submission also updates a response index blob so admins can import one index receipt instead of many individual receipts.",
              "Admins can import a response or response index from its receipt link if it was submitted from another browser.",
            ]}
          />
        </DocSection>

        <DocSection id="seal" title="Seal Private Responses">
          <DocList
            items={[
              "When Seal package ID and key servers are configured, private forms encrypt responses with the Mysten Seal SDK before Walrus storage.",
              "Admins connect a Sui wallet in the admin dashboard and sign a short-lived Seal session key.",
              "Seal key servers only release decryption shares when the configured approval transaction passes the on-chain policy.",
              "The code path is not tied to Enoki; any compatible Seal key-server configuration can be used once the key servers and access policy are available.",
              "If Seal is not configured, private mode uses the browser-held fallback key so the product remains testable locally.",
            ]}
          />
        </DocSection>

        <DocSection id="admin" title="Admin Dashboard">
          <DocList
            items={[
              "Search and filter responses by status.",
              "Star important responses.",
              "Mark responses reviewed.",
              "For Seal private forms, the creator wallet can add another authorized Seal admin after publish.",
              "Delete selected responses from the local admin index.",
              "Import response blobs or response index blobs by ID.",
              "Export all responses or selected responses as CSV, JSON, or Excel.",
            ]}
          />
        </DocSection>

        <DocSection id="deployment" title="Environment">
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <tbody>
                {envRows.map(([name, description]) => (
                  <tr key={name} className="border-b border-border last:border-b-0">
                    <td className="bg-secondary px-4 py-3 font-mono text-xs text-foreground">
                      {name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Public testnet endpoints can be used directly for demos. A mainnet publisher that
            requires an API key should be called through a server-side proxy so the key is not
            exposed in browser JavaScript.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            The default sponsor-budget profile caps each publish request at 5 MiB, generic files at
            3 MiB, videos at 5 MiB, and uploads at 2 files per response.
          </p>
        </DocSection>

        <DocSection id="submission" title="Hackathon Submission Checklist">
          <DocList
            items={[
              "Deploy the app with production Walrus read/write configuration.",
              "Create a form from the Walrus Session template.",
              "Confirm the required review address is present in reviewer wallet addresses.",
              "Publish the form and copy the public form link.",
              "Submit at least one real response through the form.",
              "Open admin, import the receipt if needed, star/review the entry, and export CSV/JSON/Excel.",
              "Record a demo video under 3 minutes and upload it to Walrus.",
              "Prepare repository, app link, form link, X post, SUI address, screenshots, and Walrus builder feedback.",
            ]}
          />
        </DocSection>
      </article>
    </div>
  );
}

function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-3xl border border-border bg-white p-6 shadow-sm"
    >
      <h2
        className="text-2xl font-semibold text-foreground"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DocList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
