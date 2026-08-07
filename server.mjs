import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);
const AWC = 'https://aviationweather.gov/api/data';
const FAA_TFR_JSON = 'https://tfr.faa.gov/tfr3/export/json';
const FAA_TFR_XML = 'https://tfr.faa.gov/tfr3/export/xml';
const cache = new Map();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function json(res, statusCode, value, headers = {}) {
  const body = JSON.stringify(value);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(body);
}

function cleanIds(input = '') {
  return [...new Set(String(input).toUpperCase().split(/[\s,]+/).filter(id => /^[A-Z0-9]{3,5}$/.test(id)))].slice(0, 12);
}

function cleanNumber(value, min, max, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

async function cachedFetch(url, ttlMs = 60_000, accept = 'application/json,text/plain;q=0.8,*/*;q=0.5') {
  const existing = cache.get(url);
  const now = Date.now();
  if (existing && existing.expires > now) return existing.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: accept,
        'User-Agent': 'AeroBrief-RealWorld-PWA/2.0 (+https://github.com/)'
      }
    });
    if (response.status === 204) return [];
    if (!response.ok) throw new Error(`Upstream ${response.status} from ${new URL(url).hostname}`);
    const contentType = response.headers.get('content-type') || '';
    let value;
    if (contentType.includes('json')) value = await response.json();
    else value = await response.text();
    cache.set(url, { expires: now + ttlMs, value });
    return value;
  } finally {
    clearTimeout(timer);
  }
}

function parseBbox(value) {
  const nums = String(value || '').split(',').map(Number);
  if (nums.length !== 4 || nums.some(n => !Number.isFinite(n))) return null;
  const [lat0, lon0, lat1, lon1] = nums;
  if ([lat0, lat1].some(n => n < -90 || n > 90) || [lon0, lon1].some(n => n < -180 || n > 180)) return null;
  return {
    minLat: Math.min(lat0, lat1), maxLat: Math.max(lat0, lat1),
    minLon: Math.min(lon0, lon1), maxLon: Math.max(lon0, lon1)
  };
}

function itemCoords(item) {
  const points = [];
  if (Array.isArray(item?.coords)) {
    for (const p of item.coords) {
      const lat = Number(p?.lat ?? p?.latitude);
      const lon = Number(p?.lon ?? p?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) points.push({ lat, lon });
    }
  }
  const lat = Number(item?.lat ?? item?.latitude);
  const lon = Number(item?.lon ?? item?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) points.push({ lat, lon });
  return points;
}

function inBbox(item, bbox) {
  if (!bbox) return true;
  const coords = itemCoords(item);
  if (!coords.length) return true;
  return coords.some(({ lat, lon }) => lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon);
}

