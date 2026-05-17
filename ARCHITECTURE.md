# FORMRUS Architecture

This document is the working architecture contract for FORMRUS. It is derived from the current repository structure and should be updated whenever a change introduces a new structural boundary, integration layer, storage contract, or deployment assumption.

## Product

FORMRUS is a Walrus-native feedback and form platform for creating shareable forms, collecting structured responses, storing published data as decentralized blobs, optionally encrypting private responses, and reviewing/exporting submissions from an admin dashboard.

## Tech Stack

- Runtime: React 19 with TypeScript.
- Routing: TanStack Router and TanStack Start.
- Build: Vite with first-party plugins for TanStack Start, React, Tailwind CSS, tsconfig paths, and Cloudflare Workers.
- Styling: Tailwind CSS plus scoped CSS in `src/styles.css`.
- UI primitives: Radix/shadcn-style components in `src/components/ui`.
- Icons: `lucide-react`, except official brand SVG paths where brand fidelity is required.
- Notifications: `sonner`.
- Decentralized storage: Walrus HTTP publisher/aggregator APIs.
- Encryption: Mysten Seal SDK when configured, with browser WebCrypto fallback for local/private demo continuity.
- Sui client: `@mysten/sui` for Seal integration.

## Directory Boundaries

### `src/routes`

Route modules own page-level orchestration, URL params, local UI state, and route metadata. Route modules may call `src/lib` functions and render `src/components`, but they must not embed storage protocol logic or encryption internals.

Current route responsibilities:

- `src/routes/index.tsx`: landing page and product narrative.
- `src/routes/builder.tsx`: form builder, draft state, field ordering, publish flow.
- `src/routes/form.$blobId.tsx`: public response form and submission flow.
- `src/routes/admin.$blobId.tsx`: admin response review, filtering, bulk actions, CSV export.
- `src/routes/my-forms.tsx`: locally indexed published form list plus wallet-linked creator manifest import/sync.
- `src/routes/docs.tsx`: user-facing product/storage documentation.
- `src/routes/__root.tsx`: app shell, metadata, navbar/footer composition, query client context.

### `src/components`

Components own reusable UI rendering and interaction patterns. Components may receive typed props and call narrowly scoped helpers only when the helper is part of the component's direct responsibility.

Current component responsibilities:

- `FieldRenderer.tsx`: renders form field controls and attachment upload controls.
- `Navbar.tsx`: app navigation.
- `Footer.tsx`: branded footer section.
- `AnimatedGradientCTA.tsx`: FAQ/CTA section.
- `MarqueeLogos.tsx`: ecosystem logo marquee.
- `ui/*`: reusable Radix/shadcn-style primitives. These should remain generic and not import app-specific form/storage logic.

### `src/lib`

Library modules own protocol integrations, storage adapters, crypto helpers, cross-route domain utilities, and non-visual application logic. Library modules must expose typed functions with narrow responsibilities.

Current library responsibilities:

- `walrus.ts`: Walrus HTTP adapter, local development blob fallback, form/response/draft persistence helpers, response metadata updates, CSV export utilities.
- `seal.ts`: private response encryption/decryption helpers, Seal SDK integration, WebCrypto fallback, private key storage helpers.
- `validation.ts`: shared form definition and response value validation used before publish, draft save, and submission storage.
- `form-templates.ts`: reusable product templates, including the Walrus Session registration form and required review admin address.
- `utils.ts`: generic class name composition helper.
- `error-capture.ts` and `error-page.ts`: app error handling support.

### `src/types`

Shared contracts live in `src/types/index.ts`. Route and library code must import shared domain types from this module instead of redefining incompatible local shapes.

Current domain contracts:

- Field contracts: `FieldType`, `FormField`.
- Storage contracts: `StorageMode`, `BlobReceipt`, `AttachmentValue`.
- Encryption contracts: `EncryptionProvider`, `EncryptionEnvelope`, `AccessControl`.
- Form contracts: `FormSchema`, `FormDraft`.
- Branding contracts: `FormBranding`.
- Response contracts: `FormResponse`.
- Manifest contracts: `CreatorManifest`, `ResponseIndex`.
- Admin contracts: `AdminStats`.

## Data Flow

### Published Form Flow

