"use client";

import { useMemo, useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { totalVariance } from "../lib/svi";
import type { OracleState } from "../lib/useVolStream";

type HoverInfo = { k: number; minutesOut: number; iv: number };

type Props = {
  oracles: Record<string, OracleState>;
  now: number;
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
const PLOT_H = 2.5;

export function VolSurface3D({ oracles, now }: Props) {
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const expiries = useMemo(() => {
    return Object.values(oracles)
      .filter(
        (o) => o.svi && o.forward !== undefined && o.expiryMs !== undefined && o.expiryMs > now,
      )
      .sort((a, b) => a.expiryMs! - b.expiryMs!);
  }, [oracles, now]);

  if (expiries.length < 2) {
    return (
      <div className="flex h-full min-h-[460px] items-center justify-center text-center">
        <div>
          <p className="font-mono text-xs text-neutral-500">Need at least 2 active oracles to render surface</p>
          <p className="mt-1 font-mono text-[10px] text-neutral-600">currently {expiries.length} active</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[460px] w-full" style={{ touchAction: "none" }}>
      <Canvas
        camera={{ position: [6, 5, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 3]} intensity={0.8} />
          <directionalLight position={[-5, 3, -3]} intensity={0.3} color="#60a5fa" />
          <SurfaceMesh expiries={expiries} now={now} onHover={setHover} />
          <Axes />
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

      {hover && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded border border-neutral-700 bg-neutral-950/95 backdrop-blur px-3 py-2 font-mono text-xs whitespace-nowrap pointer-events-none">
          <div className="text-blue-400 font-bold">IV {(hover.iv * 100).toFixed(1)}%</div>
          <div className="text-neutral-400 mt-0.5 text-[10px]">
            k={hover.k.toFixed(2)} · {hover.minutesOut < 60 ? `${Math.round(hover.minutesOut)}m` : `${(hover.minutesOut / 60).toFixed(1)}h`}
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 rounded border border-neutral-800 bg-neutral-950/80 backdrop-blur px-3 py-2 pointer-events-none">
        <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-1">IV scale</p>
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 rounded" style={{
            background: "linear-gradient(to right, rgb(0,0,255), rgb(0,255,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))"
          }} />
          <span className="font-mono text-[9px] text-neutral-400">low → high</span>
        </div>
      </div>

      <div className="absolute top-3 right-3 rounded border border-neutral-800 bg-neutral-950/80 backdrop-blur px-3 py-1.5 pointer-events-none">
        <p className="font-mono text-[10px] text-neutral-400">drag to rotate · scroll to zoom</p>
      </div>
    </div>
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

  const { geometry, ivByCell } = useMemo(() => {
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

    for (let ti = 0; ti < rows; ti++) {
      for (let ki = 0; ki < cols; ki++) {
        const iv = ivGrid[ti][ki];
        const x = ((ki / (cols - 1)) - 0.5) * PLOT_W;
        const z = ((ti / Math.max(1, rows - 1)) - 0.5) * PLOT_D;
        const tNorm = (iv - minIv) / (maxIv - minIv);
        const y = tNorm * PLOT_H;
        positions.push(x, y, z);
        const [r, g, b] = thermalColor(tNorm);
        colors.push(r, g, b);
      }
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

    return { geometry: geom, ivByCell: ivGrid };
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
    const o = visibleExpiries[ti];
    const iv = ivByCell[ti][ki];
    const minutesOut = (o.expiryMs! - now) / 60000;
    onHover({ k, minutesOut, iv });
  }

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerMove={handlePointerMove}
        onPointerOut={() => onHover(null)}
      >
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#000" wireframe transparent opacity={0.15} />
      </mesh>
    </>
  );
}

function Axes() {
  const halfW = PLOT_W / 2;
  const halfD = PLOT_D / 2;
  const ground = -0.02;

  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-halfW, ground, halfD, halfW, ground, halfD])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#525252" />
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
        <lineBasicMaterial color="#525252" />
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
        <lineBasicMaterial color="#525252" />
      </line>
      <Text position={[0, ground - 0.3, halfD + 0.4]} fontSize={0.22} color="#60a5fa" anchorX="center">
        STRIKE (log-moneyness)
      </Text>
      <Text position={[-halfW - 0.6, ground - 0.1, 0]} fontSize={0.22} color="#60a5fa" rotation={[0, -Math.PI / 2, 0]} anchorX="center">
        EXPIRY
      </Text>
      <Text position={[-halfW - 0.4, PLOT_H / 2, halfD + 0.3]} fontSize={0.22} color="#60a5fa" rotation={[0, 0, Math.PI / 2]} anchorX="center">
        IV
      </Text>
      <Text position={[-halfW, ground - 0.15, halfD + 0.15]} fontSize={0.15} color="#737373" anchorX="center">
        {K_MIN.toFixed(2)}
      </Text>
      <Text position={[0, ground - 0.15, halfD + 0.15]} fontSize={0.15} color="#737373" anchorX="center">
        0.00
      </Text>
      <Text position={[halfW, ground - 0.15, halfD + 0.15]} fontSize={0.15} color="#737373" anchorX="center">
        +{K_MAX.toFixed(2)}
      </Text>
    </group>
  );
}