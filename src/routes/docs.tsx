import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/docs')({
  head: () => ({
    meta: [
      { title: 'Docs — FORMRUS' },
      { name: 'description', content: 'How FORMRUS stores forms and responses on Walrus Protocol.' },
      { property: 'og:title', content: 'Docs — FORMRUS' },
    ],
  }),
  component: Docs,
});

function Docs() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-4xl font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>Documentation</h1>
      <p className="mt-2 text-muted-foreground">A quick tour of how FORMRUS works.</p>

      <div className="prose prose-sm mt-10 space-y-8">
        {[
          { h: '1. Build', p: 'Open the Builder, add fields (text, star, dropdown, file…), toggle Seal encryption if you want responses encrypted client-side.' },
          { h: '2. Publish to Walrus', p: 'Hit "Publish Form to Walrus". Your schema is serialized and stored as a blob. You receive a permanent blob ID.' },
          { h: '3. Share', p: 'Copy the link /form/[blobId]. Anyone with the link can submit a response. Each response is its own Walrus blob.' },
          { h: '4. Analyze', p: 'Open the Admin dashboard at /admin/[blobId] to filter, star, mark reviewed, export CSV, and inspect every response.' },
        ].map(s => (
          <section key={s.h}>
            <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>{s.h}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-accent p-6">
        <p className="text-sm text-foreground">
          <strong>Heads up:</strong> this preview uses mocked Walrus blob IDs stored locally. Wire it to real Walrus + Seal whenever you're ready.
        </p>
        <Link to="/builder" className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Try the builder</Link>
      </div>
    </div>
  );
}
