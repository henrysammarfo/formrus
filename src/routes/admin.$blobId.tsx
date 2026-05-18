import { createFileRoute, Link } from "@tanstack/react-router";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import {
  CurrentAccountSigner,
  useCurrentAccount,
  useCurrentClient,
  useDAppKit,
} from "@mysten/dapp-kit-react";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Flag,
  Loader2,
  MessageSquare,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { AdminRole, AdminStats, EncryptionEnvelope, FormResponse, FormSchema } from "@/types";
import {
  addSealFormAdmin,
  decryptSealResponseEnvelope,
  getSealConfigurationStatus,
  hasPrivateDecryptKey,
  isEncryptionEnvelope,
} from "@/lib/seal";
import {
  bulkDelete,
  bulkUpdate,
  computeStats,
  deleteResponse,
  downloadCsv,
  downloadExcel,
  downloadJson,
  exportCsv,
  exportExcelWorkbook,
  exportJson,
  formatResponseValue,
  getDisplayResponses,
  getForm,
  importResponseIndexBlob,
  importResponseBlob,
  truncateBlob,
  updateLocalFormMetadata,
  updateResponse,
} from "@/lib/walrus";
import { sanitizeRichTextHtml } from "@/lib/rich-text";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/$blobId")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Admin - ${params.blobId.slice(0, 6)} - FORMRUS` },
      {
        name: "description",
        content: "Review, prioritize, and export responses for your Walrus form.",
      },
    ],
  }),
  component: Admin,
});

type Status = "all" | "new" | "reviewed" | "starred" | "priority";
type Sort = "newest" | "oldest" | "star" | "priority";
type Priority = NonNullable<FormResponse["priority"]>;

