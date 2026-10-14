import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ReportsClient } from "@/components/reports/reports-client";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Operational analytics across leads, users and channels."
      />
      <ReportsClient />
    </>
  );
}