1. Builder route composes a `FormSchema` from typed builder state.
2. `validateFormForPublish` checks required publish-time schema rules.
3. Optional templates may prefill fields, branding, success copy, and admin addresses before publish.
4. Private forms receive an `AccessControl` public key before publish.
5. Builder displays `getWalrusStorageStatus` so the creator knows whether Walrus or local demo storage is active.
6. `publishForm` serializes the schema and writes it through the Walrus publisher when configured.
7. The returned Walrus blob ID becomes the shareable `/form/:blobId` identifier.
8. If the creator wallet is connected, `publishCreatorManifest` appends the form to a Walrus-backed creator manifest for cross-device recovery.
9. The local form index stores the published form for the creator's convenience, but the published blob is the source of truth for shared links.

### Draft Flow

1. Drafts are checked through `validateDraftForSave`.
2. Drafts are stored locally through `saveDraft`.
3. Drafts are not shareable and are not treated as published records.
4. Publishing creates a new immutable form blob version.
5. The public share link continues to point only to a published blob ID.

### Response Flow

1. Public form route loads `FormSchema` by blob ID.
2. User input is validated through `validateResponseValues`.
3. Public form route displays `getWalrusStorageStatus` before submission.
4. `submitResponse` serializes the response.
5. Private responses are encrypted in the browser before storage.
6. The encrypted or plain response payload is written through Walrus when configured.
7. Local fallback receipts carry `fallbackReason` when a configured Walrus write fails.
8. `publishResponseIndex` appends the response receipt to a Walrus-backed response index chain for the form.
9. Admin route reads locally indexed responses and can import either remote response blob IDs or response index blob IDs.

### Submitter Wallet Flow

1. Form creators choose one of three submitter modes: public, optional wallet proof, or wallet required.
2. Public mode does not require a wallet from respondents.
3. Optional mode lets respondents attach a wallet address without blocking Web2-style submissions.
4. Required mode blocks submission until a Sui wallet is connected.
5. Wallet addresses are stored as public response metadata and are not treated as authentication for private data unless Seal approval also succeeds.

### Admin Flow

1. Admin route loads the form schema and display responses.
2. `getDisplayResponses` attempts decryption when local creator keys are available.
3. Admin UI handles filtering, sorting, selection, bulk star/unstar, bulk reviewed, bulk delete, and CSV export.
4. CSV export uses the visible display response data. Locked encrypted responses export as encrypted placeholders.

## Environment Variables

Walrus:

- `WALRUS_PUBLISHER_URL`: server-only Walrus/Nami/self-sponsored publisher endpoint used by `/api/walrus/blobs`.
- `WALRUS_EPOCHS`: server-side default storage duration for publisher proxy writes.
- `WALRUS_MAX_EPOCHS`: server-side upper bound for requested storage duration.
- `WALRUS_MAX_PUBLISH_BYTES`: server-side maximum body size accepted by the sponsored publisher proxy.
- `WALRUS_RATE_LIMIT_MAX_WRITES`: maximum sponsored publish requests per client in a rate-limit window.
- `WALRUS_RATE_LIMIT_WINDOW_MS`: rate-limit window duration.
- `WALRUS_ALLOWED_CONTENT_TYPES`: server-side content type allowlist for sponsored publisher writes.
- `WALRUS_PUBLISHER_JWT_SECRET`: optional HS256 signing secret for an authenticated self-sponsored Walrus publisher. Never expose this as `VITE_*`.
- `WALRUS_PUBLISHER_JWT_EXP_SECONDS`: short JWT lifetime for each publisher upload request.
- `WALRUS_PUBLISHER_SEND_OBJECT_TO`: optional Sui address that should receive the created blob object when the publisher supports `send_object_to`.
- `VITE_WALRUS_PUBLISHER_URL`: optional public testnet publisher endpoint for local demos only.
- `VITE_WALRUS_AGGREGATOR_URL`: Walrus aggregator endpoint.
- `VITE_WALRUS_EPOCHS`: client-requested storage duration for published blobs.
- `.env.production.example`: production/mainnet-facing deployment template. `WALRUS_*` values are server secrets; `VITE_*` values are public client config.

Seal:

