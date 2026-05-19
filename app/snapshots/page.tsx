"use client";

import { usePortfolioContext } from "@/context/portfolio-context";
import { SnapshotsPage } from "@/components/aegis/snapshots-page";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SnapshotsRouteContent() {
  const { data, setData } = usePortfolioContext();
  const searchParams = useSearchParams();
  const createRequest = searchParams.get("create") === "true" ? 1 : 0;

  return <SnapshotsPage data={data} onChange={setData} createRequest={createRequest} />;
}

export default function SnapshotsRoute() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-sm">Loading snapshots...</div>}>
      <SnapshotsRouteContent />
    </Suspense>
  );
}
