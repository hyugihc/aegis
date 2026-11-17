import { Card } from "@/components/ui/card";
import {
  appChangelog,
  appRelease,
  appRoadmap,
  codeNameThemes,
} from "@/components/aegis/constants";
import Link from "next/link";
import {
  Flame,
  Sun,
  Compass,
  Shield,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function VersionPage() {
  const currentRelease = appChangelog[0];
  const currentTheme = codeNameThemes[appRelease.codeName] || codeNameThemes.Ember;

  const getCodeIcon = (name: string, className = "h-4 w-4") => {
    switch (name) {
      case "Dawn":
        return <Sun className={className} />;
      case "Ember":
        return <Flame className={className} />;
      case "Horizon":
        return <Compass className={className} />;
      case "Aura":
        return <Shield className={className} />;
      case "Aether":
        return <Layers className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400 transition hover:border-white/20 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Dashboard</span>
            </Link>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Aegis Version & Roadmap
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Pusat evolusi sistem, pembaruan fitur, dan arah masa depan arsitektur portofolio Aegis.
          </p>
        </div>

        {/* Current Active Release Card */}
        <div
          className={`rounded-2xl border ${currentTheme.border} bg-gradient-to-br ${currentTheme.gradient} p-4 ${currentTheme.glow} lg:text-right min-w-[260px]`}
        >
          <div className="flex items-center justify-between lg:justify-end gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${currentTheme.bgBadge} ${currentTheme.textBadge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentTheme.dotColor} animate-pulse`} />
              Active Release
            </span>
            <span className="font-mono text-xs font-semibold text-zinc-300">
              Build {appRelease.buildNumber}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2 lg:justify-end">
            <span className="text-3xl font-black tracking-tight text-white">
              v{appRelease.versionNumber}
            </span>
            <span className={`text-base font-bold ${currentTheme.textColor}`}>
              {appRelease.codeName}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400 lg:justify-end">
            <span>{currentTheme.tagline}</span>
            <span>•</span>
            <span>{appRelease.month} {appRelease.year}</span>
          </div>
        </div>
      </div>

      {/* 5-Phase Codename Architecture Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.values(codeNameThemes).map((phase) => {
          const isCurrent = phase.status === "current";

          return (
            <div
              key={phase.key}
              className={`relative overflow-hidden rounded-xl border ${
                phase.border
              } ${phase.cardBg} p-4 transition duration-200 ${
                phase.borderHover
              } ${isCurrent ? `${phase.glow} ring-1 ring-inset ring-orange-500/40` : ""}`}
            >
              {/* Glow Accent at Top */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${phase.gradient}`}
              />

              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-bold font-mono ${phase.bgBadge} ${phase.textBadge}`}
                >
                  {getCodeIcon(phase.name, "h-3 w-3")}
                  {phase.version}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isCurrent ? phase.textColor : "text-zinc-500"
                  }`}
                >
                  {phase.statusLabel}
                </span>
              </div>

              <h2 className="mt-3 text-lg font-bold text-white">
                {phase.name}
              </h2>
              <p className={`text-xs font-semibold ${phase.textSub}`}>
                {phase.tagline}
              </p>
              <p className="mt-2.5 text-[11px] leading-relaxed text-zinc-400">
                {phase.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Spotlight for Current Release */}
      {currentRelease ? (
        <Card
          className={`overflow-hidden border ${currentTheme.border} bg-gradient-to-br ${currentTheme.gradient}`}
        >
          <div className="border-b border-white/10 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${currentTheme.bgBadge} ${currentTheme.textBadge}`}
                >
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  Rilis Terbaru
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  v{currentRelease.versionNumber}
                </span>
                <span className="text-zinc-500">•</span>
                <span className="font-mono text-xs text-orange-300">
                  Build {currentRelease.buildNumber}
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-xs font-medium text-zinc-300">
                  Codename {currentRelease.codeName}
                </span>
              </div>
              <span className="text-xs text-zinc-400">{currentRelease.date}</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {currentRelease.title}
            </h2>
          </div>
          <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-2">
            {currentRelease.changes.map((change, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-zinc-300 backdrop-blur-sm"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-[10px] font-bold text-orange-300">
                  {idx + 1}
                </span>
                <span>{change}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Main Two Columns: Release History vs Upcoming Roadmap */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        {/* Release History (Changelog) */}
        <Card className="overflow-hidden border-white/10 bg-zinc-950/40">
          <div className="border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Release History</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Catatan rilis fitur dan perbaikan build sebelumnya
                </p>
              </div>
              <span className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-zinc-400">
                {appChangelog.length} Rilis
              </span>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {appChangelog.map((release) => {
              const releaseTheme =
                codeNameThemes[release.codeName] || codeNameThemes.Dawn;
              const isCurrent = release.version === appRelease.version;

              return (
                <section
                  key={release.version}
                  className={`p-5 sm:p-6 transition ${
                    isCurrent ? "bg-orange-500/[0.03]" : "hover:bg-white/[0.01]"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-white">
                          v{release.versionNumber}
                        </span>
                        <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-300">
                          build {release.buildNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${releaseTheme.bgBadge} ${releaseTheme.textBadge}`}
                        >
                          {getCodeIcon(release.codeName, "h-3 w-3")}
                          {release.codeName}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">{release.date}</p>
                    </div>
                    <span
                      className={`w-fit rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                        isCurrent
                          ? "border border-orange-400/40 bg-orange-400/20 text-orange-200"
                          : "border border-white/10 bg-white/[0.04] text-zinc-400"
                      }`}
                    >
                      {release.badge}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-semibold text-zinc-200">
                    {release.title}
                  </h3>
                  <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
                    {release.changes.map((change, cIdx) => (
                      <li key={cIdx} className="flex items-start gap-2.5">
                        <CheckCircle2
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${releaseTheme.textColor}`}
                        />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </Card>

        {/* Upcoming Roadmap */}
        <Card className="h-fit overflow-hidden border-white/10 bg-zinc-950/40">
          <div className="border-b border-white/10 px-5 py-4 sm:px-6">
            <h2 className="text-base font-bold text-white">Upcoming Roadmap</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Arah evolusi arsitektur Aegis ke depan
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {appRoadmap.map((item) => {
              const roadmapTheme =
                codeNameThemes[item.codeName] || codeNameThemes.Horizon;

              return (
                <section
                  key={item.version}
                  className={`p-5 sm:p-6 space-y-3.5 transition hover:bg-white/[0.01]`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold font-mono ${roadmapTheme.bgBadge} ${roadmapTheme.textBadge}`}
                      >
                        {getCodeIcon(item.codeName, "h-3.5 w-3.5")}
                        {item.version}
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {item.codeName}
                      </h3>
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${roadmapTheme.textSub}`}
                    >
                      {item.tagline}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-zinc-300">
                    {item.theme}
                  </p>

                  <ul className="space-y-2 text-xs leading-relaxed text-zinc-400">
                    {item.features.map((feature, fIdx) => (
                      <li
                        key={fIdx}
                        className={`flex items-start gap-2.5 rounded-lg border ${roadmapTheme.border} ${roadmapTheme.cardBg} p-2.5`}
                      >
                        <span
                          className={`font-mono font-bold ${roadmapTheme.textColor}`}
                        >
                          ›
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
