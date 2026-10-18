"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { CanvasTexture, SRGBColorSpace, Texture } from "three";
import { drawLandTexture, landColors } from "@/lib/landTexture";
import { palette } from "@/lib/palette";

export function Earth() {
  const invalidate = useThree((s) => s.invalidate);
  const [texture, setTexture] = useState<Texture | null>(null);

  // The map is drawn in a worker so loading never freezes the page; until it
  // arrives (a beat), the globe shows its plain ocean.
  useEffect(() => {
    // Small screens can't show 4096px of map; half the size uses a quarter of the GPU memory.
    const width = Math.min(window.screen.width, window.screen.height) < 768 ? 2048 : 4096;
    let made: Texture | null = null;
    let done = false;
    const apply = (t: Texture) => {
      if (done) return t.dispose();
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      made = t;
      setTexture(t);
      invalidate();
    };
    // Where workers can't draw (older browsers) or the worker fails: draw here, after the first paint.
    let frame = 0;
    const onPage = () => void (frame = requestAnimationFrame(() => apply(new CanvasTexture(drawLandTexture(width)))));

    let worker: Worker | null = null;
    if (typeof OffscreenCanvas === "undefined") onPage();
    else {
      worker = new Worker(new URL("../../lib/landTexture.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (e: MessageEvent<ImageBitmap>) => {
        const t = new Texture(e.data);
        t.flipY = false; // the worker already flipped it; WebGL can't flip an ImageBitmap
        apply(t);
        worker?.terminate();
      };
      worker.onerror = () => {
        worker?.terminate();
        onPage();
      };
      worker.postMessage({ width, colors: landColors() });
    }

    return () => {
      done = true;
      cancelAnimationFrame(frame);
      worker?.terminate();
      made?.dispose();
    };
  }, [invalidate]);

  return (
    <mesh>
      <sphereGeometry args={[1, 128, 128]} />
      {/* Part self-lit so the light palette keeps its color; the lights only add soft shading.
          Keyed so the shader is rebuilt with the map once it arrives. */}
      {texture ? (
        <meshStandardMaterial
          key="map"
          map={texture}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={0.6}
          roughness={0.95}
          metalness={0}
        />
      ) : (
        <meshStandardMaterial
          key="plain"
          color={palette.ocean}
          emissive={palette.ocean}
          emissiveIntensity={0.6}
          roughness={0.95}
          metalness={0}
        />
      )}
    </mesh>
  );
}
