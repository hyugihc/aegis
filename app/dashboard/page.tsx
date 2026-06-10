"use client";

import { usePortfolioContext } from "@/context/portfolio-context";
import { DashboardPage } from "@/components/aegis/dashboard-page";
import { useRouter } from "next/navigation";

export default function DashboardRoute() {
  const { data } = usePortfolioContext();
  const router = useRouter();

  return (
    <DashboardPage
      data={data}
      onCreateSnapshot={() => {
        router.push("/snapshots?create=true");
      }}
    />
  );
}
