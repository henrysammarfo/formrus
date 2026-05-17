import type { AttachmentValue, FormField, StoragePolicy } from "@/types";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  Bold,
  Code,
  Italic,
  Link,
  List,
  ListOrdered,
  Star,
  Strikethrough,
  Underline,
} from "lucide-react";
import { AttachmentDropzone } from "@/components/AttachmentDropzone";
import { sanitizeRichTextHtml } from "@/lib/rich-text";

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
        <RichTextEditor value={(value as string) || ""} onChange={onChange} disabled={disabled} />
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

function RichTextEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const sanitized = sanitizeRichTextHtml(value);
    if (editor.innerHTML !== sanitized) editor.innerHTML = sanitized;
  }, [value]);

  const updateValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(sanitizeRichTextHtml(editor.innerHTML));
  };

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    updateValue();
  };

  const createLink = () => {
    const url = window.prompt("Paste link URL");
    if (!url) return;
    runCommand("createLink", url);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex flex-wrap gap-1 border-b border-border bg-secondary/60 px-2 py-2">
        <ToolbarButton label="Bold" disabled={disabled} onClick={() => runCommand("bold")}>
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton label="Italic" disabled={disabled} onClick={() => runCommand("italic")}>
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          disabled={disabled}
          onClick={() => runCommand("underline")}
        >
          <Underline size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          disabled={disabled}
          onClick={() => runCommand("strikeThrough")}
        >
          <Strikethrough size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          disabled={disabled}
          onClick={() => runCommand("insertUnorderedList")}
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          disabled={disabled}
          onClick={() => runCommand("insertOrderedList")}
        >
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Code"
          disabled={disabled}
          onClick={() => runCommand("formatBlock", "pre")}
        >
          <Code size={14} />
        </ToolbarButton>
        <ToolbarButton label="Link" disabled={disabled} onClick={createLink}>
          <Link size={14} />
        </ToolbarButton>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={updateValue}
        onBlur={updateValue}
        onPaste={(event) => {
          if (disabled) return;
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          updateValue();
        }}
        className="min-h-40 w-full px-3 py-3 text-sm text-foreground outline-none empty:before:text-muted-foreground empty:before:content-['Write_formatted_feedback...'] focus:bg-white [&_a]:text-primary [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:rounded-lg [&_pre]:bg-secondary [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5"
      />
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        Formatting is saved in the Walrus response blob.
      </p>
    </div>
  );
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}
