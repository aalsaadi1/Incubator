"use client";

import { useMemo, useState } from "react";
import { Check, X, RotateCcw, Trophy, ArrowRight } from "lucide-react";
import { FLOW, OXYGEN_META } from "@/lib/heart-data";

interface Question {
  prompt: string;
  kind: string;
  options: string[];
  answer: string;
  revealIndex: number; // structure to highlight on the model once answered
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distractors(exclude: string[], pool: string[], n: number): string[] {
  return shuffle(pool.filter((p) => !exclude.includes(p))).slice(0, n);
}

function buildQuiz(): Question[] {
  const names = FLOW.map((s) => s.name);
  const qs: Question[] = [];

  // "what comes next" questions
  FLOW.forEach((s, i) => {
    if (s.next.includes("loop")) return;
    qs.push({
      kind: "next",
      prompt: `Blood leaves the ${s.name}. Where does it flow next?`,
      options: shuffle([s.next.replace(/ \(.*\)/, ""), ...distractors([s.name, s.next], names, 3)]),
      answer: s.next.replace(/ \(.*\)/, ""),
      revealIndex: Math.min(i + 1, FLOW.length - 1),
    });
  });

  // "identify from description"
  FLOW.forEach((s, i) => {
    const short = s.description.split(". ")[0] + ".";
    qs.push({
      kind: "identify",
      prompt: `Which structure is this? “${short}”`,
      options: shuffle([s.name, ...distractors([s.name], names, 3)]),
      answer: s.name,
      revealIndex: i,
    });
  });

  // oxygen state
  FLOW.filter((s) => s.oxygen !== "exchange").forEach((s, idx) => {
    const i = FLOW.indexOf(s);
    qs.push({
      kind: "oxygen",
      prompt: `Is the blood at the ${s.name} oxygenated or deoxygenated?`,
      options: ["Oxygenated", "Deoxygenated"],
      answer: s.oxygen === "oxygenated" ? "Oxygenated" : "Deoxygenated",
      revealIndex: i,
    });
    void idx;
  });

  // order questions
  [1, 4, 8, 10].forEach((pos) => {
    const s = FLOW[pos];
    qs.push({
      kind: "order",
      prompt: `What is step ${pos + 1} in the journey of blood through the heart?`,
      options: shuffle([s.name, ...distractors([s.name], names, 3)]),
      answer: s.name,
      revealIndex: pos,
    });
  });

  return shuffle(qs).slice(0, 8);
}

interface Props {
  onCorrect: () => void;
  onReveal: (i: number | null) => void;
  onFinishToLearn: () => void;
}

export default function QuizPanel({ onCorrect, onReveal, onFinishToLearn }: Props) {
  const [quiz, setQuiz] = useState<Question[]>(() => buildQuiz());
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = quiz[idx];

  const total = quiz.length;
  const progress = useMemo(() => Math.round((idx / total) * 100), [idx, total]);

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    onReveal(q.revealIndex);
    if (opt === q.answer) {
      setScore((s) => s + 1);
      onCorrect();
    }
  };

  const next = () => {
    onReveal(null);
    if (idx + 1 >= total) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
  };

  const retry = () => {
    setQuiz(buildQuiz());
    setIdx(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    onReveal(null);
  };

  if (done) {
    const pct = Math.round((score / total) * 100);
    const great = pct >= 75;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full"
          style={{ background: great ? "#ffe4e6" : "#fef3c7" }}
        >
          <Trophy className="h-11 w-11" style={{ color: great ? "#e11d48" : "#d97706" }} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800">
            {great ? "Excellent work!" : "Good effort!"}
          </h2>
          <p className="mt-1 text-slate-500">
            You scored{" "}
            <span className="font-bold text-rose-600">
              {score}/{total}
            </span>{" "}
            ({pct}%)
          </p>
        </div>
        <div className="h-3 w-64 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: great ? "#e11d48" : "#f59e0b" }}
          />
        </div>
        <p className="max-w-sm text-sm text-slate-500">
          {great
            ? "You clearly know your way around the heart. Try Flow mode to lock in the sequence, or run the quiz again."
            : "Review the flow in Learn mode, watch the animated Flow, then come back and beat your score."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={retry}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-rose-700"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <button
            onClick={onFinishToLearn}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Back to Learn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-6 py-4 md:px-10 md:py-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-rose-500">
          Knowledge Check
        </span>
        <span className="text-sm font-medium text-slate-400">
          Question {idx + 1} / {total} · Score {score}
        </span>
      </div>
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-rose-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className="mb-6 text-2xl font-bold leading-snug text-slate-800 md:text-[1.75rem]">
        {q.prompt}
      </h2>

      <div className="grid gap-3">
        {q.options.map((opt) => {
          const isAnswer = opt === q.answer;
          const isPicked = opt === picked;
          let cls =
            "border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/40 text-slate-700";
          let icon = null;
          if (picked) {
            if (isAnswer) {
              cls = "border-emerald-400 bg-emerald-50 text-emerald-800";
              icon = <Check className="h-5 w-5 text-emerald-600" />;
            } else if (isPicked) {
              cls = "border-rose-300 bg-rose-50 text-rose-700";
              icon = <X className="h-5 w-5 text-rose-500" />;
            } else {
              cls = "border-slate-200 bg-white text-slate-400";
            }
          }
          return (
            <button
              key={opt}
              onClick={() => choose(opt)}
              disabled={!!picked}
              className={`flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left text-base font-medium transition ${cls}`}
            >
              <span>{opt}</span>
              {icon}
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between pt-6">
        <span className="text-sm text-slate-400">
          {picked
            ? picked === q.answer
              ? "Correct — highlighted on the model."
              : `Not quite — the answer is ${q.answer}.`
            : "Pick the best answer."}
        </span>
        {picked && (
          <button
            onClick={next}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-900"
          >
            {idx + 1 >= total ? "See results" : "Next"} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
