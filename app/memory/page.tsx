"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadLocalScores, saveLocalScore } from "@/lib/local-scores";
import { loadPlayerProfile, PlayerProfile } from "@/lib/profile";

type MemoryCard = {
  id: string;
  symbol: string;
  matched: boolean;
};

type MemoryScore = {
  username: string;
  score: number;
  moves: number;
  seconds: number;
  playedAt: string;
};

const SYMBOLS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const GAME = "memory-match";

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

function calculateMemoryScore(moves: number, seconds: number) {
  return Math.max(0, 10000 - moves * 100 - seconds * 10);
}

type MemoryScoresResponse = {
  playerBest: MemoryScore | null;
  scores: MemoryScore[];
};

async function loadScores(username: string): Promise<MemoryScoresResponse> {
  const response = await fetch(`/api/memory-scores?username=${encodeURIComponent(username)}`);
  if (!response.ok) throw new Error("Could not load scores.");

  return (await response.json()) as MemoryScoresResponse;
}

async function saveScore(username: string, moves: number, seconds: number): Promise<MemoryScore> {
  const response = await fetch("/api/memory-scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, moves, seconds }),
  });

  if (!response.ok) throw new Error("Could not save score.");

  const data = (await response.json()) as { score: MemoryScore };
  return data.score;
}

export default function MemoryPage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [cards, setCards] = useState<MemoryCard[]>(() => createDeck());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [scores, setScores] = useState<MemoryScore[]>([]);
  const [playerBestScore, setPlayerBestScore] = useState<MemoryScore | null>(null);
  const [scoreError, setScoreError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const savedWinRef = useRef(false);
  const checkTimeoutRef = useRef<number | null>(null);

  const matchedCount = useMemo(() => cards.filter((card) => card.matched).length, [cards]);
  const isComplete = matchedCount === cards.length;

  useEffect(() => {
    const playerProfile = loadPlayerProfile();
    if (!playerProfile) return;

    setProfile(playerProfile);
    const localScores = loadLocalScores(GAME) as MemoryScore[];
    setScores(localScores);
    setPlayerBestScore(localScores.find((score) => score.username === playerProfile.username) ?? null);

    loadScores(playerProfile.username)
      .then((data) => {
        setScores(data.scores);
        setPlayerBestScore(data.playerBest);
        setScoreError("");
      })
      .catch(() => setScoreError(""));
  }, []);

  useEffect(() => {
    if (!hasStarted || isComplete) return;

    const timer = window.setInterval(() => {
      setSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hasStarted, isComplete]);

  useEffect(() => {
    if (!isComplete || !hasStarted || !profile || savedWinRef.current) return;

    savedWinRef.current = true;
    const localScore = {
      username: profile.username,
      score: calculateMemoryScore(moves, seconds),
      moves,
      seconds,
      playedAt: new Date().toISOString(),
    };
    const localScores = saveLocalScore(GAME, localScore) as MemoryScore[];
    setScores(localScores);
    setPlayerBestScore(localScores.find((score) => score.username === profile.username) ?? localScore);

    saveScore(profile.username, moves, seconds)
      .then(() => loadScores(profile.username))
      .then((data) => {
        setScores(data.scores);
        setPlayerBestScore(data.playerBest);
        setScoreError("");
      })
      .catch(() => setScoreError(""));
  }, [hasStarted, isComplete, moves, profile, seconds]);

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

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-primary/20 bg-card/90 backdrop-blur">
          <CardHeader>
            <Button asChild className="mb-3 w-fit" size="sm" variant="ghost">
              <Link href="/"><ArrowLeft className="h-4 w-4" /> Games</Link>
            </Button>
            <CardTitle className="text-3xl">Login required</CardTitle>
            <CardDescription>Enter your username on the start page before playing Memory Match.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
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
              <p className="mt-1 text-sm text-muted-foreground">Playing as {profile.username}</p>
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
            <CardDescription>Your best memory score</CardDescription>
          </CardHeader>
          <CardContent>
            {playerBestScore ? (
              <div className="rounded-lg bg-secondary px-4 py-3">
                <p className="text-2xl font-bold">{playerBestScore.score} points</p>
                <p className="text-sm text-muted-foreground">
                  {playerBestScore.moves} moves in {playerBestScore.seconds} seconds
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Complete a game to save a score.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Top Players</CardTitle>
            <CardDescription>Ranked by calculated score.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scoreError ? <p className="text-sm text-destructive">{scoreError}</p> : null}
            {scores.length ? (
              scores.slice(0, 10).map((entry, index) => (
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3" key={`${entry.username}-${entry.playedAt}`}>
                  <div>
                    <p className="font-semibold">#{index + 1} {entry.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.moves} moves, {entry.seconds} seconds
                    </p>
                  </div>
                  <p className="text-sm font-bold">{entry.score}</p>
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
