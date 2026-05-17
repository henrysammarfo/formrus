import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Check,
  Copy,
  ArrowUp,
  ArrowDown,
  Save,
  Clock,
  Sparkles,
} from "lucide-react";
import type {
  AttachmentValue,
  FormBranding,
  FormDraft,
  FormField,
  FieldType,
  ResponsePolicy,
  StoragePolicy,
  SubmitterMode,
} from "@/types";
import { FIELD_TYPE_LABELS } from "@/types";
import { AttachmentDropzone, getAttachmentSource } from "@/components/AttachmentDropzone";
import { FieldRenderer } from "@/components/FieldRenderer";
import {
  getFormTemplates,
  WALRUS_SESSIONS_REVIEW_ADMIN,
  type FormTemplate,
} from "@/lib/form-templates";
import {
  ensurePrivateAccessControl,
  isSealConfigured,
  makeAccessKeyId,
  registerSealFormAccess,
} from "@/lib/seal";
import {
  firstValidationMessage,
  validateDraftForSave,
  validateFormForPublish,
} from "@/lib/validation";
import {
  getDefaultStoragePolicy,
  getWalrusConfig,
  getWalrusStorageStatus,
  publishCreatorManifest,
  publishForm,
  makeBlobId,
  truncateBlob,
  saveDraft,
  listDrafts,
  deleteDraft,
} from "@/lib/walrus";
import { toast } from "sonner";

export const Route = createFileRoute("/builder")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Form Builder - FORMRUS" },
      {
        name: "description",
        content:
          "Build a new decentralized form. Add fields, toggle private mode for Seal, publish to Walrus.",
      },
      { property: "og:title", content: "Form Builder - FORMRUS" },
      { property: "og:description", content: "Drag fields, customize, publish to Walrus." },
    ],
  }),
  component: Builder,
});

const FIELD_TYPES: FieldType[] = [
  "text",
  "longText",
  "richText",
  "dropdown",
  "checkbox",
  "radio",
  "star",
  "screenshot",
  "video",
  "file",
  "url",
  "email",
  "number",
  "date",
  "section",
];
const FORM_TEMPLATES = getFormTemplates();

