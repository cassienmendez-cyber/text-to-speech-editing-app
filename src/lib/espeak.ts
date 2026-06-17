// Free, offline text-to-speech via meSpeak.js (an eSpeak port). Distinct voices
// and accents that sound the same on every device. Loaded entirely on demand
// (the engine + voice data are dynamically imported and code-split) so they
// never touch the main bundle unless the author selects the eSpeak engine.

interface VoiceDef {
  id: string;
  label: string;
  load: () => Promise<{ default: unknown }>;
}

const VOICES: VoiceDef[] = [
  { id: "en/en-us", label: "English (US)", load: () => import("mespeak/voices/en/en-us.json") },
  { id: "en", label: "English (UK)", load: () => import("mespeak/voices/en/en.json") },
  { id: "en/en-rp", label: "English (UK · RP)", load: () => import("mespeak/voices/en/en-rp.json") },
  { id: "en/en-n", label: "English (UK · North)", load: () => import("mespeak/voices/en/en-n.json") },
  { id: "en/en-wm", label: "English (UK · W. Midlands)", load: () => import("mespeak/voices/en/en-wm.json") },
  { id: "en/en-sc", label: "English (Scottish)", load: () => import("mespeak/voices/en/en-sc.json") },
  { id: "de", label: "German", load: () => import("mespeak/voices/de.json") },
  { id: "fr", label: "French", load: () => import("mespeak/voices/fr.json") },
  { id: "es", label: "Spanish", load: () => import("mespeak/voices/es.json") },
];

export const ESPEAK_VOICES = VOICES.map((v) => ({ id: v.id, label: v.label }));
export const DEFAULT_ESPEAK_VOICE = "en/en-us";

let instance: any = null;
let ready: Promise<any> | null = null;

async function ensure(): Promise<any> {
  if (ready) return ready;
  ready = (async () => {
    const mod: any = await import("mespeak");
    const meSpeak = mod.default ?? mod;
    const config = (await import("mespeak/src/mespeak_config.json")).default;
    meSpeak.loadConfig(config);
    await Promise.all(
      VOICES.map(async (v) => meSpeak.loadVoice((await v.load()).default)),
    );
    instance = meSpeak;
    return meSpeak;
  })();
  return ready;
}

/** Speak one chunk; `onEnd` fires only on natural completion (not when stopped). */
export async function espeakSpeak(
  text: string,
  voiceId: string,
  rate: number,
  onEnd: () => void,
): Promise<void> {
  const meSpeak = await ensure();
  const speed = Math.min(400, Math.max(80, Math.round(175 * rate)));
  meSpeak.stop();
  meSpeak.speak(text, { voice: voiceId, speed }, (success: boolean) => {
    if (success) onEnd();
  });
}

export function espeakStop(): void {
  try {
    instance?.stop();
  } catch {
    /* noop */
  }
}
