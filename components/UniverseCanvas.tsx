"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
} from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { Color, MeshLambertMaterial, type Material } from "three";
import { APP_CONFIG } from "@/app.config";
import { useUniverseStore } from "@/components/UniverseProvider";

/** Minimal graph node shape for canvas rendering. */
export type CanvasNodeStatus = "foggy" | "mastered" | "active";

export interface CanvasNode {
  id: string;
  label: string;
  status: CanvasNodeStatus;
  x?: number;
  y?: number;
  z?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
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

type SimNode = CanvasNode & {
  x?: number;
  y?: number;
  z?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
};

type DragTranslate = { x: number; y: number; z?: number };

/**
 * Zero Drift: every visual token comes from APP_CONFIG.ui.colors — never hardcode hex.
 */
function resolveNodeColor(
  node: CanvasNode,
  activeNodeId: string | null,
  multiSelected: ReadonlySet<string>,
): string {
  const { colors } = APP_CONFIG.ui;
  if (activeNodeId !== null && node.id === activeNodeId) {
    return colors.active;
  }
  if (multiSelected.has(node.id)) {
    return colors.mastered;
  }
  if (node.status === "mastered") {
    return colors.mastered;
  }
  return colors.foggy;
}

/**
 * WebGL force-graph surface. Rendering + local multi-select / drag-pin.
 * Mentor selection stays with the parent via `onNodeSelect`.
 * Must be loaded via `next/dynamic` with `{ ssr: false }`.
 */
export default function UniverseCanvas({
  graphData,
  activeNodeId,
  onNodeSelect,
}: UniverseCanvasProps) {
  const { setGraphData } = useUniverseStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<CanvasNode, CanvasLink> | undefined>(
    undefined,
  );
  const [size, setSize] = useState({ width: 0, height: 0 });
  const cameraInitialized = useRef(false);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(
    () => new Set(),
  );
  const multiSelectedRef = useRef(multiSelected);
  multiSelectedRef.current = multiSelected;

  const groupDragStarts = useRef<
    Map<string, { x: number; y: number; z: number }>
  >(new Map());
  const lastClickRef = useRef<{ id: string; at: number } | null>(null);

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
    linkArrowLength,
    linkArrowRelPos,
  } = APP_CONFIG.graph;
  const { background, active } = APP_CONFIG.ui.colors;

  /** Shared cylinder material — width > 0 uses meshes (visible), not 1px Lines. */
  const linkMaterial = useMemo((): Material => {
    return new MeshLambertMaterial({
      color: new Color(active),
      transparent: true,
      opacity: 0.95,
    });
  }, [active]);

  useEffect(() => {
    return () => {
      linkMaterial.dispose();
    };
  }, [linkMaterial]);

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

  // Fresh node/link objects each update; keep persisted pins.
  const simGraphData = useMemo(() => {
    const nodes: SimNode[] = graphData.nodes.map((node) => ({
      ...node,
      fx: typeof node.fx === "number" ? node.fx : undefined,
      fy: typeof node.fy === "number" ? node.fy : undefined,
      fz: typeof node.fz === "number" ? node.fz : undefined,
    }));
    const links: CanvasLink[] = graphData.links.map((link) => ({
      source: typeof link.source === "object" ? link.source.id : link.source,
      target: typeof link.target === "object" ? link.target.id : link.target,
    }));
    return { nodes, links };
  }, [graphData]);

