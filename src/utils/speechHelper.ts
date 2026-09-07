import { SUPPORTED_LANGUAGES } from "../data/translations";

export type TTSState = "idle" | "playing" | "paused";

/**
 * Text to Speech (TTS) Manager with full Play, Pause, Resume, and Stop controls
 */
class SpeechTTSManager {
  private state: TTSState = "idle";
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentText = "";
  private currentLangCode = "en";
  private currentSpeed = 1.0;
  private currentPitch = 1.0;
  private listeners: Set<(state: TTSState) => void> = new Set();
  private onEndCallbacks: Set<() => void> = new Set();

  public isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  public getState(): TTSState {
    if (!this.isSupported()) return "idle";
    if (window.speechSynthesis.paused) return "paused";
    if (window.speechSynthesis.speaking) return "playing";
    return this.state;
  }

  public subscribe(listener: (state: TTSState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(newState: TTSState): void {
    this.state = newState;
    this.listeners.forEach((l) => l(newState));
  }

  public speak(
    text: string,
    langCode: string,
    speed = 1.0,
    pitch = 1.0,
    onFinish?: () => void
  ): boolean {
    if (!this.isSupported()) {
      console.warn("Speech Synthesis is not supported on this device/browser.");
      return false;
    }

    this.stop();

    if (!text || text.trim() === "") return false;

    this.currentText = text;
    this.currentLangCode = langCode;
    this.currentSpeed = speed;
    this.currentPitch = pitch;

    if (onFinish) {
      this.onEndCallbacks.add(onFinish);
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Find matching language or fallback
      const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
      const targetLocale = langConfig?.speechLocale || "en-IN";
      utterance.lang = targetLocale;
      utterance.rate = Math.max(0.7, Math.min(1.5, speed));
      utterance.pitch = Math.max(0.8, Math.min(1.3, pitch));

      // Attempt to pick a voice matching the target language if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) => v.lang.startsWith(targetLocale.split("-")[0]));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        this.notify("playing");
      };

      utterance.onpause = () => {
        this.notify("paused");
      };

      utterance.onresume = () => {
        this.notify("playing");
      };

      utterance.onend = () => {
        this.notify("idle");
        this.currentUtterance = null;
        this.onEndCallbacks.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error(e);
          }
        });
        this.onEndCallbacks.clear();
      };

      utterance.onerror = (e) => {
        console.warn("Speech Synthesis event:", e);
        this.notify("idle");
        this.currentUtterance = null;
        this.onEndCallbacks.forEach((cb) => {
          try {
            cb();
          } catch (err) {
            console.error(err);
          }
        });
        this.onEndCallbacks.clear();
      };

      window.speechSynthesis.speak(utterance);
      this.notify("playing");
      return true;
    } catch (err) {
      console.error("Failed to speak text:", err);
      this.notify("idle");
      return false;
    }
  }

  public pause(): void {
    if (!this.isSupported()) return;
    try {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        this.notify("paused");
      }
    } catch (e) {
      console.warn("Error pausing speech synthesis:", e);
    }
  }

  public resume(): void {
    if (!this.isSupported()) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        this.notify("playing");
      }
    } catch (e) {
      console.warn("Error resuming speech synthesis:", e);
    }
  }

  public stop(): void {
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("Error stopping speech synthesis:", e);
    }
    this.notify("idle");
    this.currentUtterance = null;
  }
}

export const ttsManager = new SpeechTTSManager();

/**
 * Speech-to-Text Recognition Handler
 */
export interface VoiceRecognitionOptions {
  langCode: string;
  onResult: (transcript: string) => void;
  onError: (errorKey: "denied" | "unavailable" | "error", rawMsg?: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export class VoiceRecognizer {
  private recognition: any = null;
  private isListening = false;
  private lastOptions: VoiceRecognitionOptions | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
      }
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public start(options: VoiceRecognitionOptions): void {
    this.lastOptions = options;
    if (!this.recognition) {
      options.onError("unavailable", "Speech recognition not supported");
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === options.langCode);
    this.recognition.lang = langConfig?.speechLocale || "en-IN";

    let finalTranscript = "";

    this.recognition.onstart = () => {
      this.isListening = true;
      options.onStart();
    };

    this.recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      options.onResult(finalTranscript || interim);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      const err = event.error || "";
      if (err === "not-allowed" || err === "permission-denied") {
        options.onError("denied", "Microphone access denied");
      } else if (err === "service-not-allowed" || err === "network") {
        options.onError("unavailable", "Speech service unavailable");
      } else if (err === "no-speech") {
        // No speech detected is common, end gracefully
        options.onEnd();
      } else {
        options.onError("error", err || "Voice input error");
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      options.onEnd();
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      this.isListening = false;
      options.onError("error", e.message || "Failed to start recognition");
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }
  }

  public cancel(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
      this.isListening = false;
    }
  }

  public retry(): void {
    if (this.lastOptions) {
      this.start(this.lastOptions);
    }
  }
}

export const voiceRecognizer = new VoiceRecognizer();
