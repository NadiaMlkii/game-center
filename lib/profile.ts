export type PlayerProfile = {
  username: string;
};

export const PLAYER_PROFILE_KEY = "game-center-player-profile";

export function loadPlayerProfile(): PlayerProfile | null {
  if (typeof window === "undefined") return null;

  const saved = window.localStorage.getItem(PLAYER_PROFILE_KEY);
  return saved ? (JSON.parse(saved) as PlayerProfile) : null;
}

export function savePlayerProfile(profile: PlayerProfile) {
  window.localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
}

export function clearPlayerProfile() {
  window.localStorage.removeItem(PLAYER_PROFILE_KEY);
}
