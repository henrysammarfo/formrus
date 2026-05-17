import { decryptResponseEnvelope, encryptResponseData, isEncryptionEnvelope } from "@/lib/seal";
import type {
  AdminStats,
  AttachmentValue,
  BlobReceipt,
  CreatorManifest,
  FormDraft,
  FormResponse,
  FormSchema,
  ResponseIndex,
  StoragePolicy,
  SubmitterMode,
} from "@/types";

const FORMS_KEY = "formrus.forms";
const RESP_KEY = "formrus.responses";
const BLOBS_KEY = "formrus.blobs";
const DRAFTS_KEY = "formrus.drafts";
const CREATOR_MANIFEST_POINTERS_KEY = "formrus.creatorManifestPointers";
const RESPONSE_INDEX_POINTERS_KEY = "formrus.responseIndexPointers";

const isBrowser = () => typeof window !== "undefined";
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

type StoredBlob = {
  blobId: string;
  contentType: string;
  body: string;
  createdAt: string;
};

type FormPayload = Omit<FormSchema, "blobId" | "receipt"> & {
  kind?: "formrus.form";
  payloadVersion?: number;
};

type ResponsePayload = {
  kind?: "formrus.response";
  payloadVersion?: number;
  formBlobId: string;
  submittedAt: string;
  submitterAddress?: string;
  submitterMode?: SubmitterMode;
  data: Record<string, unknown> | unknown;
  encrypted?: boolean;
  encryptionProvider?: FormResponse["encryptionProvider"];
};

export type WalrusStorageStatus = {
  mode: "walrus" | "local";
  label: string;
  message: string;
  publisherUrl?: string;
  aggregatorUrl?: string;
  canPublishToWalrus: boolean;
  canReadFromWalrus: boolean;
};

function read<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function readRecord<T>(key: string): Record<string, T> {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") as Record<string, T>;
  } catch {
    return {};
  }
}

