"use client";

import { useMemo, useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { totalVariance } from "../lib/svi";
import type { OracleState } from "../lib/useVolStream";

type HoverInfo = { k: number; strikePct: number; minutesOut: number; iv: number; worldX: number; worldY: number; worldZ: number };

type Props = {
  oracles: Record<string, OracleState>;
  now: number;
  isScrubbing?: boolean;
};

function thermalColor(t: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, t));
  if (v < 0.25) {
    const u = v / 0.25;
    return [0, u, 1];
  } else if (v < 0.5) {
    const u = (v - 0.25) / 0.25;
    return [0, 1, 1 - u];
  } else if (v < 0.75) {
    const u = (v - 0.5) / 0.25;
    return [u, 1, 0];
  } else {
    const u = (v - 0.75) / 0.25;
    return [1, 1 - u, 0];
  }
}

const K_STEPS = 30;
const T_STEPS = 16;
const K_MIN = -0.3;
const K_MAX = 0.3;
const PLOT_W = 6;
const PLOT_D = 6;
const PLOT_H = 3.5;

const DEFAULT_CAMERA: [number, number, number] = [6, 5, 6];

export function VolSurface3D({ oracles, now, isScrubbing = false }: Props) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [hasRendered, setHasRendered] = useState(false);

  // Reset hasRendered when expiries change (e.g. scrubbing changes data)
  const expiries = useMemo(() => {
    return Object.values(oracles)
      .filter(
        (o) => o.svi && o.forward !== undefined && o.expiryMs !== undefined && o.expiryMs > now,
      )
      .sort((a, b) => a.expiryMs! - b.expiryMs!);
  }, [oracles, now]);

  // Loading state hint
  useEffect(() => {
    if (expiries.length >= 2) {
      // Tiny delay to let the geometry compute + first frame paint
      const id = setTimeout(() => setHasRendered(true), 250);
      return () => clearTimeout(id);
    } else {
      setHasRendered(false);
    }
  }, [expiries.length, resetKey]);

  if (expiries.length === 0) {
    return (
      <div className="flex h-full min-h-[460px] items-center justify-center text-center">
        <div>
          <p className="font-mono text-xs text-neutral-300">No active oracles with SVI data</p>
          <p className="mt-1 font-mono text-xs text-neutral-200">waiting for events from the protocol…</p>
        </div>
      </div>
    );
  }

  if (expiries.length === 1) {
    return (
      <div className="flex h-full min-h-[460px] items-center justify-center text-center">
        <div>
          <p className="font-mono text-xs text-neutral-300">Only 1 active oracle</p>
          <p className="mt-1 font-mono text-xs text-neutral-200">need at least 2 expiries to render a surface</p>
          <p className="mt-3 font-mono text-xs text-neutral-300">use the Skew curve to view this single expiry →</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[460px] w-full" style={{ touchAction: "none" }}>
      <Canvas
        key={resetKey}
        camera={{ position: DEFAULT_CAMERA, fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 8, 3]} intensity={0.6} />
          <directionalLight position={[-5, 3, -3]} intensity={0.4} color="#60a5fa" />
          <SurfaceMesh expiries={expiries} now={now} onHover={setHover} />
          {hover && <HoverMarker x={hover.worldX} y={hover.worldY} z={hover.worldZ} />}
          <Axes expiries={expiries} now={now} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            rotateSpeed={0.8}
            zoomSpeed={0.6}
            minDistance={4}
            maxDistance={14}
            target={[0, PLOT_H / 2, 0]}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2}
          />
        </Suspense>
      </Canvas>

      {/* Loading state */}
      {!hasRendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <div className="inline-block h-6 w-6 rounded-full border-2 border-neutral-700 border-t-blue-400 animate-spin" />
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-neutral-200">rendering surface…</p>
          </div>
        </div>
      )}

      {isScrubbing && (
        <div className="absolute top-3 left-3 rounded border border-amber-500/40 bg-amber-950/60 backdrop-blur px-3 py-1.5 pointer-events-none">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-300 font-bold">⏪ HISTORICAL VIEW</p>
        </div>
      )}

    {hover && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded border border-neutral-700 bg-neutral-950/95 backdrop-blur px-3 py-2 font-mono text-xs whitespace-nowrap pointer-events-none">
          <div className="text-blue-400 font-bold text-sm">IV {(hover.iv * 100).toFixed(1)}%</div>
          <div className="text-neutral-200 mt-1 text-xs">
            Strike: <span className="text-white font-bold">{hover.strikePct >= 0 ? "+" : ""}{hover.strikePct.toFixed(1)}%</span> of spot
          </div>
          <div className="text-neutral-200 text-xs">
            Expires in: <span className="text-white font-bold">{hover.minutesOut < 60 ? `${Math.round(hover.minutesOut)}m` : `${(hover.minutesOut / 60).toFixed(1)}h`}</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 rounded border border-neutral-800 bg-neutral-950/80 backdrop-blur px-3 py-2 pointer-events-none">
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-300 mb-1">IV scale</p>
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 rounded" style={{
            background: "linear-gradient(to right, rgb(0,0,255), rgb(0,255,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))"
          }} />
          <span className="font-mono text-xs text-neutral-200">low → high</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button
          onClick={() => setResetKey((k) => k + 1)}
          className="rounded border border-neutral-800 bg-neutral-950/80 backdrop-blur px-3 py-1.5 font-mono text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          ⟲ RESET VIEW
        </button>
        <div className="rounded border border-neutral-800 bg-neutral-950/80 backdrop-blur px-3 py-1.5 pointer-events-none">
          <p className="font-mono text-xs text-neutral-200">drag · scroll · hover</p>
        </div>
      </div>
    </div>
  );
}

