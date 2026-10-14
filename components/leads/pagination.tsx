import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * Server-rendered, searchParams-driven pagination.
 */
export function LeadsPagination({
  page,
  pageSize,
  total,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  searchParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "lead" : "leads"}
      </p>
    );
  }

  function hrefFor(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(target));
    return `?${params.toString()}`;
  }

  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        Showing {(page - 1) * pageSize + 1}–
        {Math.min(page * pageSize, total)} of {total} leads
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={hrefFor(prev)}
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href={hrefFor(page)} isActive>
              {page}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <span className="px-2 text-sm text-muted-foreground">
              of {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href={hrefFor(next)}
              aria-disabled={page >= totalPages}
              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
