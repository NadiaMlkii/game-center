"use client";

import Link from "next/link";
import { KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Trophy, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadLocalScores, LocalGameScore, saveLocalScore } from "@/lib/local-scores";
import { loadPlayerProfile } from "@/lib/profile";

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";
type ScoreEntry = { score: number; dots: number; playedAt: string };
type Profile = { username: string; bestScore: number; totalPoints: number; gamesPlayed: number; scores: ScoreEntry[] };
type SnakeScoresResponse = {
  playerBest: LocalGameScore | null;
  scores: LocalGameScore[];
};

const BOARD_SIZE = 18;
const GAME = "snake";
const POINTS_PER_DOT = 10;
const STORAGE_KEY = "snake-game-profiles";
const START_SNAKE: Point[] = [
  { x: 8, y: 9 },
  { x: 7, y: 9 },
  { x: 6, y: 9 },
];
const START_DOT = { x: 12, y: 9 };

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  w: "up",
  ArrowDown: "down",
  s: "down",
  ArrowLeft: "left",
  a: "left",
  ArrowRight: "right",
  d: "right",
};

function isTextInputTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function pointsMatch(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function createDot(snake: Point[]) {
  const openCells: Point[] = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!snake.some((part) => pointsMatch(part, { x, y }))) {
        openCells.push({ x, y });
      }
    }
  }

  return openCells[Math.floor(Math.random() * openCells.length)] ?? START_DOT;
}

function loadSnakeProfile(username: string): Profile {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  const profiles = saved ? (JSON.parse(saved) as Record<string, Profile>) : {};
  return profiles[username] ?? { username, bestScore: 0, totalPoints: 0, gamesPlayed: 0, scores: [] };
}

function saveSnakeProfile(profile: Profile) {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  const profiles = saved ? (JSON.parse(saved) as Record<string, Profile>) : {};
  profiles[profile.username] = { ...profile, scores: profile.scores.slice(0, 20) };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

async function loadSnakeScores(username: string): Promise<SnakeScoresResponse> {
  const response = await fetch(`/api/snake-scores?username=${encodeURIComponent(username)}`);
  if (!response.ok) throw new Error("Could not load Snake scores.");

  return (await response.json()) as SnakeScoresResponse;
}

async function saveSnakeScore(username: string, score: number, dots: number) {
  const response = await fetch("/api/snake-scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, score, dots }),
  });

  if (!response.ok) throw new Error("Could not save Snake score.");
}

