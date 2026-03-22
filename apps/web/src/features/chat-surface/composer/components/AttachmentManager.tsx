import { useId, useState } from "react";

import type { Attachment } from "../types/Attachment";

type AttachmentManagerProps = {
  attachments: Attachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  accept: string[];
  error: string | null;
};

export function AttachmentManager({
  attachments,
  onAddFiles,
  onRemoveAttachment,
  accept,
  error,
}: AttachmentManagerProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;
    if (!files) {
      return;
    }

    onAddFiles(Array.from(files));
    event.target.value = "";
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const files = Array.from(event.dataTransfer.files);
          onAddFiles(files);
        }}
        className={`flex cursor-pointer items-center justify-between rounded-xl border border-dashed px-3 py-2 text-sm transition-colors ${
          isDragging
            ? "border-primary bg-[rgba(134,201,255,0.12)]"
            : "border-border bg-[rgba(255,255,255,0.02)]"
        }`}
      >
        <span className="text-text-muted">Drop files or click to upload</span>
        <span className="text-xs text-text-muted">{attachments.length} staged</span>
      </label>

      <input
        id={inputId}
        type="file"
        className="sr-only"
        multiple
        accept={accept.join(",")}
        onChange={handleFileInput}
      />

      {error ? <p className="text-xs text-[rgb(235,120,120)]">{error}</p> : null}

      {attachments.length > 0 ? (
        <ul className="space-y-1" aria-label="Staged attachments">
          {attachments.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-lg border border-border bg-[rgba(255,255,255,0.02)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-text">{file.name}</p>
                <p className="text-xs text-text-muted">{Math.ceil(file.size / 1024)} KB</p>
              </div>
              <button
                type="button"
                className="ml-3 text-xs text-text-muted hover:text-text"
                onClick={() => onRemoveAttachment(file.id)}
                aria-label={`Remove ${file.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
