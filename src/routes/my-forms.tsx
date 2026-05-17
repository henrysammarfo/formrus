import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  BarChart3,
  Loader2,
  UploadCloud,
  Pencil,
  History,
} from "lucide-react";
import {
  getLocalCreatorManifestPointer,
  importCreatorManifest,
  listForms,
  deleteForm,
  saveDraft,
  makeBlobId,
  truncateBlob,
} from "@/lib/walrus";
import type { FormSchema } from "@/types";
import { toast } from "sonner";

export const Route = createFileRoute("/my-forms")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Forms - FORMRUS" },
      { name: "description", content: "All your forms stored on Walrus, in one place." },
      { property: "og:title", content: "My Forms - FORMRUS" },
    ],
  }),
  component: MyForms,
});

function MyForms() {
  const [forms, setForms] = useState<FormSchema[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [manifestId, setManifestId] = useState("");
  const [importing, setImporting] = useState(false);
  const account = useCurrentAccount();
  const navigate = useNavigate();

  const load = () => {
    listForms().then((fs) => {
      setForms(fs);
      // count responses
      try {
        const all = JSON.parse(localStorage.getItem("formrus.responses") || "[]") as {
          formBlobId: string;
        }[];
        const c: Record<string, number> = {};
        all.forEach((r) => {
          c[r.formBlobId] = (c[r.formBlobId] || 0) + 1;
        });
        setCounts(c);
      } catch {
        setCounts({});
      }
    });
  };
  useEffect(load, []);

  useEffect(() => {
    if (!account?.address) return;
    const pointer = getLocalCreatorManifestPointer(account.address);
    if (!pointer) return;
    importCreatorManifest(pointer, account.address)
      .then(() => load())
      .catch((error) => console.warn(error));
  }, [account?.address]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this form and its responses?")) return;
    await deleteForm(id);
    load();
    toast.success("Deleted");
  };

  const copy = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/form/${id}`);
    toast.success("Link copied");
  };

  const groups = useMemo(() => {
    if (!forms) return [];
    const byLineage = new Map<string, FormSchema[]>();
    for (const form of forms) {
      const lineageId = form.publishedFromDraftId || form.draftId || form.blobId;
      const list = byLineage.get(lineageId) || [];
      list.push(form);
      byLineage.set(lineageId, list);
    }

    return [...byLineage.entries()]
      .map(([lineageId, versions]) => {
        const sorted = [...versions].sort((a, b) => {
          const versionDelta = (b.formVersion || 1) - (a.formVersion || 1);
          if (versionDelta !== 0) return versionDelta;
          return +new Date(b.publishedAt || b.createdAt) - +new Date(a.publishedAt || a.createdAt);
        });
        return { lineageId, latest: sorted[0], versions: sorted };
      })
      .sort(
        (a, b) =>
          +new Date(b.latest.publishedAt || b.latest.createdAt) -
          +new Date(a.latest.publishedAt || a.latest.createdAt),
      );
  }, [forms]);

  const editAsNewVersion = async (form: FormSchema) => {
    const nextDraftId = form.publishedFromDraftId || form.draftId || makeBlobId().slice(0, 12);
    const nextVersion = (form.formVersion || 1) + 1;
    const draft = await saveDraft({
      draftId: nextDraftId,
      title: form.title,
      description: form.description,
      isPrivate: form.isPrivate,
      creatorAddress: account?.address || form.creatorAddress,
      submitterMode: form.submitterMode,
      storagePolicy: form.storagePolicy,
      responsePolicy: form.responsePolicy,
      fields: form.fields,
      branding: form.branding,
      formVersion: nextVersion,
      publishedBlobId: form.blobId,
      adminAddresses: form.adminAddresses,
      accessControl: form.accessControl,
      creatorManifestBlobId: form.creatorManifestBlobId,
      responseIndexBlobId: form.responseIndexBlobId,
    });
    toast.success(`Draft v${nextVersion} ready`);
    await navigate({ to: "/builder", search: { draft: draft.draftId } });
  };

  const handleManifestImport = async () => {
    const id = manifestId.trim();
    if (!id) return;
    setImporting(true);
    try {
      const imported = await importCreatorManifest(id, account?.address);
      load();
      setManifestId("");
      toast.success(
        `Imported ${imported.length} form${imported.length === 1 ? "" : "s"} from manifest`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Manifest import failed");
    } finally {
      setImporting(false);
    }
  };

  if (!forms)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8">
        <h1
          className="text-3xl font-semibold text-foreground"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          My Forms
        </h1>
        <p className="text-sm text-muted-foreground">Every form you've published to Walrus.</p>
      </div>

      <section className="mb-6 rounded-3xl border border-border bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Creator wallet sync</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect the wallet you used when publishing to recover its creator manifest on this
              browser. You can also paste a manifest blob ID from another device.
            </p>
            {account?.address && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Wallet: {account.address}{" "}
                {getLocalCreatorManifestPointer(account.address)
                  ? `- manifest ${truncateBlob(getLocalCreatorManifestPointer(account.address) || "")}`
                  : ""}
              </p>
            )}
          </div>
          <ConnectButton />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={manifestId}
            onChange={(event) => setManifestId(event.target.value)}
            placeholder="Paste creator manifest blob ID"
            className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleManifestImport}
            disabled={importing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:border-primary disabled:opacity-60"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            Import manifest
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/builder"
          className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white p-6 text-center transition-all hover:-translate-y-1 hover:border-primary hover:bg-accent"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus size={20} />
          </div>
          <span className="text-sm font-semibold text-foreground">Create New Form</span>
        </Link>

        {groups.map((group) => (
          <FormVersionCard
            key={group.lineageId}
            group={group}
            counts={counts}
            onCopy={copy}
            onDelete={handleDelete}
            onEdit={editAsNewVersion}
          />
        ))}
      </div>
    </div>
  );
}

function FormVersionCard({
  group,
  counts,
  onCopy,
  onDelete,
  onEdit,
}: {
  group: { lineageId: string; latest: FormSchema; versions: FormSchema[] };
  counts: Record<string, number>;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (form: FormSchema) => void;
}) {
  const f = group.latest;
  const totalResponses = group.versions.reduce((sum, form) => sum + (counts[form.blobId] || 0), 0);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {f.title}
        </h3>
        <div className="flex flex-wrap justify-end gap-1">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            v{f.formVersion || 1}
          </span>
          {f.isPrivate && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
              Private
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div>Latest published {new Date(f.publishedAt || f.createdAt).toLocaleDateString()}</div>
        <div>{totalResponses} responses across all versions</div>
        <div className="font-mono">{truncateBlob(f.blobId)}</div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History size={13} /> Version history
        </div>
        <div className="space-y-2">
          {group.versions.map((version) => (
            <div
              key={version.blobId}
              className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  v{version.formVersion || 1}
                  {version.blobId === f.blobId ? " latest" : ""}
                </p>
                <p className="truncate font-mono text-muted-foreground">
                  {truncateBlob(version.blobId)} - {counts[version.blobId] || 0} responses
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Link
                  to="/form/$blobId"
                  params={{ blobId: version.blobId }}
                  className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary"
                  aria-label={`View version ${version.formVersion || 1}`}
                >
                  <ExternalLink size={12} />
                </Link>
                <button
                  type="button"
                  onClick={() => onCopy(version.blobId)}
                  className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-primary hover:text-primary"
                  aria-label={`Copy version ${version.formVersion || 1} link`}
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <button
          type="button"
          onClick={() => onEdit(f)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-primary"
        >
          <Pencil size={12} /> Edit latest
        </button>
        <Link
          to="/form/$blobId"
          params={{ blobId: f.blobId }}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-primary"
        >
          <ExternalLink size={12} /> View
        </Link>
        <Link
          to="/admin/$blobId"
          params={{ blobId: f.blobId }}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <BarChart3 size={12} /> Admin
        </Link>
        <button
          onClick={() => onCopy(f.blobId)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:border-primary"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={() => onDelete(f.blobId)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
