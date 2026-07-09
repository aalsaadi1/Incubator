"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Heart,
  Droplet,
  Waves,
  Wind,
  DoorOpen,
  Gauge,
  Layers,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  GraduationCap,
  Route as RouteIcon,
  ClipboardCheck,
  ChevronRight,
  Sparkles,
  Bell,
  Check,
  CircleDot,
  Activity,
} from "lucide-react";
import { FLOW, OXYGEN_META, TYPE_LABEL, StructureType } from "@/lib/heart-data";
import QuizPanel from "@/components/heart/QuizPanel";

const HeartViewer = dynamic(() => import("@/components/heart/HeartViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <Heart className="h-10 w-10 animate-pulse text-rose-400" />
        <span className="text-sm">Loading heart model…</span>
      </div>
    </div>
  ),
});

type Mode = "learn" | "flow" | "quiz";

const TYPE_ICON: Record<StructureType, React.ComponentType<{ className?: string }>> = {
  vessel: Waves,
  chamber: Heart,
  valve: DoorOpen,
  organ: Wind,
};

const XP_PER_STRUCTURE = 8;
const XP_PER_CORRECT = 12;
const XP_PER_LEVEL = 100;

export default function HeartLearningPage() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<Mode>("learn");
  const [autoRotate, setAutoRotate] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const [xp, setXp] = useState(0);
  const [quizReveal, setQuizReveal] = useState<number | null>(null);

  const step = FLOW[index];
  const oxy = OXYGEN_META[step.oxygen];

  // load persisted progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem("hemo-progress");
      if (raw) {
        const p = JSON.parse(raw);
        setXp(p.xp ?? 0);
        setLearned(new Set(p.learned ?? []));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((nextXp: number, nextLearned: Set<string>) => {
    try {
      localStorage.setItem(
        "hemo-progress",
        JSON.stringify({ xp: nextXp, learned: [...nextLearned] }),
      );
    } catch {
      /* ignore */
    }
  }, []);

  // mark a structure learned when viewed in learn/flow
  useEffect(() => {
    if (mode === "quiz") return;
    setLearned((prev) => {
      if (prev.has(step.id)) return prev;
      const nextLearned = new Set(prev).add(step.id);
      setXp((x) => {
        const nx = x + XP_PER_STRUCTURE;
        persist(nx, nextLearned);
        return nx;
      });
      return nextLearned;
    });
  }, [index, mode, step.id, persist]);

  // flow autoplay
  useEffect(() => {
    if (mode !== "flow" || !playing) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % FLOW.length);
    }, 2600);
    return () => clearInterval(t);
  }, [mode, playing]);

  const onQuizCorrect = useCallback(() => {
    setXp((x) => {
      const nx = x + XP_PER_CORRECT;
      setLearned((l) => {
        persist(nx, l);
        return l;
      });
      return nx;
    });
  }, [persist]);

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const levelXp = xp % XP_PER_LEVEL;
  const learnedCount = learned.size;

  const goto = (i: number) => {
    setIndex(i);
    if (mode === "quiz") setMode("learn");
  };
  const prev = () => setIndex((i) => (i - 1 + FLOW.length) % FLOW.length);
  const nextStep = () => setIndex((i) => (i + 1) % FLOW.length);

  const switchMode = (m: Mode) => {
    setMode(m);
    setPlaying(m === "flow");
    setAutoRotate(m === "learn");
    setQuizReveal(null);
  };

  const TypeIcon = TYPE_ICON[step.type];

  const overviewRows = useMemo(
    () => [
      {
        icon: Droplet,
        label: "Oxygenation",
        value: `${step.oxygenPct}%`,
        meter: step.oxygenPct,
        color: oxy.color,
      },
      { icon: Activity, label: "Blood State", value: oxy.label, meter: null, color: oxy.color },
      { icon: Gauge, label: "Pressure", value: step.pressure, meter: null, color: "#64748b" },
      {
        icon: TypeIcon,
        label: "Structure Type",
        value: TYPE_LABEL[step.type],
        meter: null,
        color: "#e11d48",
      },
      { icon: Layers, label: "Wall / Build", value: step.wall, meter: null, color: "#64748b" },
      {
        icon: RouteIcon,
        label: "Flow Stage",
        value: `${index + 1} of ${FLOW.length}`,
        meter: ((index + 1) / FLOW.length) * 100,
        color: "#e11d48",
      },
    ],
    [step, oxy, index, TypeIcon],
  );

  return (
    <div
      className="flex min-h-screen w-full flex-col gap-4 p-4 lg:h-screen lg:flex-row lg:overflow-hidden"
      style={{ background: "linear-gradient(160deg,#f7f4ee 0%,#f3eee7 60%,#efe8f0 100%)" }}
    >
      {/* ============ LEFT COLUMN ============ */}
      <aside className="flex w-full flex-col gap-4 lg:w-[290px] lg:shrink-0">
        {/* brand */}
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-inner">
              <Heart className="h-6 w-6" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-rose-600">HEMO</h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Explore the Circulation
              </p>
            </div>
          </div>
        </div>

        {/* structure list */}
        <div className="flex min-h-0 flex-1 flex-col rounded-3xl bg-white p-3 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
              The Journey
            </span>
            <span className="text-[11px] font-semibold text-slate-300">13 stops</span>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {FLOW.map((s, i) => {
              const m = OXYGEN_META[s.oxygen];
              const active = i === index && mode !== "quiz";
              const done = learned.has(s.id);
              const Ico = TYPE_ICON[s.type];
              return (
                <button
                  key={s.id}
                  onClick={() => goto(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-rose-200 bg-rose-50/70 shadow-sm"
                      : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: m.color }}
                  >
                    <Ico className="h-4 w-4" />
                    <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-slate-500 shadow ring-1 ring-black/5">
                      {i + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-700">{s.name}</p>
                    <p className="truncate text-[11px] text-slate-400">{s.nickname}</p>
                  </div>
                  {active ? (
                    <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Here
                    </span>
                  ) : done ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* progress */}
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              <GraduationCap className="h-4 w-4" /> Learning Progress
            </span>
            <span className="text-sm font-bold text-rose-600">
              {learnedCount}/{FLOW.length}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all"
              style={{ width: `${(learnedCount / FLOW.length) * 100}%` }}
            />
          </div>
        </div>
      </aside>

      {/* ============ CENTER COLUMN ============ */}
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 flex-col rounded-3xl bg-white/60 shadow-sm ring-1 ring-black/5 backdrop-blur">
          {mode === "quiz" ? (
            <QuizPanel
              onCorrect={onQuizCorrect}
              onReveal={setQuizReveal}
              onFinishToLearn={() => switchMode("learn")}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* header text */}
              <div className="px-6 pt-6 md:px-10 md:pt-8">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 md:text-4xl">
                    {step.name}
                  </h2>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: oxy.soft, color: oxy.color }}
                  >
                    <Droplet className="h-3.5 w-3.5" fill="currentColor" />
                    {oxy.label}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
                  {step.nickname}
                </p>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500">
                  {step.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip icon={Droplet} label={`${step.oxygenPct}% O₂`} />
                  <Chip icon={Gauge} label={step.pressure} />
                  <Chip icon={TypeIcon} label={TYPE_LABEL[step.type]} />
                </div>
              </div>

              {/* 3D viewer */}
              <div className="relative min-h-[300px] flex-1">
                <HeartViewer
                  currentIndex={index}
                  onSelect={setIndex}
                  mode={mode}
                  autoRotate={autoRotate}
                />
                {/* viewer controls */}
                <div className="absolute right-4 top-4 flex flex-col gap-2">
                  <IconBtn
                    active={autoRotate}
                    onClick={() => setAutoRotate((v) => !v)}
                    title="Toggle auto-rotate"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </IconBtn>
                </div>

                {/* floating flow-stage card */}
                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
                  <div className="pointer-events-auto flex items-center gap-4 rounded-2xl bg-white/90 px-5 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur">
                    <button
                      onClick={prev}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </button>
                    <div className="text-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Flow Stage {index + 1}/{FLOW.length}
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        Next: {step.next.replace(/ \(.*\)/, "")}
                      </p>
                    </div>
                    <button
                      onClick={nextStep}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {mode === "flow" && (
                  <div className="absolute left-4 top-4">
                    <button
                      onClick={() => setPlaying((p) => !p)}
                      className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-700"
                    >
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {playing ? "Pause flow" : "Play flow"}
                    </button>
                  </div>
                )}
              </div>

              {/* step dots */}
              <div className="flex justify-center gap-1.5 pb-3">
                {FLOW.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setIndex(i)}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === index ? 22 : 8,
                      background: i === index ? OXYGEN_META[s.oxygen].color : "#cbd5e1",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* mode nav */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-black/5">
            <ModeBtn active={mode === "learn"} onClick={() => switchMode("learn")} icon={GraduationCap}>
              Learn
            </ModeBtn>
            <ModeBtn active={mode === "flow"} onClick={() => switchMode("flow")} icon={RouteIcon}>
              Flow
            </ModeBtn>
            <ModeBtn active={mode === "quiz"} onClick={() => switchMode("quiz")} icon={ClipboardCheck}>
              Quiz
            </ModeBtn>
          </div>
        </div>
      </main>

      {/* ============ RIGHT COLUMN ============ */}
      <aside className="flex w-full flex-col gap-4 lg:w-[330px] lg:shrink-0 lg:overflow-y-auto">
        {/* profile */}
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-slate-800">Anatomy Cadet</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Level {level} · {xp} XP
              </p>
            </div>
            <button className="rounded-xl p-2 text-slate-300 transition hover:bg-slate-50 hover:text-slate-500">
              <Bell className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all"
              style={{ width: `${levelXp}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[10px] font-medium text-slate-400">
            {levelXp} / {XP_PER_LEVEL} XP to level {level + 1}
          </p>
        </div>

        {mode === "quiz" ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Colour Legend
            </p>
            <div className="mt-4 space-y-3">
              <Legend color={OXYGEN_META.deoxygenated.color} label="Deoxygenated (O₂-poor)" />
              <Legend color={OXYGEN_META.oxygenated.color} label="Oxygenated (O₂-rich)" />
              <Legend color={OXYGEN_META.exchange.color} label="Gas exchange (lungs)" />
            </div>
            <div className="mt-5 rounded-2xl bg-rose-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-rose-700">
                <Sparkles className="h-4 w-4" /> Tip
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-rose-600/80">
                Answer correctly to earn {XP_PER_CORRECT} XP and see the structure light up on the
                3D heart.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* overview */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Structure Overview
                </p>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: oxy.color }}
                />
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {overviewRows.map((r) => {
                  const Ico = r.icon;
                  return (
                    <div key={r.label} className="flex items-center gap-3 py-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                        <Ico className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {r.label}
                        </p>
                        {r.meter != null ? (
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${r.meter}%`, background: r.color }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-right text-sm font-bold text-slate-700">
                        {r.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* functions */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Functions &amp; Key Facts
              </p>
              <div className="space-y-2.5">
                {step.functions.map((f) => (
                  <div
                    key={f.title}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-rose-100 hover:bg-rose-50/30"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: oxy.soft, color: oxy.color }}
                    >
                      <CircleDot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-700">{f.title}</p>
                      <p className="truncate text-[12px] text-slate-400">{f.text}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* tip toast */}
        <div className="rounded-2xl bg-slate-800 p-4 text-white shadow-sm">
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <Sparkles className="h-4 w-4 text-amber-300" />
            {mode === "quiz"
              ? "Beat 75% to master this circuit."
              : mode === "flow"
                ? "Watch the blood travel the full double loop."
                : "Click a numbered marker on the heart to jump there."}
          </p>
        </div>
      </aside>
    </div>
  );
}

/* ---------- small UI helpers ---------- */

function Chip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-black/5">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 transition ${
        active ? "bg-rose-600 text-white" : "bg-white/90 text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function ModeBtn({
  children,
  onClick,
  active,
  icon: Icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
        active
          ? "bg-rose-600 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-4 w-4 rounded-full" style={{ background: color }} />
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
  );
}
