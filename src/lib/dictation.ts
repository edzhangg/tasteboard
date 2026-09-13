/**
 * Web Speech API dictation for the note field.
 *
 * Notes are expected to be dictated, so the recogniser snapshots whatever is
 * already typed when it starts and APPENDS the running transcript to that
 * snapshot — it never replaces what you wrote.
 */

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface DictationHandlers {
  /** The full note text: the snapshot plus everything heard so far. */
  onTranscript: (text: string) => void;
  onStop: () => void;
  onError: (message: string) => void;
}

export interface DictationSession {
  stop: () => void;
}

/**
 * Starts dictation. Returns null if it could not start — the handler will
 * already have been told why.
 */
export function startDictation(
  baseText: string,
  handlers: DictationHandlers,
): DictationSession | null {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError("Dictation isn't supported in this browser");
    return null;
  }

  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let heard = "";
    for (let i = 0; i < event.results.length; i++) {
      heard += event.results[i][0].transcript;
    }
    const joined =
      (baseText ? baseText.replace(/\s+$/, "") + " " : "") + heard.replace(/^\s+/, "");
    handlers.onTranscript(joined);
  };

  recognition.onerror = (event) => {
    handlers.onStop();
    handlers.onError(
      event.error === "not-allowed"
        ? "Microphone permission denied"
        : "Dictation stopped",
    );
  };

  recognition.onend = () => handlers.onStop();

  try {
    recognition.start();
  } catch {
    handlers.onError("Couldn't start dictation");
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}