function writeRecord<T>(key: string, value: Record<string, T>) {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getWalrusConfig() {
  const publisherUrl = env.VITE_WALRUS_PUBLISHER_URL?.replace(/\/$/, "") || "/api/walrus/blobs";
  const aggregatorUrl = env.VITE_WALRUS_AGGREGATOR_URL?.replace(/\/$/, "");
  const epochs = env.VITE_WALRUS_EPOCHS || "5";
  return { publisherUrl, aggregatorUrl, epochs, enabled: Boolean(publisherUrl && aggregatorUrl) };
}

export function getWalrusStorageStatus(): WalrusStorageStatus {
  const { publisherUrl, aggregatorUrl, enabled } = getWalrusConfig();
  if (enabled) {
    return {
      mode: "walrus",
      label: "Walrus connected",
      message:
        "Published forms, responses, and media will be written through the configured Walrus publisher.",
      publisherUrl,
      aggregatorUrl,
      canPublishToWalrus: true,
      canReadFromWalrus: true,
    };
  }

  return {
    mode: "local",
    label: publisherUrl || aggregatorUrl ? "Partial Walrus config" : "Local demo storage",
    message:
      publisherUrl || aggregatorUrl
        ? "Both publisher and aggregator endpoints are required for a complete Walrus flow. Writes may fall back to local browser storage."
        : "Walrus endpoints are not configured. The app remains usable with local browser storage for development and demos.",
    publisherUrl,
    aggregatorUrl,
    canPublishToWalrus: Boolean(publisherUrl),
    canReadFromWalrus: Boolean(aggregatorUrl),
  };
}

export function makeBlobId(): string {
  const bytes = new Uint8Array(16);
  if (isBrowser() && window.crypto) window.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getDefaultStoragePolicy(): StoragePolicy {
  return {
    maxFileSizeMb: Number(env.VITE_MAX_FILE_MB || 3),
    maxVideoSizeMb: Number(env.VITE_MAX_VIDEO_MB || 5),
    maxFilesPerResponse: Number(env.VITE_MAX_FILES_PER_RESPONSE || 2),
    allowedMimeTypes: (
      env.VITE_ALLOWED_UPLOAD_MIME_TYPES ||
      "image/*,video/*,application/pdf,text/plain,text/csv,application/json"
    )
      .split(",")
      .map((type) => type.trim())
      .filter(Boolean),
  };
}

function bytesFromMb(value: number): number {
  return Math.max(0, value) * 1024 * 1024;
}

function mimeMatches(type: string, allowed: string[]): boolean {
  if (!allowed.length) return true;
  const normalized = type || "application/octet-stream";
  return allowed.some((rule) => {
    if (rule === "*/*") return true;
    if (rule.endsWith("/*")) return normalized.startsWith(`${rule.slice(0, -2)}/`);
    return normalized === rule;
  });
}

export function validateAttachmentFile(
  file: File,
  policy: StoragePolicy = getDefaultStoragePolicy(),
) {
  const type = file.type || "application/octet-stream";
  const limitMb = type.startsWith("video/") ? policy.maxVideoSizeMb : policy.maxFileSizeMb;
  if (file.size > bytesFromMb(limitMb)) {
    throw new Error(
      `${file.name} is too large. Limit is ${limitMb}MB${type.startsWith("video/") ? " for videos" : ""}.`,
    );
  }
  if (!mimeMatches(type, policy.allowedMimeTypes)) {
    throw new Error(`${type} uploads are not allowed for this form.`);
  }
}

export function truncateBlob(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}...${id.slice(-6)}`;
}

function extractWalrusReceipt(result: unknown): BlobReceipt | null {
  const root = result as Record<string, unknown> | null;
  if (!root || typeof root !== "object") return null;

  const newlyCreated = root.newlyCreated as Record<string, unknown> | undefined;
  const alreadyCertified = root.alreadyCertified as Record<string, unknown> | undefined;
  const blobObject = newlyCreated?.blobObject as Record<string, unknown> | undefined;
  const storage = blobObject?.storage as Record<string, unknown> | undefined;
  const blobId = String(blobObject?.blobId || alreadyCertified?.blobId || "");
  if (!blobId) return null;

  return {
    blobId,
    objectId: typeof blobObject?.id === "string" ? blobObject.id : undefined,
    endEpoch: Number(storage?.endEpoch || alreadyCertified?.endEpoch || 0) || undefined,
    storageMode: "walrus",
  };
}

async function putWalrusBlob(
  body: Blob | string,
  contentType: string,
): Promise<BlobReceipt | null> {
  const { publisherUrl, epochs } = getWalrusConfig();
  if (!publisherUrl) return null;

  const endpoint = publisherUrl.startsWith("/api/")
    ? `${publisherUrl}?epochs=${encodeURIComponent(epochs)}`
    : `${publisherUrl}/v1/blobs?epochs=${encodeURIComponent(epochs)}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: { "content-type": contentType },
    body,
  });
  if (!res.ok) throw new Error(`Walrus publish failed: ${res.status}`);
  return extractWalrusReceipt(await res.json());
}

function readLocalBlob(blobId: string): StoredBlob | null {
  return read<StoredBlob>(BLOBS_KEY).find((b) => b.blobId === blobId) || null;
}

function putLocalBlob(body: string, contentType: string, fallbackReason?: string): BlobReceipt {
  const blob: StoredBlob = {
    blobId: makeBlobId(),
    contentType,
    body,
    createdAt: new Date().toISOString(),
  };
  const all = read<StoredBlob>(BLOBS_KEY);
  all.unshift(blob);
  write(BLOBS_KEY, all);
  return { blobId: blob.blobId, storageMode: "local", fallbackReason };
}

async function putJson(payload: unknown): Promise<BlobReceipt> {
  const body = JSON.stringify(payload);
  let fallbackReason: string | undefined;
  try {
    const receipt = await putWalrusBlob(body, "application/json");
    if (receipt) return receipt;
  } catch (error) {
    fallbackReason = error instanceof Error ? error.message : "Walrus publish failed";
    console.warn(error);
  }
  return putLocalBlob(body, "application/json", fallbackReason);
}

