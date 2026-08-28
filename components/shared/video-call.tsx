"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, VideoOff } from "lucide-react";

import { getCallToken } from "@/lib/services/calls";
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
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);

  // onLeave lives in a ref so a re-created callback in the parent doesn't
  // tear the meeting down and rebuild it mid-call.
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    let disposed = false;

    (async () => {
      const { data, error: tokenError } = await getCallToken(callId);
      if (disposed) return;
      if (tokenError || !data) {
        setError(tokenError?.message || "Could not join this call.");
        setConnecting(false);
        return;
      }

      try {
        await loadJaasScript(data.appId);
      } catch {
        if (!disposed) {
          setError("Could not reach the video service.");
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

      const handleJoined = () => !disposed && setConnecting(false);
      const handleLeft = () => onLeaveRef.current();

      api.addListener("videoConferenceJoined", handleJoined);
      api.addListener("videoConferenceLeft", handleLeft);
      api.addListener("readyToClose", handleLeft);
    })();

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [callId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-white px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
          <VideoOff className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">Call couldn&apos;t start</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={onLeave}>
          Back to messages
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
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
