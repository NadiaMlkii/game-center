export type LocalGameScore = {
  username: string;
  score: number;
  moves?: number;
  seconds?: number;
  dots?: number;
  playedAt: string;
};

const LOCAL_SCORES_KEY = "game-center-local-scores";

function readScores() {
  if (typeof window === "undefined") return {} as Record<string, LocalGameScore[]>;

  try {
    const saved = window.localStorage.getItem(LOCAL_SCORES_KEY);
    return saved ? (JSON.parse(saved) as Record<string, LocalGameScore[]>) : {};
  } catch {
    return {};
  }
}

function rankBestByPlayer(scores: LocalGameScore[]) {
  const bestByPlayer = new Map<string, LocalGameScore>();

  for (const score of scores) {
    const currentBest = bestByPlayer.get(score.username);
    const isBetter =
      !currentBest ||
      score.score > currentBest.score ||
      (score.score === currentBest.score && (score.seconds ?? Number.MAX_SAFE_INTEGER) < (currentBest.seconds ?? Number.MAX_SAFE_INTEGER)) ||
      (score.score === currentBest.score &&
        (score.seconds ?? Number.MAX_SAFE_INTEGER) === (currentBest.seconds ?? Number.MAX_SAFE_INTEGER) &&
        (score.moves ?? Number.MAX_SAFE_INTEGER) < (currentBest.moves ?? Number.MAX_SAFE_INTEGER));

    if (isBetter) bestByPlayer.set(score.username, score);
  }

  return [...bestByPlayer.values()]
    .sort((a, b) => b.score - a.score || (a.seconds ?? 0) - (b.seconds ?? 0) || (a.moves ?? 0) - (b.moves ?? 0))
    .slice(0, 10);
}

export function loadLocalScores(game: string) {
  return rankBestByPlayer(readScores()[game] ?? []);
}

export function saveLocalScore(game: string, score: LocalGameScore) {
  const scores = readScores();
  scores[game] = [score, ...(scores[game] ?? [])].slice(0, 200);
  window.localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(scores));
  return rankBestByPlayer(scores[game]);
}
