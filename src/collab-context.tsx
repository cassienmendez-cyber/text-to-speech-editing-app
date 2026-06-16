import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "./store";
import type { Project } from "./types";

type Status = "off" | "connecting" | "connected";

interface CollabApi {
  status: Status;
  room: string;
  peers: number;
  error: string | null;
  /** Share the currently-open project and return its room code. */
  hostSession: (password?: string) => Promise<void>;
  joinSession: (code: string, password?: string) => Promise<void>;
  leave: () => void;
}

interface SessionRefs {
  doc?: { destroy: () => void };
  provider?: { destroy: () => void; awareness: any };
  binding?: { push: (p: Project) => void };
  unsub?: () => void;
  applying?: boolean;
  lastPushed?: Project;
  syncedId?: string | null;
}

// The collaboratively-shared slices of a project. Playback position, rate, and
// voice are deliberately excluded — they're per-user.
const SHARED_KEYS = [
  "manuscript",
  "notes",
  "bookmarks",
  "characters",
  "world",
  "passes",
  "revisions",
] as const;

function sharedUnchanged(a: Project, b: Project): boolean {
  return SHARED_KEYS.every((k) => (a as any)[k] === (b as any)[k]);
}

const CollabContext = createContext<CollabApi | null>(null);

export function useCollab(): CollabApi {
  const ctx = useContext(CollabContext);
  if (!ctx) throw new Error("useCollab must be used within CollabProvider");
  return ctx;
}

export function CollabProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("off");
  const [room, setRoom] = useState("");
  const [peers, setPeers] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<SessionRefs>({});

  function teardown() {
    const r = ref.current;
    try {
      r.unsub?.();
    } catch {
      /* noop */
    }
    try {
      r.provider?.destroy();
    } catch {
      /* noop */
    }
    try {
      r.doc?.destroy();
    } catch {
      /* noop */
    }
    ref.current = {};
  }

  async function begin(mode: "host" | "join", code: string, password?: string) {
    setError(null);
    setStatus("connecting");
    setRoom(code);
    try {
      // Loaded on demand so Yjs / y-webrtc stay out of the main bundle.
      const Y = await import("yjs");
      const collab = await import("./lib/collab");
      const doc = new Y.Doc();
      const binding = new collab.ProjectBinding(doc);
      const r = ref.current;
      r.doc = doc;
      r.binding = binding;
      r.applying = false;
      r.syncedId = null;

      // Remote → local: apply incoming changes, preserving this peer's own
      // listening position and narration settings (those are personal).
      binding.observe((proj) => {
        r.applying = true;
        const existing = useStore.getState().projects[proj.manuscript.id];
        useStore.getState().replaceProject({
          ...proj,
          playbackIndex: existing?.playbackIndex ?? 0,
          rate: existing?.rate ?? 1,
          voiceURI: existing?.voiceURI,
        });
        r.syncedId = proj.manuscript.id;
        r.lastPushed = useStore.getState().projects[proj.manuscript.id];
        r.applying = false;
      });

      if (mode === "host") {
        const p = useStore.getState().current();
        if (!p) throw new Error("Open a project to share first.");
        binding.push(p);
        r.syncedId = p.manuscript.id;
        r.lastPushed = p;
      }

      const provider = await collab.connectWebrtc(doc, code, password);
      r.provider = provider;
      const updatePeers = () => setPeers(provider.awareness.getStates().size);
      provider.awareness.on("change", updatePeers);
      updatePeers();

      // Local → remote: push only when the *shared* parts change. Playback
      // position / rate / voice churn every narrated sentence and are personal,
      // so skip pushes where only those differ.
      r.unsub = useStore.subscribe((state) => {
        const id = r.syncedId;
        if (!id || r.applying) return;
        const p = state.projects[id];
        if (!p || (r.lastPushed && sharedUnchanged(p, r.lastPushed))) return;
        r.lastPushed = p;
        binding.push(p);
      });

      setStatus("connected");
    } catch (e) {
      teardown();
      setError(e instanceof Error ? e.message : String(e));
      setStatus("off");
    }
  }

  const api: CollabApi = {
    status,
    room,
    peers,
    error,
    hostSession: async (password) => {
      const collab = await import("./lib/collab");
      await begin("host", collab.generateRoomCode(), password);
    },
    joinSession: (code, password) =>
      begin("join", code.trim().toUpperCase(), password),
    leave: () => {
      teardown();
      setStatus("off");
      setRoom("");
      setPeers(1);
      setError(null);
    },
  };

  useEffect(() => () => teardown(), []);

  return (
    <CollabContext.Provider value={api}>{children}</CollabContext.Provider>
  );
}