function Builder() {
  const [requestedDraftId] = useState(() =>
    typeof window === "undefined"
      ? undefined
      : new URLSearchParams(window.location.search).get("draft") || undefined,
  );
  const [draftId, setDraftId] = useState(() => makeBlobId().slice(0, 12));
  const [title, setTitle] = useState("Untitled Form");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitterMode, setSubmitterMode] = useState<SubmitterMode>("public");
  const [responsePolicy, setResponsePolicy] = useState<ResponsePolicy>({
    allowMultipleSubmissions: true,
    saveIncompleteResponses: true,
  });
  const [storagePolicy, setStoragePolicy] = useState<StoragePolicy>(() =>
    getDefaultStoragePolicy(),
  );
  const [fields, setFields] = useState<FormField[]>([]);
  const [branding, setBranding] = useState<FormBranding>({
    coverPlacement: "banner",
    logoPlacement: "left",
    responseLayout: "standard",
    successTheme: "clean",
    successEffect: "none",
    successTitle: "Response received",
    successMessage: "Your response has been stored.",
  });
  const [adminAddresses, setAdminAddresses] = useState<string[]>([WALRUS_SESSIONS_REVIEW_ADMIN]);
  const [formVersion, setFormVersion] = useState(1);
  const [drafts, setDrafts] = useState<FormDraft[]>([]);
  const [accessControl, setAccessControl] = useState<FormDraft["accessControl"]>(() => ({
    provider: "formrus-rsa",
    keyId: makeAccessKeyId(),
  }));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{
    blobId: string;
    creatorManifestBlobId?: string;
  } | null>(null);
  const storageStatus = getWalrusStorageStatus();
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const sealEnabled = isSealConfigured();

  useEffect(() => {
    const previewFields = fields.filter((field) => field.type !== "section");
    setPreviewStep((step) => Math.min(step, Math.max(previewFields.length - 1, 0)));
  }, [fields]);

  const addField = (type: FieldType) => {
    const needsOptions = type === "dropdown" || type === "radio" || type === "checkbox";
    setFields((prev) => [
      ...prev,
      {
        id: makeBlobId().slice(0, 12),
        type,
        label: type === "section" ? "Section title" : `New ${FIELD_TYPE_LABELS[type]}`,
        required: false,
        options: needsOptions ? ["Option 1", "Option 2"] : undefined,
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };
  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id));
  const adminAddressText = adminAddresses.join("\n");
  const updateAdminAddresses = (value: string) => {
    const next = value
      .split(/\s|,|;/)
      .map((address) => address.trim())
      .filter(Boolean);
    setAdminAddresses([...new Set(next)]);
  };
  const updateBranding = (patch: Partial<FormBranding>) =>
    setBranding((prev) => ({ ...prev, ...patch }));
  const applyTemplate = (template: FormTemplate) => {
    setTitle(template.title);
    setDescription(template.description);
    setBranding({
      coverPlacement: "banner",
      logoPlacement: "left",
      responseLayout: "standard",
      successTheme: "clean",
      successEffect: "none",
      ...template.branding,
    });
    setResponsePolicy(
      template.responsePolicy || {
        allowMultipleSubmissions: true,
        saveIncompleteResponses: true,
      },
    );
    setFields(template.fields);
    setAdminAddresses(template.adminAddresses);
    setPublished(null);
    toast.success(`${template.name} loaded`);
  };
  const moveTo = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setFields((prev) => {
      const sourceIndex = prev.findIndex((f) => f.id === sourceId);
      const targetIndex = prev.findIndex((f) => f.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;
      const next = [...prev];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
  };
  const move = (id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const i = prev.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const previewInputFields = fields.filter((field) => field.type !== "section");
  const previewStepper = branding.responseLayout === "stepper" && previewInputFields.length > 1;
  const previewField = previewInputFields[previewStep];

  const persistDraft = async (
    publishedBlobId?: string,
    versionOverride = formVersion,
    accessOverride = accessControl,
  ) => {
    const validation = validateDraftForSave({ title, description, fields });
    if (!validation.ok) {
      toast.error(firstValidationMessage(validation) || "Draft is not valid yet");
      return null;
    }
    const privateAccess = isPrivate
      ? await ensurePrivateAccessControl(accessOverride)
      : accessOverride;
    setAccessControl(privateAccess);
    const saved = await saveDraft({
      draftId,
      title,
      description,
      isPrivate,
      fields,
      branding,
      creatorAddress: account?.address,
      submitterMode,
      storagePolicy,
      responsePolicy,
      formVersion: versionOverride,
      publishedBlobId,
      adminAddresses,
      accessControl: isPrivate ? privateAccess : undefined,
    });
    setDrafts(await listDrafts());
    toast.success("Draft saved");
    return saved;
  };

  const loadDraft = (draft: FormDraft) => {
    setDraftId(draft.draftId);
    setTitle(draft.title);
    setDescription(draft.description);
    setIsPrivate(draft.isPrivate);
    setSubmitterMode(draft.submitterMode || "public");
    setStoragePolicy(draft.storagePolicy || getDefaultStoragePolicy());
    setResponsePolicy(
      draft.responsePolicy || {
        allowMultipleSubmissions: true,
        saveIncompleteResponses: true,
      },
    );
    setFields(draft.fields);
    setBranding(draft.branding || {});
    setAdminAddresses(
      draft.adminAddresses?.length ? draft.adminAddresses : [WALRUS_SESSIONS_REVIEW_ADMIN],
    );
    setFormVersion(draft.formVersion || 1);
    setAccessControl(draft.accessControl || { provider: "formrus-rsa", keyId: makeAccessKeyId() });
    setPublished(draft.publishedBlobId ? { blobId: draft.publishedBlobId } : null);
    toast.success("Draft loaded");
  };

  useEffect(() => {
    listDrafts().then((nextDrafts) => {
      setDrafts(nextDrafts);
      if (!requestedDraftId) return;
      const requested = nextDrafts.find((draft) => draft.draftId === requestedDraftId);
      if (requested) loadDraft(requested);
    });
  }, [requestedDraftId]);

  const removeDraft = async (id: string) => {
    await deleteDraft(id);
    setDrafts(await listDrafts());
    if (id === draftId) {
      setDraftId(makeBlobId().slice(0, 12));
      setPublished(null);
    }
  };

  const handlePublish = async () => {
    const validation = validateFormForPublish({ title, description, fields });
    if (!validation.ok) {
      toast.error(firstValidationMessage(validation) || "Form is not ready to publish");
      return;
    }
    setPublishing(true);
    try {
      const privateAccess = isPrivate ? await ensurePrivateAccessControl(accessControl) : undefined;
      let finalAccess = privateAccess;
      if (privateAccess?.provider === "seal") {
        if (!account) {
          toast.error("Connect your Sui wallet to register private form access before publishing");
          return;
        }
        finalAccess = await registerSealFormAccess(privateAccess, adminAddresses, {
          address: account.address,
          dAppKit,
        });
      }
      if (finalAccess) setAccessControl(finalAccess);
      const form = await publishForm({
        title,
        description,
        isPrivate,
        creatorAddress: account?.address,
        submitterMode,
        storagePolicy,
        responsePolicy,
        fields,
        branding,
        formVersion,
        draftId,
        publishedFromDraftId: draftId,
        adminAddresses,
        accessControl: finalAccess,
      });
      const creatorManifestBlobId = account?.address
        ? await publishCreatorManifest(account.address, form)
        : undefined;
      setPublished({ blobId: form.blobId, creatorManifestBlobId });
      const nextVersion = formVersion + 1;
      setFormVersion(nextVersion);
      await persistDraft(form.blobId, nextVersion, finalAccess);
      toast.success(
        form.receipt?.storageMode === "walrus"
          ? "Published to Walrus"
          : form.receipt?.fallbackReason
            ? `Saved locally: ${form.receipt.fallbackReason}`
            : "Saved locally - add Walrus endpoints to publish blobs",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8">
        <h1
          className="text-3xl font-semibold text-foreground"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          Form Builder
        </h1>
        <p className="text-sm text-muted-foreground">
          Design your form on the left, see live preview on the right. Draft v{formVersion} is
          private until you publish.
        </p>
      </div>

      <section className="mb-6 rounded-3xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Start from a template</h2>
            <p className="text-xs text-muted-foreground">
              Use a ready workflow, then edit every field and visual.
            </p>
          </div>
          <Sparkles size={18} className="text-primary" />
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {FORM_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className="rounded-2xl border border-border bg-secondary/50 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-accent"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary">
                {template.category}
              </span>
              <span className="mt-1 block text-sm font-semibold text-foreground">
                {template.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-white p-6">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Form title
            </label>
            <input
              className="mb-4 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </label>
            <textarea
              rows={2}
              className="mb-4 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reviewer wallet addresses
            </label>
            <textarea
              rows={3}
              className="mb-4 w-full rounded-lg border border-border px-3 py-2.5 font-mono text-xs outline-none focus:border-primary"
              value={adminAddressText}
              onChange={(e) => updateAdminAddresses(e.target.value)}
              placeholder="0x..."
            />
            <p className="-mt-3 mb-4 text-xs leading-5 text-muted-foreground">
              Add your own team wallets here. For the Walrus Session template, the required review
              address is included automatically.
            </p>
            <div className="mb-4 rounded-xl border border-border bg-secondary/50 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="block text-sm font-medium text-foreground">Creator wallet</span>
                  <span className="block text-xs text-muted-foreground">
                    Connect before publishing to attach this form to your cross-device creator
                    manifest.
                  </span>
                </div>
                <ConnectButton />
              </div>
              {account?.address && (
                <code className="block truncate rounded-lg bg-white px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                  {account.address}
                </code>
              )}
            </div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Who can submit?
            </label>
            <select
              value={submitterMode}
              onChange={(event) => setSubmitterMode(event.target.value as SubmitterMode)}
              className="mb-4 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="public">Anyone with the link</option>
              <option value="wallet_optional">Anyone, with optional wallet proof</option>
              <option value="wallet_required">Connected wallet required</option>
            </select>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <ToggleControl
                label="Allow another response"
                description="Show a second-submit option after success."
                checked={responsePolicy.allowMultipleSubmissions}
                onChange={(checked) =>
                  setResponsePolicy((prev) => ({
                    ...prev,
                    allowMultipleSubmissions: checked,
                  }))
                }
              />
              <ToggleControl
                label="Resume unfinished response"
                description="Autosave answers on this device while filling."
                checked={responsePolicy.saveIncompleteResponses}
                onChange={(checked) =>
                  setResponsePolicy((prev) => ({
                    ...prev,
                    saveIncompleteResponses: checked,
                  }))
                }
              />
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  File MB
                </span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={storagePolicy.maxFileSizeMb}
                  onChange={(event) =>
                    setStoragePolicy((prev) => ({
                      ...prev,
                      maxFileSizeMb: Math.min(5, Math.max(1, Number(event.target.value) || 1)),
                    }))
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Video MB
                </span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={storagePolicy.maxVideoSizeMb}
                  onChange={(event) =>
                    setStoragePolicy((prev) => ({
                      ...prev,
                      maxVideoSizeMb: Math.min(5, Math.max(1, Number(event.target.value) || 1)),
                    }))
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Uploads
                </span>
                <input
                  type="number"
                  min={1}
                  max={2}
                  value={storagePolicy.maxFilesPerResponse}
                  onChange={(event) =>
                    setStoragePolicy((prev) => ({
                      ...prev,
                      maxFilesPerResponse: Math.min(
                        2,
                        Math.max(1, Number(event.target.value) || 1),
                      ),
                    }))
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2.5">
              <span>
                <span className="block text-sm font-medium text-foreground">Private responses</span>
                <span className="block text-xs text-muted-foreground">
                  Encrypt submissions before they are stored.
                </span>
              </span>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-border transition-colors checked:bg-primary relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
              />
            </label>
            {isPrivate && sealEnabled && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-accent p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  Seal access registration
                </div>
                <p className="mb-3 text-xs leading-5 text-muted-foreground">
                  Private forms register a per-form admin allowlist on Sui before publishing so
                  admins only decrypt this form's responses.
                </p>
                <ConnectButton />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => persistDraft()}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:border-primary"
              >
                <Save size={14} /> Save draft
              </button>
              <span className="rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">
                Draft ID {draftId}
              </span>
            </div>
          </div>

          <BrandingControls
            branding={branding}
            storagePolicy={storagePolicy}
            onChange={updateBranding}
          />

          {drafts.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock size={14} /> Drafts
              </h3>
              <div className="space-y-2">
                {drafts.slice(0, 5).map((d) => (
                  <div
                    key={d.draftId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => loadDraft(d)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-sm font-semibold text-foreground">
                        {d.title || "Untitled Form"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        v{d.formVersion} saved {new Date(d.updatedAt).toLocaleString()}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDraft(d.draftId)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-white hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-white p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              + Add Field
            </h3>
            <div className="flex flex-wrap gap-2">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => addField(t)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary hover:bg-accent hover:text-primary"
                >
                  <Plus size={12} /> {FIELD_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {fields.length > 0 && (
            <div className="space-y-3">
              {fields.map((f, idx) => (
                <div
                  key={f.id}
                  draggable
                  onDragStart={() => setDraggingId(f.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggingId) moveTo(draggingId, f.id);
                    setDraggingId(null);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={`group rounded-xl border bg-white p-4 transition-all ${draggingId === f.id ? "border-primary opacity-60" : "border-border"}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button
                        onClick={() => move(f.id, -1)}
                        disabled={idx === 0}
                        className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <GripVertical
                        size={14}
                        className="cursor-grab text-muted-foreground active:cursor-grabbing"
                      />
                      <button
                        onClick={() => move(f.id, 1)}
                        disabled={idx === fields.length - 1}
                        className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                          value={f.label}
                          onChange={(e) => updateField(f.id, { label: e.target.value })}
                        />
                        <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase text-primary">
                          {FIELD_TYPE_LABELS[f.type]}
                        </span>
                        <button
                          onClick={() => removeField(f.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {f.options && (
                        <input
                          className="w-full rounded-lg border border-border px-3 py-2 text-xs outline-none focus:border-primary"
                          value={f.options.join(", ")}
                          onChange={(e) =>
                            updateField(f.id, {
                              options: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      )}
                      {f.type !== "section" && (
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={f.required}
                            onChange={(e) => updateField(f.id, { required: e.target.checked })}
                            className="accent-primary"
                          />
                          Required
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!published ? (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:opacity-60"
            >
              {publishing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Publishing...
                </>
              ) : (
                "Publish form"
              )}
            </button>
          ) : (
            <PublishedCard
              blobId={published.blobId}
              creatorManifestBlobId={published.creatorManifestBlobId}
              version={formVersion - 1}
              onReset={() => {
                setPublished(null);
                setFields([]);
                setTitle("Untitled Form");
                setDescription("");
                setSubmitterMode("public");
                setResponsePolicy({
                  allowMultipleSubmissions: true,
                  saveIncompleteResponses: true,
                });
                setStoragePolicy(getDefaultStoragePolicy());
                setBranding({
                  coverPlacement: "banner",
                  logoPlacement: "left",
                  responseLayout: "standard",
                  successTheme: "clean",
                  successEffect: "none",
                  successTitle: "Response received",
                  successMessage: "Your response has been stored.",
                });
                setAdminAddresses([WALRUS_SESSIONS_REVIEW_ADMIN]);
                setDraftId(makeBlobId().slice(0, 12));
                setAccessControl({ provider: "formrus-rsa", keyId: makeAccessKeyId() });
                setFormVersion(1);
              }}
            />
          )}

          <StorageStatusCard status={storageStatus} />
        </div>

        {/* RIGHT - preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Live Preview
          </div>
          <div
            className={`overflow-hidden rounded-2xl border border-border bg-white p-8 shadow-sm ${branding.coverPlacement === "background" ? "relative" : ""}`}
            style={
              branding.coverPlacement === "background" && getAttachmentSource(branding.coverImage)
                ? {
                    backgroundImage: `linear-gradient(rgba(255,255,255,.9), rgba(255,255,255,.96)), url(${getAttachmentSource(branding.coverImage)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {branding.coverPlacement !== "hidden" &&
              branding.coverPlacement !== "background" &&
              getAttachmentSource(branding.coverImage) && (
                <div className="-mx-8 -mt-8 mb-6 h-44 overflow-hidden rounded-t-2xl bg-slate-950">
                  <div className="relative h-full w-full">
                    <img
                      src={getAttachmentSource(branding.coverImage)}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-45 blur-xl"
                    />
                    <img
                      src={getAttachmentSource(branding.coverImage)}
                      alt=""
                      className="relative z-10 mx-auto h-full w-full object-contain object-center"
                    />
                  </div>
                </div>
              )}
            {branding.logoPlacement !== "hidden" && getAttachmentSource(branding.logoImage) && (
              <img
                src={getAttachmentSource(branding.logoImage)}
                alt=""
                className={`mb-4 h-16 w-16 rounded-2xl object-cover ${branding.logoPlacement === "center" ? "mx-auto" : ""}`}
              />
            )}
            <h2
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {title || "Untitled Form"}
            </h2>
            {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
            {isPrivate && (
              <span className="mt-3 inline-block rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase text-primary">
                Seal encrypted private
              </span>
            )}
            <div className="mt-6 space-y-5">
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Add fields to see preview...</p>
              )}
              {previewStepper && previewField ? (
                <div className="rounded-2xl border border-border bg-[#fbfcfd] p-4">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                      {previewStep + 1} / {previewInputFields.length}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewStep((step) => Math.max(step - 1, 0))}
                        disabled={previewStep === 0}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground disabled:opacity-30"
                        aria-label="Preview previous question"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewStep((step) =>
                            Math.min(step + 1, previewInputFields.length - 1),
                          )
                        }
                        disabled={previewStep === previewInputFields.length - 1}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground disabled:opacity-30"
                        aria-label="Preview next question"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                  <FieldRenderer
                    field={previewField}
                    value={undefined}
                    onChange={() => {}}
                    disabled
                    storagePolicy={storagePolicy}
                  />
                  <button
                    disabled
                    className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground opacity-70"
                  >
                    {previewStep === previewInputFields.length - 1 ? "Submit" : "Continue"}
                  </button>
                </div>
              ) : (
                <>
                  {fields.map((f) => (
                    <FieldRenderer
                      key={f.id}
                      field={f}
                      value={undefined}
                      onChange={() => {}}
                      disabled
                      storagePolicy={storagePolicy}
                    />
                  ))}
                  {fields.length > 0 && (
                    <button
                      disabled
                      className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground opacity-70"
                    >
                      Submit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandingControls({
  branding,
  storagePolicy,
  onChange,
}: {
  branding: FormBranding;
  storagePolicy: StoragePolicy;
  onChange: (patch: Partial<FormBranding>) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Branding and success page
      </h3>
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        Choose the images, placement, and completion style for this form.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <AttachmentDropzone
          value={branding.coverImage}
          onChange={(value: AttachmentValue) => onChange({ coverImage: value })}
          accept="image/*"
          label="Company or cover image"
          compact
          storagePolicy={storagePolicy}
        />
        <AttachmentDropzone
          value={branding.logoImage}
          onChange={(value: AttachmentValue) => onChange({ logoImage: value })}
          accept="image/*"
          label="Logo / icon"
          compact
          storagePolicy={storagePolicy}
        />
        <AttachmentDropzone
          value={branding.successImage}
          onChange={(value: AttachmentValue) => onChange({ successImage: value })}
          accept="image/*"
          label="Success image/GIF"
          compact
          storagePolicy={storagePolicy}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SelectControl
          label="Response flow"
          value={branding.responseLayout || "standard"}
          onChange={(value) =>
            onChange({ responseLayout: value as FormBranding["responseLayout"] })
          }
          options={[
            ["standard", "Full form"],
            ["stepper", "One question at a time"],
          ]}
        />
        <SelectControl
          label="Cover placement"
          value={branding.coverPlacement || "banner"}
          onChange={(value) =>
            onChange({ coverPlacement: value as FormBranding["coverPlacement"] })
          }
          options={[
            ["banner", "Top banner"],
            ["background", "Page background"],
            ["hidden", "Hidden"],
          ]}
        />
        <SelectControl
          label="Logo placement"
          value={branding.logoPlacement || "left"}
          onChange={(value) => onChange({ logoPlacement: value as FormBranding["logoPlacement"] })}
          options={[
            ["left", "Left"],
            ["center", "Center"],
            ["hidden", "Hidden"],
          ]}
        />
        <SelectControl
          label="Success style"
          value={branding.successTheme || "clean"}
          onChange={(value) => onChange({ successTheme: value as FormBranding["successTheme"] })}
          options={[
            ["clean", "Clean"],
            ["blue", "Blue"],
            ["midnight", "Midnight"],
            ["celebration", "Celebration"],
          ]}
        />
        <SelectControl
          label="Success effect"
          value={branding.successEffect || "none"}
          onChange={(value) => onChange({ successEffect: value as FormBranding["successEffect"] })}
          options={[
            ["none", "None"],
            ["confetti", "Confetti"],
            ["splash", "Full-screen splash"],
          ]}
        />
      </div>
      <label className="mb-1 mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Success title
      </label>
      <input
        className="mb-3 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        value={branding.successTitle || ""}
        onChange={(e) => onChange({ successTitle: e.target.value })}
        placeholder="Response received"
      />
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Success message
      </label>
      <textarea
        rows={2}
        className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        value={branding.successMessage || ""}
        onChange={(e) => onChange({ successMessage: e.target.value })}
        placeholder="Your response has been stored."
      />
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function StorageStatusCard({ status }: { status: ReturnType<typeof getWalrusStorageStatus> }) {
  const isWalrus = status.mode === "walrus";
  return (
    <details
      className={`rounded-2xl border p-4 text-sm ${isWalrus ? "border-border bg-white text-foreground" : "border-amber-200 bg-amber-50 text-amber-950"}`}
    >
      <summary className="cursor-pointer font-semibold">
        {isWalrus ? "Storage ready" : "Storage setup needed"}
      </summary>
      <p className="mt-2 text-xs opacity-80">{status.message}</p>
      <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
        <div className="rounded-lg bg-secondary px-2 py-1.5">
          <span className="font-semibold">Write route:</span>{" "}
          {status.publisherUrl ? truncateBlob(status.publisherUrl) : "missing"}
        </div>
        <div className="rounded-lg bg-secondary px-2 py-1.5">
          <span className="font-semibold">Read route:</span>{" "}
          {status.aggregatorUrl ? truncateBlob(status.aggregatorUrl) : "missing"}
        </div>
      </div>
    </details>
  );
}

function ToggleControl({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 px-3 py-3">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-border transition-colors checked:bg-primary before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
      />
    </label>
  );
}

function PublishedCard({
  blobId,
  creatorManifestBlobId,
  version,
  onReset,
}: {
  blobId: string;
  creatorManifestBlobId?: string;
  version: number;
  onReset: () => void;
}) {
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/form/${blobId}` : `/form/${blobId}`;
  const walrusEnabled = getWalrusConfig().enabled;
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-accent p-6">
      <div className="mb-3 flex items-center gap-2 text-primary">
        <Check size={18} />{" "}
        <span className="font-semibold">
          {walrusEnabled ? "Published to Walrus" : "Saved locally"} as v{version}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Blob ID</div>
          <div className="font-mono text-xs text-foreground">{blobId}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Shareable link
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-white px-2 py-1.5 font-mono text-xs">
              {link}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast.success("Link copied");
              }}
              className="rounded-lg border border-border bg-white p-2 hover:border-primary"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
        {creatorManifestBlobId && (
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Creator manifest
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-white px-2 py-1.5 font-mono text-xs">
                {creatorManifestBlobId}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(creatorManifestBlobId);
                  toast.success("Manifest copied");
                }}
                className="rounded-lg border border-border bg-white p-2 hover:border-primary"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/form/$blobId"
          params={{ blobId }}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          Open form
        </Link>
        <Link
          to="/admin/$blobId"
          params={{ blobId }}
          className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:border-primary"
        >
          Admin
        </Link>
        <button
          onClick={onReset}
          className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:border-primary"
        >
          New form
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {walrusEnabled ? "Walrus blob" : "Local dev blob"}: {truncateBlob(blobId)}
      </p>
    </div>
  );
}
