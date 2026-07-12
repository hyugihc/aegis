import { Card } from "@/components/ui/card";
import { appChangelog, appRelease, appRoadmap } from "@/components/aegis/constants";

export default function VersionPage() {
  const currentRelease = appChangelog[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Versioning</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Aegis changelog</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Ringkasan perubahan aplikasi, rilis terbaru, dan arah fitur yang sedang disiapkan.
          </p>
        </div>
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-left shadow-[0_0_32px_-22px_rgba(245,158,11,0.95)] lg:text-right">
          <p className="text-xs uppercase tracking-wider text-amber-200">Current version</p>
          <p className="mt-1 text-xl font-semibold text-white">v{appRelease.version}</p>
          <p className="mt-1 text-xs text-zinc-400">
            {appRelease.month} {appRelease.year} - {appRelease.codeName}
          </p>
        </div>
      </div>

      {currentRelease ? (
        <Card className="overflow-hidden">
          <div className="border-b border-white/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">What is new</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{currentRelease.title}</h2>
            <p className="mt-1 text-sm text-amber-200/80">
              v{currentRelease.version} - {currentRelease.date} - Code name {currentRelease.codeName}
            </p>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2">
            {currentRelease.changes.map((change) => (
              <div key={change} className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-300">
                {change}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <Card className="overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">Release history</h2>
          </div>
          <div className="divide-y divide-white/5">
            {appChangelog.map((release) => (
              <section key={release.version} className="p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">v{release.version}</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {release.date} - {release.codeName}
                    </p>
                  </div>
                  <span className="w-fit rounded-md border border-amber-300/20 bg-amber-300/[0.08] px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-100">
                    {release.version === appRelease.version ? "Current" : "Archive"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-zinc-300">{release.title}</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-500">
                  {release.changes.map((change) => (
                    <li key={change} className="border-l border-white/10 pl-3">
                      {change}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Card>

        <Card className="h-fit overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="font-semibold text-white">Coming next (V2.0)</h2>
          </div>
          <div className="divide-y divide-white/5">
            {appRoadmap.map((item) => (
              <section key={item.title} className="p-5">
                <h3 className="text-sm font-semibold text-amber-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{item.description}</p>
              </section>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
