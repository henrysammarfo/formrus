import type { AttachmentValue, FormField, StoragePolicy } from "@/types";
import { Star } from "lucide-react";
import { AttachmentDropzone } from "@/components/AttachmentDropzone";

interface Props {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  storagePolicy?: StoragePolicy;
}

export function FieldRenderer({ field, value, onChange, disabled, storagePolicy }: Props) {
  if (field.type === "section") {
    return (
      <div className="my-4 border-t border-border pt-4">
        <h3
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {field.label}
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="ml-1 text-primary">*</span>}
      </label>
      <FieldInput
        field={field}
        value={value}
        onChange={onChange}
        disabled={disabled}
        storagePolicy={storagePolicy}
      />
    </div>
  );
}

function FieldInput({ field, value, onChange, disabled, storagePolicy }: Props) {
  const cls =
    "w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-60";

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          className={cls}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case "longText":
      return (
        <textarea
          rows={4}
          className={cls}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case "richText":
      return (
        <div>
          <textarea
            rows={6}
            className={cls}
            placeholder="Write formatted feedback. Markdown is supported."
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Markdown formatting is preserved in the Walrus response blob.
          </p>
        </div>
      );
    case "email":
      return (
        <input
          type="email"
          className={cls}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case "url":
      return (
        <input
          type="url"
          className={cls}
          placeholder="https://"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className={cls}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className={cls}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
    case "dropdown":
      return (
        <select
          className={cls}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Select...</option>
          {(field.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="space-y-2">
          {(field.options || []).map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={field.id}
                value={o}
                checked={value === o}
                onChange={() => onChange(o)}
                disabled={disabled}
                className="accent-primary"
              />
              {o}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <div className="space-y-2">
          {(field.options || []).map((o) => {
            const arr = (value as string[]) || [];
            const checked = arr.includes(o);
            return (
              <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(checked ? arr.filter((x) => x !== o) : [...arr, o])}
                  disabled={disabled}
                  className="accent-primary"
                />
                {o}
              </label>
            );
          })}
        </div>
      );
    case "star": {
      const n = Number(value) || 0;
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => onChange(s)}
              className="transition-transform hover:scale-110 disabled:cursor-default"
            >
              <Star
                className={s <= n ? "fill-primary text-primary" : "text-muted-foreground"}
                size={28}
              />
            </button>
          ))}
        </div>
      );
    }
    case "file":
      return (
        <AttachmentDropzone
          value={value as AttachmentValue}
          onChange={onChange as (value: AttachmentValue) => void}
          disabled={disabled}
          storagePolicy={storagePolicy}
        />
      );
    case "screenshot":
      return (
        <AttachmentDropzone
          value={value as AttachmentValue}
          onChange={onChange as (value: AttachmentValue) => void}
          disabled={disabled}
          accept="image/*"
          label="Drop a screenshot or click to upload"
          storagePolicy={storagePolicy}
        />
      );
    case "video":
      return (
        <AttachmentDropzone
          value={value as AttachmentValue}
          onChange={onChange as (value: AttachmentValue) => void}
          disabled={disabled}
          accept="video/*"
          label="Drop a demo video or click to upload"
          storagePolicy={storagePolicy}
        />
      );
    default:
      return null;
  }
}
