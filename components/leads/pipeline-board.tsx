"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarClock, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { moveLeadToStatus } from "@/lib/actions/lead-actions";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export type PipelineLead = {
  id: number;
  name: string | null;
  mobile: string;
  source: string | null;
  followup: string | null;
  statusId: number | null;
};

export type PipelineColumn = {
  id: number; // status id; -1 represents "no status"
  name: string;
  color: string | null;
};

const UNSET_COLUMN = -1;

function LeadCard({
  lead,
  dragging,
}: {
  lead: PipelineLead;
  dragging?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-3 text-sm shadow-xs ${
        dragging ? "rotate-2 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/leads/${lead.id}`}
            className="block truncate font-medium hover:underline"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {lead.name || "Unnamed"}
          </Link>
          <div className="text-xs text-muted-foreground">{lead.mobile}</div>
        </div>
        <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {lead.source ? (
          <Badge variant="outline" className="text-[10px]">
            {lead.source}
          </Badge>
        ) : null}
        {lead.followup ? (
          <Badge variant="outline" className="gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <CalendarClock className="size-3" />
            {formatDate(lead.followup)}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function DraggableLead({ lead }: { lead: PipelineLead }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { lead },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-40" : "cursor-grab active:cursor-grabbing"}
    >
      <LeadCard lead={lead} />
    </div>
  );
}

function Column({
  column,
  leads,
}: {
  column: PipelineColumn;
  leads: PipelineLead[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { columnId: column.id },
  });

  return (
    <div
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: column.color ?? "#94a3b8" }}
          />
          {column.name}
        </div>
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <ScrollArea className="h-[calc(100svh-16rem)]">
        <div ref={setNodeRef} className="min-h-24 space-y-2 p-2">
          {leads.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Drop leads here
            </p>
          ) : (
            leads.map((lead) => <DraggableLead key={lead.id} lead={lead} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function PipelineBoard({
  columns,
  initialLeads,
}: {
  columns: PipelineColumn[];
  initialLeads: PipelineLead[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeLead, setActiveLead] = useState<PipelineLead | null>(null);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byColumn = useMemo(() => {
    const map = new Map<number, PipelineLead[]>();
    for (const column of columns) map.set(column.id, []);
    for (const lead of leads) {
      const key = lead.statusId ?? UNSET_COLUMN;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(lead);
    }
    return map;
  }, [columns, leads]);

  function handleDragStart(event: DragStartEvent) {
    const lead = event.active.data.current?.lead as PipelineLead | undefined;
    setActiveLead(lead ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const lead = event.active.data.current?.lead as PipelineLead | undefined;
    const columnId = event.over?.data.current?.columnId as number | undefined;
    if (!lead || columnId === undefined) return;

    const newStatusId = columnId === UNSET_COLUMN ? null : columnId;
    if (lead.statusId === newStatusId) return;

    const previous = lead.statusId;

    // Optimistic update
    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id ? { ...item, statusId: newStatusId } : item,
      ),
    );

    moveLeadToStatus(lead.id, newStatusId).then((result) => {
      if (!result.success) {
        // Roll back on failure
        setLeads((current) =>
          current.map((item) =>
            item.id === lead.id ? { ...item, statusId: previous } : item,
          ),
        );
        toast.error(result.message ?? "Could not move the lead");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            leads={byColumn.get(column.id) ?? []}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
