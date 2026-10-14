"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FilterOption = { id: number; name: string };

export function LeadFilters({
  statuses,
  sources,
  types,
}: {
  statuses: FilterOption[];
  sources: FilterOption[];
  types: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const status = searchParams.get("status") ?? "all";
  const source = searchParams.get("source") ?? "all";
  const type = searchParams.get("type") ?? "all";

  function update(params: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value == null || value === "" || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    next.delete("page"); // reset pagination when filters change
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }

  // Debounce the free-text search.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (query === current) return;
    const timer = setTimeout(() => update({ q: query || null }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasFilters =
    (searchParams.get("q") ?? "") !== "" ||
    status !== "all" ||
    source !== "all" ||
    type !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1 sm:max-w-xs">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, mobile or email…"
          className="pl-8"
        />
      </div>

      <Select value={status} onValueChange={(value) => update({ status: value })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {statuses.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={source} onValueChange={(value) => update({ source: value })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {sources.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={type} onValueChange={(value) => update({ type: value })}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {types.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            router.replace(pathname);
          }}
        >
          <X />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
