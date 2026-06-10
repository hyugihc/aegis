"use client";

import { usePortfolioContext } from "@/context/portfolio-context";
import { HoldingsPage } from "@/components/aegis/holdings-page";

export default function HoldingsRoute() {
  const { data, setData } = usePortfolioContext();
  return <HoldingsPage data={data} onChange={setData} />;
}
