import { useEffect, useMemo, useRef, useState } from "react";

import type { ComposerProps } from "../types/ComposerProps";
import type { Attachment } from "../types/Attachment";
import type { ChatMode } from "../types/ChatMode";
import type { Connector } from "../types/Connector";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionResultList = {
  length: number;
  item: (index: number) => SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  item: (index: number) => SpeechRecognitionAlternative;
};

type SpeechRecognitionAlternative = {
  transcript: string;
};

const defaultConnectors: Connector[] = [
  {
    id: "web-search",
    label: "Web Search",
    description: "Include live web context.",
    enabled: false,
  },
  {
    id: "local-docs",
    label: "Local Docs",
    description: "Search project documentation files.",
    enabled: true,
  },
  {
    id: "repository",
    label: "Repository",
    description: "Use repository code context.",
    enabled: true,
  },
];

const defaultModes: ChatMode[] = [
  { id: "drafting", label: "Drafting", description: "Long-form generation mode." },
  { id: "editing", label: "Editing", description: "Focused revision mode." },
  { id: "brainstorming", label: "Brainstorming", description: "Idea generation mode." },
];

export function useComposerState(props: ComposerProps) {
  const {
    onSubmit,
    maxFiles = 5,
    maxFileSizeBytes = 5 * 1024 * 1024,
    allowedFileTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/json",
    ],
    initialConnectors = defaultConnectors,
    initialModes = defaultModes,
    quickActionSeed,
    onQuickActionSeedApplied,
  } = props;

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>(initialConnectors);
  const [currentModeId, setCurrentModeId] = useState(initialModes[0]?.id ?? "drafting");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);

  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const maybeWindow = window as typeof window & {
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
      SpeechRecognition?: SpeechRecognitionConstructor;
    };

    setSpeechSupported(Boolean(maybeWindow.SpeechRecognition || maybeWindow.webkitSpeechRecognition));
  }, []);

  const currentMode = useMemo(() => {
    return (
      initialModes.find((mode) => mode.id === currentModeId) ??
      initialModes[0] ?? {
        id: "drafting",
        label: "Drafting",
        description: "Long-form generation mode.",
      }
    );
  }, [currentModeId, initialModes]);

  const clearComposer = (): void => {
    setText("");
    setAttachments([]);
    setTranscript("");
    setAttachmentError(null);
  };

  useEffect(() => {
    setConnectors(initialConnectors);
  }, [initialConnectors]);

  useEffect(() => {
    const modeExists = initialModes.some((mode) => mode.id === currentModeId);
    if (modeExists) {
      return;
    }

    setCurrentModeId(initialModes[0]?.id ?? "drafting");
  }, [currentModeId, initialModes]);

  useEffect(() => {
    if (!quickActionSeed) {
      return;
    }

    setText(quickActionSeed);
    onQuickActionSeedApplied?.();
  }, [quickActionSeed, onQuickActionSeedApplied]);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.stop();
    };
  }, []);

  const addFiles = (files: File[]): void => {
    let nextError: string | null = null;

    setAttachments((previousAttachments) => {
      const availableSlots = maxFiles - previousAttachments.length;
      if (availableSlots <= 0) {
        nextError = `Maximum of ${maxFiles} files allowed.`;
        return previousAttachments;
      }

      const nextFiles = files.slice(0, availableSlots);
      const validFiles: Attachment[] = [];

      for (const file of nextFiles) {
        if (!allowedFileTypes.includes(file.type)) {
          nextError = `Unsupported file type: ${file.name}`;
          continue;
        }

        if (file.size > maxFileSizeBytes) {
          nextError = `File too large: ${file.name}`;
          continue;
        }

        validFiles.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }

      if (validFiles.length === 0) {
        return previousAttachments;
      }

      return [...previousAttachments, ...validFiles];
    });

    setAttachmentError(nextError);
  };

  const removeAttachment = (id: string): void => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  };

  const clearStagedFiles = (): void => {
    setAttachments([]);
    setAttachmentError(null);
  };

  const toggleConnector = (id: string): void => {
    setConnectors((prev) =>
      prev.map((connector) =>
        connector.id === id ? { ...connector, enabled: !connector.enabled } : connector,
      ),
    );
  };

  const setMode = (id: string): void => {
    setCurrentModeId(id);
  };

  const toggleDictation = (): void => {
    if (!speechSupported || typeof window === "undefined") {
      setDictationError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isDictating) {
      speechRecognitionRef.current?.stop();
      return;
    }

    const maybeWindow = window as typeof window & {
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
      SpeechRecognition?: SpeechRecognitionConstructor;
    };

    const RecognitionClass = maybeWindow.SpeechRecognition || maybeWindow.webkitSpeechRecognition;
    if (!RecognitionClass) {
      setDictationError("Speech recognition is unavailable.");
      return;
    }

    const recognition = new RecognitionClass();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let bufferedTranscript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results.item(i);
        if (result.isFinal) {
          bufferedTranscript += result.item(0).transcript;
        }
      }

      if (!bufferedTranscript) {
        return;
      }

      setTranscript((prev) => `${prev}${bufferedTranscript}`.trim());
      setText((prev) => `${prev} ${bufferedTranscript}`.trim());
    };

    recognition.onerror = (event) => {
      setDictationError(`Dictation error: ${event.error}`);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    speechRecognitionRef.current = recognition;
    setDictationError(null);
    setIsDictating(true);
    recognition.start();
  };

  const submit = async (): Promise<boolean> => {
    const trimmedText = text.trim();
    if (!trimmedText && attachments.length === 0) {
      return false;
    }

    await onSubmit({
      text: trimmedText,
      attachments,
      connectors: connectors.filter((connector) => connector.enabled),
      mode: currentMode,
      transcript,
    });

    clearComposer();
    return true;
  };

  return {
    text,
    textPayload: text,
    attachments,
    stagedFiles: attachments,
    connectors,
    currentMode,
    modes: initialModes,
    attachmentError,
    dictationError,
    isDictating,
    transcript,
    transcriptBuffer: transcript,
    speechSupported,
    setText,
    setTextPayload: setText,
    addFiles,
    stageFiles: addFiles,
    removeAttachment,
    removeStagedFile: removeAttachment,
    clearStagedFiles,
    toggleConnector,
    setMode,
    toggleDictation,
    submit,
  };
}
