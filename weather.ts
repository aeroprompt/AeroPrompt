export type MetarParse = {
  raw: string;
  station?: string;
  windDir?: number | null;
  windSpeed?: number | null;
  gust?: number | null;
  visibilitySM?: number | null;
  ceilingFT?: number | null; // lowest BKN/OVC/VV layer
};

// Very small "good enough" METAR parser for the MVP.
// Handles common formats like: 21012G18KT 10SM BKN020 OVC035 ...
// If parsing fails, fields will be null and you can still show raw text.
export function parseMetar(raw: string): MetarParse {
  const out: MetarParse = { raw, windDir: null, windSpeed: null, gust: null, visibilitySM: null, ceilingFT: null };

  const tokens = raw.trim().split(/\s+/);
  if (tokens.length < 2) return out;

  const station = tokens[0]?.toUpperCase();
  if (/^[A-Z]{4}$/.test(station)) out.station = station;

  const windTok = tokens.find(t => /^(VRB|\d{3})\d{2,3}(G\d{2,3})?KT$/.test(t));
  if (windTok) {
    const m = windTok.match(/^(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT$/);
    if (m) {
      out.windDir = m[1] === "VRB" ? null : Number(m[1]);
      out.windSpeed = Number(m[2]);
      out.gust = m[3] ? Number(m[3]) : null;
    }
  }

  let visSM: number | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^\d{1,2}SM$/.test(t)) {
      visSM = Number(t.replace("SM", ""));
      break;
    }
    if (/^\d\/\dSM$/.test(t)) {
      const [a,b] = t.replace("SM","").split("/").map(Number);
      if (b) visSM = a / b;
      break;
    }
    if (/^\d{1,2}$/.test(t) && i+1 < tokens.length && /^\d\/\dSM$/.test(tokens[i+1])) {
      const whole = Number(t);
      const [a,b] = tokens[i+1].replace("SM","").split("/").map(Number);
      if (b) visSM = whole + (a/b);
      break;
    }
  }
  out.visibilitySM = visSM;

  const layers = tokens.filter(t => /^(BKN|OVC|VV)\d{3}$/.test(t));
  let ceil: number | null = null;
  for (const l of layers) {
    const h = Number(l.slice(3));
    const ft = h * 100;
    if (!ceil || ft < ceil) ceil = ft;
  }
  out.ceilingFT = ceil;

  return out;
}

export async function fetchLatestMetar(icao: string): Promise<string | null> {
  const id = icao.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (!id) return null;

  const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(id)}&format=json`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json();
  if (Array.isArray(data) && data.length) {
    const row = data[0];
    return (row?.rawOb ?? row?.raw_text ?? row?.raw ?? row?.text) ?? null;
  }
  return null;
}

export async function fetchLatestTaf(icao: string): Promise<string | null> {
  const id = icao.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (!id) return null;

  const url = `https://aviationweather.gov/api/data/taf?ids=${encodeURIComponent(id)}&format=json`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json();
  if (Array.isArray(data) && data.length) {
    const row = data[0];
    return (row?.rawTAF ?? row?.raw_text ?? row?.raw ?? row?.text) ?? null;
  }
  return null;
}
