"use client";

import dynamic from "next/dynamic";
import { Component, type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { useGlobe } from "@/store";

// WebGL only exists in the browser, so the scene skips server rendering.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <div className="aspect-square h-3/4 animate-pulse rounded-full bg-chip" />
    </div>
  ),
});

/** Whether this browser can draw WebGL at all. Asked once; the test context is let go right away. */
let webgl: boolean | null = null;
function hasWebGL() {
  if (webgl === null) {
    try {
      const gl = document.createElement("canvas").getContext("webgl2") ?? document.createElement("canvas").getContext("webgl");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      webgl = gl !== null;
    } catch {
      webgl = false;
    }
  }
  return webgl;
}
const never = () => () => {};

/** If the globe throws (no context, a driver error), only the globe goes; the answer keeps working. */
class GlobeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Where the globe would be: a still disc, what happened, and a way back when there is one. */
function GlobeFallback({ onRetry }: { onRetry?: () => void }) {
  // While it's up, the list words itself without pointing to a globe.
  useEffect(() => {
    useGlobe.setState({ globeOff: true });
    return () => useGlobe.setState({ globeOff: false });
  }, []);
  return (
    <div className="relative grid h-full place-items-center px-6">
      <div aria-hidden="true" className="absolute aspect-square h-3/4 rounded-full bg-chip" />
      <div role="status" className="relative flex max-w-72 flex-col items-center gap-3 text-center text-sm text-ink">
        <p>
          {onRetry ? "The globe stopped drawing." : "The 3D globe can't run in this browser."} Every quake is still listed
          in the answer.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-chip-line bg-surface px-4 py-2.5 font-medium transition-colors hover:border-ink/40"
          >
            Restart the globe
          </button>
        )}
      </div>
    </div>
  );
}

export function GlobeView() {
  const load = useGlobe((s) => s.load);
  useEffect(() => void load(), [load]);
  // The server can't know, so it renders the globe and the browser corrects it.
  const supported = useSyncExternalStore(never, hasWebGL, () => true);
  // The browser can take the GPU back (a driver reset, too many tabs): offer to start again.
  const [lost, setLost] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setLost(false);
    setAttempt((n) => n + 1);
  };

  if (!supported) return <GlobeFallback />;
  if (lost) return <GlobeFallback onRetry={retry} />;
  return (
    <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
      <GlobeBoundary key={attempt} fallback={<GlobeFallback onRetry={retry} />}>
        <Scene onContextLost={() => setLost(true)} />
      </GlobeBoundary>
    </div>
  );
}
