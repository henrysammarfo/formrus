# FORMRUS

Walrus-native form tooling for teams collecting structured feedback, bug reports, surveys, applications, and media-rich submissions.

FORMRUS lets a builder create a form, publish the schema as a blob, share a public response link, store each response as its own blob, and review/export submissions from an admin dashboard.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the repo-derived architecture contract, directory boundaries, data flow, environment variables, security rules, and verification standards.

## Repository Structure

- `src/routes`: page routes, route metadata, and user flows.
- `src/components`: reusable UI, navigation, footer, form field rendering, and shared visual sections.
- `src/components/ui`: generic Radix/shadcn-style primitives only.
- `src/lib`: Walrus storage, Seal encryption, validation, templates, CSV/JSON/Excel export, and domain helpers.
- `src/types`: shared form, response, storage, encryption, and admin contracts.
- `public`: stable brand, SEO, favicon, social image, robots, and sitemap assets.
- `move/formrus_policy`: Sui Move policy package used by Seal admin authorization.

## Hackathon Fit

- Custom form builder with required and optional fields
- One-click Walrus Session 2 registration template based on the official Airtable fields
- Template gallery for bug reports, feature requests, surveys, applications, and Walrus Session submissions
- Custom form cover image, logo/icon, and success image or GIF
- Full-form or one-question-at-a-time response flow for Typeform-style submissions
- Creator controls for repeat submissions and unfinished response resume
- Optional full-screen success splash before the final respondent receipt
- Rich text, dropdowns, checkboxes, radio inputs, star ratings, screenshots, video uploads, generic files, URLs, email, numbers, and dates
- Shareable `/form/:blobId` links
- Walrus HTTP publisher/aggregator support for schemas, responses, screenshots, and videos
- Local development blob fallback when Walrus endpoints are not configured; production writes use Walrus mainnet.
- Admin dashboard with search, status filters, star/review actions, bulk star/review/delete, response blob import, and CSV/JSON/Excel export
- Version history in My Forms: old published blobs stay available, while edits create the next draft/version
- Private form toggle with client-side encryption, optional Mysten Seal SDK config, and creator-held decrypt keys
- Drag-and-drop field ordering plus draft saving and published form versions
- Published schema can include admin Sui addresses, including the required Walrus review admin address

## Product Direction From Walrus AMA

The AMA feedback reinforced that the best user experience for Walrus apps is to hide wallet, token, gas, and object-management complexity from everyday users. FORMRUS follows that direction by keeping respondent submissions as a normal web form flow while the app/builder side handles Walrus publishing status, fallback visibility, and future sponsorship controls.

That means the production target is:

- Respondents fill forms without crypto friction.
- Builders see whether Walrus mainnet storage is configured.
- Media and responses are written to Walrus through a sponsored/publisher-style flow.
- Admins can review, prioritize, and export without asking respondents to manage storage fees.

## Walrus Storage

For local testnet development, public Walrus endpoints can be configured directly:

```bash
VITE_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
VITE_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
VITE_WALRUS_EPOCHS=5
```

For production/mainnet, keep the publisher endpoint server-side and let the browser call FORMRUS' `/api/walrus/blobs` proxy:

```bash
WALRUS_PUBLISHER_URL=https://walrus-mainnet-publisher.nami.cloud/YOUR_ENDPOINT_KEY
WALRUS_EPOCHS=5
VITE_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-mainnet.walrus.space
VITE_WALRUS_EPOCHS=5
```

If a hosted sponsor such as Nami is unavailable, run your own authenticated Walrus publisher and point the Worker proxy at it:

```bash
WALRUS_PUBLISHER_URL=https://your-auth-publisher.example.com
WALRUS_EPOCHS=5
WALRUS_MAX_EPOCHS=5
WALRUS_MAX_PUBLISH_BYTES=26214400
WALRUS_RATE_LIMIT_MAX_WRITES=5
WALRUS_RATE_LIMIT_WINDOW_MS=60000
WALRUS_ALLOWED_CONTENT_TYPES=application/json,image/*,video/*,application/pdf,text/plain,text/csv
WALRUS_PUBLISHER_JWT_SECRET=0xYOUR_RANDOM_32_BYTE_HEX_SECRET
WALRUS_PUBLISHER_JWT_EXP_SECONDS=60
WALRUS_PUBLISHER_SEND_OBJECT_TO=0xYOUR_SPONSOR_WALLET_ADDRESS
```

