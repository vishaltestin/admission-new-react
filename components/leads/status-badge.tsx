import { Badge } from "@/components/ui/badge";

/**
 * Status/sub-status badge with the color configured in Lead Masters.
 * Renders a subtle colored badge with a dot.
 */
export function StatusBadge({
  name,
  color,
}: {
  name?: string | null;
  color?: string | null;
}) {
  if (!name) return <span className="text-muted-foreground">—</span>;

  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color ?? "#94a3b8" }}
      />
      {name}
    </Badge>
  );
}
