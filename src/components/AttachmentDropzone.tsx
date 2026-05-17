import type { AttachmentValue, StoragePolicy } from "@/types";
import { uploadAttachment } from "@/lib/walrus";
import { ExternalLink, Loader2, Upload } from "lucide-react";
import { useState } from "react";

type AttachmentDropzoneProps = {
  value?: AttachmentValue;
  onChange: (value: AttachmentValue) => void;
  disabled?: boolean;
  accept?: string;
  label?: string;
  compact?: boolean;
  storagePolicy?: StoragePolicy;
};

export function getAttachmentSource(value?: AttachmentValue): string | undefined {
  return value?.url || value?.embeddedDataUrl;
}

export function AttachmentDropzone({
  value,
  onChange,
  disabled,
  accept,
  label = "Drop a file here or click to upload",
  compact = false,
  storagePolicy,
}: AttachmentDropzoneProps) {
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file || disabled) return;
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadAttachment(file, storagePolicy));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void handleFile(e.dataTransfer.files?.[0]);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm transition-colors ${compact ? "px-3 py-4" : "px-4 py-8"} ${drag ? "border-primary bg-accent" : "border-border bg-white"}`}
    >
      {uploading ? (
        <Loader2 size={20} className="animate-spin text-primary" />
      ) : (
        <Upload size={20} className="text-muted-foreground" />
      )}
      <span className="text-center text-muted-foreground">
        {uploading ? "Uploading blob..." : value?.name || label}
      </span>
      {value?.blobId && (
        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 font-mono text-[10px] text-primary">
          {value.storageMode === "walrus" ? "Walrus" : "Local"} {value.blobId.slice(0, 10)}
          {value.url && <ExternalLink size={11} />}
        </span>
      )}
      {error && <span className="max-w-full text-center text-xs text-destructive">{error}</span>}
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </label>
  );
}