async function getJson<T>(blobId: string): Promise<T | null> {
  const { aggregatorUrl } = getWalrusConfig();
  if (aggregatorUrl) {
    try {
      const res = await fetch(`${aggregatorUrl}/v1/blobs/${encodeURIComponent(blobId)}`);
      if (res.ok) return (await res.json()) as T;
    } catch (error) {
      console.warn(error);
    }
  }

  const local = readLocalBlob(blobId);
  if (!local || !local.contentType.includes("json")) return null;
  try {
    return JSON.parse(local.body) as T;
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadAttachment(
  file: File,
  policy: StoragePolicy = getDefaultStoragePolicy(),
): Promise<AttachmentValue> {
  validateAttachmentFile(file, policy);
  let fallbackReason: string | undefined;
  try {
    const receipt = await putWalrusBlob(file, file.type || "application/octet-stream");
    if (receipt) {
      const { aggregatorUrl } = getWalrusConfig();
      return {
        ...receipt,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        url: aggregatorUrl ? `${aggregatorUrl}/v1/blobs/${receipt.blobId}` : undefined,
      };
    }
  } catch (error) {
    fallbackReason = error instanceof Error ? error.message : "Walrus upload failed";
    console.warn(error);
  }

  const embeddedDataUrl = await fileToDataUrl(file);
  const receipt = putLocalBlob(
    embeddedDataUrl,
    file.type || "application/octet-stream",
    fallbackReason,
  );
  return {
    ...receipt,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    embeddedDataUrl,
  };
}

export async function publishForm(
  schema: Omit<FormSchema, "blobId" | "createdAt" | "receipt">,
): Promise<FormSchema> {
  const now = new Date().toISOString();
  const payload: FormPayload = {
    payloadVersion: 1,
    kind: "formrus.form",
    ...schema,
    createdAt: now,
    publishedAt: now,
    formVersion: schema.formVersion || 1,
  };
  const receipt = await putJson(payload);
  const form: FormSchema = {
    ...schema,
    blobId: receipt.blobId,
    createdAt: payload.createdAt,
    publishedAt: payload.publishedAt,
    formVersion: payload.formVersion,
    receipt,
  };
  indexLocalForm(form);
  return form;
}

function indexLocalForm(form: FormSchema) {
  const all = read<FormSchema>(FORMS_KEY).filter((existing) => existing.blobId !== form.blobId);
  all.unshift(form);
  write(FORMS_KEY, all);
}

export async function getForm(blobId: string): Promise<FormSchema | null> {
  const local = read<FormSchema>(FORMS_KEY).find((f) => f.blobId === blobId);
  if (local) return local;

  const remote = await getJson<FormPayload>(blobId);
  if (!remote || !remote.title || !Array.isArray(remote.fields)) return null;
  return {
    blobId,
    title: remote.title,
    description: remote.description || "",
    isPrivate: Boolean(remote.isPrivate),
    creatorAddress: remote.creatorAddress,
    submitterMode: remote.submitterMode || "public",
    storagePolicy: remote.storagePolicy,
    responsePolicy: remote.responsePolicy,
    fields: remote.fields,
    createdAt: remote.createdAt || new Date().toISOString(),
    branding: remote.branding,
    formVersion: remote.formVersion || 1,
    draftId: remote.draftId,
    publishedFromDraftId: remote.publishedFromDraftId,
    publishedAt: remote.publishedAt || remote.createdAt || new Date().toISOString(),
    adminAddresses: remote.adminAddresses,
    accessControl: remote.accessControl,
    creatorManifestBlobId: remote.creatorManifestBlobId,
    responseIndexBlobId: remote.responseIndexBlobId,
    receipt: { blobId, storageMode: getWalrusConfig().aggregatorUrl ? "walrus" : "local" },
  };
}

export async function listForms(): Promise<FormSchema[]> {
  return read<FormSchema>(FORMS_KEY);
}

export async function deleteForm(blobId: string): Promise<void> {
  write(
    FORMS_KEY,
    read<FormSchema>(FORMS_KEY).filter((f) => f.blobId !== blobId),
  );
  write(
    RESP_KEY,
    read<FormResponse>(RESP_KEY).filter((r) => r.formBlobId !== blobId),
  );
}

export function updateLocalFormMetadata(
  blobId: string,
  patch: Partial<FormSchema>,
): FormSchema | null {
  const all = read<FormSchema>(FORMS_KEY);
  const index = all.findIndex((form) => form.blobId === blobId);
  if (index < 0) return null;
  all[index] = { ...all[index], ...patch };
  write(FORMS_KEY, all);
  return all[index];
}

function normalizeUniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

async function getLatestResponseIndex(formBlobId: string): Promise<ResponseIndex | null> {
  const pointer = readRecord<string>(RESPONSE_INDEX_POINTERS_KEY)[formBlobId];
  if (!pointer) return null;
  return getJson<ResponseIndex>(pointer);
}

export async function publishResponseIndex(
  formBlobId: string,
  responseId: string,
): Promise<string | undefined> {
  const previousIndexBlobId = readRecord<string>(RESPONSE_INDEX_POINTERS_KEY)[formBlobId];
  const previous = previousIndexBlobId ? await getJson<ResponseIndex>(previousIndexBlobId) : null;
  const index: ResponseIndex = {
    kind: "formrus.responseIndex",
    payloadVersion: 1,
    formBlobId,
    responseIds: normalizeUniqueIds([responseId, ...(previous?.responseIds || [])]),
    updatedAt: new Date().toISOString(),
    previousIndexBlobId,
  };
  const receipt = await putJson(index);
  const pointers = readRecord<string>(RESPONSE_INDEX_POINTERS_KEY);
  pointers[formBlobId] = receipt.blobId;
  writeRecord(RESPONSE_INDEX_POINTERS_KEY, pointers);
  return receipt.blobId;
}

export async function submitResponse(
  form: FormSchema,
  data: Record<string, unknown>,
  options: { submitterAddress?: string } = {},
): Promise<FormResponse> {
  const storedData = form.isPrivate ? await encryptResponseData(form, data) : data;
  const payload = {
    payloadVersion: 1,
    kind: "formrus.response",
    formBlobId: form.blobId,
    submittedAt: new Date().toISOString(),
    submitterAddress: options.submitterAddress,
    submitterMode: form.submitterMode || "public",
    data: storedData,
    encrypted: isEncryptionEnvelope(storedData),
    encryptionProvider: isEncryptionEnvelope(storedData) ? storedData.provider : undefined,
  };
  const receipt = await putJson(payload);
  const responseIndexBlobId = await publishResponseIndex(form.blobId, receipt.blobId);
  const resp: FormResponse = {
    id: receipt.blobId,
    formBlobId: form.blobId,
    submittedAt: payload.submittedAt,
    submitterAddress: payload.submitterAddress,
    submitterMode: payload.submitterMode,
    data: storedData as Record<string, unknown>,
    receipt,
    responseIndexBlobId,
    encrypted: payload.encrypted,
    encryptionProvider: payload.encryptionProvider,
    decryptionStatus: payload.encrypted ? "locked" : "plain",
  };
  const all = read<FormResponse>(RESP_KEY);
  all.unshift(resp);
  write(RESP_KEY, all);
  return resp;
}

export async function getResponses(formBlobId: string): Promise<FormResponse[]> {
  const local = read<FormResponse>(RESP_KEY).filter((r) => r.formBlobId === formBlobId);
  const latestIndex = await getLatestResponseIndex(formBlobId);
  if (!latestIndex) return local;

  const localIds = new Set(local.map((response) => response.id));
  for (const responseId of latestIndex.responseIds) {
    if (localIds.has(responseId)) continue;
    try {
      await importResponseBlob(responseId, formBlobId);
    } catch (error) {
      console.warn(error);
    }
  }
  return read<FormResponse>(RESP_KEY).filter((r) => r.formBlobId === formBlobId);
}

export async function getDisplayResponses(form: FormSchema): Promise<FormResponse[]> {
  const responses = await getResponses(form.blobId);
  return Promise.all(
    responses.map(async (response) => {
      if (!isEncryptionEnvelope(response.data)) {
        return { ...response, decryptionStatus: response.encrypted ? "locked" : "plain" };
      }

      const decrypted = await decryptResponseEnvelope(form, response.data);
      if (!decrypted) {
        return { ...response, decryptionStatus: "locked" };
      }

      return {
        ...response,
        data: decrypted,
        encrypted: true,
        encryptionProvider: response.data.provider,
        decryptionStatus: "decrypted",
      };
    }),
  );
}

export async function importResponseBlob(
  blobId: string,
  expectedFormBlobId: string,
): Promise<FormResponse> {
  const existing = read<FormResponse>(RESP_KEY).find((r) => r.id === blobId);
  if (existing) return existing;

  const payload = await getJson<ResponsePayload>(blobId);
  if (!payload || !payload.formBlobId || !payload.submittedAt || !payload.data) {
    throw new Error("Response blob not found or not a FORMRUS response");
  }
  if (payload.formBlobId !== expectedFormBlobId) {
    throw new Error("Response belongs to a different form");
  }

  const response: FormResponse = {
    id: blobId,
    formBlobId: payload.formBlobId,
    submittedAt: payload.submittedAt,
    submitterAddress: payload.submitterAddress,
    submitterMode: payload.submitterMode || "public",
    data: payload.data as Record<string, unknown>,
    receipt: { blobId, storageMode: getWalrusConfig().aggregatorUrl ? "walrus" : "local" },
    encrypted: payload.encrypted || isEncryptionEnvelope(payload.data),
    encryptionProvider:
      payload.encryptionProvider ||
      (isEncryptionEnvelope(payload.data) ? payload.data.provider : undefined),
    decryptionStatus: payload.encrypted ? "locked" : "plain",
  };
  const all = read<FormResponse>(RESP_KEY);
  all.unshift(response);
  write(RESP_KEY, all);
  return response;
}

export async function importResponseIndexBlob(
  blobId: string,
  expectedFormBlobId: string,
): Promise<number> {
  const payload = await getJson<ResponseIndex>(blobId);
  if (
    !payload ||
    payload.kind !== "formrus.responseIndex" ||
    payload.formBlobId !== expectedFormBlobId ||
    !Array.isArray(payload.responseIds)
  ) {
    throw new Error("Response index blob not found or belongs to a different form");
  }

  const pointers = readRecord<string>(RESPONSE_INDEX_POINTERS_KEY);
  pointers[expectedFormBlobId] = blobId;
  writeRecord(RESPONSE_INDEX_POINTERS_KEY, pointers);

  let imported = 0;
  for (const responseId of payload.responseIds) {
    try {
      await importResponseBlob(responseId, expectedFormBlobId);
      imported += 1;
    } catch (error) {
      console.warn(error);
    }
  }
  return imported;
}

export function getLocalResponseIndexPointer(formBlobId: string): string | undefined {
  return readRecord<string>(RESPONSE_INDEX_POINTERS_KEY)[formBlobId];
}

function toCreatorRef(form: FormSchema) {
  return {
    blobId: form.blobId,
    title: form.title,
    description: form.description,
    isPrivate: form.isPrivate,
    formVersion: form.formVersion,
    publishedAt: form.publishedAt || form.createdAt,
  };
}

export function getLocalCreatorManifestPointer(ownerAddress: string): string | undefined {
  return readRecord<string>(CREATOR_MANIFEST_POINTERS_KEY)[ownerAddress.toLowerCase()];
}

export async function publishCreatorManifest(
  ownerAddress: string,
  form: FormSchema,
): Promise<string | undefined> {
  const normalizedOwner = ownerAddress.toLowerCase();
  const previousManifestBlobId = getLocalCreatorManifestPointer(normalizedOwner);
  const previous = previousManifestBlobId
    ? await getJson<CreatorManifest>(previousManifestBlobId)
    : null;
  const refs = [toCreatorRef(form), ...(previous?.forms || [])];
  const manifest: CreatorManifest = {
    kind: "formrus.creatorManifest",
    payloadVersion: 1,
    ownerAddress: normalizedOwner,
    forms: refs.filter(
      (ref, index, all) => all.findIndex((item) => item.blobId === ref.blobId) === index,
    ),
    updatedAt: new Date().toISOString(),
    previousManifestBlobId,
  };
  const receipt = await putJson(manifest);
  const pointers = readRecord<string>(CREATOR_MANIFEST_POINTERS_KEY);
  pointers[normalizedOwner] = receipt.blobId;
  writeRecord(CREATOR_MANIFEST_POINTERS_KEY, pointers);
  return receipt.blobId;
}

export async function importCreatorManifest(
  blobId: string,
  ownerAddress?: string,
): Promise<FormSchema[]> {
  const manifest = await getJson<CreatorManifest>(blobId);
  if (!manifest || manifest.kind !== "formrus.creatorManifest" || !Array.isArray(manifest.forms)) {
    throw new Error("Creator manifest blob not found");
  }
  const normalizedOwner = ownerAddress?.toLowerCase();
  if (normalizedOwner && manifest.ownerAddress.toLowerCase() !== normalizedOwner) {
    throw new Error("Creator manifest belongs to a different wallet");
  }

  const forms: FormSchema[] = [];
  for (const ref of manifest.forms) {
    const form = await getForm(ref.blobId);
    if (form) {
      indexLocalForm(form);
      forms.push(form);
    }
  }

  const pointers = readRecord<string>(CREATOR_MANIFEST_POINTERS_KEY);
  pointers[manifest.ownerAddress.toLowerCase()] = blobId;
  writeRecord(CREATOR_MANIFEST_POINTERS_KEY, pointers);
  return forms;
}

export async function saveDraft(draft: Omit<FormDraft, "updatedAt">): Promise<FormDraft> {
  const next: FormDraft = { ...draft, updatedAt: new Date().toISOString() };
  const drafts = read<FormDraft>(DRAFTS_KEY).filter((d) => d.draftId !== next.draftId);
  drafts.unshift(next);
  write(DRAFTS_KEY, drafts);
  return next;
}

export async function listDrafts(): Promise<FormDraft[]> {
  return read<FormDraft>(DRAFTS_KEY);
}

export async function deleteDraft(draftId: string): Promise<void> {
  write(
    DRAFTS_KEY,
    read<FormDraft>(DRAFTS_KEY).filter((d) => d.draftId !== draftId),
  );
}

export function updateResponse(id: string, patch: Partial<FormResponse>) {
  const all = read<FormResponse>(RESP_KEY);
  const idx = all.findIndex((r) => r.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch };
    write(RESP_KEY, all);
  }
}

export function deleteResponse(id: string) {
  write(
    RESP_KEY,
    read<FormResponse>(RESP_KEY).filter((r) => r.id !== id),
  );
}

export function bulkUpdate(ids: string[], patch: Partial<FormResponse>) {
  const all = read<FormResponse>(RESP_KEY);
  ids.forEach((id) => {
    const i = all.findIndex((r) => r.id === id);
    if (i >= 0) all[i] = { ...all[i], ...patch };
  });
  write(RESP_KEY, all);
}

export function bulkDelete(ids: string[]) {
  write(
    RESP_KEY,
    read<FormResponse>(RESP_KEY).filter((r) => !ids.includes(r.id)),
  );
}

export function computeStats(form: FormSchema, responses: FormResponse[]): AdminStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = responses.filter((r) => new Date(r.submittedAt) >= today).length;
  const required = form.fields.filter((f) => f.required && f.type !== "section");
  const completionRate =
    responses.length === 0 || required.length === 0
      ? 100
      : Math.round(
          (responses.reduce((acc, r) => {
            const filled = required.filter(
              (f) => r.data[f.id] !== undefined && r.data[f.id] !== "" && r.data[f.id] !== null,
            ).length;
            return acc + filled / required.length;
          }, 0) /
            responses.length) *
            100,
        );
  const starField = form.fields.find((f) => f.type === "star");
  let avgStar: number | null = null;
  if (starField && responses.length) {
    const vals = responses.map((r) => Number(r.data[starField.id]) || 0).filter((v) => v > 0);
    avgStar = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  }
  return { total: responses.length, today: todayCount, completionRate, avgStar };
}

