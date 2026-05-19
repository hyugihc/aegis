"use client";

import { usePortfolioContext } from "@/context/portfolio-context";
import { SettingsPage } from "@/components/aegis/settings-page";

export default function SettingsRoute() {
  const { data, setData } = usePortfolioContext();
  return <SettingsPage data={data} onChange={setData} />;
}
