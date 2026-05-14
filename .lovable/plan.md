## FORMRUS — Decentralized Form Builder

A 5-page product UI for building, sharing, and analyzing forms "stored on Walrus." This plan is **frontend-only with mocked persistence** (localStorage simulating Walrus blob IDs). No real Walrus/Seal integration — when you're ready for that, we wire it via Lovable Cloud + a server function.

> Note on stack: project is **TanStack Start + Vite + Tailwind v4** (not Next.js). Routing/SEO and design tokens follow the existing template. All visual specs from your three reference templates are honored.

---

### Pages (TanStack file routes)

```
src/routes/
  __root.tsx          → shared Navbar + Footer + <Outlet/>
  index.tsx           → Landing (/)
  builder.tsx         → Form Builder (/builder)
  form.$blobId.tsx    → Public Form View (/form/:blobId)
  admin.$blobId.tsx   → Admin Dashboard (/admin/:blobId)
  my-forms.tsx        → My Forms grid (/my-forms)
  docs.tsx            → Simple docs page (nav link target)
```

Each route gets unique `head()` metadata (title, description, og:*).

---

### Design tokens (src/styles.css)

- Background `#FFFFFF`, foreground `#0A0F1E`, primary/accent teal `#0EA5E9`
- Inter (body) + Outfit (display) via Google Fonts
- Tokens added to `@theme inline` and `:root` as oklch equivalents
- Custom CSS classes for animated gradient (`c5-animated-gradient` with `@property` blobs) and marquee keyframes

---

### Shared components (src/components/)

- `Navbar.tsx` — bold teal "FORMRUS" wordmark, links: Create Form, My Forms, Docs, CTA "Create Free Form"
- `Footer.tsx` — adapts the **Kresna** footer template (two-card layout, video left card, FAQ-light info, watermark) rebranded to FORMRUS, teal accents instead of blue
- `MarqueeLogos.tsx` — seamless CSS marquee from the hero template (used on landing under feature cards)
- `AnimatedGradientCTA.tsx` — the `c5-animated-gradient` CTA card from CTA template
- `FAQ.tsx` — accordion (lucide ChevronUp/Down), 5 form-builder Q&As
- `FieldRenderer.tsx` — renders any FormField in preview/public view
- `ui/*` — already present (shadcn)

---

### Page details

**1. Landing (`/`)**
- Hero with video background card (from hero template), headline *"Forms that live on Walrus. Forever."*, sub copy, two CTAs (Start Building → /builder, View Demo Form → seeded blob)
- Floating bottom navbar inside hero (Products, Docs, Get in touch)
- Three feature cards: 🔒 Private with Seal · ♾️ Stored on Walrus · 📊 Smart Dashboard
- Marquee logo strip
- Animated gradient CTA + FAQ section (two-column from CTA template)
- Footer

**2. Builder (`/builder`)** — two-panel layout
- Left: title input, description textarea, "Private (Seal encrypted)" toggle, field-type pill picker (Text, Long Text, Dropdown, Checkbox, Radio, Star Rating, File Upload, URL, Email, Number, Date, Section Break), list of added field cards with drag handle (dnd-kit), label input, type badge, required toggle, delete. Bottom: teal "Publish Form to Walrus" button → mock async → returns fake blob ID + shareable `/form/:blobId` link in a success card
- Right: live `FieldRenderer` preview updating in real time

**3. Form View (`/form/:blobId`)**
- Loads form from localStorage by blob ID
- Centered layout, optional progress bar, all field types correctly rendered (5-star clickable, dnd file upload zone, email/URL validation)
- Submit → mock "Storing on Walrus…" → success state with response blob ID

**4. Admin Dashboard (`/admin/:blobId`)**
- Header: title, truncated form ID, Copy link, Export CSV
- 4 stat cards: Total / Today / Completion Rate / Avg Star Rating
- Filter bar: search, date range (shadcn calendar), status (All/New/Reviewed/Starred), sort
- Responses table with dynamic field columns, row actions (View expand, Star, Mark Reviewed, Delete), bulk actions, teal highlight for starred
- CSV export via client-side blob download

**5. My Forms (`/my-forms`)**
- Grid of form cards: title, created date, response count, "Private" badge, actions (View / Admin / Copy / Delete)
- "+ Create New Form" card linking to /builder

---

### Types (`src/types/index.ts`)

```ts
export type FieldType =
  | 'text' | 'longText' | 'dropdown' | 'checkbox' | 'radio'
  | 'star' | 'file' | 'url' | 'email' | 'number' | 'date' | 'section';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[]; // dropdown/radio/checkbox
}

export interface FormSchema {
  blobId: string;
  title: string;
  description: string;
  isPrivate: boolean;
  fields: FormField[];
  createdAt: string;
}

export interface FormResponse {
  id: string;
  formBlobId: string;
  submittedAt: string;
  data: Record<string, unknown>;
  starred?: boolean;
  reviewed?: boolean;
}

export interface AdminStats {
  total: number; today: number;
  completionRate: number; avgStar: number | null;
}
```

---

### Mock persistence layer (`src/lib/walrus-mock.ts`)

`publishForm`, `getForm`, `submitResponse`, `getResponses`, `listForms`, `deleteForm` — all backed by localStorage with simulated 600–1200ms latency to feel real. Blob IDs = random 32-hex strings. Easy to swap for real API/server functions later.

---

### Out of scope (this iteration)

- Real Walrus/Seal network calls, wallet auth, encryption — all mocked
- Backend / Lovable Cloud — none enabled yet (ask if you want it)
- Drag-reorder polish beyond dnd-kit basics

After approval I'll build all of the above in one pass.