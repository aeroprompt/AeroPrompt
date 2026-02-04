import type { PilotProfile } from "./storage";

export type FlightInput = {
  departure: string;
  destination: string;
  when: string; // ISO-ish string
  isNight: boolean;

  // Lite mode: user-provided conditions
  windCross: number; // kt
  ceiling: number;   // ft
  visibility: number;// sm
  gustSpread: number;// kt
};

export type Decision = {
  status: "GO" | "CAUTION" | "NO-GO";
  score: number;
  titleLine: string;
  bullets: string[];
  tech: {
    inputs: FlightInput;
    profile: PilotProfile;
    rulesTriggered: Array<{ rule: string; points: number; note: string }>;
  };
};

function clampICAO(s: string) {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function makeDecision(profile: PilotProfile, flight: FlightInput): Decision {
  const name = (profile.nickname && profile.nickname.trim()) ? profile.nickname.trim() : profile.fullName.trim().split(" ")[0] || "Friend";
  const rules: Array<{ rule: string; points: number; note: string }> = [];

  const cross = flight.windCross;
  const ceil = flight.ceiling;
  const vis = flight.visibility;
  const gust = flight.gustSpread;

  // Hard limit checks
  if (cross > profile.mins.maxCrosswind) {
    rules.push({ rule: "Crosswind above your max", points: 3, note: `Crosswind ${cross}kt > your max ${profile.mins.maxCrosswind}kt.` });
  } else if (cross >= Math.max(0, profile.mins.maxCrosswind - 3)) {
    rules.push({ rule: "Crosswind near your max", points: 2, note: `Crosswind ${cross}kt is close to your max ${profile.mins.maxCrosswind}kt.` });
  } else if (cross >= Math.max(0, profile.mins.maxCrosswind - 5)) {
    rules.push({ rule: "Crosswind worth a second look", points: 1, note: `Crosswind ${cross}kt is getting sporty for your limit ${profile.mins.maxCrosswind}kt.` });
  }

  if (ceil < profile.mins.minCeiling) {
    rules.push({ rule: "Ceiling below your min", points: 3, note: `Ceiling ${ceil}ft < your min ${profile.mins.minCeiling}ft.` });
  } else if (ceil <= profile.mins.minCeiling + 500) {
    rules.push({ rule: "Ceiling close to your min", points: 2, note: `Ceiling ${ceil}ft is close to your min ${profile.mins.minCeiling}ft.` });
  } else if (ceil <= profile.mins.minCeiling + 1000) {
    rules.push({ rule: "Ceiling: mild caution", points: 1, note: `Ceiling ${ceil}ft is within 1000ft of your min ${profile.mins.minCeiling}ft.` });
  }

  if (vis < profile.mins.minVis) {
    rules.push({ rule: "Visibility below your min", points: 3, note: `Visibility ${vis}sm < your min ${profile.mins.minVis}sm.` });
  } else if (vis <= profile.mins.minVis + 1) {
    rules.push({ rule: "Visibility close to your min", points: 2, note: `Visibility ${vis}sm is close to your min ${profile.mins.minVis}sm.` });
  } else if (vis <= profile.mins.minVis + 2) {
    rules.push({ rule: "Visibility: mild caution", points: 1, note: `Visibility ${vis}sm is within 2sm of your min ${profile.mins.minVis}sm.` });
  }

  if (gust > profile.mins.maxGustSpread) {
    rules.push({ rule: "Gust spread above your max", points: 2, note: `Gust spread ${gust}kt > your max ${profile.mins.maxGustSpread}kt.` });
  } else if (gust >= Math.max(0, profile.mins.maxGustSpread - 2)) {
    rules.push({ rule: "Gust spread near your max", points: 1, note: `Gust spread ${gust}kt is close to your max ${profile.mins.maxGustSpread}kt.` });
  }

  // Currency / recency
  if (flight.isNight && !profile.currency.nightPassengerCurrent) {
    rules.push({ rule: "Not night-passenger current", points: 3, note: "You marked that you're not night-passenger current." });
  }

  if (profile.currency.lastFlightDaysAgo >= 60) {
    rules.push({ rule: "Long time since last flight", points: 2, note: `Last flight ${profile.currency.lastFlightDaysAgo} days ago.` });
  } else if (profile.currency.lastFlightDaysAgo >= 30) {
    rules.push({ rule: "A little rusty", points: 1, note: `Last flight ${profile.currency.lastFlightDaysAgo} days ago.` });
  }

  // Experience modifier
  if (profile.totalHours < 100) {
    rules.push({ rule: "Low total time (extra buffer)", points: 1, note: `Total time ${profile.totalHours}h. I add a little buffer for newer pilots.` });
  }
  if (profile.hours90 < 10) {
    rules.push({ rule: "Low recent time", points: 1, note: `Only ${profile.hours90}h in the last 90 days.` });
  }

  const score = rules.reduce((a, r) => a + r.points, 0);

  let status: Decision["status"] = "GO";
  if (score >= 6) status = "NO-GO";
  else if (score >= 3) status = "CAUTION";

  const bullets = rules
    .sort((a, b) => b.points - a.points)
    .slice(0, 6)
    .map(r => r.note);

  let titleLine = `${name}, I like this one.`;
  if (status === "CAUTION") titleLine = `${name}, this one’s flyable, but it’s pushing your usual comfort zone.`;
  if (status === "NO-GO") titleLine = `${name}, I’d call this a no-go based on your limits.`;

  return {
    status,
    score,
    titleLine,
    bullets: bullets.length ? bullets : ["Nothing here jumps out as a problem based on what you entered."],
    tech: {
      inputs: { ...flight, departure: clampICAO(flight.departure), destination: clampICAO(flight.destination) },
      profile,
      rulesTriggered: rules,
    },
  };
}
