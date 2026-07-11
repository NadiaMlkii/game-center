import { NextRequest, NextResponse } from "next/server";

import { getPool } from "@/lib/db";

type SnakeScoreRequest = {
  username?: unknown;
  score?: unknown;
  dots?: unknown;
};

const GAME = "snake";
const MAX_USERNAME_LENGTH = 40;

export const runtime = "nodejs";

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
            dots,
            played_at AS "playedAt"
          FROM game_scores
          WHERE game = $1
          ORDER BY username, score DESC, dots DESC, played_at ASC
        `,
        [GAME],
      ),
      username
        ? getPool().query(
            `
              SELECT username, score, dots, played_at AS "playedAt"
              FROM game_scores
              WHERE game = $1 AND username = $2
              ORDER BY score DESC, dots DESC, played_at ASC
              LIMIT 1
            `,
            [GAME, username],
          )
        : Promise.resolve({ rows: [] }),
    ]);

    return NextResponse.json({
      playerBest: playerBestResult.rows[0] ?? null,
      scores: leaderboardResult.rows.sort((a, b) => b.score - a.score || b.dots - a.dots).slice(0, 10),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load Snake scores." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: SnakeScoreRequest;

  try {
    body = (await request.json()) as SnakeScoreRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim().slice(0, MAX_USERNAME_LENGTH) : "";
  const score = typeof body.score === "number" ? Math.trunc(body.score) : NaN;
  const dots = typeof body.dots === "number" ? Math.trunc(body.dots) : NaN;

  if (!username || !Number.isFinite(score) || !Number.isFinite(dots) || score < 0 || dots < 0) {
    return NextResponse.json({ error: "Username, score, and dots are required." }, { status: 400 });
  }

  try {
    await ensureScoresTable();

    const { rows } = await getPool().query(
      `
        INSERT INTO game_scores (game, username, score, dots)
        VALUES ($1, $2, $3, $4)
        RETURNING username, score, dots, played_at AS "playedAt"
      `,
      [GAME, username, score, dots],
    );

    return NextResponse.json({ score: rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not save Snake score." }, { status: 500 });
  }
}
