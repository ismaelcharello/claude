"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Self-contained studio environment map built from Lightformers.
 *
 * drei's `preset="city"` downloads an HDR file from a public CDN at runtime.
 * That request fails on offline / proxied machines and the resulting error
 * crashes the whole canvas. This version renders the reflections locally,
 * so the office works without any outbound network access.
 */
export function OfflineEnvironment({ warm = "#C8A66A" }: { warm?: string }) {
  return (
    <Environment resolution={128} frames={1}>
      <color attach="background" args={["#131714"]} />
      <Lightformer form="rect" intensity={2.2} color="#F4F0E7" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
      <Lightformer form="rect" intensity={1.1} color={warm} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#1E4A35" position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
      <Lightformer form="ring" intensity={0.6} color="#F4F0E7" position={[0, 3, -6]} scale={3} />
    </Environment>
  );
}
