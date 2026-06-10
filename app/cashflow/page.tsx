"use client";

import { usePortfolioContext } from "@/context/portfolio-context";
import { CashflowPage } from "@/components/aegis/cashflow-page";

export default function CashflowRoute() {
  const { data, setData } = usePortfolioContext();
  return <CashflowPage data={data} onChange={setData} />;
}
