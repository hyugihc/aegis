"use client";

import { SharedPortfolioView } from "@/components/aegis/share-page";
import { usePortfolioContext } from "@/context/portfolio-context";
import { useParams } from "next/navigation";

export default function SharedPortfolioRoute() {
  const { data, syncStatus } = usePortfolioContext();
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  return <SharedPortfolioView data={data} token={token} loading={syncStatus.toLowerCase().includes("loading")} />;
}
