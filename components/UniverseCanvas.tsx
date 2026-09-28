"use client";

import { useEffect, useRef, useState } from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
} from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { APP_CONFIG } from "@/app.config";

/** Minimal graph node shape for canvas rendering (full schema lives in types/graph.ts later). */
export type CanvasNodeStatus = "foggy" | "mastered" | "active";

export interface CanvasNode {
  id: string;
  label: string;
  status: CanvasNodeStatus;
  x?: number;
  y?: number;
  z?: number;
}

export interface CanvasLink {
  source: string | CanvasNode;
  target: string | CanvasNode;
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
 * - ui.colors.background → WebGL clear / container backdrop
 * - ui.colors.active → link stroke (readable on slate-950)
 * - graph.* → node size, link width, forces, labels, camera
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

  const {
    nodeRelSize,
    linkWidth,
    particleSpeed,
    initialDistance,
    linkDistance,
    chargeStrength,
    linkParticles,
    linkParticleWidth,
    labelTextHeight,
  } = APP_CONFIG.graph;
  const { background, active } = APP_CONFIG.ui.colors;

  // Tight link / charge forces so expanded children stay near their parent.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || size.width <= 0) return;

    const linkForce = fg.d3Force("link") as
      | { distance?: (d: number) => unknown }
      | undefined;
    linkForce?.distance?.(linkDistance);

    const chargeForce = fg.d3Force("charge") as
      | { strength?: (s: number) => unknown }
      | undefined;
    chargeForce?.strength?.(chargeStrength);

    fg.d3ReheatSimulation();
  }, [size.width, size.height, linkDistance, chargeStrength, graphData]);

  // Position camera once, then zoom-to-fit whenever the graph grows.
  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const fg = fgRef.current;
    if (!fg) return;

    if (!cameraInitialized.current) {
      fg.cameraPosition({ x: 0, y: 0, z: initialDistance });
      cameraInitialized.current = true;
    }

    const timer = window.setTimeout(() => {
      fg.zoomToFit(400, 48);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    size.width,
    size.height,
    initialDistance,
    graphData.nodes.length,
    graphData.links.length,
  ]);

  // Re-paint node materials when inquiry selection changes so Status-Active
  // (#22D3EE via APP_CONFIG.ui.colors.active) applies and prior nodes revert.
  useEffect(() => {
    fgRef.current?.refresh();
  }, [activeNodeId, graphData]);

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
          nodeThreeObject={(node) => {
            const canvasNode = node as CanvasNode;
            const sprite = new SpriteText(canvasNode.label || canvasNode.id);
            sprite.color = resolveNodeColor(canvasNode, activeNodeId);
            sprite.textHeight = labelTextHeight;
            sprite.padding = 1.2;
            sprite.borderRadius = 2;
            sprite.backgroundColor = background;
            sprite.strokeWidth = 0.3;
            sprite.strokeColor = background;
            // Offset label above the sphere (sphere stays via nodeThreeObjectExtend).
            sprite.position.y = nodeRelSize + labelTextHeight;
            return sprite;
          }}
          nodeThreeObjectExtend
          linkWidth={linkWidth}
          linkColor={() => active}
          linkOpacity={0.85}
          linkDirectionalParticles={linkParticles}
          linkDirectionalParticleWidth={linkParticleWidth}
          linkDirectionalParticleSpeed={particleSpeed}
          linkDirectionalParticleColor={() => active}
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
