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
      className="composer-field font-body max-h-56 w-full resize-none rounded-[1.4rem] border-none bg-[rgba(5,12,21,0.6)] px-4 py-3 pb-12 text-base leading-relaxed text-text outline-none focus:ring-0"
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
