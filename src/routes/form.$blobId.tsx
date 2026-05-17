import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  Copy,
  Wallet,
} from "lucide-react";
import { getAttachmentSource } from "@/components/AttachmentDropzone";
import { FieldRenderer } from "@/components/FieldRenderer";
import { firstValidationMessage, isFilledValue, validateResponseValues } from "@/lib/validation";
import { getForm, submitResponse, truncateBlob } from "@/lib/walrus";
import type { FormSchema } from "@/types";
import { toast } from "sonner";

type SubmissionReceipt = {
  id: string;
  responseIndexBlobId?: string;
  storageMode?: string;
  fallbackReason?: string;
  submittedAt?: string;
};

type StoredResponseDraft = {
  values: Record<string, unknown>;
  activeStep: number;
  updatedAt: string;
};

const DEFAULT_RESPONSE_POLICY = {
  allowMultipleSubmissions: true,
  saveIncompleteResponses: true,
};

export const Route = createFileRoute("/form/$blobId")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Form ${params.blobId.slice(0, 6)} - FORMRUS` },
      { name: "description", content: "Respond to a form stored on Walrus Protocol." },
    ],
  }),
  component: FormView,
});

function FormView() {
  const { blobId } = Route.useParams();
  const [form, setForm] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);
  const [done, setDone] = useState<SubmissionReceipt | null>(null);
  const [priorSubmission, setPriorSubmission] = useState<SubmissionReceipt | null>(null);
  const account = useCurrentAccount();

  useEffect(() => {
    getForm(blobId).then((f) => {
      setForm(f);
      setLoading(false);
      setActiveStep(0);
      setValues({});
      setDone(null);
    });
  }, [blobId]);

  useEffect(() => {
    if (!showSuccessSplash) return;
    const timeout = window.setTimeout(() => setShowSuccessSplash(false), 1850);
    return () => window.clearTimeout(timeout);
  }, [showSuccessSplash]);

  const inputFields = form?.fields.filter((f) => f.type !== "section") || [];
  const totalFields = inputFields.length;
  const filled = Object.values(values).filter(isFilledValue).length;
  const progress = totalFields ? Math.round((filled / totalFields) * 100) : 0;
  const responseLayout = form?.branding?.responseLayout || "standard";
  const responsePolicy = form?.responsePolicy || DEFAULT_RESPONSE_POLICY;
  const isStepper = responseLayout === "stepper" && inputFields.length > 1;
  const currentStepIndex = Math.min(activeStep, Math.max(inputFields.length - 1, 0));
  const currentField = inputFields[currentStepIndex];
  const draftStorageKey = form
    ? respondentStorageKey("draft", form.blobId, account?.address)
    : undefined;
  const submittedStorageKey = form
    ? respondentStorageKey("submitted", form.blobId, account?.address)
    : undefined;

  useEffect(() => {
    if (!form || !submittedStorageKey) return;
    setPriorSubmission(readJson<SubmissionReceipt>(submittedStorageKey));
  }, [form, submittedStorageKey]);

  useEffect(() => {
    if (!form || !draftStorageKey || !responsePolicy.saveIncompleteResponses || done) return;
    const draft = readJson<StoredResponseDraft>(draftStorageKey);
    if (!draft) return;
    setValues(draft.values || {});
    setActiveStep(Math.min(draft.activeStep || 0, Math.max(inputFields.length - 1, 0)));
    toast.info("Draft restored");
  }, [done, draftStorageKey, form, inputFields.length, responsePolicy.saveIncompleteResponses]);

  useEffect(() => {
    if (!form || !draftStorageKey || !responsePolicy.saveIncompleteResponses || done) return;
    const hasValues = Object.values(values).some(isFilledValue);
    if (!hasValues && activeStep === 0) return;
    const timeout = window.setTimeout(() => {
      writeJson<StoredResponseDraft>(draftStorageKey, {
        values: sanitizeDraftValues(values),
        activeStep,
        updatedAt: new Date().toISOString(),
      });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [activeStep, done, draftStorageKey, form, responsePolicy.saveIncompleteResponses, values]);

  const submitValues = async () => {
    if (!form) return;
    if (!responsePolicy.allowMultipleSubmissions && priorSubmission) {
      toast.error("This form only accepts one response from this browser or wallet");
      return;
    }
    if (form.submitterMode === "wallet_required" && !account) {
      toast.error("Connect your Sui wallet to submit this form");
      return;
    }
    const validation = validateResponseValues(form, values);
    if (!validation.ok) {
      toast.error(firstValidationMessage(validation) || "Check your response and try again");
      return;
    }
    setSubmitting(true);
    try {
      const r = await submitResponse(form, values, { submitterAddress: account?.address });
      setDone({
        id: r.id,
        responseIndexBlobId: r.responseIndexBlobId,
        storageMode: r.receipt?.storageMode,
        fallbackReason: r.receipt?.fallbackReason,
        submittedAt: r.submittedAt,
      });
      if (draftStorageKey) window.localStorage.removeItem(draftStorageKey);
      if (!responsePolicy.allowMultipleSubmissions && submittedStorageKey) {
        const receipt = {
          id: r.id,
          responseIndexBlobId: r.responseIndexBlobId,
          storageMode: r.receipt?.storageMode,
          fallbackReason: r.receipt?.fallbackReason,
          submittedAt: r.submittedAt,
        };
        writeJson(submittedStorageKey, receipt);
        setPriorSubmission(receipt);
      }
      if (form.branding?.successEffect === "splash") setShowSuccessSplash(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitValues();
  };

  const startAnotherResponse = () => {
    setDone(null);
    setValues({});
    setActiveStep(0);
    setShowSuccessSplash(false);
    if (draftStorageKey) window.localStorage.removeItem(draftStorageKey);
  };

  const canLeaveCurrentStep = () => {
    if (!currentField?.required) return true;
    if (isFilledValue(values[currentField.id])) return true;
    toast.error(`${currentField.label} is required`);
    return false;
  };

  const goNext = () => {
    if (!canLeaveCurrentStep()) return;
    setActiveStep((step) => Math.min(step + 1, inputFields.length - 1));
  };

  const handleStepperKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (!isStepper || e.key !== "Enter" || e.shiftKey) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA") return;
    e.preventDefault();
    if (currentStepIndex < inputFields.length - 1) goNext();
    else void submitValues();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }
  if (!form) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h2 className="text-xl font-semibold">Blob not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No form exists at <code className="font-mono">{truncateBlob(blobId)}</code>
        </p>
        <Link
          to="/builder"
          className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Build one
        </Link>
      </div>
    );
  }
  const completion = done || (!responsePolicy.allowMultipleSubmissions ? priorSubmission : null);
  if (completion) {
    const isPreviousSubmission = !done;
    const theme = form.branding?.successTheme || "clean";
    const copyReceipt = async () => {
      await navigator.clipboard.writeText(completion.id);
      toast.success("Response blob copied");
    };

    return (
      <div className="relative min-h-screen bg-[#fbfcfd] px-4 py-10">
        {showSuccessSplash && <SuccessSplash title={form.branding?.successTitle} />}
        <div
          className={`relative mx-auto max-w-md overflow-hidden rounded-3xl px-6 py-14 text-center shadow-sm ${successThemeClass(theme)}`}
        >
          {form.branding?.successEffect === "confetti" && <Confetti />}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-primary shadow-sm">
            <Check size={28} />
          </div>
          {getAttachmentSource(form.branding?.successImage) && (
            <img
              src={getAttachmentSource(form.branding?.successImage)}
              alt=""
              className="mx-auto mb-5 h-32 w-32 rounded-3xl object-cover"
            />
          )}
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {isPreviousSubmission
              ? "Already submitted"
              : form.branding?.successTitle || "Response received"}
          </h2>
          {isPreviousSubmission ? (
            <p className="mt-2 text-sm opacity-75">
              This form is set to one response per browser or connected wallet.
            </p>
          ) : (
            form.branding?.successMessage && (
              <p className="mt-2 text-sm opacity-75">{form.branding.successMessage}</p>
            )
          )}
          {completion.fallbackReason && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Walrus fallback: {completion.fallbackReason}
            </p>
          )}
          <p className="mt-4 text-sm opacity-70">Response receipt</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2 text-left text-foreground">
            <code className="min-w-0 flex-1 break-all font-mono text-xs">{completion.id}</code>
            <button
              type="button"
              onClick={copyReceipt}
              className="rounded-lg border border-border p-2 text-muted-foreground hover:border-primary hover:text-primary"
              aria-label="Copy response blob ID"
            >
              <Copy size={14} />
            </button>
          </div>
          {completion.responseIndexBlobId && (
            <>
              <p className="mt-4 text-sm opacity-70">Response index receipt</p>
              <div className="mt-2 rounded-xl border border-black/5 bg-white px-3 py-2 text-left text-foreground">
                <code className="break-all font-mono text-xs">
                  {completion.responseIndexBlobId}
                </code>
              </div>
            </>
          )}
          {done && responsePolicy.allowMultipleSubmissions && (
            <button
              type="button"
              onClick={startAnotherResponse}
              className="mt-6 w-full rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
            >
              Submit another response
            </button>
          )}
          <Link
            to="/"
            className="mt-3 block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const coverSrc = getAttachmentSource(form.branding?.coverImage);
  const logoSrc = getAttachmentSource(form.branding?.logoImage);
  const coverPlacement = form.branding?.coverPlacement || "banner";
  const logoPlacement = form.branding?.logoPlacement || "left";
  const hasBanner = coverPlacement === "banner" && coverSrc;

  return (
    <div
      className="min-h-screen bg-[#fbfcfd]"
      style={
        coverPlacement === "background" && coverSrc
          ? {
              backgroundImage: `linear-gradient(rgba(255,255,255,.88), rgba(255,255,255,.96)), url(${coverSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      {hasBanner && (
        <div className="relative h-[clamp(190px,28svh,340px)] w-full overflow-hidden bg-slate-950 sm:h-[clamp(220px,30svh,380px)]">
          <img
            src={coverSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-45 blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/15" />
          <img
            src={coverSrc}
            alt=""
            className="relative z-10 mx-auto h-full w-full max-w-[1180px] object-contain object-center px-0 sm:px-6"
          />
        </div>
      )}

      <div
        className={`mx-auto w-full max-w-[900px] px-4 pb-14 sm:px-5 ${hasBanner ? "-mt-10 sm:-mt-14" : "pt-10"}`}
      >
        <div className="mx-auto mb-7 h-1 max-w-[80%] overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleStepperKeyDown}
          className="rounded-[28px] border border-border bg-white px-5 py-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:px-10 sm:py-12 lg:px-12"
        >
          <header className="mb-12">
            {logoPlacement !== "hidden" && logoSrc && (
              <img
                src={logoSrc}
                alt=""
                className={`mb-8 max-h-36 max-w-[min(320px,100%)] rounded-2xl object-contain ${logoPlacement === "center" ? "mx-auto" : ""}`}
              />
            )}
            <h1
              className="text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.05] text-foreground"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {form.title}
            </h1>
            {form.description && (
              <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
                {form.description}
              </p>
            )}
            {form.isPrivate && (
              <span className="mt-4 inline-block rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                Private response
              </span>
            )}
            {form.submitterMode && form.submitterMode !== "public" && (
              <div className="mt-5 rounded-2xl border border-border bg-secondary/50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Wallet size={18} className="mt-0.5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {form.submitterMode === "wallet_required"
                          ? "Wallet required"
                          : "Wallet optional"}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {form.submitterMode === "wallet_required"
                          ? "Connect to attach wallet proof before submitting."
                          : "Connect if you want your wallet address attached to this response."}
                      </p>
                    </div>
                  </div>
                  <ConnectButton />
                </div>
                {account?.address && (
                  <code className="block truncate rounded-lg bg-white px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                    {account.address}
                  </code>
                )}
              </div>
            )}
          </header>

          {isStepper && currentField ? (
            <StepperResponse
              field={currentField}
              fieldIndex={currentStepIndex}
              totalFields={inputFields.length}
              value={values[currentField.id]}
              onChange={(v) => setValues((prev) => ({ ...prev, [currentField.id]: v }))}
              onBack={() => setActiveStep((step) => Math.max(step - 1, 0))}
              onNext={goNext}
              submitting={submitting}
              canSubmit={form.submitterMode !== "wallet_required" || Boolean(account)}
              storagePolicy={form.storagePolicy}
            />
          ) : (
            <>
              <div className="space-y-9">
                {form.fields.map((f) => (
                  <FieldRenderer
                    key={f.id}
                    field={f}
                    value={values[f.id]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [f.id]: v }))}
                    storagePolicy={form.storagePolicy}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting || (form.submitterMode === "wallet_required" && !account)}
                className="mt-10 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function StepperResponse({
  field,
  fieldIndex,
  totalFields,
  value,
  onChange,
  onBack,
  onNext,
  submitting,
  canSubmit,
  storagePolicy,
}: {
  field: FormSchema["fields"][number];
  fieldIndex: number;
  totalFields: number;
  value: unknown;
  onChange: (value: unknown) => void;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
  canSubmit: boolean;
  storagePolicy?: FormSchema["storagePolicy"];
}) {
  const isLast = fieldIndex === totalFields - 1;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-between gap-3">
        <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          {fieldIndex + 1} / {totalFields}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={fieldIndex === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
            aria-label="Previous question"
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={isLast}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
            aria-label="Next question"
          >
            <ArrowDown size={16} />
          </button>
        </div>
      </div>
      <div className="min-h-[280px] rounded-3xl border border-border bg-[#fbfcfd] px-5 py-8 sm:px-8">
        <FieldRenderer
          field={field}
          value={value}
          onChange={onChange}
          storagePolicy={storagePolicy}
        />
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={fieldIndex === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Back
        </button>
        {isLast ? (
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting...
              </>
            ) : (
              "Submit"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5"
          >
            Continue <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function respondentStorageKey(kind: "draft" | "submitted", formBlobId: string, address?: string) {
  return `formrus.${kind}.${formBlobId}.${(address || "browser").toLowerCase()}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    toast.error("Could not save local draft on this device");
  }
}

function sanitizeDraftValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, sanitizeDraftValue(value)]),
  );
}

function sanitizeDraftValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeDraftValue);
  if (!value || typeof value !== "object") return value;
  const maybeAttachment = value as Record<string, unknown>;
  if (typeof maybeAttachment.blobId === "string" && typeof maybeAttachment.name === "string") {
    const rest = { ...maybeAttachment };
    delete rest.embeddedDataUrl;
    return rest;
  }
  return value;
}

function successThemeClass(theme: NonNullable<FormSchema["branding"]>["successTheme"]) {
  if (theme === "blue") return "border border-primary/20 bg-accent text-foreground";
  if (theme === "midnight") return "bg-slate-950 text-white";
  if (theme === "celebration")
    return "border border-primary/20 bg-gradient-to-br from-white via-sky-50 to-emerald-50 text-foreground";
  return "border border-border bg-white text-foreground";
}

function Confetti() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden"
    >
      {[
        "left-[8%] bg-primary rotate-12",
        "left-[22%] bg-emerald-400 -rotate-6",
        "left-[38%] bg-amber-300 rotate-45",
        "left-[56%] bg-pink-400 -rotate-12",
        "left-[74%] bg-violet-400 rotate-6",
        "left-[88%] bg-cyan-400 -rotate-45",
      ].map((className, index) => (
        <span
          key={className}
          className={`absolute top-5 h-3 w-1.5 rounded-full ${className}`}
          style={{ transform: `translateY(${index % 2 ? 18 : 2}px)` }}
        />
      ))}
    </div>
  );
}

function SuccessSplash({ title }: { title?: string }) {
  return (
    <div className="formrus-success-splash fixed inset-0 z-50 flex items-center justify-center bg-primary px-6 text-center text-primary-foreground">
      <div>
        <div className="formrus-success-dance mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white text-primary shadow-2xl shadow-black/15">
          <Check size={46} />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] opacity-80">Success</p>
        <h2 className="mt-3 text-[clamp(2rem,8vw,4.5rem)] font-semibold leading-none">
          {title || "Response received"}
        </h2>
      </div>
    </div>
  );
}
