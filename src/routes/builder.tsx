import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Plus, Trash2, GripVertical, Loader2, Check, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import type { FormField, FieldType } from '@/types';
import { FIELD_TYPE_LABELS } from '@/types';
import { FieldRenderer } from '@/components/FieldRenderer';
import { publishForm, makeBlobId, truncateBlob } from '@/lib/walrus-mock';
import { toast } from 'sonner';

export const Route = createFileRoute('/builder')({
  head: () => ({
    meta: [
      { title: 'Form Builder — FORMRUS' },
      { name: 'description', content: 'Build a new decentralized form. Add fields, toggle Seal encryption, publish to Walrus.' },
      { property: 'og:title', content: 'Form Builder — FORMRUS' },
      { property: 'og:description', content: 'Drag fields, customize, publish to Walrus.' },
    ],
  }),
  component: Builder,
});

const FIELD_TYPES: FieldType[] = ['text', 'longText', 'dropdown', 'checkbox', 'radio', 'star', 'file', 'url', 'email', 'number', 'date', 'section'];

function Builder() {
  const [title, setTitle] = useState('Untitled Form');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ blobId: string } | null>(null);

  const addField = (type: FieldType) => {
    const needsOptions = type === 'dropdown' || type === 'radio' || type === 'checkbox';
    setFields(prev => [...prev, {
      id: makeBlobId().slice(0, 12),
      type,
      label: type === 'section' ? 'Section title' : `New ${FIELD_TYPE_LABELS[type]}`,
      required: false,
      options: needsOptions ? ['Option 1', 'Option 2'] : undefined,
    }]);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };
  const removeField = (id: string) => setFields(prev => prev.filter(f => f.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    setFields(prev => {
      const i = prev.findIndex(f => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handlePublish = async () => {
    if (!title.trim() || fields.length === 0) {
      toast.error('Add a title and at least one field');
      return;
    }
    setPublishing(true);
    try {
      const form = await publishForm({ title, description, isPrivate, fields });
      setPublished({ blobId: form.blobId });
      toast.success('Published to Walrus!');
    } catch {
      toast.error('Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>Form Builder</h1>
        <p className="text-sm text-muted-foreground">Design your form on the left, see live preview on the right.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-white p-6">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Form title</label>
            <input className="mb-4 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" value={title} onChange={e => setTitle(e.target.value)} />
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea rows={2} className="mb-4 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" value={description} onChange={e => setDescription(e.target.value)} />
            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2.5">
              <span className="text-sm font-medium text-foreground">🔒 Private (Seal encrypted)</span>
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-border transition-colors checked:bg-primary relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4" />
            </label>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">+ Add Field</h3>
            <div className="flex flex-wrap gap-2">
              {FIELD_TYPES.map(t => (
                <button key={t} onClick={() => addField(t)} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary hover:bg-accent hover:text-primary">
                  <Plus size={12} /> {FIELD_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {fields.length > 0 && (
            <div className="space-y-3">
              {fields.map((f, idx) => (
                <div key={f.id} className="group rounded-xl border border-border bg-white p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button onClick={() => move(f.id, -1)} disabled={idx === 0} className="text-muted-foreground disabled:opacity-30 hover:text-foreground"><ArrowUp size={14} /></button>
                      <GripVertical size={14} className="text-muted-foreground" />
                      <button onClick={() => move(f.id, 1)} disabled={idx === fields.length - 1} className="text-muted-foreground disabled:opacity-30 hover:text-foreground"><ArrowDown size={14} /></button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary" value={f.label} onChange={e => updateField(f.id, { label: e.target.value })} />
                        <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase text-primary">{FIELD_TYPE_LABELS[f.type]}</span>
                        <button onClick={() => removeField(f.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                      </div>
                      {f.options && (
                        <input
                          className="w-full rounded-lg border border-border px-3 py-2 text-xs outline-none focus:border-primary"
                          value={f.options.join(', ')}
                          onChange={e => updateField(f.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          placeholder="Option 1, Option 2, Option 3"
                        />
                      )}
                      {f.type !== 'section' && (
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" checked={f.required} onChange={e => updateField(f.id, { required: e.target.checked })} className="accent-primary" />
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
              {publishing ? <><Loader2 size={16} className="animate-spin" /> Storing on Walrus…</> : 'Publish Form to Walrus'}
            </button>
          ) : (
            <PublishedCard blobId={published.blobId} onReset={() => { setPublished(null); setFields([]); setTitle('Untitled Form'); setDescription(''); }} />
          )}
        </div>

        {/* RIGHT — preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live Preview</div>
          <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>{title || 'Untitled Form'}</h2>
            {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
            {isPrivate && <span className="mt-3 inline-block rounded-full bg-accent px-2 py-1 text-[10px] font-semibold uppercase text-primary">🔒 Seal encrypted</span>}
            <div className="mt-6 space-y-5">
              {fields.length === 0 && <p className="text-sm text-muted-foreground italic">Add fields to see preview…</p>}
              {fields.map(f => <FieldRenderer key={f.id} field={f} value={undefined} onChange={() => {}} disabled />)}
              {fields.length > 0 && (
                <button disabled className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground opacity-70">Submit</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PublishedCard({ blobId, onReset }: { blobId: string; onReset: () => void }) {
  const link = typeof window !== 'undefined' ? `${window.location.origin}/form/${blobId}` : `/form/${blobId}`;
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-accent p-6">
      <div className="mb-3 flex items-center gap-2 text-primary">
        <Check size={18} /> <span className="font-semibold">Published to Walrus</span>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Blob ID</div>
          <div className="font-mono text-xs text-foreground">{blobId}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Shareable link</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-white px-2 py-1.5 font-mono text-xs">{link}</code>
            <button onClick={() => { navigator.clipboard.writeText(link); toast.success('Link copied'); }} className="rounded-lg border border-border bg-white p-2 hover:border-primary"><Copy size={14} /></button>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/form/$blobId" params={{ blobId }} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">Open form</Link>
        <Link to="/admin/$blobId" params={{ blobId }} className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:border-primary">Admin</Link>
        <button onClick={onReset} className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:border-primary">New form</button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Truncated: {truncateBlob(blobId)}</p>
    </div>
  );
}