function HoverMarker({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function SurfaceMesh({
  expiries,
  now,
  onHover,
}: {
  expiries: OracleState[];
  now: number;
  onHover: (info: HoverInfo | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, ivByCell, gridPositions } = useMemo(() => {
    const sortedExpiries = [...expiries].sort((a, b) => a.expiryMs! - b.expiryMs!);
    const visibleExpiries = sortedExpiries.slice(0, T_STEPS);

    const ivGrid: number[][] = [];
    let minIv = Infinity;
    let maxIv = -Infinity;

    for (let ti = 0; ti < visibleExpiries.length; ti++) {
      const o = visibleExpiries[ti];
      const row: number[] = [];
      for (let ki = 0; ki < K_STEPS; ki++) {
        const k = K_MIN + (K_MAX - K_MIN) * (ki / (K_STEPS - 1));
        const w = totalVariance(o.svi!, k);
        const iv = w > 0 ? Math.sqrt(w) : 0;
        row.push(iv);
        if (iv > 0) {
          minIv = Math.min(minIv, iv);
          maxIv = Math.max(maxIv, iv);
        }
      }
      ivGrid.push(row);
    }

    if (!isFinite(minIv)) minIv = 0;
    if (!isFinite(maxIv) || maxIv === minIv) maxIv = minIv + 0.01;

    const cols = K_STEPS;
    const rows = visibleExpiries.length;

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const gridPos: { x: number; y: number; z: number }[][] = [];

    for (let ti = 0; ti < rows; ti++) {
      const gridRow: { x: number; y: number; z: number }[] = [];
      for (let ki = 0; ki < cols; ki++) {
        const iv = ivGrid[ti][ki];
        const x = ((ki / (cols - 1)) - 0.5) * PLOT_W;
        const z = ((ti / Math.max(1, rows - 1)) - 0.5) * PLOT_D;
        const tNorm = (iv - minIv) / (maxIv - minIv);
        const y = tNorm * PLOT_H;
        positions.push(x, y, z);
        const [r, g, b] = thermalColor(tNorm);
        colors.push(r, g, b);
        gridRow.push({ x, y, z });
      }
      gridPos.push(gridRow);
    }

    for (let ti = 0; ti < rows - 1; ti++) {
      for (let ki = 0; ki < cols - 1; ki++) {
        const a = ti * cols + ki;
        const b = ti * cols + (ki + 1);
        const c = (ti + 1) * cols + ki;
        const d = (ti + 1) * cols + (ki + 1);
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return { geometry: geom, ivByCell: ivGrid, gridPositions: gridPos };
  }, [expiries]);

  const visibleExpiries = useMemo(
    () => [...expiries].sort((a, b) => a.expiryMs! - b.expiryMs!).slice(0, T_STEPS),
    [expiries],
  );

function handlePointerMove(e: { uv?: THREE.Vector2; stopPropagation?: () => void }) {
    if (!e.uv) return;
    const cols = K_STEPS;
    const rows = visibleExpiries.length;
    const ki = Math.round(e.uv.x * (cols - 1));
    const ti = Math.round(e.uv.y * (rows - 1));
    if (ti < 0 || ti >= rows || ki < 0 || ki >= cols) return;
    const k = K_MIN + (K_MAX - K_MIN) * (ki / (cols - 1));
    const strikePct = (Math.exp(k) - 1) * 100;
    const o = visibleExpiries[ti];
    const iv = ivByCell[ti][ki];
    const minutesOut = (o.expiryMs! - now) / 60000;
    const cell = gridPositions[ti][ki];
    onHover({ k, strikePct, minutesOut, iv, worldX: cell.x, worldY: cell.y, worldZ: cell.z });
  }

  return (
    <>
     <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerMove={handlePointerMove}
        onPointerOut={() => onHover(null)}
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.4}
          metalness={0.0}
          flatShading={false}
        />
      </mesh>
      <mesh geometry={geometry} renderOrder={1}>
        <meshBasicMaterial color="#0a0a0a" wireframe transparent opacity={0.55} />
      </mesh>
    </>
  );
}

function Axes({ expiries, now }: { expiries: OracleState[]; now: number }) {
  const halfW = PLOT_W / 2;
  const halfD = PLOT_D / 2;
  const ground = -0.02;

  // Compute the actual IV range across all visible oracles for axis labels
  const sortedExpiries = [...expiries].sort((a, b) => a.expiryMs! - b.expiryMs!).slice(0, T_STEPS);
  let minIv = Infinity;
  let maxIv = -Infinity;
  for (const o of sortedExpiries) {
    for (let ki = 0; ki < K_STEPS; ki++) {
      const k = K_MIN + (K_MAX - K_MIN) * (ki / (K_STEPS - 1));
      const w = totalVariance(o.svi!, k);
      const iv = w > 0 ? Math.sqrt(w) : 0;
      if (iv > 0) {
        minIv = Math.min(minIv, iv);
        maxIv = Math.max(maxIv, iv);
      }
    }
  }
  if (!isFinite(minIv)) minIv = 0;
  if (!isFinite(maxIv) || maxIv === minIv) maxIv = minIv + 0.01;
  const midIv = (minIv + maxIv) / 2;

  // Expiry tick labels — sample 3 evenly-spaced expiries from the sorted list
  const expTicks: { z: number; label: string }[] = [];
  if (sortedExpiries.length >= 2) {
    const ticksToShow = Math.min(3, sortedExpiries.length);
    for (let i = 0; i < ticksToShow; i++) {
      const idx = Math.floor((i / (ticksToShow - 1)) * (sortedExpiries.length - 1));
      const o = sortedExpiries[idx];
      const z = ((idx / Math.max(1, sortedExpiries.length - 1)) - 0.5) * PLOT_D;
      const mins = (o.expiryMs! - now) / 60000;
      const label = mins < 60 ? `${Math.round(mins)}m` : `${(mins / 60).toFixed(1)}h`;
      expTicks.push({ z, label });
    }
  }

  // IV tick labels at min / mid / max
  const ivTicks = [
    { y: ground, label: `${(minIv * 100).toFixed(0)}%` },
    { y: ground + PLOT_H / 2, label: `${(midIv * 100).toFixed(0)}%` },
    { y: ground + PLOT_H, label: `${(maxIv * 100).toFixed(0)}%` },
  ];

  // Strike tick labels in real-world percent
  const strikePcts = [K_MIN, 0, K_MAX].map((k) => (Math.exp(k) - 1) * 100);

  return (
    <group>
      {/* Axis lines */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-halfW, ground, halfD, halfW, ground, halfD])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#737373" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-halfW, ground, -halfD, -halfW, ground, halfD])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#737373" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-halfW, ground, halfD, -halfW, ground + PLOT_H, halfD])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#737373" />
      </line>

      {/* Axis name labels — plainer wording */}
      <Text position={[0, ground - 0.35, halfD + 0.5]} fontSize={0.24} color="#93c5fd" anchorX="center">
        STRIKE (vs spot)
      </Text>
      <Text position={[-halfW - 0.75, ground - 0.1, 0]} fontSize={0.24} color="#93c5fd" rotation={[0, -Math.PI / 2, 0]} anchorX="center">
        TIME TO EXPIRY
      </Text>
      <Text position={[-halfW - 0.55, PLOT_H / 2, halfD + 0.3]} fontSize={0.24} color="#93c5fd" rotation={[0, 0, Math.PI / 2]} anchorX="center">
        IMPLIED VOL
      </Text>

      {/* Strike tick labels — real percent */}
      <Text position={[-halfW, ground - 0.18, halfD + 0.18]} fontSize={0.17} color="#a3a3a3" anchorX="center">
        {strikePcts[0].toFixed(0)}%
      </Text>
      <Text position={[0, ground - 0.18, halfD + 0.18]} fontSize={0.17} color="#a3a3a3" anchorX="center">
        ATM
      </Text>
      <Text position={[halfW, ground - 0.18, halfD + 0.18]} fontSize={0.17} color="#a3a3a3" anchorX="center">
        +{strikePcts[2].toFixed(0)}%
      </Text>

      {/* Expiry tick labels — bigger */}
      {expTicks.map((t, i) => (
        <Text
          key={`exp-${i}`}
          position={[-halfW - 0.18, ground - 0.05, t.z]}
          fontSize={0.16}
          color="#a3a3a3"
          anchorX="right"
        >
          {t.label}
        </Text>
      ))}

    {/* IV tick labels — actual percent values (placed on the FAR side, away from the IMPLIED VOL label) */}
      {ivTicks.map((t, i) => (
        <Text
          key={`iv-${i}`}
          position={[-halfW - 0.9, t.y, halfD + 0.18]}
          fontSize={0.16}
          color="#a3a3a3"
          anchorX="right"
        >
          {t.label}
        </Text>
      ))}
    </group>
  );
}