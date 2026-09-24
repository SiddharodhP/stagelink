"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, VideoOff, AlertTriangle } from "lucide-react";

import { getCallToken, touchCall } from "@/lib/services/calls";
import { Button } from "@/components/ui/button";

/**
 * The JaaS meeting, embedded on our page.
 *
 * The whole call happens in this iframe — nobody is sent to 8x8.vc. The
 * external_api.js script has to come from 8x8 because it is what creates
 * and talks to that iframe; there is no self-hosted equivalent short of
 * running Jitsi ourselves.
 *
 * The script is loaded per AppID and cached across mounts, because
 * re-adding the same tag on every call would re-register the global and
 * leak listeners.
 */

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>
    ) => JitsiApi;
  }
}

interface JitsiApi {
  addListener(event: string, handler: (...args: unknown[]) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
  executeCommand(command: string, ...args: unknown[]): void;
  dispose(): void;
}

/**
 * How long to wait for the meeting to connect before giving up.
 *
 * Without a ceiling the overlay spins forever when the iframe never
 * reaches "joined" — a blocked camera, a failed connection, or the other
 * side hanging up mid-connect all look identical to the user otherwise.
 */
const CONNECT_TIMEOUT_MS = 25_000;

const scriptCache = new Map<string, Promise<void>>();

function loadJaasScript(appId: string) {
  const cached = scriptCache.get(appId);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://8x8.vc/${appId}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Could not reach the video service."));
    document.body.appendChild(script);
  });

  scriptCache.set(appId, promise);
  return promise;
}

export function VideoCall({
  callId,
  onLeave,
  className,
}: {
  callId: string;
  onLeave: () => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  // fatalError replaces the iframe (we never built one). slowWarning sits
  // above it (the iframe exists and may be showing its own message —
  // hiding it was what made the last failure undiagnosable).
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [slowWarning, setSlowWarning] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);

  // onLeave lives in a ref so a re-created callback in the parent doesn't
  // tear the meeting down and rebuild it mid-call.
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    let disposed = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const { data, error: tokenError } = await getCallToken(callId);
      if (disposed) return;
      if (tokenError || !data) {
        setFatalError(tokenError?.message || "Could not join this call.");
        setConnecting(false);
        return;
      }

      try {
        await loadJaasScript(data.appId);
      } catch {
        if (!disposed) {
          setFatalError("Could not reach the video service.");
          setConnecting(false);
        }
        return;
      }
      if (disposed || !containerRef.current || !window.JitsiMeetExternalAPI) return;

      const api = new window.JitsiMeetExternalAPI("8x8.vc", {
        // JaaS namespaces every room under the AppID.
        roomName: `${data.appId}/${data.room}`,
        jwt: data.token,
        parentNode: containerRef.current,
        configOverwrite: {
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        },
        interfaceConfigOverwrite: {
          // The two people are already known to each other from the thread,
          // so the invite and profile panels are noise here.
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "tileview",
            "settings",
            "hangup",
          ],
        },
      });

      apiRef.current = api;

      // Drop the overlay and warn, but LEAVE THE IFRAME MOUNTED. Jitsi
      // shows its own reason in there — a permission prompt, "membership
      // required", an auth failure — and replacing it with our own message
      // throws away the only real diagnostic.
      timeoutId = setTimeout(() => {
        if (disposed) return;
        setConnecting(false);
        setSlowWarning(
          "Still connecting. If the call area shows an error or a permission prompt, that's the reason."
        );
      }, CONNECT_TIMEOUT_MS);

      const handleJoined = () => {
        if (disposed) return;
        clearTimeout(timeoutId);
        setConnecting(false);
      };
      const handleLeft = () => onLeaveRef.current();

      // The other person leaving ends the call for whoever is left, rather
      // than stranding them alone in an empty room.
      const handleParticipantLeft = () => onLeaveRef.current();
      // Surface what Jitsi actually said rather than a generic line.
      const handleFailure = (...args: unknown[]) => {
        if (disposed) return;
        const detail = args[0] as { error?: { message?: string; name?: string } };
        const reason =
          detail?.error?.message || detail?.error?.name || "unknown error";
        console.error("Jitsi error:", detail);
        setConnecting(false);
        setSlowWarning(`Video service reported: ${reason}`);
      };

      api.addListener("videoConferenceJoined", handleJoined);
      api.addListener("videoConferenceLeft", handleLeft);
      api.addListener("readyToClose", handleLeft);
      api.addListener("participantLeft", handleParticipantLeft);
      api.addListener("errorOccurred", handleFailure);
    })();

    return () => {
      disposed = true;
      clearTimeout(timeoutId);
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [callId]);

  // Heartbeat. A call with nobody reporting in is treated as over by the
  // server, so this is what stops an abandoned session wedging the
  // conversation for the next call.
  useEffect(() => {
    const beat = () => {
      touchCall(callId);
    };
    beat();
    const interval = setInterval(beat, 15_000);
    return () => clearInterval(interval);
  }, [callId]);

  if (fatalError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <VideoOff className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">Call couldn&apos;t start</p>
          <p className="mt-1 text-sm text-muted-foreground">{fatalError}</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={onLeave}>
          Back to messages
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {slowWarning && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-3 py-2 text-sm text-amber-900 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{slowWarning}</span>
        </div>
      )}
      <div className="relative overflow-hidden rounded-xl border border-border bg-ink">
        {connecting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink text-paper">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm opacity-80">Connecting…</p>
          </div>
        )}
        <div ref={containerRef} className="h-[min(70vh,560px)] w-full" />
      </div>
    </div>
  );
}
