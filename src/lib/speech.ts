// Browser-native speech: text-to-speech narration and speech-to-text capture.
// Everything runs locally in the browser, satisfying the local-first and
// privacy principles (no manuscript audio leaves the device).

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak a short confirmation phrase (accessibility). No-op if unsupported. */
export function speak(text: string): void {
  if (!ttsSupported()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  window.speechSynthesis.speak(u);
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return [];
  return window.speechSynthesis.getVoices();
}

/** Resolve voices once they are available (some browsers load them async). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve([]);
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);
    const handler = () => {
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    // Fallback in case the event never fires.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
  });
}

export interface NarratorOptions {
  onIndex: (index: number) => void;
  onState: (playing: boolean) => void;
  onEnd: () => void;
}

/**
 * Narrates an ordered list of sentences one utterance at a time. Speaking each
 * sentence individually keeps utterances short (avoiding the Chrome ~15s cutoff
 * bug) and gives us precise sentence-level highlighting.
 */
export class Narrator {
  private sentences: string[] = [];
  private index = 0;
  private rate = 1;
  private voice: SpeechSynthesisVoice | null = null;
  private playing = false;
  private opts: NarratorOptions;

  constructor(opts: NarratorOptions) {
    this.opts = opts;
  }

  setSentences(sentences: string[]) {
    this.sentences = sentences;
  }

  setRate(rate: number) {
    this.rate = rate;
    // Re-speak the current sentence at the new rate if mid-playback.
    if (this.playing) this.speakCurrent();
  }

  setVoice(voice: SpeechSynthesisVoice | null) {
    this.voice = voice;
    if (this.playing) this.speakCurrent();
  }

  getIndex() {
    return this.index;
  }

  isPlaying() {
    return this.playing;
  }

  seek(index: number) {
    this.index = Math.max(0, Math.min(index, this.sentences.length - 1));
    this.opts.onIndex(this.index);
    if (this.playing) this.speakCurrent();
  }

  next() {
    this.seek(this.index + 1);
  }

  prev() {
    this.seek(this.index - 1);
  }

  /** Approximate a 15-second skip by jumping a few sentences. */
  skipForward() {
    this.seek(this.index + 3);
  }

  skipBackward() {
    this.seek(this.index - 3);
  }

  play() {
    if (!ttsSupported() || this.sentences.length === 0) return;
    this.playing = true;
    this.opts.onState(true);
    this.speakCurrent();
  }

  pause() {
    this.playing = false;
    this.opts.onState(false);
    if (ttsSupported()) window.speechSynthesis.cancel();
  }

  stop() {
    this.playing = false;
    this.index = 0;
    this.opts.onState(false);
    this.opts.onIndex(0);
    if (ttsSupported()) window.speechSynthesis.cancel();
  }

  private speakCurrent() {
    if (!ttsSupported()) return;
    window.speechSynthesis.cancel();
    const text = this.sentences[this.index];
    if (text === undefined) {
      this.playing = false;
      this.opts.onState(false);
      this.opts.onEnd();
      return;
    }
    this.opts.onIndex(this.index);

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = this.rate;
    if (this.voice) utter.voice = this.voice;
    utter.onend = () => {
      if (!this.playing) return;
      if (this.index >= this.sentences.length - 1) {
        this.playing = false;
        this.opts.onState(false);
        this.opts.onEnd();
        return;
      }
      this.index += 1;
      this.speakCurrent();
    };
    utter.onerror = (e) => {
      // "interrupted" / "canceled" are expected when we seek; ignore those.
      if (e.error === "interrupted" || e.error === "canceled") return;
      this.playing = false;
      this.opts.onState(false);
    };
    window.speechSynthesis.speak(utter);
  }
}

// --------------------------------------------------------------------------
// Speech-to-text capture for voice notes.
// --------------------------------------------------------------------------

export function sttSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

export function recordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof window !== "undefined" &&
    "MediaRecorder" in window
  );
}

export interface VoiceCaptureHandlers {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
}

/**
 * Captures a voice note: records audio (preserving the original recording) and,
 * where supported, transcribes it live via the Web Speech API.
 */
export class VoiceCapture {
  private recognition: any | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private handlers: VoiceCaptureHandlers;
  private finalText = "";

  constructor(handlers: VoiceCaptureHandlers) {
    this.handlers = handlers;
  }

  async start(): Promise<void> {
    this.finalText = "";
    this.chunks = [];

    // Live transcription (best-effort).
    if (sttSupported()) {
      const Ctor =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            this.finalText += result[0].transcript;
            this.handlers.onTranscript(this.finalText.trim(), true);
          } else {
            interim += result[0].transcript;
          }
        }
        if (interim) {
          this.handlers.onTranscript(`${this.finalText} ${interim}`.trim(), false);
        }
      };
      rec.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          this.handlers.onError(`Transcription error: ${e.error}`);
        }
      };
      this.recognition = rec;
      try {
        rec.start();
      } catch {
        /* already started */
      }
    }

    // Audio recording to preserve the original voice note.
    if (recordingSupported()) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.recorder = new MediaRecorder(this.stream);
        this.recorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.chunks.push(e.data);
        };
        this.recorder.start();
      } catch (err) {
        this.handlers.onError(
          "Microphone unavailable — you can still type your note.",
        );
      }
    }
  }

  /** Stops capture and returns the recorded audio as a data URL (if any). */
  async stop(): Promise<{ audioUrl?: string }> {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* noop */
      }
      this.recognition = null;
    }

    const audioUrl = await new Promise<string | undefined>((resolve) => {
      if (!this.recorder) return resolve(undefined);
      this.recorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(blob);
      };
      try {
        this.recorder.stop();
      } catch {
        resolve(undefined);
      }
    });

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    return { audioUrl };
  }
}
