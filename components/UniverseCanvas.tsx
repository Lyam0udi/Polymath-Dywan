"use client";

import { useEffect, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
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
 */
export default function UniverseCanvas({
  graphData,
  activeNodeId,
  onNodeSelect,
}: UniverseCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  const { nodeRelSize, linkWidth, particleSpeed } = APP_CONFIG.graph;
  const { background } = APP_CONFIG.ui.colors;

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="3D knowledge universe"
    >
      {size.width > 0 && size.height > 0 ? (
        <ForceGraph3D
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
