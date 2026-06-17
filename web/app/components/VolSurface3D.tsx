"use client";

import { useMemo, useRef, useState, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Billboard } from "@react-three/drei";
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

  const expiries = useMemo(() => {
    return Object.values(oracles)
      .filter(
        (o) => o.svi && o.forward !== undefined && o.expiryMs !== undefined && o.expiryMs > now,
      )
      .sort((a, b) => a.expiryMs! - b.expiryMs!);
  }, [oracles, now]);

  useEffect(() => {
    if (expiries.length >= 2) {
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
        <meshBasicMaterial color="#1a1a1a" wireframe transparent opacity={0.2} />
      </mesh>
    </>
  );
}

// AlwaysOnText: text that renders on top of everything (depthTest off) and faces the camera (billboard).
// This is how professional 3D viz tools (Plotly, deck.gl) handle axis labels.
function AlwaysOnText({
  position,
  children,
  fontSize = 0.2,
  color = "#e5e5e5",
  fontWeight,
}: {
  position: [number, number, number];
  children: string;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
}) {
  return (
    <Billboard position={position}>
      <Text
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000000"
        fontWeight={fontWeight}
        renderOrder={999}
        material-depthTest={false}
        material-transparent={true}
      >
        {children}
      </Text>
    </Billboard>
  );
}

function Axes({ expiries, now }: { expiries: OracleState[]; now: number }) {
  const halfW = PLOT_W / 2;
  const halfD = PLOT_D / 2;
  const ground = -0.02;

  // ---------- TICK DATA ----------
  // 5 strike ticks
  const strikeTicks: { x: number; label: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const k = K_MIN + (K_MAX - K_MIN) * t;
    const x = (t - 0.5) * PLOT_W;
    const pct = (Math.exp(k) - 1) * 100;
    const label = i === 2 ? "ATM" : `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
    strikeTicks.push({ x, label });
  }

  // 5 expiry ticks
  const sortedExpiries = [...expiries].sort((a, b) => a.expiryMs! - b.expiryMs!).slice(0, T_STEPS);
  const expTicks: { z: number; label: string }[] = [];
  if (sortedExpiries.length >= 2) {
    const ticksToShow = Math.min(5, sortedExpiries.length);
    for (let i = 0; i < ticksToShow; i++) {
      const idx = Math.floor((i / (ticksToShow - 1)) * (sortedExpiries.length - 1));
      const o = sortedExpiries[idx];
      const z = ((idx / Math.max(1, sortedExpiries.length - 1)) - 0.5) * PLOT_D;
      const mins = (o.expiryMs! - now) / 60000;
      const label = mins < 60 ? `${Math.round(mins)}m` : `${(mins / 60).toFixed(1)}h`;
      expTicks.push({ z, label });
    }
  }

  // 5 IV ticks
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

  const ivTicks: { y: number; label: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const y = ground + t * PLOT_H;
    const iv = minIv + (maxIv - minIv) * t;
    ivTicks.push({ y, label: `${(iv * 100).toFixed(0)}%` });
  }

  // ---------- GRID LINE HELPER ----------
  function gridLine(start: [number, number, number], end: [number, number, number], key: string) {
    return (
      <line key={key}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([...start, ...end]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#737373" transparent opacity={0.55} />
      </line>
    );
  }

  return (
    <group>
      {/* ===== GRID CAGE ===== */}
      {/* Floor grid — strike-direction lines */}
      {strikeTicks.map((t) => gridLine([t.x, ground, -halfD], [t.x, ground, halfD], `floor-x-${t.label}`))}
      {/* Floor grid — expiry-direction lines */}
      {expTicks.map((t, i) => gridLine([-halfW, ground, t.z], [halfW, ground, t.z], `floor-z-${i}`))}

      {/* Back wall (perpendicular to expiry) — IV horizontal lines */}
      {ivTicks.map((t) => gridLine([-halfW, t.y, -halfD], [halfW, t.y, -halfD], `back-iv-${t.label}`))}
      {/* Back wall — strike vertical lines */}
      {strikeTicks.map((t) => gridLine([t.x, ground, -halfD], [t.x, ground + PLOT_H, -halfD], `back-x-${t.label}`))}

      {/* Side wall (perpendicular to strike) — IV horizontal lines */}
      {ivTicks.map((t) => gridLine([-halfW, t.y, -halfD], [-halfW, t.y, halfD], `side-iv-${t.label}`))}
      {/* Side wall — expiry vertical lines */}
      {expTicks.map((t, i) => gridLine([-halfW, ground, t.z], [-halfW, ground + PLOT_H, t.z], `side-z-${i}`))}

      {/* ===== AXIS LINES (brighter than grid) ===== */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([-halfW, ground, halfD, halfW, ground, halfD]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#9ca3af" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([-halfW, ground, -halfD, -halfW, ground, halfD]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#9ca3af" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([-halfW, ground, halfD, -halfW, ground + PLOT_H, halfD]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#9ca3af" />
      </line>

      {/* ===== AXIS NAME LABELS ===== */}
      <AlwaysOnText position={[0, ground - 0.5, halfD + 0.5]} fontSize={0.26} color="#93c5fd" fontWeight={700}>
        STRIKE (vs spot)
      </AlwaysOnText>
      <AlwaysOnText position={[-halfW - 0.85, ground + PLOT_H / 2, 0]} fontSize={0.26} color="#93c5fd" fontWeight={700}>
        TIME TO EXPIRY
      </AlwaysOnText>
      <AlwaysOnText position={[-halfW - 0.85, PLOT_H + 0.3, halfD]} fontSize={0.26} color="#93c5fd" fontWeight={700}>
        IMPLIED VOL
      </AlwaysOnText>

      {/* ===== STRIKE TICK LABELS (front floor edge) ===== */}
      {strikeTicks.map((t) => (
        <AlwaysOnText
          key={`tick-x-${t.label}`}
          position={[t.x, ground - 0.22, halfD + 0.2]}
          fontSize={0.16}
          color="#d4d4d8"
        >
          {t.label}
        </AlwaysOnText>
      ))}

      {/* ===== EXPIRY TICK LABELS (left floor edge) ===== */}
      {expTicks.map((t, i) => (
        <group key={`tick-z-${i}`}>
          <mesh position={[-halfW, ground, t.z]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshBasicMaterial color="#60a5fa" depthTest={false} />
          </mesh>
          <AlwaysOnText
            position={[-halfW - 0.3, ground + 0.02, t.z]}
            fontSize={0.16}
            color="#d4d4d8"
          >
            {t.label}
          </AlwaysOnText>
        </group>
      ))}

      {/* ===== IV TICK LABELS (left vertical edge) ===== */}
      {ivTicks.map((t, i) => (
        <group key={`tick-y-${i}`}>
          <mesh position={[-halfW, t.y, halfD]}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshBasicMaterial color="#60a5fa" depthTest={false} />
          </mesh>
          <AlwaysOnText
            position={[-halfW - 0.3, t.y, halfD]}
            fontSize={0.16}
            color="#d4d4d8"
          >
            {t.label}
          </AlwaysOnText>
        </group>
      ))}
    </group>
  );
}