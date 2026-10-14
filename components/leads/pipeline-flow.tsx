"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export type FlowStage = {
  id: number | string;
  name: string;
  color: string | null;
  count: number;
};

type StageNodeData = Record<string, unknown> & {
  name: string;
  count: number;
  color: string;
  isFirst: boolean;
  isLast: boolean;
};

function StageNode({ data }: NodeProps<Node<StageNodeData>>) {
  return (
    <div
      className="min-w-44 rounded-xl border bg-background p-3 shadow-sm"
      style={{ borderLeft: `4px solid ${data.color}` }}
    >
      {!data.isFirst ? <Handle type="target" position={Position.Left} /> : null}
      <div className="text-sm font-semibold">{data.name}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">
          {data.count.toLocaleString("en-IN")}
        </span>
        <span className="text-xs text-muted-foreground">
          lead{data.count === 1 ? "" : "s"}
        </span>
      </div>
      {!data.isLast ? <Handle type="source" position={Position.Right} /> : null}
    </div>
  );
}

const nodeTypes = { stage: StageNode };

export function PipelineFlow({ stages }: { stages: FlowStage[] }) {
  const { nodes, edges } = useMemo(() => {
    const H_GAP = 220;
    const max = Math.max(1, ...stages.map((s) => s.count));

    const nodes: Node<StageNodeData>[] = stages.map((stage, index) => ({
      id: String(stage.id),
      type: "stage",
      position: { x: index * H_GAP, y: 60 },
      data: {
        name: stage.name,
        count: stage.count,
        color: stage.color ?? "#94a3b8",
        isFirst: index === 0,
        isLast: index === stages.length - 1,
      },
      draggable: false,
      selectable: false,
    }));

    const edges: Edge[] = stages.slice(1).map((stage, index) => {
      const from = stages[index];
      const weight = 0.4 + 0.6 * (Math.max(from.count, stage.count) / max);
      return {
        id: `e-${from.id}-${stage.id}`,
        source: String(from.id),
        target: String(stage.id),
        animated: from.count > 0,
        style: {
          stroke: stage.color ?? "#6366f1",
          strokeWidth: 1 + weight * 3,
        },
        label: `${stage.count}`,
        labelStyle: { fontSize: 11 },
        labelBgStyle: { fill: "transparent" },
      };
    });

    return { nodes, edges };
  }, [stages]);

  if (stages.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No lead statuses configured yet.
      </p>
    );
  }

  return (
    <div className="h-96 overflow-hidden rounded-xl border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 0.9 }}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll
        panOnScroll
        proOptions={{ hideAttribution: true }}
        colorMode="system"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.5} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
