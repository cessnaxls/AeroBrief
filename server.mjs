import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);
const AWC = 'https://aviationweather.gov/api/data';
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
    ...headers
  });
  res.end(body);
}

function cleanIds(input = '') {
  return [...new Set(String(input).toUpperCase().split(/[\s,]+/).filter(id => /^[A-Z0-9]{3,4}$/.test(id)))].slice(0, 8);
}

function cleanUser(input = '') {
  const user = String(input).trim();
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(user)) return '';
  return user;
}

async function cachedFetch(url, ttlMs = 60_000) {
  const existing = cache.get(url);
  const now = Date.now();
  if (existing && existing.expires > now) return existing.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json,text/plain;q=0.8,*/*;q=0.5',
        'User-Agent': 'AeroBrief-Simulator-PWA/1.0'
      }
    });
    if (response.status === 204) return [];
    if (!response.ok) throw new Error(`Upstream ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    const value = contentType.includes('json') ? await response.json() : await response.text();
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
  if (Array.isArray(item?.coords)) {
    return item.coords.map(p => ({ lat: Number(p?.lat), lon: Number(p?.lon) }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  }
  if (Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon))) {
    return [{ lat: Number(item.lat), lon: Number(item.lon) }];
  }
  return [];
}

function inBbox(item, bbox) {
  if (!bbox) return true;
  const coords = itemCoords(item);
  if (!coords.length) return true;
  return coords.some(({ lat, lon }) => lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon);
}

async function handleApi(req, res, url) {
  try {
    if (url.pathname === '/api/health') {
      return json(res, 200, { ok: true, service: 'aerobrief-ipad', version: '1.0.0', time: new Date().toISOString() });
    }

    if (url.pathname === '/api/airport') {
      const ids = cleanIds(url.searchParams.get('ids'));
      if (!ids.length) return json(res, 400, { error: 'Provide one or more valid ICAO identifiers.' });
      const data = await cachedFetch(`${AWC}/airport?ids=${encodeURIComponent(ids.join(','))}&format=json`, 24 * 60 * 60_000);
      return json(res, 200, { airports: Array.isArray(data) ? data : [], fetchedAt: new Date().toISOString() });
    }

    if (url.pathname === '/api/weather') {
      const ids = cleanIds(url.searchParams.get('ids'));
      if (!ids.length) return json(res, 400, { error: 'Provide one or more valid ICAO identifiers.' });
      const joined = encodeURIComponent(ids.join(','));
      const [metars, tafs] = await Promise.all([
        cachedFetch(`${AWC}/metar?ids=${joined}&format=json`, 60_000),
        cachedFetch(`${AWC}/taf?ids=${joined}&format=json`, 5 * 60_000)
      ]);
      return json(res, 200, {
        metars: Array.isArray(metars) ? metars : [],
        tafs: Array.isArray(tafs) ? tafs : [],
        fetchedAt: new Date().toISOString()
      });
    }

    if (url.pathname === '/api/hazards') {
      const bbox = parseBbox(url.searchParams.get('bbox'));
      if (!bbox) return json(res, 400, { error: 'A valid bbox=lat0,lon0,lat1,lon1 is required.' });
      const rawLevel = Number(url.searchParams.get('level'));
      const level = Number.isFinite(rawLevel) ? Math.max(0, Math.min(60000, Math.round(rawLevel))) : 0;
      const bboxText = [bbox.minLat, bbox.minLon, bbox.maxLat, bbox.maxLon].join(',');
      const levelQuery = level ? `&level=${level}` : '';
      const [sigmetsRaw, gairmetsRaw, pirepsRaw] = await Promise.allSettled([
        cachedFetch(`${AWC}/airsigmet?format=json${levelQuery}`, 60_000),
        cachedFetch(`${AWC}/gairmet?format=json`, 60_000),
        cachedFetch(`${AWC}/pirep?bbox=${encodeURIComponent(bboxText)}&format=json&age=4${levelQuery}`, 60_000)
      ]);
      const val = result => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
      return json(res, 200, {
        sigmets: val(sigmetsRaw).filter(item => inBbox(item, bbox)).slice(0, 40),
        gairmets: val(gairmetsRaw).filter(item => inBbox(item, bbox)).slice(0, 60),
        pireps: val(pirepsRaw).slice(0, 80),
        fetchedAt: new Date().toISOString()
      });
    }

    if (url.pathname === '/api/simbrief') {
      const user = cleanUser(url.searchParams.get('user'));
      if (!user) return json(res, 400, { error: 'Enter a valid SimBrief username or numeric Pilot ID.' });
      const key = /^\d+$/.test(user) ? 'userid' : 'username';
      const endpoint = `https://www.simbrief.com/api/xml.fetcher.php?${key}=${encodeURIComponent(user)}&json=1`;
      const data = await cachedFetch(endpoint, 15_000);
      if (!data || typeof data !== 'object') throw new Error('SimBrief returned an unexpected response.');
      return json(res, 200, { ofp: data, fetchedAt: new Date().toISOString() });
    }

    return json(res, 404, { error: 'API endpoint not found.' });
  } catch (error) {
    console.error(error);
    return json(res, 502, { error: error?.name === 'AbortError' ? 'The upstream service timed out.' : (error?.message || 'Upstream request failed.') });
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
    const isShell = ext === '.html' || ext === '.js' || ext === '.css' || ext === '.webmanifest';
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': isShell ? 'no-cache' : 'public, max-age=604800, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), camera=(), microphone=()'
    });
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
  console.log(`AeroBrief listening on http://0.0.0.0:${port}`);
});
