export type KeyboardShortcutCommand =
  | "focus-inbox"
  | "approve"
  | "deny"
  | "escalate"
  | "new-entity"
  | "save"
  | "cancel"
  | "refresh";

export type KeyboardShortcutEvent = {
  altKey: boolean;
  key: string;
};

const shortcutKeyMap: Record<string, KeyboardShortcutCommand> = {
  i: "focus-inbox",
  a: "approve",
  d: "deny",
  e: "escalate",
  n: "new-entity",
  s: "save",
  c: "cancel",
  r: "refresh"
};

export const resolveKeyboardShortcut = (event: KeyboardShortcutEvent): KeyboardShortcutCommand | null => {
  if (!event.altKey) {
    return null;
  }

  return shortcutKeyMap[event.key.toLowerCase()] ?? null;
};

export const moveListCursor = (currentIndex: number, total: number, key: string): number => {
  if (total <= 0) {
    return -1;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return total - 1;
  }

  if (key === "ArrowDown") {
    return (currentIndex + 1 + total) % total;
  }

  if (key === "ArrowUp") {
    return (currentIndex - 1 + total) % total;
  }

  return currentIndex;
};

export const moveFocusTrap = (currentIndex: number, total: number, shiftKey: boolean): number => {
  if (total <= 0) {
    return -1;
  }

  if (shiftKey) {
    return (currentIndex - 1 + total) % total;
  }

  return (currentIndex + 1) % total;
};

export type EntityFormValues = {
  name: string;
  summary: string;
  category: string;
};

export type EntityFormValidationResult = {
  isValid: boolean;
  errors: Partial<Record<keyof EntityFormValues, string>>;
  orderedErrorFields: Array<keyof EntityFormValues>;
};

export const validateEntityForm = (values: EntityFormValues): EntityFormValidationResult => {
  const errors: Partial<Record<keyof EntityFormValues, string>> = {};

  if (values.name.trim().length === 0) {
    errors.name = "Name is required.";
  }

  if (values.summary.trim().length === 0) {
    errors.summary = "Summary is required.";
  }

  if (values.category.trim().length === 0) {
    errors.category = "Category is required.";
  }

  const orderedErrorFields = ["name", "summary", "category"].filter((field) => Boolean(errors[field as keyof EntityFormValues])) as Array<keyof EntityFormValues>;

  return {
    isValid: orderedErrorFields.length === 0,
    errors,
    orderedErrorFields
  };
};

export const toAriaSort = (direction: "none" | "ascending" | "descending"): "none" | "ascending" | "descending" => direction;