- `VITE_SUI_FULLNODE_URL` or `VITE_SEAL_FULLNODE_URL`: Sui fullnode URL.
- `VITE_SEAL_PACKAGE_ID`: Seal package namespace.
- `VITE_SEAL_KEY_SERVERS`: comma-separated object IDs or JSON server config.
- `VITE_SEAL_THRESHOLD`: Seal threshold.
- `VITE_SEAL_VERIFY_KEY_SERVERS`: optional verification toggle.
- `VITE_SEAL_APPROVE_TARGET`: Move approval function target used to build Seal decrypt PTB bytes.
- `VITE_SEAL_REGISTER_TARGET`: Move function target used to register a private form's admin allowlist.
- `VITE_SEAL_ADD_ADMIN_TARGET`: Move function target used to add a private form admin after publish.
- `VITE_SEAL_APPROVE_POLICY_OBJECT_ID`: optional policy object passed into the approval function.
- `VITE_SEAL_APPROVE_ARGUMENTS`: argument layout for the approval function. Seal requires `id` first; the FORMRUS policy uses `id,policy`.
- `VITE_SEAL_SESSION_TTL_MIN`: short-lived wallet session duration for Seal decrypt.

No secrets should be hardcoded in source files. Client-exposed `VITE_*` values are public configuration and must not contain private keys.

## Naming Standards

- React components: PascalCase.
- Functions and variables: camelCase.
- Types and interfaces: PascalCase.
- Route files: TanStack route naming conventions, including dynamic segments such as `form.$blobId.tsx`.
- App modules: kebab-case for new non-route files unless existing local convention requires otherwise.
- CSS classes: Tailwind utility classes first; scoped CSS only for complex visual sections or global theme rules.

## Implementation Rules

- New route-level behavior belongs in `src/routes`.
- Reusable rendering belongs in `src/components`.
- Protocol/storage/crypto/domain logic belongs in `src/lib`.
- Shared shapes belong in `src/types`.
- UI primitive files under `src/components/ui` must stay generic.
- Do not duplicate storage or encryption logic inside route files.
- Do not introduce unrelated refactors while shipping a requested feature.
- Do not revert user-authored changes unless explicitly requested.
- Any structural boundary change requires an update to this document.

## Security Rules

- Validate required form input before submission.
- Keep private decrypt keys out of published form blobs and response blobs.
- Store only public encryption metadata in published form schemas.
- Store admin Sui addresses as public schema metadata only; wallet-gated enforcement requires a wallet/session layer.
- Seal decryption must go through wallet-signed session keys and the configured on-chain approval policy.
- Seal admin changes must go through the creator-gated Move policy function.
- Treat all `VITE_*` values as public.
- Never place secrets, private keys, or service credentials in the repository.
- Handle locked encrypted responses explicitly in admin UI.
- Prefer remote Walrus blobs as source of truth for published/shareable records.
- Enforce upload size/type limits before attempting sponsored Walrus writes.
- Protect the server-side Walrus publisher proxy with body-size limits, content-type allowlists, and per-client rate limits because the publisher spends project funds.

## Verification Standards

Before considering implementation complete:

- Run `npm.cmd run build` or `npm run build` depending on shell execution policy.
- Run `git diff --check`.
- Confirm production env points to intended Walrus publisher/aggregator endpoints before final demo.
- For visual/layout changes, verify the relevant route in the browser.
- For storage/encryption changes, verify at least one publish-submit-admin path.
- For admin changes, verify selected-row bulk behavior and CSV output.

## Testing Expectations

The current repo does not have a configured test runner script beyond build/lint. When adding testable domain logic, prefer pure functions in `src/lib` so a test runner can be added without moving code. Future test files should mirror source ownership:

- `src/lib/*.test.ts` for storage, encryption, CSV, and validation helpers.
- `src/components/*.test.tsx` for reusable UI behavior.
- Route integration tests should cover publish, submit, and admin review flows once a browser test runner is configured.

## Known Technical Debt

- Drafts still use browser localStorage because unpublished drafts are not decentralized records.
- Creator manifests and response indexes are immutable Walrus blobs, so cross-device sync works by importing the latest manifest/index blob ID. Automatic global discovery still requires a mutable registry or account index.
- Official Seal decryption requires wallet/session-key/policy approval wiring beyond basic encryption configuration.
- No dedicated test runner is configured yet; build currently acts as the main type/integration gate.