function xmlText(text, tag) {
  const match = text.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

function parseTfrXml(xml) {
  const blocks = String(xml).match(/<TfrEntry[\s\S]*?<\/TfrEntry>|<Notam[\s\S]*?<\/Notam>/gi) || [];
  return blocks.map(block => ({
    notam: xmlText(block, 'NotamNumber') || xmlText(block, 'NOTAM'),
    type: xmlText(block, 'Type') || xmlText(block, 'TfrType'),
    state: xmlText(block, 'State'),
    location: xmlText(block, 'Location'),
    facility: xmlText(block, 'Facility'),
    effective: xmlText(block, 'EffectiveDate') || xmlText(block, 'BeginningDate'),
    expires: xmlText(block, 'ExpireDate') || xmlText(block, 'EndingDate'),
    detailUrl: xmlText(block, 'NotamDetail') || xmlText(block, 'DetailURL'),
    description: xmlText(block, 'Description') || xmlText(block, 'Reason')
  })).filter(item => item.notam || item.location || item.detailUrl);
}

function normalizeTfrJson(raw) {
  const array = Array.isArray(raw) ? raw : raw?.features || raw?.items || raw?.data || [];
  return array.map(item => {
    const p = item?.properties || item || {};
    return {
      notam: p.notam || p.NOTAM || p.notamNumber || p.NOTAM_NUMBER || p.number || '',
      type: p.type || p.TYPE || p.tfrType || '',
      state: p.state || p.STATE || '',
      location: p.location || p.LOCATION || p.city || '',
      facility: p.facility || p.FACILITY || '',
      effective: p.effective || p.EFFECTIVE || p.beginningDate || p.start || '',
      expires: p.expires || p.EXPIRES || p.endingDate || p.end || '',
      detailUrl: p.detailUrl || p.NOTAM_DETAIL || p.url || '',
      description: p.description || p.DESCRIPTION || p.reason || '',
      geometry: item?.geometry || null
    };
  }).filter(item => item.notam || item.location || item.detailUrl);
}

function tfrNearBbox(item, bbox) {
  if (!bbox || !item?.geometry) return true;
  const coordinates = item.geometry.coordinates;
  const flattened = JSON.stringify(coordinates).match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  for (let i = 0; i + 1 < flattened.length; i += 2) {
    const lon = flattened[i];
    const lat = flattened[i + 1];
    if (lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon) return true;
  }
  return false;
}

async function getTfrs() {
  try {
    const raw = await cachedFetch(FAA_TFR_JSON, 60_000, 'application/json,text/plain;q=0.9,*/*;q=0.5');
    if (typeof raw === 'object') return normalizeTfrJson(raw);
    const parsed = JSON.parse(raw);
    return normalizeTfrJson(parsed);
  } catch (jsonError) {
    const xml = await cachedFetch(FAA_TFR_XML, 60_000, 'application/xml,text/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5');
    const parsed = parseTfrXml(xml);
    if (!parsed.length) throw jsonError;
    return parsed;
  }
}

async function handleApi(req, res, url) {
  try {
    if (url.pathname === '/api/health') {
      return json(res, 200, {
        ok: true,
        service: 'aerobrief-realworld',
        version: '2.0.0',
        time: new Date().toISOString(),
        sources: ['FAA Aviation Weather Center', 'FAA TFR', 'FAA Flight Service links']
      });
    }

    if (url.pathname === '/api/airport') {
      const ids = cleanIds(url.searchParams.get('ids'));
      if (!ids.length) return json(res, 400, { error: 'Provide one or more valid airport identifiers.' });
      const data = await cachedFetch(`${AWC}/airport?ids=${encodeURIComponent(ids.join(','))}&format=json`, 12 * 60 * 60_000);
      return json(res, 200, {
        airports: Array.isArray(data) ? data : [],
        source: 'FAA Aviation Weather Center airport data service',
        sourceUrl: 'https://aviationweather.gov/data/api/',
        fetchedAt: new Date().toISOString()
      });
    }

    if (url.pathname === '/api/weather') {
      const ids = cleanIds(url.searchParams.get('ids'));
      if (!ids.length) return json(res, 400, { error: 'Provide one or more valid airport identifiers.' });
      const joined = encodeURIComponent(ids.join(','));
      const [metars, tafs] = await Promise.all([
        cachedFetch(`${AWC}/metar?ids=${joined}&format=json`, 45_000),
        cachedFetch(`${AWC}/taf?ids=${joined}&format=json`, 4 * 60_000)
      ]);
      return json(res, 200, {
        metars: Array.isArray(metars) ? metars : [],
        tafs: Array.isArray(tafs) ? tafs : [],
        source: 'NOAA/NWS aviation weather distributed by FAA Aviation Weather Center',
        sourceUrl: 'https://aviationweather.gov/data/api/',
        fetchedAt: new Date().toISOString()
      });
    }

    if (url.pathname === '/api/hazards') {
      const bbox = parseBbox(url.searchParams.get('bbox'));
      if (!bbox) return json(res, 400, { error: 'A valid bbox=lat0,lon0,lat1,lon1 is required.' });
      const level = cleanNumber(url.searchParams.get('level'), 0, 60000, 0);
      const bboxText = [bbox.minLat, bbox.minLon, bbox.maxLat, bbox.maxLon].join(',');
      const levelQuery = level ? `&level=${level}` : '';
      const settled = await Promise.allSettled([
        cachedFetch(`${AWC}/airsigmet?format=json${levelQuery}`, 60_000),
        cachedFetch(`${AWC}/gairmet?format=json`, 60_000),
        cachedFetch(`${AWC}/pirep?bbox=${encodeURIComponent(bboxText)}&format=json&age=6${levelQuery}`, 60_000)
      ]);
      const value = index => settled[index].status === 'fulfilled' && Array.isArray(settled[index].value) ? settled[index].value : [];
      return json(res, 200, {
        sigmets: value(0).filter(item => inBbox(item, bbox)).slice(0, 80),
        gairmets: value(1).filter(item => inBbox(item, bbox)).slice(0, 100),
        pireps: value(2).slice(0, 120),
        source: 'FAA Aviation Weather Center',
        sourceUrl: 'https://aviationweather.gov/data/api/',
        fetchedAt: new Date().toISOString()
      });
    }

    if (url.pathname === '/api/tfr') {
      const bbox = parseBbox(url.searchParams.get('bbox'));
      const all = await getTfrs();
      return json(res, 200, {
        tfrs: all.filter(item => tfrNearBbox(item, bbox)).slice(0, 200),
        source: 'FAA Graphic TFR service',
        sourceUrl: 'https://tfr.faa.gov/',
        fetchedAt: new Date().toISOString()
      });
    }

    if (url.pathname === '/api/source-status') {
      return json(res, 200, {
        fetchedAt: new Date().toISOString(),
        sources: [
          { id: 'weather', name: 'FAA Aviation Weather Center', mode: 'embedded', url: 'https://aviationweather.gov/', products: ['METAR', 'TAF', 'SIGMET', 'G-AIRMET', 'PIREP'] },
          { id: 'tfr', name: 'FAA Graphic TFR', mode: 'embedded', url: 'https://tfr.faa.gov/', products: ['TFR list and detail links'] },
          { id: 'notam', name: 'FAA NOTAM Search / Flight Service', mode: 'official-link', url: 'https://notams.aim.faa.gov/notamSearch/', products: ['NOTAM'] },
          { id: 'briefing', name: 'FAA Flight Service (Leidos)', mode: 'official-link', url: 'https://www.1800wxbrief.com/', products: ['Recorded briefing', 'flight-plan filing', 'alerts'] },
          { id: 'aero', name: 'FAA Aeronautical Information Services', mode: 'reference', url: 'https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/', products: ['NASR', 'CIFP', 'airport/runway data'] }
        ]
      });
    }

    return json(res, 404, { error: 'API endpoint not found.' });
  } catch (error) {
    console.error(error);
    return json(res, 502, {
      error: error?.name === 'AbortError' ? 'The authoritative upstream service timed out.' : (error?.message || 'Authoritative upstream request failed.')
    });
  }
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const requested = path.normalize(path.join(publicDir, pathname));
  if (!requested.startsWith(publicDir)) return json(res, 403, { error: 'Forbidden' });

  let filePath = requested;
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(publicDir, 'index.html');
  }

  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const isShell = ['.html', '.js', '.css', '.webmanifest'].includes(ext);
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': isShell ? 'no-cache' : 'public, max-age=604800, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    });
    if (req.method === 'HEAD') return res.end();
    res.end(body);
  } catch {
    json(res, 404, { error: 'Not found' });
  }
}

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method || '')) return json(res, 405, { error: 'Method not allowed.' });
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return serveStatic(req, res, url);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`AeroBrief RealWorld listening on http://0.0.0.0:${port}`);
});
