import { NextRequest, NextResponse } from "next/server";

import { getPool } from "@/lib/db";

type MemoryScoreRequest = {
  username?: unknown;
  moves?: unknown;
  seconds?: unknown;
};

const GAME = "memory-match";
const MAX_USERNAME_LENGTH = 40;

export const runtime = "nodejs";

function calculateMemoryScore(moves: number, seconds: number) {
  return Math.max(0, 10000 - moves * 100 - seconds * 10);
}

async function ensureScoresTable() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS game_scores (
      id BIGSERIAL PRIMARY KEY,
      game TEXT NOT NULL,
      username TEXT NOT NULL,
      score INTEGER NOT NULL,
      moves INTEGER,
      seconds INTEGER,
      dots INTEGER,
      played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE game_scores
      ADD COLUMN IF NOT EXISTS dots INTEGER;

    CREATE INDEX IF NOT EXISTS game_scores_game_score_idx
      ON game_scores (game, score DESC, seconds ASC, moves ASC, played_at ASC);
  `);
}

export async function GET(request: NextRequest) {
  try {
    await ensureScoresTable();
    const username = request.nextUrl.searchParams.get("username")?.trim().slice(0, MAX_USERNAME_LENGTH) ?? "";

    const [leaderboardResult, playerBestResult] = await Promise.all([
      getPool().query(
        `
          SELECT DISTINCT ON (username)
            username,
            score,
            moves,
            seconds,
            played_at AS "playedAt"
          FROM game_scores
          WHERE game = $1
          ORDER BY username, score DESC, seconds ASC, moves ASC, played_at ASC
        `,
        [GAME],
      ),
      username
        ? getPool().query(
            `
              SELECT username, score, moves, seconds, played_at AS "playedAt"
              FROM game_scores
              WHERE game = $1 AND username = $2
              ORDER BY score DESC, seconds ASC, moves ASC, played_at ASC
              LIMIT 1
            `,
            [GAME, username],
          )
        : Promise.resolve({ rows: [] }),
    ]);

    return NextResponse.json({
      playerBest: playerBestResult.rows[0] ?? null,
      scores: leaderboardResult.rows
        .sort((a, b) => b.score - a.score || a.seconds - b.seconds || a.moves - b.moves)
        .slice(0, 10),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load memory scores." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: MemoryScoreRequest;

  try {
    body = (await request.json()) as MemoryScoreRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim().slice(0, MAX_USERNAME_LENGTH) : "";
  const moves = typeof body.moves === "number" ? Math.trunc(body.moves) : NaN;
  const seconds = typeof body.seconds === "number" ? Math.trunc(body.seconds) : NaN;

  if (!username || !Number.isFinite(moves) || !Number.isFinite(seconds) || moves < 1 || seconds < 0) {
    return NextResponse.json({ error: "Username, moves, and seconds are required." }, { status: 400 });
  }

  try {
    await ensureScoresTable();

    const score = calculateMemoryScore(moves, seconds);
    const { rows } = await getPool().query(
      `
        INSERT INTO game_scores (game, username, score, moves, seconds)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING username, score, moves, seconds, played_at AS "playedAt"
      `,
      [GAME, username, score, moves, seconds],
    );

    return NextResponse.json({ score: rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not save memory score." }, { status: 500 });
  }
}