The Worker signs a short-lived HS256 JWT for each upload. The publisher must be configured with the same JWT decode secret. Keep the publisher wallet funded with SUI for gas and WAL for storage. Keep media caps low until the sponsor budget is larger.

The default production budget profile is intentionally conservative: 5 MiB server hard cap, 3 MiB generic files, 5 MiB videos, and 2 uploads per response. That keeps normal text-only responses cheap enough for dozens of submissions while preventing a single large video from burning the sponsor wallet. Creators can also disable repeat submissions and enable local draft resume so respondents can recover unfinished text/select/rating answers after closing the tab.

Current production publisher shape:

- Cloudflare Worker hosts the FORMRUS app.
- Azure Ubuntu VM runs the authenticated Walrus publisher as `formrus-publisher.service`.
- Cloudflare Tunnel exposes only the publisher HTTPS endpoint; the Walrus publisher itself stays bound to `127.0.0.1:31416`.
- `WALRUS_PUBLISHER_URL` points the Worker to the tunnel URL.
- `WALRUS_PUBLISHER_JWT_SECRET` is server-only and must match the publisher service secret.

When configured, FORMRUS stores:

- Form schemas via `PUT /v1/blobs`
- Response payloads via `PUT /v1/blobs`
- Uploaded screenshots, videos, and files via `PUT /v1/blobs`
- Remote form and response imports via `GET /v1/blobs/:blobId`

Without a working publisher or proxy, the app uses `localStorage` as a development blob store so the full UX remains testable.

The builder and public form display the active storage mode. If Walrus is configured but a write fails, the saved receipt records the fallback reason so the demo does not silently pretend a local write was decentralized.

For production/mainnet-facing deployment, start from `.env.production.example`. Do not put a paid Nami publisher URL in a `VITE_*` variable because that would expose it to every browser user.

## Private Responses

Private forms encrypt in the respondent browser before they are written to Walrus. When Seal package/key-server config is present, FORMRUS uses the Mysten Seal SDK. Without Seal config, it uses a browser-held fallback key so local testing still works. Enoki is not required by the application code; it is one managed way to get a mainnet Seal key-server/API-key setup. Any compatible Seal key-server config can be used when it is available. To use the official Seal SDK path, configure:

```bash
VITE_SUI_FULLNODE_URL=https://fullnode.mainnet.sui.io:443
VITE_SEAL_PACKAGE_ID=0x...
VITE_SEAL_KEY_SERVERS=0xserver1,0xserver2
VITE_SEAL_THRESHOLD=1
VITE_SEAL_APPROVE_TARGET=0xpackage::module::seal_approve
VITE_SEAL_APPROVE_POLICY_OBJECT_ID=0x...
VITE_SEAL_APPROVE_ARGUMENTS=id,policy
```

Seal decryption requires a wallet-signed session key and an on-chain approval policy. The admin dashboard includes wallet connection and a Seal decrypt action; it only unlocks responses when the connected wallet is approved by the configured Seal policy.

## Run Locally

```bash
npm install
npm run dev
```

For the local verification port used during hackathon prep:

```bash
npm run dev:local
```

## Demo Flow

1. Open `/builder`.
2. Create a feedback form with required fields, a rating, rich text, screenshot upload, and video upload.
3. Publish it and copy the generated form link.
4. Submit at least one real response from `/form/:blobId`.
5. Open `/admin/:blobId` to filter, bulk star, mark reviewed, import a response blob ID, delete selected rows, and export CSV/JSON/Excel.

## Submission Notes

For the Walrus Session 2 submission, include:

- Public repository link
- Deployed app link
- Mainnet-facing DeepSurge/app link
- FORMRUS form link created from the Walrus Session template
- Short demo video under 3 minutes uploaded to Walrus
- At least one real response submitted through FORMRUS
- Response blob ID from the real submission
- Admin dashboard screenshot showing the required review admin address
- CSV, JSON, or Excel export screenshot/file
- SUI address, GitHub profile/repo, and X tweet link
- Feedback about building on Walrus and session feedback
- Screenshot or thread showing builder, form link, Walrus blob IDs, and admin export

## Final Demo Checklist

1. Configure production Walrus publisher and aggregator endpoints.
2. Build with `npm.cmd run build`.
3. Deploy the frontend as the final app link.
4. Open `/builder` and select the Walrus Session template.
5. Add branding cover/logo/success media if desired.
6. Publish and copy the form link.
7. Submit one real entry through the published form.
8. Open `/admin/:blobId`, review the response, star or mark reviewed, and export CSV/JSON/Excel.
9. Upload the demo video to Walrus.
10. Register the project in the official Airtable form.
