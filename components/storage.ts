export type Certificate = "Student" | "PPL" | "IR" | "CPL";

export type PilotProfile = {
  fullName: string;
  nickname?: string;
  certificate: Certificate;
  totalHours: number;
  hours90: number;
  typicalAircraft: string;
  mins: {
    maxCrosswind: number; // kt
    minCeiling: number;   // ft
    minVis: number;       // sm
    maxGustSpread: number;// kt
  };
  currency: {
    nightPassengerCurrent: boolean;
    lastFlightDaysAgo: number; // simple proxy for recency
  };
};

const KEY = "pilotready.profile.v1";

export function loadProfile(): PilotProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PilotProfile;
  } catch {
    return null;
  }
}

export function saveProfile(p: PilotProfile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}
