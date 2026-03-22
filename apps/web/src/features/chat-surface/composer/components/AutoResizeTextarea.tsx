import { type KeyboardEvent, type RefObject, useLayoutEffect } from "react";

type AutoResizeTextareaProps = {
  value: string;
  placeholder: string;
  disabled: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function AutoResizeTextarea({
  value,
  placeholder,
  disabled,
  textareaRef,
  onChange,
  onSubmit,
}: AutoResizeTextareaProps) {
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value, textareaRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    onSubmit();
  };

  return (
    <textarea
      ref={textareaRef}
      className="composer-field composer-scrollbar-hide font-body max-h-64 w-full resize-none border-transparent bg-transparent shadow-none px-1 py-1 text-base leading-relaxed text-text outline-none ring-0 focus:border-transparent focus:outline-none focus:ring-0 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0"
      placeholder={placeholder}
      rows={1}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      aria-label="Message input"
    />
  );
}
