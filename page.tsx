"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button, Input, Label, SecondaryButton, Select, Pill } from "@/components/ui";
import { clearProfile, loadProfile, saveProfile, type PilotProfile } from "@/components/storage";
import { makeDecision, type FlightInput, type Decision } from "@/components/scoring";
import { fetchLatestMetar, fetchLatestTaf, parseMetar } from "@/components/weather";

type View = "home" | "profile" | "flight" | "result";

const defaultProfile: PilotProfile = {
  fullName: "",
  nickname: "",
  certificate: "PPL",
  totalHours: 80,
  hours90: 6,
  typicalAircraft: "C172",
  mins: { maxCrosswind: 10, minCeiling: 2000, minVis: 5, maxGustSpread: 8 },
  currency: { nightPassengerCurrent: true, lastFlightDaysAgo: 14 },
};

const defaultFlight: FlightInput = {
  departure: "",
  destination: "",
  when: "",
  isNight: false,
  windCross: 6,
  ceiling: 3500,
  visibility: 10,
  gustSpread: 4,
};

export default function Page() {
  const [view, setView] = useState<View>("home");
  const [profile, setProfile] = useState<PilotProfile>(defaultProfile);
  const [flight, setFlight] = useState<FlightInput>(defaultFlight);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [showTech, setShowTech] = useState(false);
const [wxLoading, setWxLoading] = useState(false);
const [wxError, setWxError] = useState<string | null>(null);
const [depMetar, setDepMetar] = useState<string>("");
const [destMetar, setDestMetar] = useState<string>("");
const [depTaf, setDepTaf] = useState<string>("");
const [destTaf, setDestTaf] = useState<string>("");

  useEffect(() => {
    const p = loadProfile();
    if (p) setProfile(p);
  }, []);

  const hasProfile = useMemo(() => {
    return Boolean(profile.fullName && profile.fullName.trim().length >= 2);
  }, [profile.fullName]);

  function start() {
    setView(hasProfile ? "flight" : "profile");
  }

  function saveAndContinue() {
    saveProfile(profile);
    setView("flight");
  }

  async function autoFillFromWeather() {
  setWxLoading(true);
  setWxError(null);
  try {
    const dep = flight.departure.trim();
    const dst = flight.destination.trim();
    if (!dep || !dst) {
      setWxError("Add both departure and destination ICAOs first.");
      return;
    }

    const [m1, m2, t1, t2] = await Promise.all([
      fetchLatestMetar(dep),
      fetchLatestMetar(dst),
      fetchLatestTaf(dep),
      fetchLatestTaf(dst),
    ]);

    setDepMetar(m1 ?? "");
    setDestMetar(m2 ?? "");
    setDepTaf(t1 ?? "");
    setDestTaf(t2 ?? "");

    const parsed = m1 ? parseMetar(m1) : null;

    const windSpeed = parsed?.windSpeed ?? flight.windCross;
    const gust = parsed?.gust ?? null;

    const gustSpread = gust !== null ? Math.max(0, gust - windSpeed) : flight.gustSpread;
    const ceiling = parsed?.ceilingFT ?? flight.ceiling;
    const vis = parsed?.visibilitySM ?? flight.visibility;

    setFlight((f) => ({
      ...f,
      windCross: windSpeed,
      gustSpread,
      ceiling,
      visibility: vis,
    }));
  } catch (e: any) {
    setWxError("Couldn’t fetch weather right now. Try again in a minute.");
  } finally {
    setWxLoading(false);
  }
}

function runDecision() {
    const d = makeDecision(profile, flight);
    setDecision(d);
    setShowTech(false);
    setView("result");
  }

  return (
    <main className="space-y-4">
      {view === "home" && (
        <>
          <Card>
            <div className="text-2xl font-semibold leading-tight">Am I safe to fly today?</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              I’ll help you decide based on <span className="font-medium">your</span> experience and personal minimums.
              This Lite version uses the conditions you enter (perfect for early testing).
            </p>
            <div className="mt-4 space-y-2">
              <Button onClick={start}>{hasProfile ? "New flight check" : "Set up my pilot profile"}</Button>
              {hasProfile && (
                <SecondaryButton onClick={() => setView("profile")}>Edit my profile</SecondaryButton>
              )}
            </div>
          </Card>

          <Card>
            <div className="text-sm font-semibold">What’s next?</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              <li>Test with pilots fast (send a link).</li>
              <li>Later: auto-fetch METAR/TAF + login + history sync.</li>
              <li>Then: App Store.</li>
            </ul>
          </Card>
        </>
      )}

      {view === "profile" && (
        <Card>
          <div className="text-lg font-semibold">Let’s get to know you</div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <Label>Full name</Label>
              <Input value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} placeholder="Jason Denisyuk" />
            </div>
            <div>
              <Label>Nickname (optional)</Label>
              <Input value={profile.nickname ?? ""} onChange={(e) => setProfile({ ...profile, nickname: e.target.value })} placeholder="Captain J" />
            </div>
            <div>
              <Label>Certificate</Label>
              <Select value={profile.certificate} onChange={(e) => setProfile({ ...profile, certificate: e.target.value as any })}>
                <option>Student</option>
                <option>PPL</option>
                <option>IR</option>
                <option>CPL</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total hours</Label>
                <Input type="number" value={profile.totalHours} onChange={(e) => setProfile({ ...profile, totalHours: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Hours last 90 days</Label>
                <Input type="number" value={profile.hours90} onChange={(e) => setProfile({ ...profile, hours90: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <Label>Typical aircraft</Label>
              <Input value={profile.typicalAircraft} onChange={(e) => setProfile({ ...profile, typicalAircraft: e.target.value })} placeholder="C172" />
            </div>

            <div className="pt-2 text-sm font-semibold">Personal minimums</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max crosswind (kt)</Label>
                <Input type="number" value={profile.mins.maxCrosswind} onChange={(e) => setProfile({ ...profile, mins: { ...profile.mins, maxCrosswind: Number(e.target.value) } })} />
              </div>
              <div>
                <Label>Max gust spread (kt)</Label>
                <Input type="number" value={profile.mins.maxGustSpread} onChange={(e) => setProfile({ ...profile, mins: { ...profile.mins, maxGustSpread: Number(e.target.value) } })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min ceiling (ft)</Label>
                <Input type="number" value={profile.mins.minCeiling} onChange={(e) => setProfile({ ...profile, mins: { ...profile.mins, minCeiling: Number(e.target.value) } })} />
              </div>
              <div>
                <Label>Min visibility (sm)</Label>
                <Input type="number" value={profile.mins.minVis} onChange={(e) => setProfile({ ...profile, mins: { ...profile.mins, minVis: Number(e.target.value) } })} />
              </div>
            </div>

            <div className="pt-2 text-sm font-semibold">Currency (Lite)</div>

            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={profile.currency.nightPassengerCurrent}
                onChange={(e) => setProfile({ ...profile, currency: { ...profile.currency, nightPassengerCurrent: e.target.checked } })}
              />
              I’m night-passenger current
            </label>

            <div>
              <Label>Days since last flight</Label>
              <Input
                type="number"
                value={profile.currency.lastFlightDaysAgo}
                onChange={(e) => setProfile({ ...profile, currency: { ...profile.currency, lastFlightDaysAgo: Number(e.target.value) } })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <SecondaryButton onClick={() => { clearProfile(); setProfile(defaultProfile); }}>Reset</SecondaryButton>
              <Button onClick={saveAndContinue} disabled={!profile.fullName.trim()}>
                Save & continue
              </Button>
            </div>

            <SecondaryButton onClick={() => setView("home")}>Back</SecondaryButton>
          </div>
        </Card>
      )}

      {view === "flight" && (
        <Card>
          <div className="text-lg font-semibold">Tell me about your flight</div>
          <p className="mt-1 text-xs text-zinc-600">Lite mode: enter the conditions you’re expecting.</p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Departure (ICAO)</Label>
                <Input value={flight.departure} onChange={(e) => setFlight({ ...flight, departure: e.target.value })} placeholder="KCGF" />
              </div>
              <div>
                <Label>Destination (ICAO)</Label>
                <Input value={flight.destination} onChange={(e) => setFlight({ ...flight, destination: e.target.value })} placeholder="KAKR" />
              </div>
            </div>

            <div>
              <Label>Planned departure time (optional)</Label>
              <Input value={flight.when} onChange={(e) => setFlight({ ...flight, when: e.target.value })} placeholder="2026-01-27 14:30" />
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input type="checkbox" checked={flight.isNight} onChange={(e) => setFlight({ ...flight, isNight: e.target.checked })} />
              Night flight
            </label>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
  <div className="text-xs font-semibold text-zinc-700">Weather (optional)</div>
  <p className="mt-1 text-xs text-zinc-600">
    Tap to auto-fill using the latest METAR/TAF from AviationWeather.gov. You can still override anything.
  </p>
  {wxError && <div className="mt-2 text-xs font-semibold text-red-600">{wxError}</div>}
  <div className="mt-2">
    <button
      type="button"
      onClick={autoFillFromWeather}
      disabled={wxLoading}
      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm disabled:opacity-50"
    >
      {wxLoading ? "Fetching weather…" : "Auto-fill from METAR/TAF"}
    </button>
  </div>

  {(depMetar || destMetar) && (
    <div className="mt-3 space-y-2">
      {depMetar && (
        <div>
          <div className="text-[11px] font-semibold text-zinc-700">Departure METAR</div>
          <div className="mt-1 rounded-xl border border-zinc-200 bg-white p-2 text-[11px] text-zinc-800">{depMetar}</div>
        </div>
      )}
      {destMetar && (
        <div>
          <div className="text-[11px] font-semibold text-zinc-700">Destination METAR</div>
          <div className="mt-1 rounded-xl border border-zinc-200 bg-white p-2 text-[11px] text-zinc-800">{destMetar}</div>
        </div>
      )}
      {(depTaf || destTaf) && (
        <button
          type="button"
          onClick={() => alert(
            (depTaf ? `DEP TAF:\n${depTaf}\n\n` : '') + (destTaf ? `DEST TAF:\n${destTaf}` : '')
          )}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-900"
        >
          View TAFs
        </button>
      )}
      <div className="text-[11px] text-zinc-600">
        Note: crosswind is approximated from wind speed in this MVP. We’ll compute real crosswind with runway data later.
      </div>
    </div>
  )}
</div>

<div className="pt-2 text-sm font-semibold">Conditions</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Crosswind (kt)</Label>
                <Input type="number" value={flight.windCross} onChange={(e) => setFlight({ ...flight, windCross: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Gust spread (kt)</Label>
                <Input type="number" value={flight.gustSpread} onChange={(e) => setFlight({ ...flight, gustSpread: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ceiling (ft)</Label>
                <Input type="number" value={flight.ceiling} onChange={(e) => setFlight({ ...flight, ceiling: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Visibility (sm)</Label>
                <Input type="number" value={flight.visibility} onChange={(e) => setFlight({ ...flight, visibility: Number(e.target.value) })} />
              </div>
            </div>

            <Button onClick={runDecision} disabled={!hasProfile}>Check this flight</Button>

            <div className="grid grid-cols-2 gap-3">
              <SecondaryButton onClick={() => setView("profile")}>Edit profile</SecondaryButton>
              <SecondaryButton onClick={() => setView("home")}>Home</SecondaryButton>
            </div>
          </div>
        </Card>
      )}

      {view === "result" && decision && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">My call</div>
            <Pill status={decision.status} />
          </div>

          <div className="mt-3 text-sm font-semibold">{decision.titleLine}</div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {decision.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <SecondaryButton onClick={() => setShowTech(s => !s)}>
              {showTech ? "Hide technical details" : "Show technical details"}
            </SecondaryButton>
            <Button onClick={() => setView("flight")}>New check</Button>
          </div>

          {showTech && (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs font-semibold text-zinc-700">Technical details (Lite)</div>
              <div className="mt-2 text-xs text-zinc-700">
                <div><span className="font-semibold">Score:</span> {decision.score}</div>
                <div className="mt-2 font-semibold">Triggered rules</div>
                <ul className="mt-1 list-disc pl-5">
                  {decision.tech.rulesTriggered.length ? decision.tech.rulesTriggered.map((r, i) => (
                    <li key={i}>{r.rule} (+{r.points}) — {r.note}</li>
                  )) : <li>No rules triggered.</li>}
                </ul>
                <div className="mt-2 font-semibold">Inputs</div>
                <pre className="mt-1 overflow-auto rounded-xl border border-zinc-200 bg-white p-2 text-[11px] leading-relaxed">
{JSON.stringify({ profile: decision.tech.profile, flight: decision.tech.inputs }, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <SecondaryButton className="mt-3" onClick={() => setView("home")}>Home</SecondaryButton>
        </Card>
      )}

      {view !== "home" && (
        <div className="text-center text-[11px] text-zinc-500">
          Tip: On iPhone/Android you can “Add to Home Screen” for an app-like experience.
        </div>
      )}
    </main>
  );
}