  const persistPinsForIds = useCallback(
    (ids: Iterable<string>) => {
      const idSet = new Set(ids);
      const pinById = new Map<string, { fx: number; fy: number; fz: number }>();

      for (const node of simGraphData.nodes) {
        if (!idSet.has(node.id)) continue;
        if (
          typeof node.x !== "number" ||
          typeof node.y !== "number" ||
          typeof node.z !== "number"
        ) {
          continue;
        }
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
        pinById.set(node.id, { fx: node.x, fy: node.y, fz: node.z });
      }

      if (pinById.size === 0) return;

      setGraphData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) => {
          const pin = pinById.get(node.id);
          if (!pin) return node;
          return { ...node, fx: pin.fx, fy: pin.fy, fz: pin.fz };
        }),
      }));
    },
    [setGraphData, simGraphData.nodes],
  );

  const unpinNode = useCallback(
    (id: string) => {
      const live = simGraphData.nodes.find((n) => n.id === id);
      if (live) {
        live.fx = undefined;
        live.fy = undefined;
        live.fz = undefined;
      }
      setGraphData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === id
            ? { ...n, fx: undefined, fy: undefined, fz: undefined }
            : n,
        ),
      }));
    },
    [setGraphData, simGraphData.nodes],
  );

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
  }, [
    size.width,
    size.height,
    linkDistance,
    chargeStrength,
    simGraphData.nodes.length,
    simGraphData.links.length,
  ]);

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
    simGraphData.nodes.length,
    simGraphData.links.length,
  ]);

  useEffect(() => {
    fgRef.current?.refresh();
  }, [activeNodeId, multiSelected, simGraphData]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      style={{ backgroundColor: background }}
      aria-label="3D knowledge universe"
    >
      <p className="pointer-events-none absolute left-3 top-3 z-10 max-w-sm rounded-md bg-background/80 px-2 py-1 text-[11px] leading-snug text-text-muted">
        Cyan tubes + arrows = links. Drag a node to pin it. Ctrl/Cmd+click
        multi-select, then drag the group. Double-click to unpin.
      </p>
      {size.width > 0 && size.height > 0 ? (
        <ForceGraph3D
          ref={fgRef}
          graphData={simGraphData}
          width={size.width}
          height={size.height}
          backgroundColor={background}
          nodeId="id"
          nodeLabel="label"
          nodeRelSize={nodeRelSize}
          nodeVal={(node) =>
            multiSelected.has((node as CanvasNode).id) ? 1.6 : 1
          }
          nodeColor={(node) =>
            resolveNodeColor(
              node as CanvasNode,
              activeNodeId,
              multiSelected,
            )
          }
          nodeThreeObject={(node) => {
            const canvasNode = node as CanvasNode;
            const sprite = new SpriteText(canvasNode.label || canvasNode.id);
            sprite.color = resolveNodeColor(
              canvasNode,
              activeNodeId,
              multiSelected,
            );
            sprite.textHeight = labelTextHeight;
            sprite.padding = 1.2;
            sprite.borderRadius = 2;
            sprite.backgroundColor = background;
            sprite.strokeWidth = 0.4;
            sprite.strokeColor = background;
            sprite.position.y = nodeRelSize + labelTextHeight;
            return sprite;
          }}
          nodeThreeObjectExtend
          linkVisibility
          linkWidth={linkWidth}
          linkColor={() => active}
          linkOpacity={1}
          linkMaterial={() => linkMaterial}
          linkDirectionalArrowLength={linkArrowLength}
          linkDirectionalArrowColor={() => active}
          linkDirectionalArrowRelPos={linkArrowRelPos}
          linkDirectionalParticles={linkParticles}
          linkDirectionalParticleWidth={linkParticleWidth}
          linkDirectionalParticleSpeed={particleSpeed}
          linkDirectionalParticleColor={() => active}
          enableNodeDrag
          showNavInfo={false}
          onNodeClick={(node, event) => {
            const id = (node as CanvasNode).id;
            if (!id) return;

            const now = Date.now();
            const prev = lastClickRef.current;
            if (prev && prev.id === id && now - prev.at < 350) {
              lastClickRef.current = null;
              unpinNode(id);
              return;
            }
            lastClickRef.current = { id, at: now };

            const multiKey = event.ctrlKey || event.metaKey;
            if (multiKey) {
              setMultiSelected((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            } else {
              setMultiSelected(new Set([id]));
            }
            onNodeSelect?.(id);
          }}
          onNodeDrag={(node, translate) => {
            const dragged = node as SimNode;
            const group = multiSelectedRef.current;
            if (!group.has(dragged.id) || group.size < 2) return;

            const t = translate as DragTranslate;
            const tx = t.x;
            const ty = t.y;
            const tz = typeof t.z === "number" ? t.z : 0;

            if (groupDragStarts.current.size === 0) {
              for (const live of simGraphData.nodes) {
                if (!group.has(live.id)) continue;
                if (typeof live.x !== "number" || typeof live.y !== "number") {
                  continue;
                }
                const z = typeof live.z === "number" ? live.z : 0;
                if (live.id === dragged.id) {
                  groupDragStarts.current.set(live.id, {
                    x: live.x - tx,
                    y: live.y - ty,
                    z: z - tz,
                  });
                } else {
                  groupDragStarts.current.set(live.id, {
                    x: live.x,
                    y: live.y,
                    z,
                  });
                }
              }
            }

            for (const live of simGraphData.nodes) {
              if (live.id === dragged.id) continue;
              if (!group.has(live.id)) continue;
              const start = groupDragStarts.current.get(live.id);
              if (!start) continue;
              live.x = start.x + tx;
              live.y = start.y + ty;
              live.z = start.z + tz;
              live.fx = live.x;
              live.fy = live.y;
              live.fz = live.z;
            }
          }}
          onNodeDragEnd={(node) => {
            const dragged = node as SimNode;
            const group = multiSelectedRef.current;
            const ids =
              group.has(dragged.id) && group.size > 0
                ? group
                : new Set([dragged.id]);
            persistPinsForIds(ids);
            groupDragStarts.current = new Map();
          }}
          onBackgroundClick={() => {
            setMultiSelected(new Set());
          }}
        />
      ) : null}
    </div>
  );
}
