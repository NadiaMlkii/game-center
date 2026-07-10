"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Brain, ChevronRight, Gamepad2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clearPlayerProfile, loadPlayerProfile, PlayerProfile, savePlayerProfile } from "@/lib/profile";

const games = [
  {
    title: "Snake",
    description: "Guide the snake, collect dots, and build your profile score history.",
    href: "/snake",
    icon: Gamepad2,
    accent: "from-emerald-400/25 to-lime-400/10",
    stats: "Keyboard + touch controls",
  },
  {
    title: "Memory Match",
    description: "Flip cards, remember positions, and find every matching pair.",
    href: "/memory",
    icon: Brain,
    accent: "from-fuchsia-400/25 to-sky-400/10",
    stats: "Fast mobile card play",
  },
];

export default function Home() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [username, setUsername] = useState("");

  useEffect(() => {
    setProfile(loadPlayerProfile());
  }, []);

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = username.trim();
    if (!trimmedName) return;

    const nextProfile = { username: trimmedName };
    savePlayerProfile(nextProfile);
    setProfile(nextProfile);
  }

  function logout() {
    clearPlayerProfile();
    setProfile(null);
    setUsername("");
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-primary/20 bg-card/90 shadow-2xl backdrop-blur">
          <CardHeader>
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Game Center
            </div>
            <CardTitle className="text-3xl">Enter your username</CardTitle>
            <CardDescription>Your name is used to keep scores for every game on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={login}>
              <Input autoFocus placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
              <Button className="w-full" type="submit">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border bg-card/70 p-5 shadow-2xl backdrop-blur sm:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Game Center
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Choose your game</h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Welcome, {profile.username}. Your scores are saved locally for each game.
            </p>
          </div>
          <Button className="w-full sm:w-auto" onClick={logout} variant="outline">
            Change user
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {games.map((game) => {
            const Icon = game.icon;

            return (
              <Link key={game.href} className="group block" href={game.href}>
                <Card className="h-full overflow-hidden border-primary/15 bg-slate-950/70 transition duration-200 group-hover:-translate-y-1 group-hover:border-primary/45 group-hover:shadow-2xl">
                  <div className={`h-28 bg-gradient-to-br ${game.accent} p-5`}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/70 ring-1 ring-white/10">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-2xl">
                      {game.title}
                      <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                    </CardTitle>
                    <CardDescription>{game.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{game.stats}</span>
                    <Button asChild size="sm">
                      <span>Play</span>
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
