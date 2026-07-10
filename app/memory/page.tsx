"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MemoryCard = {
  id: string;
  symbol: string;
  matched: boolean;
};

type MemoryScore = {
  moves: number;
  seconds: number;
  playedAt: string;
};

const STORAGE_KEY = "memory-match-scores";
const SYMBOLS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function shuffle<T>(items: T[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function createDeck(): MemoryCard[] {
  return shuffle(
    SYMBOLS.flatMap((symbol) => [
      { id: `${symbol}-1`, symbol, matched: false },
      { id: `${symbol}-2`, symbol, matched: false },
    ]),
  );
}

function loadScores(): MemoryScore[] {
  if (typeof window === "undefined") return [];

  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved ? (JSON.parse(saved) as MemoryScore[]) : [];
}

export default function MemoryPage() {
  const [cards, setCards] = useState<MemoryCard[]>(() => createDeck());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [scores, setScores] = useState<MemoryScore[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const savedWinRef = useRef(false);
  const checkTimeoutRef = useRef<number | null>(null);

  const matchedCount = useMemo(() => cards.filter((card) => card.matched).length, [cards]);
  const isComplete = matchedCount === cards.length;
  const bestScore = scores[0];

  useEffect(() => {
    setScores(loadScores());
  }, []);

  useEffect(() => {
    if (!hasStarted || isComplete) return;

    const timer = window.setInterval(() => {
      setSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hasStarted, isComplete]);

  useEffect(() => {
    if (!isComplete || !hasStarted || savedWinRef.current) return;

    savedWinRef.current = true;
    setScores((currentScores) => {
      const nextScores = [{ moves, seconds, playedAt: new Date().toISOString() }, ...currentScores]
        .sort((a, b) => a.moves - b.moves || a.seconds - b.seconds)
        .slice(0, 10);

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextScores));
      return nextScores;
    });
  }, [hasStarted, isComplete, moves, seconds]);

  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) window.clearTimeout(checkTimeoutRef.current);
    };
  }, []);

  function resetGame() {
    if (checkTimeoutRef.current) window.clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = null;
    savedWinRef.current = false;
    setCards(createDeck());
    setSelectedIds([]);
    setMoves(0);
    setSeconds(0);
    setHasStarted(false);
    setIsChecking(false);
  }

  function selectCard(card: MemoryCard) {
    if (card.matched || selectedIds.includes(card.id) || selectedIds.length === 2 || isChecking || isComplete) return;

    if (!hasStarted) setHasStarted(true);

    const nextSelectedIds = [...selectedIds, card.id];
    setSelectedIds(nextSelectedIds);

    if (nextSelectedIds.length !== 2) return;

    setMoves((currentMoves) => currentMoves + 1);
    setIsChecking(true);

    const [firstCard, secondCard] = nextSelectedIds.map((id) => cards.find((item) => item.id === id));

    checkTimeoutRef.current = window.setTimeout(() => {
      if (firstCard && secondCard && firstCard.symbol === secondCard.symbol) {
        setCards((currentCards) =>
          currentCards.map((item) => (item.symbol === firstCard.symbol ? { ...item, matched: true } : item)),
        );
      }

      setSelectedIds([]);
      setIsChecking(false);
      checkTimeoutRef.current = null;
    }, 550);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-3 sm:px-4 sm:py-6 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-6 lg:px-8">
      <section className="flex flex-col gap-4">
        <div className="rounded-2xl border bg-card/70 p-4 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-5">
          <Button asChild className="mb-3 -ml-2" size="sm" variant="ghost">
            <Link href="/"><ArrowLeft className="h-4 w-4" /> Games</Link>
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Memory / Matching Game</p>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Find the pairs</h1>
            </div>
            <Button className="w-full sm:w-auto" onClick={resetGame} variant="secondary">
              <RotateCcw className="h-4 w-4" /> New game
            </Button>
          </div>
        </div>

        <Card className="border-primary/20 bg-slate-950/80">
          <CardHeader className="grid grid-cols-3 gap-2 px-4 py-4 sm:px-6">
            <Stat label="Moves" value={moves} />
            <Stat label="Time" value={`${seconds}s`} />
            <Stat label="Pairs" value={`${matchedCount / 2}/${SYMBOLS.length}`} />
          </CardHeader>
          <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
            {isComplete ? (
              <div className="mb-4 rounded-2xl bg-primary px-4 py-3 text-center font-bold text-primary-foreground">
                You matched every card in {moves} moves and {seconds} seconds.
              </div>
            ) : null}

            <div className="mx-auto grid max-w-[min(92vw,34rem)] grid-cols-4 gap-2 sm:gap-3 lg:max-w-none">
              {cards.map((card) => {
                const isVisible = card.matched || selectedIds.includes(card.id);

                return (
                  <button
                    aria-label={isVisible ? `Card ${card.symbol}` : "Hidden card"}
                    className={
                      isVisible
                        ? "aspect-square rounded-2xl border border-primary/50 bg-primary text-3xl font-black text-primary-foreground shadow-[0_0_18px_rgba(34,197,94,0.25)] transition sm:text-4xl"
                        : "aspect-square rounded-2xl border border-white/10 bg-secondary text-3xl font-black text-transparent transition hover:border-primary/40 active:scale-95 sm:text-4xl"
                    }
                    disabled={card.matched || isChecking}
                    key={card.id}
                    onClick={() => selectCard(card)}
                    type="button"
                  >
                    {card.symbol}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="grid gap-4 sm:grid-cols-2 lg:block lg:space-y-6">
        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Best Result</CardTitle>
            <CardDescription>Your best local memory score</CardDescription>
          </CardHeader>
          <CardContent>
            {bestScore ? (
              <div className="rounded-lg bg-secondary px-4 py-3">
                <p className="text-2xl font-bold">{bestScore.moves} moves</p>
                <p className="text-sm text-muted-foreground">Finished in {bestScore.seconds} seconds</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Complete a game to save a score.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Recent Scores</CardTitle>
            <CardDescription>Only the best 10 are stored.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scores.length ? (
              scores.slice(0, 5).map((entry) => (
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3" key={entry.playedAt}>
                  <div>
                    <p className="font-semibold">{entry.moves} moves</p>
                    <p className="text-xs text-muted-foreground">{entry.seconds} seconds</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(entry.playedAt).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No memory scores yet.</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold sm:text-xl">{value}</p>
    </div>
  );
}
