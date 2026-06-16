import * as Y from "yjs";
import type { Project } from "../types";

// Real-time collaboration. The shared project lives in a Yjs document (a CRDT),
// so concurrent edits from the author and beta readers merge without conflicts.
// This module is transport-agnostic and unit-testable; the WebRTC wiring is a
// lazily-loaded, browser-only function at the bottom.

const LOCAL_ORIGIN = "local";

// Collections synced as arrays of plain (JSON) items keyed by `id`. Concurrent
// additions merge; edits replace the item; deletes remove it.
const COLLECTIONS = [
  "notes",
  "bookmarks",
  "characters",
  "world",
  "passes",
  "revisions",
] as const;

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

function reconcile(yarr: Y.Array<any>, items: any[]): void {
  const ids = new Set(items.map((i) => i.id));
  // Remove items no longer present locally.
  for (let i = yarr.length - 1; i >= 0; i -= 1) {
    if (!ids.has(yarr.get(i).id)) yarr.delete(i, 1);
  }
  // Upsert in local order.
  const indexById = new Map<string, number>();
  yarr.toArray().forEach((v, i) => indexById.set(v.id, i));
  for (const item of items) {
    const at = indexById.get(item.id);
    if (at === undefined) {
      yarr.push([clone(item)]);
    } else if (JSON.stringify(yarr.get(at)) !== JSON.stringify(item)) {
      yarr.delete(at, 1);
      yarr.insert(at, [clone(item)]);
    }
  }
}

/** Binds a Project to a Yjs document, in both directions. */
export class ProjectBinding {
  readonly doc: Y.Doc;
  private meta: Y.Map<any>;
  private arrays: Record<string, Y.Array<any>> = {};
  private onRemote?: (project: Project) => void;

  constructor(doc: Y.Doc) {
    this.doc = doc;
    this.meta = doc.getMap("meta");
    for (const c of COLLECTIONS) this.arrays[c] = doc.getArray(c);
    this.doc.on("update", (_update: Uint8Array, origin: unknown) => {
      // Ignore our own writes and empty docs.
      if (origin === LOCAL_ORIGIN) return;
      if (!this.hasData()) return;
      this.onRemote?.(this.read());
    });
  }

  /** Register a callback fired when a remote peer changes the project. */
  observe(cb: (project: Project) => void): void {
    this.onRemote = cb;
  }

  /** True once the document holds a manuscript (i.e. has been seeded). */
  hasData(): boolean {
    return this.meta.has("manuscript");
  }

  /** Push the local project into the shared document (minimal CRDT ops). */
  push(project: Project): void {
    this.doc.transact(() => {
      this.meta.set("manuscript", clone(project.manuscript));
      this.meta.set("playbackIndex", project.playbackIndex);
      this.meta.set("rate", project.rate);
      this.meta.set("voiceURI", project.voiceURI ?? null);
      for (const c of COLLECTIONS) {
        reconcile(this.arrays[c], (project as any)[c] ?? []);
      }
    }, LOCAL_ORIGIN);
  }

  /** Read the current shared project out of the document. */
  read(): Project {
    const project: any = {
      manuscript: this.meta.get("manuscript"),
      playbackIndex: this.meta.get("playbackIndex") ?? 0,
      rate: this.meta.get("rate") ?? 1,
      voiceURI: this.meta.get("voiceURI") ?? undefined,
    };
    for (const c of COLLECTIONS) {
      project[c] = this.arrays[c].toArray().map((v) => clone(v));
    }
    return project as Project;
  }
}

/** A short, human-friendly room code for sharing a session. */
export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Connect a Yjs document to peers over WebRTC. Browser-only; y-webrtc is
 * dynamically imported so it (and its crypto/webrtc deps) stay out of the main
 * bundle and out of the Node test path.
 *
 * `password` enables y-webrtc's end-to-end encryption — peers must share it.
 * Signaling servers can be overridden via the VITE_SIGNALING env var
 * (comma-separated wss:// URLs); otherwise y-webrtc's defaults are used.
 */
/** ICE servers for NAT traversal: a default public STUN, plus any servers
 *  (typically TURN, with credentials) supplied as JSON in VITE_ICE_SERVERS. */
function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
  ];
  const raw = (import.meta.env.VITE_ICE_SERVERS as string | undefined) ?? "";
  if (raw.trim()) {
    try {
      const extra = JSON.parse(raw);
      if (Array.isArray(extra)) servers.push(...extra);
    } catch {
      console.warn("VITE_ICE_SERVERS is not valid JSON; ignoring.");
    }
  }
  return servers;
}

export async function connectWebrtc(
  doc: Y.Doc,
  room: string,
  password?: string,
) {
  const { WebrtcProvider } = await import("y-webrtc");
  const env = (import.meta.env.VITE_SIGNALING as string | undefined) ?? "";
  const signaling = env.split(",").map((s) => s.trim()).filter(Boolean);
  return new WebrtcProvider(`storyscribe-${room}`, doc, {
    password: password || undefined,
    ...(signaling.length ? { signaling } : {}),
    // Passed through to simple-peer → RTCPeerConnection.
    peerOpts: { config: { iceServers: iceServers() } },
  });
}
