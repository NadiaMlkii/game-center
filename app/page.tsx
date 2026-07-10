import Link from "next/link";
import { Brain, ChevronRight, Gamepad2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
              Two lightweight browser games built for mobile first, with simple routes and no background work until you open a game.
            </p>
          </div>
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