export default function SnakePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [snake, setSnake] = useState<Point[]>(START_SNAKE);
  const [dot, setDot] = useState<Point>(START_DOT);
  const [direction, setDirection] = useState<Direction>("right");
  const [nextDirection, setNextDirection] = useState<Direction>("right");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [dots, setDots] = useState(0);
  const [topScores, setTopScores] = useState<LocalGameScore[]>([]);
  const savedFinalScoreRef = useRef(false);

  const score = dots * POINTS_PER_DOT;
  const recentScores = useMemo(() => profile?.scores.slice(0, 5) ?? [], [profile]);

  useEffect(() => {
    const playerProfile = loadPlayerProfile();
    setTopScores(loadLocalScores(GAME));
    if (!playerProfile) return;

    setProfile(loadSnakeProfile(playerProfile.username));
    loadSnakeScores(playerProfile.username)
      .then((data) => setTopScores(data.scores))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (profile) {
      saveSnakeProfile(profile);
    }
  }, [profile]);

  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const timer = window.setInterval(() => {
      setSnake((currentSnake) => {
        const activeDirection = nextDirection;
        const head = currentSnake[0];
        const nextHead = {
          x: head.x + (activeDirection === "right" ? 1 : activeDirection === "left" ? -1 : 0),
          y: head.y + (activeDirection === "down" ? 1 : activeDirection === "up" ? -1 : 0),
        };

        const hitWall = nextHead.x < 0 || nextHead.x >= BOARD_SIZE || nextHead.y < 0 || nextHead.y >= BOARD_SIZE;
        const hitSelf = currentSnake.some((part) => pointsMatch(part, nextHead));

        if (hitWall || hitSelf) {
          setIsPlaying(false);
          setIsGameOver(true);
          return currentSnake;
        }

        setDirection(activeDirection);

        const ateDot = pointsMatch(nextHead, dot);
        const nextSnake = ateDot ? [nextHead, ...currentSnake] : [nextHead, ...currentSnake.slice(0, -1)];

        if (ateDot) {
          setDots((currentDots) => currentDots + 1);
          setDot(createDot(nextSnake));
        }

        return nextSnake;
      });
    }, 130);

    return () => window.clearInterval(timer);
  }, [dot, isGameOver, isPlaying, nextDirection]);

  useEffect(() => {
    if (!isGameOver || !profile || savedFinalScoreRef.current) return;

    savedFinalScoreRef.current = true;
    const playedAt = new Date().toISOString();
    setTopScores(saveLocalScore(GAME, { username: profile.username, score, dots, playedAt }));
    saveSnakeScore(profile.username, score, dots)
      .then(() => loadSnakeScores(profile.username))
      .then((data) => setTopScores(data.scores))
      .catch(() => undefined);
    setProfile({
      ...profile,
      bestScore: Math.max(profile.bestScore, score),
      totalPoints: profile.totalPoints + score,
      gamesPlayed: profile.gamesPlayed + 1,
      scores: [{ score, dots, playedAt }, ...profile.scores].slice(0, 20),
    });
  }, [dots, isGameOver, profile, score]);

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (isTextInputTarget(event.target)) return;

      if (event.key === "Enter" && profile && (!isPlaying || isGameOver)) {
        event.preventDefault();
        startGame();
        return;
      }

      const selectedDirection = DIRECTION_KEYS[event.key] ?? DIRECTION_KEYS[event.key.toLowerCase()];

      if (selectedDirection) {
        event.preventDefault();
        changeDirection(selectedDirection);
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [direction, isGameOver, isPlaying, profile]);

  function resetGame() {
    savedFinalScoreRef.current = false;
    setSnake(START_SNAKE);
    setDot(START_DOT);
    setDirection("right");
    setNextDirection("right");
    setDots(0);
    setIsGameOver(false);
    setIsPlaying(false);
  }

  function startGame() {
    if (isGameOver) resetGame();
    setIsPlaying(true);
  }

  function changeDirection(newDirection: Direction) {
    const isOpposite =
      (direction === "up" && newDirection === "down") ||
      (direction === "down" && newDirection === "up") ||
      (direction === "left" && newDirection === "right") ||
      (direction === "right" && newDirection === "left");

    if (!isOpposite) setNextDirection(newDirection);
  }

  function handleBoardKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const selectedDirection = DIRECTION_KEYS[event.key] ?? DIRECTION_KEYS[event.key.toLowerCase()];

    if (selectedDirection) {
      event.preventDefault();
      changeDirection(selectedDirection);
    }
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
            <CardDescription>Enter your username on the start page before playing Snake.</CardDescription>
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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-3 sm:px-4 sm:py-6 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-6 lg:px-8">
      <section className="flex flex-col gap-4 lg:gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <Button asChild className="mb-2 -ml-2" size="sm" variant="ghost">
              <Link href="/"><ArrowLeft className="h-4 w-4" /> Games</Link>
            </Button>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{profile.username}</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <div className="col-span-2 rounded-md bg-secondary px-3 py-2 text-center text-sm font-medium sm:col-span-1 sm:px-4">
              {isGameOver ? "Tap board or press Enter for a new game" : isPlaying ? "Playing" : "Tap board or press Enter to start"}
            </div>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setIsPlaying((playing) => !playing)} disabled={isGameOver}>
              {isPlaying ? "Pause" : "Resume"}
            </Button>
            <Button asChild className="w-full sm:w-auto" variant="outline"><Link href="/">Games</Link></Button>
          </div>
        </div>

        <Card className="overflow-hidden border-primary/20 bg-slate-950/80">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 px-4 py-4 sm:px-6">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Current Score: {score}</CardTitle>
              <CardDescription>{dots} dots eaten at {POINTS_PER_DOT} points each</CardDescription>
            </div>
            {isGameOver ? <span className="rounded-full bg-destructive px-3 py-1 text-sm font-semibold">Game over</span> : null}
          </CardHeader>
          <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
            <div
              aria-label="Snake game board"
              className="mx-auto grid aspect-square w-full max-w-[min(92vw,34rem)] touch-none rounded-2xl border border-primary/30 bg-slate-900 p-1.5 outline-none sm:p-2 lg:max-w-none"
              onClick={() => {
                if (!isPlaying || isGameOver) startGame();
              }}
              onKeyDown={handleBoardKeyDown}
              style={{
                gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
              }}
              tabIndex={0}
            >
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
                const cell = { x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) };
                const isHead = pointsMatch(snake[0], cell);
                const isSnake = snake.some((part) => pointsMatch(part, cell));
                const isDot = pointsMatch(dot, cell);

                return (
                  <div key={`${cell.x}-${cell.y}`} className="min-h-0 min-w-0 p-px sm:p-0.5">
                    <div
                      className={
                        isHead
                          ? "h-full w-full rounded-md bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]"
                          : isSnake
                            ? "h-full w-full rounded bg-primary"
                            : isDot
                              ? "h-full w-full rounded-full bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.9)]"
                              : "h-full w-full rounded bg-slate-800/70"
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mt-4 grid max-w-xs grid-cols-3 gap-2 sm:hidden">
              <span />
              <Button className="h-12" variant="secondary" onClick={() => changeDirection("up")}>Up</Button>
              <span />
              <Button className="h-12" variant="secondary" onClick={() => changeDirection("left")}>Left</Button>
              <Button className="h-12" variant="secondary" onClick={() => changeDirection("down")}>Down</Button>
              <Button className="h-12" variant="secondary" onClick={() => changeDirection("right")}>Right</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="grid gap-4 sm:grid-cols-2 lg:block lg:space-y-6">
        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" /> Profile</CardTitle>
            <CardDescription>Your saved Snake progress</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Stat label="Best score" value={profile.bestScore} />
            <Stat label="Total points" value={profile.totalPoints} />
            <Stat label="Games played" value={profile.gamesPlayed} />
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Recent Scores</CardTitle>
            <CardDescription>Scores are saved after each game over.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentScores.length ? (
              recentScores.map((entry) => (
                <div key={entry.playedAt} className="flex items-center justify-between rounded-lg bg-secondary p-3">
                  <div>
                    <p className="font-semibold">{entry.score} points</p>
                    <p className="text-xs text-muted-foreground">{entry.dots} dots eaten</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(entry.playedAt).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No saved games yet. Start playing to build your profile.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Top Players</CardTitle>
            <CardDescription>Ranked by highest Snake score.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topScores.length ? (
              topScores.map((entry, index) => (
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3" key={`${entry.username}-${entry.playedAt}`}>
                  <div>
                    <p className="font-semibold">#{index + 1} {entry.username}</p>
                    <p className="text-xs text-muted-foreground">{entry.dots ?? 0} dots eaten</p>
                  </div>
                  <p className="text-sm font-bold">{entry.score}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No Snake scores yet.</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}
