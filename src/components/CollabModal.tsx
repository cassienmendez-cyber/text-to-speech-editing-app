import { useState } from "react";
import { useCollab } from "../collab-context";
import { Users, X } from "./icons";

export default function CollabModal({ onClose }: { onClose: () => void }) {
  const { status, room, peers, error, hostSession, joinSession, leave } =
    useCollab();
  const [joinCode, setJoinCode] = useState("");
  const [passphrase, setPassphrase] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-md space-y-4 border-ink-700">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-50">
            <Users className="h-5 w-5 text-accent-500" /> Live collaboration
          </h3>
          <button className="btn-icon h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "connected" ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-300">
              Connected · {peers} participant{peers === 1 ? "" : "s"}
            </p>
            <div>
              <div className="text-xs text-ink-400">Room code</div>
              <div className="flex items-center gap-2">
                <code className="rounded bg-ink-800 px-3 py-2 text-lg tracking-widest text-accent-400">
                  {room}
                </code>
                <button
                  className="btn-ghost py-1"
                  onClick={() => navigator.clipboard?.writeText(room)}
                >
                  Copy
                </button>
              </div>
            </div>
            <p className="text-xs text-ink-500">
              Share this code (and the passphrase, if you set one) with your
              collaborators. Everyone with the code edits the same project in
              real time, peer-to-peer.
            </p>
            <button className="btn-ghost w-full" onClick={leave}>
              Leave session
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-300">
              Share this project with editors and beta readers in real time over
              an encrypted peer-to-peer connection. This sends manuscript and
              note data to connected peers — only people with the code (and
              passphrase) can join.
            </p>

            <label className="block text-xs text-ink-400">
              Passphrase (optional, end-to-end encrypts the session)
              <input
                className="field mt-1"
                type="text"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="shared secret"
              />
            </label>

            <button
              className="btn-primary w-full"
              disabled={status === "connecting"}
              onClick={() => hostSession(passphrase || undefined)}
            >
              {status === "connecting" ? "Connecting…" : "Start sharing this project"}
            </button>

            <div className="flex items-center gap-2 text-xs text-ink-500">
              <span className="h-px flex-1 bg-ink-800" /> or join{" "}
              <span className="h-px flex-1 bg-ink-800" />
            </div>

            <div className="flex gap-2">
              <input
                className="field tracking-widest"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                maxLength={6}
              />
              <button
                className="btn-ghost"
                disabled={status === "connecting" || joinCode.length < 4}
                onClick={() => joinSession(joinCode, passphrase || undefined)}
              >
                Join
              </button>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            <p className="text-[10px] text-ink-500">
              Peer-to-peer uses WebRTC and a signaling server to introduce peers;
              if a corporate firewall blocks WebRTC it may not connect.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
