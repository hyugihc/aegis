"use client";

import { usePortfolioContext } from "@/context/portfolio-context";
import { AutoPortfolioPage } from "@/components/aegis/auto-portfolio-page";

export default function AutoPortfolioRoute() {
  const { data, setData } = usePortfolioContext();
  return <AutoPortfolioPage data={data} onChange={setData} />;
}
