"use client";

import { useEffect, useRef, useState } from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
} from "react-force-graph-3d";
import { APP_CONFIG } from "@/app.config";

/** Minimal graph node shape for canvas rendering (full schema lives in types/graph.ts later). */
export type CanvasNodeStatus = "foggy" | "mastered" | "active";

export interface CanvasNode {
  id: string;
  label: string;
  status: CanvasNodeStatus;
}

export interface CanvasLink {
  source: string;
  target: string;
}

export interface CanvasGraphData {
  nodes: CanvasNode[];
  links: CanvasLink[];
}

export interface UniverseCanvasProps {
  graphData: CanvasGraphData;
  activeNodeId: string | null;
  onNodeSelect?: (nodeId: string) => void;
}

/**
 * Zero Drift: every visual token comes from APP_CONFIG.ui.colors — never hardcode hex.
 */
function resolveNodeColor(
  node: CanvasNode,
  activeNodeId: string | null,
): string {
  const { colors } = APP_CONFIG.ui;
  if (activeNodeId !== null && node.id === activeNodeId) {
    return colors.active;
  }
  if (node.status === "mastered") {
    return colors.mastered;
  }
  return colors.foggy;
}

/**
 * WebGL force-graph surface. Rendering only — selection/mastery owned by parent.
 * Must be loaded via `next/dynamic` with `{ ssr: false }` to avoid hydration mismatch.
 *
 * Design tokens (APP_CONFIG):
 * - ui.colors.background → WebGL clear / container backdrop (#020617)
 * - graph.nodeRelSize / linkWidth / particleSpeed → force-graph props
 * - graph.initialDistance → camera Z on first mount
 */
export default function UniverseCanvas({
  graphData,
  activeNodeId,
  onNodeSelect,
}: UniverseCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<CanvasNode, CanvasLink> | undefined>(
    undefined,
  );
  const [size, setSize] = useState({ width: 0, height: 0 });
  const cameraInitialized = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { nodeRelSize, linkWidth, particleSpeed, initialDistance } =
    APP_CONFIG.graph;
  const { background } = APP_CONFIG.ui.colors;

  // Position camera once the WebGL instance is ready (seed / first paint).
  useEffect(() => {
    if (size.width <= 0 || size.height <= 0 || cameraInitialized.current) {
      return;
    }
    const fg = fgRef.current;
    if (!fg) return;
    fg.cameraPosition({ x: 0, y: 0, z: initialDistance });
    cameraInitialized.current = true;
  }, [size.width, size.height, initialDistance, graphData]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ backgroundColor: background }}
      aria-label="3D knowledge universe"
    >
      {size.width > 0 && size.height > 0 ? (
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          backgroundColor={background}
          nodeId="id"
          nodeLabel="label"
          nodeRelSize={nodeRelSize}
          nodeColor={(node) =>
            resolveNodeColor(node as CanvasNode, activeNodeId)
          }
          linkWidth={linkWidth}
          linkColor={() => APP_CONFIG.ui.colors.foggy}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={particleSpeed}
          showNavInfo={false}
          onNodeClick={(node) => {
            const id = (node as CanvasNode).id;
            if (id) onNodeSelect?.(id);
          }}
        />
      ) : null}
    </div>
  );
}
