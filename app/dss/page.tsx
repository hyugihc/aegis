"use client";

import { DssPage } from "@/components/aegis/dss-page";
import { usePortfolioContext } from "@/context/portfolio-context";

export default function DssRoute() {
  const { data, setData } = usePortfolioContext();
  return <DssPage data={data} onChange={setData} />;
}
