"use client";

import { useMemo } from "react";
import { BackSide, Color, FrontSide, NormalBlending } from "three";
import { palette } from "@/lib/palette";

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A soft shadow around the globe: the inside of a slightly bigger sphere,
// strongest right at the globe's edge and fading out. Lifts it off the page.
const haloFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  void main() {
    float d = -dot(vNormal, vec3(0.0, 0.0, 1.0));
    float intensity = pow(smoothstep(0.0, 0.6, d), 1.6);
    gl_FragColor = vec4(uColor, intensity * uOpacity);
  }
`;

// Darkens the globe toward its edge, so it reads as a sphere, not a disc.
const limbFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  void main() {
    float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    gl_FragColor = vec4(uColor, pow(rim, 2.2) * uOpacity);
  }
`;

export function Atmosphere() {
  const shadow = useMemo(() => new Color(palette.shadow), []); // read once, from the token
  const halo = useMemo(() => ({ uColor: { value: shadow }, uOpacity: { value: 0.22 } }), [shadow]);
  const limb = useMemo(() => ({ uColor: { value: shadow }, uOpacity: { value: 0.45 } }), [shadow]);

  return (
    <>
      <mesh scale={1.12}>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={haloFragment}
          uniforms={halo}
          side={BackSide}
          blending={NormalBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.002}>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={limbFragment}
          uniforms={limb}
          side={FrontSide}
          blending={NormalBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </>
  );
}