const priorityRank: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
const priorities: { value: Priority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function normalizeWallets(values: Array<string | undefined>) {
  return [
    ...new Set(values.map((value) => value?.trim().toLowerCase()).filter(Boolean)),
  ] as string[];
}

function getAdminRole(form: FormSchema | null, address?: string): AdminRole | null {
  if (!form) return null;
  const connected = address?.toLowerCase();
  const ownerAddress = form.creatorAddress?.trim().toLowerCase();
  const adminAddresses = normalizeWallets(form.adminAddresses || []);
  const reviewerAddresses = normalizeWallets(form.reviewerAddresses || []);
  if (!ownerAddress && !adminAddresses.length && !reviewerAddresses.length) return "owner";
  if (!connected) return null;
  if (ownerAddress && connected === ownerAddress) return "owner";
  if (adminAddresses.includes(connected)) return "admin";
  if (reviewerAddresses.includes(connected)) return "reviewer";
  return null;
}

function Admin() {
  const { blobId } = Route.useParams();
  const [form, setForm] = useState<FormSchema | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [importId, setImportId] = useState("");
  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [addingSealAdmin, setAddingSealAdmin] = useState(false);
  const [decryptingSeal, setDecryptingSeal] = useState(false);
  const [queryImportHandled, setQueryImportHandled] = useState(false);
  const account = useCurrentAccount();
  const suiClient = useCurrentClient();
  const dAppKit = useDAppKit();
  const roleWallets = useMemo(
    () =>
      normalizeWallets([
        form?.creatorAddress,
        ...(form?.adminAddresses || []),
        ...(form?.reviewerAddresses || []),
      ]),
    [form?.adminAddresses, form?.creatorAddress, form?.reviewerAddresses],
  );
  const adminRole = getAdminRole(form, account?.address);
  const isAuthorizedAdmin = Boolean(adminRole);
  const canManageAccess = adminRole === "owner";
  const canManageResponses = adminRole === "owner" || adminRole === "admin";
  const canExport = canManageResponses;
  const canImport = canManageResponses;

  const reload = async (currentForm = form) => {
    if (!currentForm || !isAuthorizedAdmin) return;
    setResponses(await getDisplayResponses(currentForm));
  };

  useEffect(() => {
    getForm(blobId).then((loadedForm) => {
      setForm(loadedForm);
      if (!loadedForm) {
        setResponses([]);
      }
      setQueryImportHandled(false);
      setLoading(false);
    });
  }, [blobId]);

  useEffect(() => {
    if (!form || !isAuthorizedAdmin) {
      setResponses([]);
      return;
    }

    const loadAuthorizedResponses = async () => {
      const query =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const responseBlobId = queryImportHandled ? "" : query?.get("response")?.trim() || "";
      const responseIndexBlobId = queryImportHandled ? "" : query?.get("index")?.trim() || "";
      if (responseIndexBlobId) {
        try {
          const count = await importResponseIndexBlob(responseIndexBlobId, blobId);
          toast.success(`Imported ${count} response${count === 1 ? "" : "s"} from index`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Response index import failed");
        }
      }
      if (responseBlobId) {
        try {
          await importResponseBlob(responseBlobId, blobId);
          toast.success("Response imported from receipt link");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Response import failed");
        }
      }
      if ((responseBlobId || responseIndexBlobId) && typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }

      setQueryImportHandled(true);
      setResponses(await getDisplayResponses(form));
    };

    void loadAuthorizedResponses();
  }, [blobId, form, isAuthorizedAdmin, queryImportHandled]);

  const stats: AdminStats | null = useMemo(
    () => (form ? computeStats(form, responses) : null),
    [form, responses],
  );
  const cols = useMemo(
    () => form?.fields.filter((field) => field.type !== "section") || [],
    [form],
  );
  const sealStatus = useMemo(() => getSealConfigurationStatus(), []);
  const sealLockedCount = useMemo(
    () =>
      responses.filter(
        (response) =>
          response.decryptionStatus === "locked" &&
          isEncryptionEnvelope(response.data) &&
          response.data.provider === "seal",
      ).length,
    [responses],
  );

  const filtered = useMemo(() => {
    let next = [...responses];
    if (status === "starred") next = next.filter((response) => response.starred);
    if (status === "reviewed") next = next.filter((response) => response.reviewed);
    if (status === "new") next = next.filter((response) => !response.reviewed);
    if (status === "priority")
      next = next.filter(
        (response) => response.priority === "urgent" || response.priority === "high",
      );
    if (search) {
      const needle = search.toLowerCase();
      next = next.filter((response) =>
        Object.values(response.data).some((value) =>
          formatResponseValue(value).toLowerCase().includes(needle),
        ),
      );
    }
    if (sort === "newest") next.sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
    if (sort === "oldest") next.sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt));
    if (sort === "priority")
      next.sort(
        (a, b) =>
          (priorityRank[b.priority || "low"] || 0) - (priorityRank[a.priority || "low"] || 0),
      );
    if (sort === "star") {
      const starField = form?.fields.find((field) => field.type === "star");
      if (starField)
        next.sort(
          (a, b) => (Number(b.data[starField.id]) || 0) - (Number(a.data[starField.id]) || 0),
        );
    }
    return next;
  }, [responses, status, search, sort, form]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/form/${blobId}`);
    toast.success("Form link copied");
  };

  const exportAll = () => {
    if (!form || !canExport) return;
    downloadCsv(`${form.title.replace(/\s+/g, "_")}.csv`, exportCsv(form, responses));
  };

  const exportAllJson = () => {
    if (!form || !canExport) return;
    downloadJson(`${form.title.replace(/\s+/g, "_")}.json`, exportJson(form, responses));
  };

  const exportAllExcel = () => {
    if (!form || !canExport) return;
    downloadExcel(`${form.title.replace(/\s+/g, "_")}.xls`, exportExcelWorkbook(form, responses));
  };

  const exportSelectedJson = () => {
    if (!form || !canExport) return;
    downloadJson(
      "selected.json",
      exportJson(
        form,
        responses.filter((response) => selected.has(response.id)),
      ),
    );
  };

  const exportSelectedExcel = () => {
    if (!form || !canExport) return;
    downloadExcel(
      "selected.xls",
      exportExcelWorkbook(
        form,
        responses.filter((response) => selected.has(response.id)),
      ),
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    if (!canImport) {
      toast.error("Reviewer-only wallets cannot import response blobs");
      return;
    }
    const id = importId.trim();
    if (!id) return;
    try {
      try {
        const count = await importResponseIndexBlob(id, blobId);
        toast.success(`Imported ${count} response${count === 1 ? "" : "s"} from response index`);
      } catch {
        await importResponseBlob(id, blobId);
        toast.success("Response imported");
      }
      await reload();
      setImportId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  };

  const decryptSealResponses = async () => {
    if (!form || !account) {
      toast.error("Connect an authorized Sui wallet first");
      return;
    }
    if (!sealStatus.canAttemptDecrypt) {
      toast.error("Seal decrypt config is missing approval target or key servers");
      return;
    }

    setDecryptingSeal(true);
    try {
      const signer = new CurrentAccountSigner(dAppKit);
      let decryptedCount = 0;
      for (const response of responses) {
        if (!isEncryptionEnvelope(response.data) || response.data.provider !== "seal") continue;
        const decrypted = await decryptSealResponseEnvelope(
          form,
          response.data as EncryptionEnvelope,
          {
            address: account.address,
            signer,
            suiClient,
          },
        );
        updateResponse(response.id, {
          data: decrypted,
          encrypted: true,
          encryptionProvider: "seal",
          decryptionStatus: "decrypted",
        });
        decryptedCount += 1;
      }
      await reload();
      toast.success(
        decryptedCount
          ? `Decrypted ${decryptedCount} Seal response${decryptedCount === 1 ? "" : "s"}`
          : "No Seal responses needed decryption",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Seal decryption failed");
    } finally {
      setDecryptingSeal(false);
    }
  };

  const handleAddSealAdmin = async () => {
    if (!canManageAccess) {
      toast.error("Only the form owner can add admins");
      return;
    }
    if (!form || !account) {
      toast.error("Connect the creator wallet first");
      return;
    }
    const admin = newAdminAddress.trim();
    if (!admin) return;
    setAddingSealAdmin(true);
    try {
      const digest = await addSealFormAdmin(form, admin, { address: account.address, dAppKit });
      const nextAdmins = [...new Set([...(form.adminAddresses || []), admin])];
      const nextForm = { ...form, adminAddresses: nextAdmins };
      setForm(nextForm);
      updateLocalFormMetadata(form.blobId, { adminAddresses: nextAdmins });
      setNewAdminAddress("");
      toast.success(`Seal admin added: ${truncateBlob(digest)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add Seal admin");
    } finally {
      setAddingSealAdmin(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  if (!form) return <div className="py-20 text-center">Form not found.</div>;
  if (!isAuthorizedAdmin) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-5 py-10">
        <div className="w-full rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Admin access</p>
          <h1
            className="mt-2 text-2xl font-semibold text-foreground"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Connect an authorized admin or reviewer wallet
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This dashboard is restricted to the form owner, published admins, and reviewer-only
            wallets. The public form link remains open for respondents.
          </p>
          <div className="mt-5 flex justify-center">
            <ConnectButton />
          </div>
          {account?.address && (
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 font-mono text-xs text-amber-900">
              Connected wallet is not on this form's access list: {account.address}
            </p>
          )}
          {roleWallets.length > 0 && (
            <details className="mt-5 rounded-2xl border border-border bg-secondary/40 p-3 text-left">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Allowed wallets
              </summary>
              <div className="mt-3 space-y-2">
                {roleWallets.map((address) => (
                  <code
                    key={address}
                    className="block break-all rounded-lg bg-white px-3 py-2 font-mono text-[11px] text-foreground"
                  >
                    {address}
                  </code>
                ))}
              </div>
            </details>
          )}
          <Link
            to="/form/$blobId"
            params={{ blobId }}
            className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary"
          >
            Open public form
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 rounded-3xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Review workspace
            </p>
            <h1
              className="mt-2 text-3xl font-semibold text-foreground"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {form.title}
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Form ID: {truncateBlob(blobId)}
            </p>
            {adminRole && (
              <span className="mt-3 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
                {adminRole === "owner" ? "Super admin" : adminRole}
              </span>
            )}
            {form.isPrivate && (
              <p className="mt-2 text-xs font-semibold text-primary">
                {hasPrivateDecryptKey(form.accessControl)
                  ? "Private responses decrypt in this browser."
                  : "Private responses are locked here until an authorized decrypt key/session is available."}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary"
            >
              <Copy size={14} /> Copy form link
            </button>
            {canExport && (
              <>
                <button
                  onClick={exportAll}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button
                  onClick={exportAllJson}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary"
                >
                  <Download size={14} /> Export JSON
                </button>
                <button
                  onClick={exportAllExcel}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold hover:border-primary"
                >
                  <Download size={14} /> Export Excel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total responses", val: stats?.total ?? 0 },
          { label: "Needs review", val: responses.filter((response) => !response.reviewed).length },
          {
            label: "High priority",
            val: responses.filter(
              (response) => response.priority === "urgent" || response.priority === "high",
            ).length,
          },
          { label: "Avg rating", val: stats?.avgStar ?? "-" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {item.label}
            </div>
            <div
              className="mt-2 text-3xl font-semibold text-foreground"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {item.val}
            </div>
          </div>
        ))}
      </div>

      {form.creatorAddress || form.adminAddresses?.length || form.reviewerAddresses?.length ? (
        <details className="mb-4 rounded-2xl border border-border bg-white p-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Role wallet addresses
          </summary>
          <RoleAddressGroup
            label="Super admin"
            addresses={form.creatorAddress ? [form.creatorAddress] : []}
          />
          <RoleAddressGroup label="Admins" addresses={form.adminAddresses || []} />
          <RoleAddressGroup label="Reviewers" addresses={form.reviewerAddresses || []} />
        </details>
      ) : null}

      {form.isPrivate && (
        <div className="mb-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Seal access
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {sealStatus.configured
                  ? `${sealLockedCount} locked Seal response${sealLockedCount === 1 ? "" : "s"} can be opened by an approved wallet session.`
                  : "Seal key servers are not configured, so private responses use the browser fallback path."}
              </p>
              {sealStatus.approveTarget && (
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Policy: {sealStatus.approveTarget}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ConnectButton />
              <button
                type="button"
                onClick={decryptSealResponses}
                disabled={!sealLockedCount || decryptingSeal}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {decryptingSeal ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Decrypt Seal
              </button>
            </div>
          </div>
          {sealStatus.configured && canManageAccess && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Add Seal admin
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={newAdminAddress}
                  onChange={(event) => setNewAdminAddress(event.target.value)}
                  placeholder="0x admin wallet address"
                  className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2.5 font-mono text-xs outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddSealAdmin}
                  disabled={addingSealAdmin || !newAdminAddress.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:border-primary disabled:opacity-50"
                >
                  {addingSealAdmin ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Add admin
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Only the on-chain form creator can add another Seal admin. This updates the Seal
                policy; publish a new form version if you also want the public form metadata to show
                the new reviewer list.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 grid gap-2 rounded-2xl border border-border bg-white p-3 shadow-sm lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search responses..."
          className="min-w-0 rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as Status)}
          className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="all">All</option>
          <option value="new">Needs review</option>
          <option value="reviewed">Reviewed</option>
          <option value="starred">Starred</option>
          <option value="priority">High priority</option>
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="priority">Priority</option>
          <option value="star">Star Rating</option>
        </select>
        {canImport && (
          <>
            <input
              value={importId}
              onChange={(event) => setImportId(event.target.value)}
              placeholder="Import response or index blob ID"
              className="min-w-[220px] rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={handleImport}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold hover:border-primary"
            >
              <UploadCloud size={14} /> Import
            </button>
          </>
        )}
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-accent p-3 text-sm">
          <span className="font-semibold text-primary">{selected.size} selected</span>
          {canManageResponses && (
            <>
              <button
                onClick={async () => {
                  bulkUpdate([...selected], { starred: true });
                  await reload();
                  setSelected(new Set());
                }}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold hover:border-primary"
              >
                Star
              </button>
              <button
                onClick={async () => {
                  bulkUpdate([...selected], { priority: "high" });
                  await reload();
                  setSelected(new Set());
                }}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold hover:border-primary"
              >
                Mark high priority
              </button>
            </>
          )}
          <button
            onClick={async () => {
              bulkUpdate([...selected], { reviewed: true });
              await reload();
              setSelected(new Set());
            }}
            className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold hover:border-primary"
          >
            Mark reviewed
          </button>
          {canExport && (
            <>
              <button
                onClick={() => {
                  downloadCsv(
                    "selected.csv",
                    exportCsv(
                      form,
                      responses.filter((response) => selected.has(response.id)),
                    ),
                  );
                }}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold hover:border-primary"
              >
                Export selected
              </button>
              <button
                onClick={exportSelectedJson}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold hover:border-primary"
              >
                Export selected JSON
              </button>
              <button
                onClick={exportSelectedExcel}
                className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold hover:border-primary"
              >
                Export selected Excel
              </button>
            </>
          )}
          {canManageResponses && (
            <button
              onClick={async () => {
                bulkDelete([...selected]);
                await reload();
                setSelected(new Set());
              }}
              className="rounded-full border border-destructive bg-white px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Delete
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-3xl border border-border bg-white p-10 text-center text-muted-foreground">
            No responses yet.{" "}
            <Link to="/form/$blobId" params={{ blobId }} className="text-primary hover:underline">
              Open form
            </Link>
          </div>
        )}
        {filtered.map((response, index) => (
          <ResponseCard
            key={response.id}
            response={response}
            index={index}
            cols={cols}
            selected={selected.has(response.id)}
            expanded={expanded === response.id}
            onSelect={() => toggleSelect(response.id)}
            onExpand={() => setExpanded(expanded === response.id ? null : response.id)}
            onReload={reload}
            canManageResponses={canManageResponses}
          />
        ))}
      </div>
    </div>
  );
}

function ResponseCard({
  response,
  index,
  cols,
  selected,
  expanded,
  onSelect,
  onExpand,
  onReload,
  canManageResponses,
}: {
  response: FormResponse;
  index: number;
  cols: FormSchema["fields"];
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onExpand: () => void;
  onReload: () => Promise<void>;
  canManageResponses: boolean;
}) {
  const previewCols = cols.slice(0, 4);

  const setPriority = async (priority: string) => {
    updateResponse(response.id, { priority: priority ? (priority as Priority) : undefined });
    await onReload();
  };

  const setInternalNote = async (internalNote: string) => {
    updateResponse(response.id, { internalNote });
    await onReload();
  };

  return (
    <article
      className={`rounded-3xl border bg-white p-4 shadow-sm transition-all ${response.starred ? "border-primary/30 bg-accent/20" : "border-border"}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input type="checkbox" checked={selected} onChange={onSelect} className="accent-primary" />
        <button
          onClick={onExpand}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="View"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
            <span className="text-sm font-semibold text-foreground">
              {new Date(response.submittedAt).toLocaleString()}
            </span>
            {response.reviewed ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Reviewed
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                Needs review
              </span>
            )}
            {response.priority && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClass(response.priority)}`}
              >
                {response.priority}
              </span>
            )}
            {response.submitterAddress && (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                {response.submitterAddress.slice(0, 8)}...
              </span>
            )}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
            {response.decryptionStatus === "locked" ? (
              <span className="text-sm font-semibold text-primary">Encrypted - locked</span>
            ) : (
              previewCols.map((col) => (
                <div key={col.id} className="min-w-0 rounded-xl bg-secondary/60 px-3 py-2">
                  <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {col.label}
                  </div>
                  <div className="truncate text-sm text-foreground">
                    {formatResponseValue(response.data[col.id]) || "-"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canManageResponses && (
            <button
              onClick={async () => {
                updateResponse(response.id, { starred: !response.starred });
                await onReload();
              }}
              className={`rounded-lg p-2 hover:bg-secondary ${response.starred ? "text-primary" : "text-muted-foreground"}`}
              title="Star"
            >
              <Star size={16} className={response.starred ? "fill-primary" : ""} />
            </button>
          )}
          <button
            onClick={async () => {
              updateResponse(response.id, { reviewed: !response.reviewed });
              await onReload();
            }}
            className={`rounded-lg p-2 hover:bg-secondary ${response.reviewed ? "text-primary" : "text-muted-foreground"}`}
            title="Reviewed"
          >
            <Check size={16} />
          </button>
          {canManageResponses && (
            <button
              onClick={async () => {
                deleteResponse(response.id);
                await onReload();
              }}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-5 border-t border-border pt-5">
          <div className="mb-4 grid gap-3 md:grid-cols-[220px_1fr]">
            {canManageResponses && (
              <>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Flag size={12} /> Priority
                  </span>
                  <select
                    value={response.priority || ""}
                    onChange={(event) => void setPriority(event.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">No priority</option>
                    {priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <MessageSquare size={12} /> Internal note
                  </span>
                  <textarea
                    rows={2}
                    value={response.internalNote || ""}
                    onChange={(event) => void setInternalNote(event.target.value)}
                    placeholder="Add review notes, next action, or context..."
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              </>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {cols.map((col) => (
              <div key={col.id} className="rounded-2xl border border-border bg-secondary/30 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.label}
                </div>
                <div className="mt-1 break-words text-sm text-foreground">
                  <ResponseValue
                    field={col}
                    locked={response.decryptionStatus === "locked"}
                    value={response.data[col.id]}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 font-mono text-[10px] text-muted-foreground">
            Response blob: {response.id}
          </div>
          {response.responseIndexBlobId && (
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              Index blob: {response.responseIndexBlobId}
            </div>
          )}
          {response.submitterAddress && (
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              Submitter wallet: {response.submitterAddress}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ResponseValue({
  field,
  value,
  locked,
}: {
  field: FormSchema["fields"][number];
  value: unknown;
  locked: boolean;
}) {
  if (locked) return <>Encrypted - private key or Seal session required</>;
  if (field.type === "richText" && typeof value === "string") {
    const html = sanitizeRichTextHtml(value);
    if (!html) return <>-</>;
    return (
      <div
        className="prose prose-sm max-w-none [&_a]:text-primary [&_code]:rounded [&_code]:bg-white [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:rounded-lg [&_pre]:bg-white [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return <>{formatResponseValue(value) || "-"}</>;
}

function RoleAddressGroup({ label, addresses }: { label: string; addresses: string[] }) {
  if (!addresses.length) return null;
  return (
    <div className="mt-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {addresses.map((address) => (
          <code
            key={`${label}-${address}`}
            className="rounded-full bg-secondary px-3 py-1.5 font-mono text-[11px] text-foreground"
          >
            {address}
          </code>
        ))}
      </div>
    </div>
  );
}

function priorityClass(priority: Priority) {
  if (priority === "urgent") return "bg-red-50 text-red-700";
  if (priority === "high") return "bg-orange-50 text-orange-700";
  if (priority === "medium") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-700";
}
