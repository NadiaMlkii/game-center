"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Trophy, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";
type ScoreEntry = { score: number; dots: number; playedAt: string };
type Profile = { username: string; bestScore: number; totalPoints: number; gamesPlayed: number; scores: ScoreEntry[] };

const BOARD_SIZE = 18;
const POINTS_PER_DOT = 10;
const STORAGE_KEY = "snake-game-profile";
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

function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved ? (JSON.parse(saved) as Profile) : null;
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [snake, setSnake] = useState<Point[]>(START_SNAKE);
  const [dot, setDot] = useState<Point>(START_DOT);
  const [direction, setDirection] = useState<Direction>("right");
  const [nextDirection, setNextDirection] = useState<Direction>("right");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [dots, setDots] = useState(0);
  const savedFinalScoreRef = useRef(false);

  const score = dots * POINTS_PER_DOT;
  const recentScores = useMemo(() => profile?.scores.slice(0, 5) ?? [], [profile]);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    if (profile) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
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
    setProfile({
      ...profile,
      bestScore: Math.max(profile.bestScore, score),
      totalPoints: profile.totalPoints + score,
      gamesPlayed: profile.gamesPlayed + 1,
      scores: [{ score, dots, playedAt: new Date().toISOString() }, ...profile.scores],
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
  });

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = username.trim();
    if (!trimmedName) return;

    setProfile({ username: trimmedName, bestScore: 0, totalPoints: 0, gamesPlayed: 0, scores: [] });
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    resetGame();
  }

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
            <CardTitle className="text-3xl">Snake Score Arena</CardTitle>
            <CardDescription>Login with a username to play and save every score to your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={login}>
              <Input placeholder="Enter username" value={username} onChange={(event) => setUsername(event.target.value)} />
              <Button className="w-full" type="submit">
                Login and play
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_22rem] lg:px-8">
      <section className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border bg-card/70 p-5 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="text-3xl font-bold tracking-tight">{profile.username}</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-md bg-secondary px-4 py-2 text-sm font-medium">
              {isGameOver ? "Press Enter for a new game" : isPlaying ? "Playing" : "Press Enter to start"}
            </div>
            <Button variant="secondary" onClick={() => setIsPlaying((playing) => !playing)} disabled={isGameOver}>
              {isPlaying ? "Pause" : "Resume"}
            </Button>
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        </div>

        <Card className="overflow-hidden border-primary/20 bg-slate-950/80">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl">Current Score: {score}</CardTitle>
              <CardDescription>{dots} dots eaten at {POINTS_PER_DOT} points each</CardDescription>
            </div>
            {isGameOver ? <span className="rounded-full bg-destructive px-3 py-1 text-sm font-semibold">Game over</span> : null}
          </CardHeader>
          <CardContent>
            <div
              aria-label="Snake game board"
              className="grid aspect-square w-full rounded-2xl border border-primary/30 bg-slate-900 p-2 outline-none"
              onKeyDown={handleBoardKeyDown}
              style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
              tabIndex={0}
            >
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
                const cell = { x: index % BOARD_SIZE, y: Math.floor(index / BOARD_SIZE) };
                const isHead = pointsMatch(snake[0], cell);
                const isSnake = snake.some((part) => pointsMatch(part, cell));
                const isDot = pointsMatch(dot, cell);

                return (
                  <div key={`${cell.x}-${cell.y}`} className="aspect-square p-0.5">
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

            <div className="mt-5 grid grid-cols-3 gap-2 sm:hidden">
              <span />
              <Button variant="secondary" onClick={() => changeDirection("up")}>Up</Button>
              <span />
              <Button variant="secondary" onClick={() => changeDirection("left")}>Left</Button>
              <Button variant="secondary" onClick={() => changeDirection("down")}>Down</Button>
              <Button variant="secondary" onClick={() => changeDirection("right")}>Right</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-6">
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