export function formatResponseValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (isEncryptionEnvelope(value))
    return value.provider === "seal"
      ? "[Seal encrypted response]"
      : "[Encrypted response - private key required]";
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "object" && "blobId" in value) {
    const attachment = value as AttachmentValue;
    return `${attachment.name} (${attachment.blobId})`;
  }
  return String(value);
}

export function exportCsv(form: FormSchema, responses: FormResponse[]): string {
  const cols = form.fields.filter((f) => f.type !== "section");
  const header = [
    "#",
    "Submitted",
    "Priority",
    "Reviewed",
    "Starred",
    "Internal note",
    ...cols.map((c) => c.label),
  ];
  const rows = responses.map((r, i) => [
    String(i + 1),
    new Date(r.submittedAt).toISOString(),
    r.priority || "",
    r.reviewed ? "yes" : "no",
    r.starred ? "yes" : "no",
    r.internalNote || "",
    ...cols.map((c) => formatResponseValue(r.data[c.id])),
  ]);
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}

export function exportJson(form: FormSchema, responses: FormResponse[]): string {
  return JSON.stringify(
    {
      kind: "formrus.responseExport",
      payloadVersion: 1,
      exportedAt: new Date().toISOString(),
      form: {
        blobId: form.blobId,
        title: form.title,
        description: form.description,
        isPrivate: form.isPrivate,
        formVersion: form.formVersion,
        publishedAt: form.publishedAt,
        fields: form.fields,
      },
      responses,
    },
    null,
    2,
  );
}

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function excelCell(value: unknown): string {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function excelSheet(name: string, rows: unknown[][]): string {
  return `<Worksheet ss:Name="${escapeXml(name).slice(0, 31)}"><Table>${rows
    .map((row) => `<Row>${row.map(excelCell).join("")}</Row>`)
    .join("")}</Table></Worksheet>`;
}

function responseAttachmentRows(form: FormSchema, responses: FormResponse[]): unknown[][] {
  const rows: unknown[][] = [
    ["Response blob ID", "Submitted", "Field", "File name", "Type", "Size", "Blob ID", "Mode"],
  ];

  for (const response of responses) {
    for (const field of form.fields) {
      const value = response.data[field.id];
      if (!value || typeof value !== "object" || !("blobId" in value)) continue;
      const attachment = value as AttachmentValue;
      rows.push([
        response.id,
        new Date(response.submittedAt).toISOString(),
        field.label,
        attachment.name,
        attachment.type,
        attachment.size,
        attachment.blobId,
        attachment.storageMode,
      ]);
    }
  }

  return rows;
}

export function exportExcelWorkbook(form: FormSchema, responses: FormResponse[]): string {
  const fields = form.fields.filter((field) => field.type !== "section");
  const responseRows: unknown[][] = [
    [
      "#",
      "Response blob ID",
      "Submitted",
      "Submitter wallet",
      "Priority",
      "Reviewed",
      "Starred",
      "Internal note",
      ...fields.map((field) => field.label),
    ],
    ...responses.map((response, index) => [
      index + 1,
      response.id,
      new Date(response.submittedAt).toISOString(),
      response.submitterAddress || "",
      response.priority || "",
      response.reviewed ? "yes" : "no",
      response.starred ? "yes" : "no",
      response.internalNote || "",
      ...fields.map((field) => formatResponseValue(response.data[field.id])),
    ]),
  ];
  const fieldRows: unknown[][] = [
    ["ID", "Label", "Type", "Required", "Options"],
    ...form.fields.map((field) => [
      field.id,
      field.label,
      field.type,
      field.required ? "yes" : "no",
      field.options?.join("; ") || "",
    ]),
  ];
  const metadataRows: unknown[][] = [
    ["Property", "Value"],
    ["Exported at", new Date().toISOString()],
    ["Form blob ID", form.blobId],
    ["Title", form.title],
    ["Version", form.formVersion || 1],
    ["Published at", form.publishedAt || ""],
    ["Private", form.isPrivate ? "yes" : "no"],
    ["Response count", responses.length],
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  ${excelSheet("Responses", responseRows)}
  ${excelSheet("Fields", fieldRows)}
  ${excelSheet("Attachments", responseAttachmentRows(form, responses))}
  ${excelSheet("Metadata", metadataRows)}
</Workbook>`;
}

export function downloadTextFile(filename: string, content: string, type: string) {
  if (!isBrowser()) return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, content: string) {
  downloadTextFile(filename, content, "text/csv;charset=utf-8");
}

export function downloadJson(filename: string, content: string) {
  downloadTextFile(filename, content, "application/json;charset=utf-8");
}

export function downloadExcel(filename: string, content: string) {
  downloadTextFile(filename, content, "application/vnd.ms-excel;charset=utf-8");
}
