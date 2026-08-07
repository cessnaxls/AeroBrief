const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE = {
  active: 'aerobrief.rw.active.v2',
  profiles: 'aerobrief.rw.profiles.v2',
  flights: 'aerobrief.rw.flights.v2',
  settings: 'aerobrief.rw.settings.v2',
  acknowledged: 'aerobrief.rw.ack.v2',
  checklist: 'aerobrief.rw.checklist.v2'
};

const viewMeta = {
  plan: ['FLIGHT PLANNING', 'Build and validate a flight'],
  brief: ['AUTHORITATIVE BRIEFING', 'Weather, hazards, TFR and NOTAM gate'],
  wb: ['WEIGHT & BALANCE', 'Aircraft-specific loading'],
  performance: ['PERFORMANCE', 'POH / AFM worksheet'],
  aircraft: ['AIRCRAFT PROFILES', 'Aircraft, W&B and performance configuration'],
  checklists: ['CHECKLISTS', 'Aircraft-specific procedures'],
  flights: ['FLIGHT RECORDS', 'Saved flights and briefing snapshots'],
  settings: ['CONFIGURATION', 'Personal minima and data sources']
};

const DEFAULT_SETTINGS = {
  minCeilingVfr: 2500,
  minVisibilityVfr: 5,
  minCeilingIfr: 800,
  minVisibilityIfr: 2,
  maxCrosswind: 15,
  maxGustSpread: 10,
  maxDensityAltitude: 5000,
  briefStaleMinutes: 90,
  manualDistance: '',
  defaultContingency: 10,
  reserveVfrDay: 30,
  reserveVfrNight: 45,
  reserveIfr: 45,
  displayDensity: 'comfortable'
};

const DEFAULT_CHECKLISTS = [
  { name: 'Preflight', items: ['Aircraft documents — CHECK', 'Weather / NOTAMs / TFRs — REVIEW', 'Fuel quantity and quality — VERIFY', 'Weight and balance — COMPLETE', 'Performance and runway margin — COMPLETE'] },
  { name: 'Before Start', items: ['Passenger briefing — COMPLETE', 'Seats / belts / doors — SECURE', 'Parking brake — SET', 'Avionics — OFF', 'Checklist — USE AIRCRAFT POH'] },
  { name: 'Before Takeoff', items: ['Flight controls — FREE AND CORRECT', 'Instruments — CHECK', 'Fuel selector — SET', 'Trim — SET', 'Takeoff briefing — COMPLETE'] }
];

function uid() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blankProfile(name = 'New aircraft — enter verified data') {
  return {
    id: uid(),
    name,
    model: '',
    registration: '',
    icao: '',
    verified: false,
    revision: '',
    units: { weight: 'LB', arm: 'IN', fuel: 'GAL' },
    fuelDensity: 6,
    emptyWeight: 0,
    emptyArm: 0,
    limits: { maxRamp: 0, maxTakeoff: 0, maxLanding: 0, maxZeroFuel: 0, usableFuel: 0, maxCrosswind: 0 },
    defaults: { tas: 0, burn: 0, taxiBurn: 0 },
    stations: [
      { id: uid(), name: 'Front seats', type: 'seat', arm: 0, max: 0, defaultValue: 0 },
      { id: uid(), name: 'Rear seats', type: 'seat', arm: 0, max: 0, defaultValue: 0 },
      { id: uid(), name: 'Baggage', type: 'baggage', arm: 0, max: 0, defaultValue: 0 },
      { id: uid(), name: 'Main fuel', type: 'fuel', arm: 0, max: 0, defaultValue: 0 }
    ],
    envelope: [],
    performance: {
      takeoff: [],
      landing: [],
      cruise: [],
      corrections: { grassPct: 0, wetPct: 0, softPct: 0, headwindPctPerKt: 0, tailwindPctPerKt: 0 }
    },
    checklists: structuredCloneSafe(DEFAULT_CHECKLISTS),
    updatedAt: new Date().toISOString()
  };
}

let state = {
  flight: null,
  profiles: [],
  activeProfileId: '',
  editorProfileId: '',
  editorDraft: null,
  perfEditorTab: 'takeoff',
  airports: {},
  weather: { metars: [], tafs: [] },
  hazards: { sigmets: [], gairmets: [], pireps: [] },
  tfrs: [],
  briefingFetchedAt: null,
  briefingSources: {},
  hazardFilter: 'all',
  sourceStatus: [],
  calculations: {},
  wb: null,
  performance: null,
  checklistChecks: {},
  activeView: 'plan'
};

function structuredCloneSafe(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function safeParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function optionalNumber(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeHeading(value) {
  return (number(value) % 360 + 360) % 360;
}

function angularDifference(a, b) {
  return ((number(a) - number(b) + 540) % 360) - 180;
}

function formatDuration(hours) {
  if (!Number.isFinite(hours) || hours < 0) return '—';
  const total = Math.round(hours * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatNumber(value, digits = 1) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? `${date.toISOString().slice(0, 16).replace('T', ' ')}Z` : '—';
}

function ageMinutes(value) {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? Math.max(0, (Date.now() - t) / 60000) : Infinity;
}

function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...safeParse(localStorage.getItem(STORAGE.settings), {}) };
}

function loadProfiles() {
  const stored = safeParse(localStorage.getItem(STORAGE.profiles), null);
  if (Array.isArray(stored) && stored.length) return stored.map(normalizeProfile);
  const profile = blankProfile();
  localStorage.setItem(STORAGE.profiles, JSON.stringify([profile]));
  return [profile];
}

function normalizeProfile(profile) {
  const blank = blankProfile(profile?.name || 'Aircraft profile');
  return {
    ...blank,
    ...profile,
    units: { ...blank.units, ...(profile?.units || {}) },
    limits: { ...blank.limits, ...(profile?.limits || {}) },
    defaults: { ...blank.defaults, ...(profile?.defaults || {}) },
    stations: Array.isArray(profile?.stations) ? profile.stations.map(s => ({ id: s.id || uid(), name: s.name || 'Station', type: s.type || 'other', arm: number(s.arm), max: number(s.max), defaultValue: number(s.defaultValue) })) : blank.stations,
    envelope: Array.isArray(profile?.envelope) ? profile.envelope.map(p => ({ weight: number(p.weight), forward: number(p.forward), aft: number(p.aft) })).sort((a,b) => a.weight - b.weight) : [],
    performance: {
      takeoff: Array.isArray(profile?.performance?.takeoff) ? profile.performance.takeoff : [],
      landing: Array.isArray(profile?.performance?.landing) ? profile.performance.landing : [],
      cruise: Array.isArray(profile?.performance?.cruise) ? profile.performance.cruise : [],
      corrections: { ...blank.performance.corrections, ...(profile?.performance?.corrections || {}) }
    },
    checklists: Array.isArray(profile?.checklists) ? profile.checklists : structuredCloneSafe(DEFAULT_CHECKLISTS)
  };
}

function saveProfiles() {
  localStorage.setItem(STORAGE.profiles, JSON.stringify(state.profiles));
}

function loadSavedFlights() {
  const flights = safeParse(localStorage.getItem(STORAGE.flights), []);
  return Array.isArray(flights) ? flights : [];
}

function defaultFlight() {
  const settings = loadSettings();
  const profile = state.profiles[0] || blankProfile();
  const now = new Date();
  const rounded = new Date(Math.ceil(now.getTime() / 15 / 60000) * 15 * 60000);
  return {
    id: uid(),
    callsign: profile.registration || '',
    activeProfileId: profile.id,
    flightRules: 'VFR',
    operationType: 'Part 91',
    origin: 'KIND',
    destination: 'KUMP',
    alternate: 'KHFY',
    departureDate: now.toISOString().slice(0, 10),
    departureTime: rounded.toISOString().slice(11, 16),
    cruiseAltitude: 3500,
    tas: profile.defaults.tas || 105,
    taxiMinutes: 10,
    route: 'DCT',
    remarks: '',
    windDirection: 270,
    windSpeed: 10,
    fuelBurn: profile.defaults.burn || 9,
    reserveMinutes: settings.reserveVfrDay,
    contingencyPercent: settings.defaultContingency,
    extraFuel: 0,
    load: Object.fromEntries(profile.stations.map(s => [s.id, s.defaultValue || 0])),
    officialNotamCheck: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function activeProfile() {
  return state.profiles.find(p => p.id === state.activeProfileId) || state.profiles[0] || null;
}

function editorProfile() {
  return state.profiles.find(p => p.id === state.editorProfileId) || state.profiles[0] || null;
}

function airportId(item) {
  return String(item?.icaoId || item?.icao || item?.id || item?.ident || '').toUpperCase();
}

function airportName(item) {
  return item?.name || item?.site || item?.facilityName || item?.airportName || 'Airport';
}

function airportLat(item) {
  return number(item?.lat ?? item?.latitude ?? item?.latDecimal ?? item?.latitudeDecimal, NaN);
}

function airportLon(item) {
  return number(item?.lon ?? item?.longitude ?? item?.lonDecimal ?? item?.longitudeDecimal, NaN);
}

function airportElev(item) {
  return number(item?.elev ?? item?.elevation ?? item?.elevFt ?? item?.elevationFt, NaN);
}

function airportFor(id) {
  return state.airports[String(id || '').toUpperCase()] || null;
}

function greatCircle(a, b) {
  if (!a || !b) return null;
  const lat1 = airportLat(a) * Math.PI / 180;
  const lat2 = airportLat(b) * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = (airportLon(b) - airportLon(a)) * Math.PI / 180;
  if (![lat1, lat2, dLat, dLon].every(Number.isFinite)) return null;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const central = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const distanceNm = 3440.065 * central;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return { distanceNm, course: normalizeHeading(Math.atan2(y, x) * 180 / Math.PI) };
}

function collectFlight() {
  const prior = state.flight || defaultFlight();
  return {
    ...prior,
    callsign: $('#callsign').value.trim().toUpperCase(),
    activeProfileId: $('#activeAircraft').value,
    flightRules: $('#flightRules').value,
    operationType: $('#operationType').value,
    origin: $('#origin').value.trim().toUpperCase(),
    destination: $('#destination').value.trim().toUpperCase(),
    alternate: $('#alternate').value.trim().toUpperCase(),
    departureDate: $('#departureDate').value,
    departureTime: $('#departureTime').value,
    cruiseAltitude: number($('#cruiseAltitude').value),
    tas: number($('#tas').value),
    taxiMinutes: number($('#taxiMinutes').value),
    route: $('#route').value.trim().toUpperCase(),
    remarks: $('#remarks').value.trim(),
    windDirection: number($('#windDirection').value),
    windSpeed: number($('#windSpeed').value),
    fuelBurn: number($('#fuelBurn').value),
    reserveMinutes: number($('#reserveMinutes').value),
    contingencyPercent: number($('#contingencyPercent').value),
    extraFuel: number($('#extraFuel').value),
    updatedAt: new Date().toISOString()
  };
}

function applyFlight(flight) {
  state.flight = { ...defaultFlight(), ...flight };
  state.activeProfileId = state.flight.activeProfileId || state.profiles[0]?.id || '';
  $('#callsign').value = state.flight.callsign || '';
  $('#activeAircraft').value = state.activeProfileId;
  $('#flightRules').value = state.flight.flightRules || 'VFR';
  $('#operationType').value = state.flight.operationType || 'Part 91';
  $('#origin').value = state.flight.origin || '';
  $('#destination').value = state.flight.destination || '';
  $('#alternate').value = state.flight.alternate || '';
  $('#departureDate').value = state.flight.departureDate || '';
  $('#departureTime').value = state.flight.departureTime || '';
  $('#cruiseAltitude').value = state.flight.cruiseAltitude || '';
  $('#tas').value = state.flight.tas || '';
  $('#taxiMinutes').value = state.flight.taxiMinutes ?? 10;
  $('#route').value = state.flight.route || '';
  $('#remarks').value = state.flight.remarks || '';
  $('#windDirection').value = state.flight.windDirection ?? '';
  $('#windSpeed').value = state.flight.windSpeed ?? '';
  $('#fuelBurn').value = state.flight.fuelBurn || '';
  $('#reserveMinutes').value = state.flight.reserveMinutes ?? 45;
  $('#contingencyPercent').value = state.flight.contingencyPercent ?? 10;
  $('#extraFuel').value = state.flight.extraFuel ?? 0;
  $('#officialBriefReference').value = state.flight.officialNotamCheck?.reference || '';
  recalculate();
}

function calculatePlan(flight = state.flight) {
  const settings = loadSettings();
  const nav = greatCircle(airportFor(flight.origin), airportFor(flight.destination));
  const directDistance = nav?.distanceNm ?? NaN;
  const manualDistance = optionalNumber(settings.manualDistance);
  const distanceNm = manualDistance && manualDistance > 0 ? manualDistance : directDistance;
  const course = nav?.course ?? NaN;
  const angle = angularDifference(flight.windDirection, course) * Math.PI / 180;
  const headwind = Number.isFinite(course) ? flight.windSpeed * Math.cos(angle) : 0;
  const groundSpeed = clamp(flight.tas - headwind, Math.max(20, flight.tas * .35), flight.tas + Math.abs(flight.windSpeed));
  const eteHours = Number.isFinite(distanceNm) && groundSpeed > 0 ? distanceNm / groundSpeed : NaN;
  const profile = activeProfile();
  const taxiBurnRate = profile?.defaults?.taxiBurn || flight.fuelBurn;
  const taxiFuel = flight.taxiMinutes / 60 * taxiBurnRate;
  const tripFuel = eteHours * flight.fuelBurn;
  const reserveFuel = flight.reserveMinutes / 60 * flight.fuelBurn;
  const contingencyFuel = tripFuel * flight.contingencyPercent / 100;
  const requiredFuel = taxiFuel + tripFuel + reserveFuel + contingencyFuel + flight.extraFuel;
  return { directDistance, distanceNm, course, headwind, groundSpeed, eteHours, taxiFuel, tripFuel, reserveFuel, contingencyFuel, requiredFuel };
}

function recalculate() {
  state.flight = collectFlight();
  state.activeProfileId = state.flight.activeProfileId;
  state.calculations = calculatePlan(state.flight);
  state.wb = calculateWeightBalance();
  persistActive();
  renderTop();
  renderPlan();
  renderWeightBalance();
  renderCompleteness();
}

function persistActive() {
  const payload = {
    flight: state.flight,
    airports: state.airports,
    weather: state.weather,
    hazards: state.hazards,
    tfrs: state.tfrs,
    briefingFetchedAt: state.briefingFetchedAt,
    briefingSources: state.briefingSources,
    activeProfileId: state.activeProfileId
  };
  try { localStorage.setItem(STORAGE.active, JSON.stringify(payload)); } catch { /* local storage may be full */ }
}

function renderProfileSelect() {
  $('#activeAircraft').innerHTML = state.profiles.map(p => `<option value="${esc(p.id)}">${esc(p.name)}${p.verified ? '' : ' · UNVERIFIED'}</option>`).join('');
  $('#activeAircraft').value = state.activeProfileId || state.profiles[0]?.id || '';
}

function renderTop() {
  const p = activeProfile();
  $('#stripCallsign').textContent = state.flight?.callsign || p?.registration || '—';
  $('#stripRoute').textContent = `${state.flight?.origin || '—'} → ${state.flight?.destination || '—'}`;
  $('#stripAircraft').textContent = p ? `${p.icao || p.model || 'AIRCRAFT'} · ${p.registration || 'NO REG'}` : '—';
  const takeoff = state.wb?.phases?.takeoff;
  $('#stripWb').textContent = takeoff ? (takeoff.ok ? 'WITHIN LIMITS' : 'OUT OF LIMITS') : 'NOT SET';
  const settings = loadSettings();
  const briefAge = ageMinutes(state.briefingFetchedAt);
  $('#stripBrief').textContent = Number.isFinite(briefAge) ? (briefAge <= settings.briefStaleMinutes ? `${Math.round(briefAge)} MIN` : 'STALE') : 'NOT LOADED';
}

function renderPlan() {
  const f = state.flight;
  const c = state.calculations;
  const p = activeProfile();
  const origin = airportFor(f.origin);
  const destination = airportFor(f.destination);
  $('#heroOrigin').textContent = f.origin || '—';
  $('#heroDestination').textContent = f.destination || '—';
  $('#heroOriginName').textContent = origin ? airportName(origin) : 'Airport data not loaded';
  $('#heroDestinationName').textContent = destination ? airportName(destination) : 'Airport data not loaded';
  $('#metricDistance').textContent = Number.isFinite(c.distanceNm) ? Math.round(c.distanceNm) : '—';
  $('#metricCourse').textContent = Number.isFinite(c.course) ? String(Math.round(c.course)).padStart(3, '0') : '—';
  $('#metricGs').textContent = Number.isFinite(c.groundSpeed) ? Math.round(c.groundSpeed) : '—';
  $('#metricEte').textContent = formatDuration(c.eteHours);
  $('#metricFuel').textContent = formatNumber(c.requiredFuel, c.requiredFuel >= 100 ? 0 : 1);
  const fuelUnit = p?.units?.fuel || 'UNIT';
  ['metricFuelUnit','fuelTaxiUnit','fuelTripUnit','fuelReserveUnit','fuelRequiredUnit'].forEach(id => $(`#${id}`).textContent = fuelUnit);
  $('#fuelTaxi').textContent = formatNumber(c.taxiFuel, 1);
  $('#fuelTrip').textContent = formatNumber(c.tripFuel, 1);
  $('#fuelReserve').textContent = formatNumber(c.reserveFuel, 1);
  $('#fuelRequired').textContent = formatNumber(c.requiredFuel, 1);
}

function routeBbox() {
  const a = airportFor(state.flight.origin);
  const b = airportFor(state.flight.destination);
  if (!a || !b) return null;
  const latA = airportLat(a), lonA = airportLon(a), latB = airportLat(b), lonB = airportLon(b);
  if (![latA, lonA, latB, lonB].every(Number.isFinite)) return null;
  const pad = 2.5;
  return [Math.min(latA,latB)-pad, Math.min(lonA,lonB)-pad, Math.max(latA,latB)+pad, Math.max(lonA,lonB)+pad].join(',');
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

async function fetchAirportData(ids) {
  const clean = [...new Set(ids.filter(Boolean).map(id => id.toUpperCase()))];
  if (!clean.length) return;
  const data = await fetchJson(`/api/airport?ids=${encodeURIComponent(clean.join(','))}`);
  for (const airport of data.airports || []) {
    const id = airportId(airport);
    if (id) state.airports[id] = airport;
  }
  state.briefingSources.airport = { source: data.source, fetchedAt: data.fetchedAt };
}

async function loadBriefing() {
  state.flight = collectFlight();
  const ids = [state.flight.origin, state.flight.destination, state.flight.alternate].filter(Boolean);
  if (ids.length < 2) throw new Error('Enter origin and destination identifiers.');
  await fetchAirportData(ids);
  const bbox = routeBbox();
  if (!bbox) throw new Error('The authoritative airport service did not return usable coordinates for the route.');
  const joined = encodeURIComponent(ids.join(','));
  const settled = await Promise.allSettled([
    fetchJson(`/api/weather?ids=${joined}`),
    fetchJson(`/api/hazards?bbox=${encodeURIComponent(bbox)}&level=${encodeURIComponent(state.flight.cruiseAltitude || 0)}`),
    fetchJson(`/api/tfr?bbox=${encodeURIComponent(bbox)}`)
  ]);
  const errors = [];
  if (settled[0].status === 'fulfilled') {
    const data = settled[0].value;
    state.weather = { metars: data.metars || [], tafs: data.tafs || [] };
    state.briefingSources.weather = { source: data.source, fetchedAt: data.fetchedAt };
  } else errors.push(`Weather: ${settled[0].reason?.message || 'failed'}`);
  if (settled[1].status === 'fulfilled') {
    const data = settled[1].value;
    state.hazards = { sigmets: data.sigmets || [], gairmets: data.gairmets || [], pireps: data.pireps || [] };
    state.briefingSources.hazards = { source: data.source, fetchedAt: data.fetchedAt };
  } else errors.push(`Hazards: ${settled[1].reason?.message || 'failed'}`);
  if (settled[2].status === 'fulfilled') {
    const data = settled[2].value;
    state.tfrs = data.tfrs || [];
    state.briefingSources.tfr = { source: data.source, fetchedAt: data.fetchedAt };
  } else errors.push(`TFR: ${settled[2].reason?.message || 'failed'}`);
  state.briefingFetchedAt = new Date().toISOString();
  state.calculations = calculatePlan(state.flight);
  state.wb = calculateWeightBalance();
  persistActive();
  renderAll();
  if (errors.length) toast(`Briefing loaded with gaps: ${errors.join(' · ')}`);
  return errors;
}

function metarFor(id) {
  const key = String(id || '').toUpperCase();
  return state.weather.metars.find(item => String(item?.icaoId || item?.station || item?.id || '').toUpperCase() === key) || null;
}

function tafFor(id) {
  const key = String(id || '').toUpperCase();
  return state.weather.tafs.find(item => String(item?.icaoId || item?.station || item?.id || '').toUpperCase() === key) || null;
}

function cloudCeiling(metar) {
  const clouds = Array.isArray(metar?.clouds) ? metar.clouds : [];
  const ceiling = clouds.filter(c => ['BKN','OVC','VV'].includes(String(c?.cover || c?.skyCover || '').toUpperCase())).map(c => number(c?.base ?? c?.baseFt, NaN)).filter(Number.isFinite);
  if (ceiling.length) return Math.min(...ceiling);
  const raw = String(metar?.rawOb || metar?.rawText || '');
  const matches = [...raw.matchAll(/(?:BKN|OVC|VV)(\d{3})/g)].map(m => Number(m[1]) * 100);
  return matches.length ? Math.min(...matches) : Infinity;
}

function metarVisibility(metar) {
  const direct = number(metar?.visib ?? metar?.visibility, NaN);
  if (Number.isFinite(direct)) return direct;
  const raw = String(metar?.rawOb || metar?.rawText || '');
  const match = raw.match(/\s(\d+(?:\/\d+)?|\d+\s\d\/\d)SM\s/);
  if (!match) return NaN;
  const value = match[1].trim();
  if (value.includes(' ')) {
    const [whole, frac] = value.split(' ');
    const [n,d] = frac.split('/').map(Number);
    return Number(whole) + n/d;
  }
  if (value.includes('/')) {
    const [n,d] = value.split('/').map(Number);
    return n/d;
  }
  return Number(value);
}

function weatherCard(role, id) {
  const metar = metarFor(id);
  const taf = tafFor(id);
  const airport = airportFor(id);
  const rawMetar = metar?.rawOb || metar?.rawText || 'No METAR returned.';
  const rawTaf = taf?.rawTAF || taf?.rawText || 'No TAF returned.';
  const category = metar?.fltCat || metar?.flightCategory || 'N/A';
  const windDir = number(metar?.wdir ?? metar?.windDir, NaN);
  const windSpeed = number(metar?.wspd ?? metar?.windSpeed, NaN);
  const gust = number(metar?.wgst ?? metar?.windGust, NaN);
  const ceiling = cloudCeiling(metar);
  const visibility = metarVisibility(metar);
  const catClass = ['VFR'].includes(category) ? 'success' : ['MVFR'].includes(category) ? 'warning' : ['IFR','LIFR'].includes(category) ? 'danger' : 'neutral';
  return `<article class="panel weather-card">
    <div class="airport-heading"><div><span class="eyebrow">${esc(role)}</span><h3>${esc(id || '—')}</h3><small>${esc(airport ? airportName(airport) : 'Airport data unavailable')}</small></div><span class="badge ${catClass}">${esc(category)}</span></div>
    <div class="weather-meta">
      <div><span>WIND</span><strong>${Number.isFinite(windDir) ? String(Math.round(windDir)).padStart(3,'0') : '—'} / ${Number.isFinite(windSpeed) ? Math.round(windSpeed) : '—'}${Number.isFinite(gust) ? `G${Math.round(gust)}` : ''}</strong></div>
      <div><span>VIS</span><strong>${Number.isFinite(visibility) ? `${visibility} SM` : '—'}</strong></div>
      <div><span>CEILING</span><strong>${Number.isFinite(ceiling) ? `${ceiling} FT` : 'NONE'}</strong></div>
      <div><span>OBS</span><strong>${esc(formatDateTime(metar?.reportTime || metar?.obsTime))}</strong></div>
    </div>
    <div class="raw-weather">${esc(rawMetar)}</div>
    <div class="raw-weather">${esc(rawTaf)}</div>
  </article>`;
}

function renderWeather() {
  const f = state.flight;
  $('#weatherGrid').innerHTML = [
    weatherCard('DEPARTURE', f.origin),
    weatherCard('DESTINATION', f.destination),
    weatherCard('ALTERNATE', f.alternate)
  ].join('');
}

function hazardDescription(item) {
  return item?.rawAirSigmet || item?.rawOb || item?.rawText || item?.hazard || item?.phenom || item?.description || item?.text || JSON.stringify(item);
}

function hazardTitle(item, type) {
  const label = item?.hazard || item?.phenom || item?.airSigmetType || item?.reportType || item?.type || type.toUpperCase();
  const id = item?.airSigmetId || item?.icaoId || item?.id || item?.station || '';
  return `${label}${id ? ` · ${id}` : ''}`;
}

function renderHazards() {
  const groups = [
    ...state.hazards.sigmets.map(item => ({ type: 'sigmet', item })),
    ...state.hazards.gairmets.map(item => ({ type: 'gairmet', item })),
    ...state.hazards.pireps.map(item => ({ type: 'pirep', item }))
  ].filter(entry => state.hazardFilter === 'all' || entry.type === state.hazardFilter);
  $('#hazardList').innerHTML = groups.length ? groups.slice(0, 80).map(({type,item}) => `<div class="data-item ${type === 'sigmet' ? 'danger' : type === 'gairmet' ? 'warning' : ''}"><strong>${esc(hazardTitle(item,type))}</strong><p>${esc(hazardDescription(item))}</p><div class="meta"><span>${esc(type.toUpperCase())}</span><span>${esc(formatDateTime(item?.validTimeFrom || item?.issueTime || item?.reportTime || item?.obsTime))}</span></div></div>`).join('') : '<div class="data-item"><strong>No matching products returned</strong><p>This is not proof that no hazard exists. Confirm coverage and source availability.</p></div>';
}

function renderTfrs() {
  $('#tfrList').innerHTML = state.tfrs.length ? state.tfrs.slice(0, 80).map(tfr => `<div class="data-item danger"><strong>${esc(tfr.notam || 'FAA TFR')} · ${esc(tfr.location || tfr.state || '')}</strong><p>${esc(tfr.description || tfr.type || 'Open the FAA detail for controlling text and applicability.')}</p><div class="meta"><span>${esc(tfr.effective || 'EFFECTIVE TIME IN DETAIL')}</span><span>${esc(tfr.expires || '')}</span>${tfr.detailUrl ? `<a href="${esc(tfr.detailUrl)}" target="_blank" rel="noopener">FAA DETAIL</a>` : ''}</div></div>`).join('') : '<div class="data-item"><strong>No route-area TFR items returned</strong><p>Always verify the controlling FAA TFR and NOTAM text, including stadium and national-security restrictions.</p></div>';
}

function calculateWindForRunway(metar, runwayHeading) {
  const windDir = number(metar?.wdir ?? metar?.windDir, NaN);
  const windSpeed = number(metar?.wspd ?? metar?.windSpeed, NaN);
  const gust = number(metar?.wgst ?? metar?.windGust, windSpeed);
  if (![windDir, windSpeed, runwayHeading].every(Number.isFinite)) return null;
  const angle = angularDifference(windDir, runwayHeading) * Math.PI / 180;
  return { headwind: gust * Math.cos(angle), crosswind: Math.abs(gust * Math.sin(angle)), gustSpread: Math.max(0, gust - windSpeed) };
}

function personalAlerts() {
  const settings = loadSettings();
  const alerts = [];
  const minCeiling = state.flight.flightRules === 'VFR' ? settings.minCeilingVfr : settings.minCeilingIfr;
  const minVisibility = state.flight.flightRules === 'VFR' ? settings.minVisibilityVfr : settings.minVisibilityIfr;
  for (const [role,id] of [['Departure',state.flight.origin],['Destination',state.flight.destination],['Alternate',state.flight.alternate]]) {
    if (!id) continue;
    const metar = metarFor(id);
    if (!metar) { alerts.push({ level: 'warning', title: `${role} ${id}: no METAR`, text: 'Verify whether the airport reports weather and obtain nearby/area observations.' }); continue; }
    const ceiling = cloudCeiling(metar);
    const visibility = metarVisibility(metar);
    const gustSpread = Math.max(0, number(metar?.wgst, number(metar?.wspd)) - number(metar?.wspd));
    if (Number.isFinite(ceiling) && ceiling < minCeiling) alerts.push({ level:'danger', title:`${role} ceiling below personal minimum`, text:`${ceiling} ft reported; threshold ${minCeiling} ft.` });
    if (Number.isFinite(visibility) && visibility < minVisibility) alerts.push({ level:'danger', title:`${role} visibility below personal minimum`, text:`${visibility} SM reported; threshold ${minVisibility} SM.` });
    if (gustSpread > settings.maxGustSpread) alerts.push({ level:'warning', title:`${role} gust spread`, text:`${gustSpread} kt exceeds the configured ${settings.maxGustSpread} kt threshold.` });
  }
  if (state.hazards.sigmets.length) alerts.push({ level:'danger', title:'SIGMET products in route-area query', text:`${state.hazards.sigmets.length} product(s) returned. Review exact geometry, altitude, validity and movement.` });
  if (state.tfrs.length) alerts.push({ level:'danger', title:'TFR products in route-area query', text:`${state.tfrs.length} item(s) returned. Open controlling FAA details.` });
  if (!state.flight.officialNotamCheck) alerts.push({ level:'danger', title:'Official NOTAM check not recorded', text:'Use FAA NOTAM Search or Flight Service and record the time/reference.' });
  if (!alerts.length) alerts.push({ level:'success', title:'No configured minima alerts triggered', text:'This is not a clearance or an assurance that conditions are acceptable.' });
  return alerts;
}

function renderAlerts() {
  $('#alertList').innerHTML = personalAlerts().map(a => `<div class="data-item ${a.level}"><strong>${esc(a.title)}</strong><p>${esc(a.text)}</p></div>`).join('');
}

function renderBriefingHeader() {
  const settings = loadSettings();
  const age = ageMinutes(state.briefingFetchedAt);
  $('#briefUpdated').textContent = Number.isFinite(age) ? `UPDATED ${Math.round(age)} MIN AGO` : 'NOT LOADED';
  const banner = $('#briefBanner');
  if (!state.briefingFetchedAt) {
    banner.className = 'notice info';
    banner.innerHTML = '<strong>No live briefing loaded</strong><span>Build the flight to retrieve FAA Aviation Weather Center and FAA TFR data.</span>';
  } else if (age > settings.briefStaleMinutes) {
    banner.className = 'notice danger';
    banner.innerHTML = `<strong>Briefing is stale</strong><span>Loaded ${Math.round(age)} minutes ago; configured limit is ${settings.briefStaleMinutes} minutes.</span>`;
  } else {
    banner.className = 'notice success';
    banner.innerHTML = `<strong>Embedded source data loaded</strong><span>Retrieved ${formatDateTime(state.briefingFetchedAt)}. Complete the official NOTAM / Flight Service gate below.</span>`;
  }
  const check = state.flight.officialNotamCheck;
  $('#notamBadge').className = `badge ${check ? 'success' : 'warning'}`;
  $('#notamBadge').textContent = check ? 'RECORDED' : 'REQUIRED';
  $('#notamRecord').textContent = check ? `Recorded ${formatDateTime(check.time)}${check.reference ? ` · ${check.reference}` : ''}` : 'No official NOTAM check recorded for this flight.';
}

function renderSources() {
  const chips = [
    ['AIRPORT', state.briefingSources.airport?.source || 'FAA AWC airport service', state.briefingSources.airport?.fetchedAt],
    ['WEATHER', state.briefingSources.weather?.source || 'FAA Aviation Weather Center', state.briefingSources.weather?.fetchedAt],
    ['HAZARDS', state.briefingSources.hazards?.source || 'FAA Aviation Weather Center', state.briefingSources.hazards?.fetchedAt],
    ['TFR', state.briefingSources.tfr?.source || 'FAA Graphic TFR', state.briefingSources.tfr?.fetchedAt],
    ['NOTAM', 'FAA NOTAM Search / Flight Service', state.flight.officialNotamCheck?.time]
  ];
  $('#sourceRibbon').innerHTML = chips.map(([name,source,time]) => `<div class="source-chip"><strong>${esc(name)}</strong><span>${esc(source)}${time ? ` · ${esc(formatDateTime(time))}` : ' · NOT LOADED'}</span></div>`).join('');
}

function fuelWeight(profile, quantity) {
  const unit = profile?.units?.fuel || 'GAL';
  if (['LB','KG'].includes(unit)) return quantity;
  return quantity * number(profile?.fuelDensity, 0);
}

function stationInputWeight(profile, station, value) {
  return station.type === 'fuel' ? fuelWeight(profile, value) : value;
}

function envelopeBounds(profile, weight) {
  const points = [...(profile?.envelope || [])].filter(p => p.weight > 0).sort((a,b) => a.weight - b.weight);
  if (!points.length || !Number.isFinite(weight)) return null;
  if (weight < points[0].weight || weight > points.at(-1).weight) return null;
  const exact = points.find(p => p.weight === weight);
  if (exact) return { forward: exact.forward, aft: exact.aft };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i+1];
    if (weight >= a.weight && weight <= b.weight) {
      const t = (weight - a.weight) / (b.weight - a.weight || 1);
      return { forward: a.forward + t * (b.forward - a.forward), aft: a.aft + t * (b.aft - a.aft) };
    }
  }
  return null;
}

function phaseStatus(profile, name, weight, moment, maxWeight) {
  const cg = weight > 0 ? moment / weight : NaN;
  const bounds = envelopeBounds(profile, weight);
  const issues = [];
  if (!(weight > 0)) issues.push(`${name}: weight is not defined.`);
  if (maxWeight > 0 && weight > maxWeight + .01) issues.push(`${name}: ${formatNumber(weight,1)} exceeds limit ${formatNumber(maxWeight,1)}.`);
  if (!bounds) issues.push(`${name}: weight is outside or not covered by the entered envelope.`);
  else if (cg < bounds.forward - .0001 || cg > bounds.aft + .0001) issues.push(`${name}: CG ${formatNumber(cg,2)} is outside ${formatNumber(bounds.forward,2)}–${formatNumber(bounds.aft,2)}.`);
  return { name, weight, moment, cg, bounds, issues, ok: issues.length === 0 };
}

function calculateWeightBalance() {
  const profile = activeProfile();
  const flight = state.flight;
  if (!profile || !flight) return null;
  const load = flight.load || {};
  const rows = profile.stations.map(station => {
    const input = number(load[station.id], station.defaultValue || 0);
    const weight = stationInputWeight(profile, station, input);
    return { station, input, weight, moment: weight * number(station.arm) };
  });
  const emptyMoment = profile.emptyWeight * profile.emptyArm;
  const allWeight = rows.reduce((sum,row) => sum + row.weight, profile.emptyWeight);
  const allMoment = rows.reduce((sum,row) => sum + row.moment, emptyMoment);
  const fuelRows = rows.filter(row => row.station.type === 'fuel');
  const fuelWeightTotal = fuelRows.reduce((sum,row) => sum + row.weight, 0);
  const fuelMomentTotal = fuelRows.reduce((sum,row) => sum + row.moment, 0);
  const zeroFuelWeight = allWeight - fuelWeightTotal;
  const zeroFuelMoment = allMoment - fuelMomentTotal;
  const fuelArm = fuelWeightTotal > 0 ? fuelMomentTotal / fuelWeightTotal : 0;
  const taxiFuelWeight = fuelWeight(profile, state.calculations.taxiFuel || 0);
  const tripFuelWeight = fuelWeight(profile, state.calculations.tripFuel || 0);
  const takeoffWeight = allWeight - taxiFuelWeight;
  const takeoffMoment = allMoment - taxiFuelWeight * fuelArm;
  const landingWeight = takeoffWeight - tripFuelWeight;
  const landingMoment = takeoffMoment - tripFuelWeight * fuelArm;
  const phases = {
    zeroFuel: phaseStatus(profile, 'Zero fuel', zeroFuelWeight, zeroFuelMoment, profile.limits.maxZeroFuel),
    ramp: phaseStatus(profile, 'Ramp', allWeight, allMoment, profile.limits.maxRamp),
    takeoff: phaseStatus(profile, 'Takeoff', takeoffWeight, takeoffMoment, profile.limits.maxTakeoff),
    landing: phaseStatus(profile, 'Landing', landingWeight, landingMoment, profile.limits.maxLanding)
  };
  const issues = [];
  if (!profile.verified) issues.push('Aircraft profile is not marked verified against current aircraft records and POH/AFM.');
  if (!(profile.emptyWeight > 0) || !(profile.emptyArm > 0)) issues.push('Empty weight and arm are incomplete.');
  if (!profile.envelope.length) issues.push('No CG envelope is entered.');
  for (const row of rows) {
    if (row.station.max > 0 && row.input > row.station.max + .001) issues.push(`${row.station.name}: input ${formatNumber(row.input,1)} exceeds station limit ${formatNumber(row.station.max,1)}.`);
  }
  if (profile.limits.usableFuel > 0) {
    const fuelQuantity = fuelRows.reduce((sum,row) => sum + row.input, 0);
    if (fuelQuantity > profile.limits.usableFuel + .001) issues.push(`Fuel input ${formatNumber(fuelQuantity,1)} exceeds usable fuel ${formatNumber(profile.limits.usableFuel,1)}.`);
    if (state.calculations.requiredFuel > fuelQuantity + .001) issues.push(`Planned fuel ${formatNumber(fuelQuantity,1)} is below calculated required fuel ${formatNumber(state.calculations.requiredFuel,1)}.`);
  }
  if (landingWeight <= zeroFuelWeight) issues.push('Calculated landing fuel is zero or negative.');
  Object.values(phases).forEach(phase => issues.push(...phase.issues));
  return { rows, phases, issues, ok: profile.verified && issues.length === 0, fuelArm, zeroFuelWeight };
}

function renderLoadRows() {
  const profile = activeProfile();
  if (!profile) { $('#loadRows').innerHTML = ''; return; }
  const rows = state.wb?.rows || [];
  $('#loadRows').innerHTML = rows.map(row => `<tr>
    <td><strong>${esc(row.station.name)}</strong><div class="eyebrow">${esc(row.station.type.toUpperCase())}</div></td>
    <td>${formatNumber(row.station.arm,2)} ${esc(profile.units.arm)}</td>
    <td><input data-load-station="${esc(row.station.id)}" type="number" min="0" step="0.1" value="${esc(row.input)}"><small>${row.station.type === 'fuel' ? esc(profile.units.fuel) : esc(profile.units.weight)}</small></td>
    <td>${formatNumber(row.weight,1)} ${esc(profile.units.weight)}</td>
    <td>${formatNumber(row.moment,1)}</td>
    <td>${row.station.max > 0 ? `${formatNumber(row.station.max,1)} ${row.station.type === 'fuel' ? esc(profile.units.fuel) : esc(profile.units.weight)}` : '—'}</td>
  </tr>`).join('');
}

function renderPhaseSummary() {
  const profile = activeProfile();
  const phases = state.wb?.phases;
  if (!profile || !phases) { $('#phaseSummary').innerHTML = ''; return; }
  $('#phaseSummary').innerHTML = ['ramp','takeoff','landing'].map(key => {
    const p = phases[key];
    return `<div class="phase-card ${p.ok ? 'ok' : 'bad'}"><span>${esc(p.name.toUpperCase())}</span><strong>${formatNumber(p.weight,1)} ${esc(profile.units.weight)}</strong><small>CG ${formatNumber(p.cg,2)} ${esc(profile.units.arm)} · ${p.ok ? 'WITHIN' : 'CHECK'}</small></div>`;
  }).join('');
}

function renderWbChart() {
  const svg = $('#wbChart');
  const profile = activeProfile();
  const points = profile?.envelope || [];
  const phases = state.wb?.phases;
  if (!profile || points.length < 2 || !phases) {
    svg.innerHTML = '<text x="320" y="180" text-anchor="middle">Enter a verified CG envelope to display the graph.</text>';
    return;
  }
  const weights = points.map(p => p.weight).concat([phases.ramp.weight, phases.takeoff.weight, phases.landing.weight]).filter(Number.isFinite);
  const arms = points.flatMap(p => [p.forward,p.aft]).concat([phases.ramp.cg, phases.takeoff.cg, phases.landing.cg]).filter(Number.isFinite);
  let minW = Math.min(...weights), maxW = Math.max(...weights), minA = Math.min(...arms), maxA = Math.max(...arms);
  const wPad = Math.max(20,(maxW-minW)*.12), aPad = Math.max(.5,(maxA-minA)*.12);
  minW -= wPad; maxW += wPad; minA -= aPad; maxA += aPad;
  const x = arm => 58 + (arm-minA)/(maxA-minA) * 540;
  const y = weight => 318 - (weight-minW)/(maxW-minW) * 270;
  const forward = points.map(p => `${x(p.forward)},${y(p.weight)}`);
  const aft = [...points].reverse().map(p => `${x(p.aft)},${y(p.weight)}`);
  const grid = [];
  for (let i=0;i<=5;i++) {
    const gx = 58 + i*108, gy = 48 + i*54;
    grid.push(`<line class="gridline" x1="${gx}" y1="48" x2="${gx}" y2="318"/><text x="${gx}" y="338" text-anchor="middle">${formatNumber(minA+(maxA-minA)*i/5,1)}</text>`);
    grid.push(`<line class="gridline" x1="58" y1="${gy}" x2="598" y2="${gy}"/><text x="50" y="${gy+3}" text-anchor="end">${Math.round(maxW-(maxW-minW)*i/5)}</text>`);
  }
  const phasePoints = [
    ['ramp','point-ramp'],['takeoff','point-takeoff'],['landing','point-landing']
  ].map(([key,cls]) => { const p=phases[key]; return `<circle class="${cls}" cx="${x(p.cg)}" cy="${y(p.weight)}" r="6"><title>${p.name}: ${formatNumber(p.weight,1)} / ${formatNumber(p.cg,2)}</title></circle>`; }).join('');
  svg.innerHTML = `${grid.join('')}<polygon class="envelope" points="${forward.concat(aft).join(' ')}"/>${phasePoints}<text x="328" y="356" text-anchor="middle">CG (${esc(profile.units.arm)})</text><text x="14" y="182" transform="rotate(-90 14 182)" text-anchor="middle">WEIGHT (${esc(profile.units.weight)})</text>`;
}

function renderWeightBalance() {
  const profile = activeProfile();
  $('#wbTitle').textContent = profile ? `${profile.name} load sheet` : 'Load sheet';
  const badge = $('#wbBadge');
  if (!profile) { badge.className='badge neutral'; badge.textContent='NO PROFILE'; }
  else if (state.wb?.ok) { badge.className='badge success'; badge.textContent='WITHIN LIMITS'; }
  else { badge.className='badge danger'; badge.textContent='CHECK LOAD'; }
  renderLoadRows();
  renderPhaseSummary();
  renderWbChart();
  const issues = state.wb?.issues || ['No aircraft profile selected.'];
  $('#wbIssues').innerHTML = issues.length ? [...new Set(issues)].map(text => `<div class="data-item danger"><strong>CHECK</strong><p>${esc(text)}</p></div>`).join('') : '<div class="data-item success"><strong>All configured W&B checks pass</strong><p>Verify figures against the aircraft records and POH/AFM before flight.</p></div>';
}

function pressureAltitude(elevation, altimeter) {
  return elevation + (29.92 - altimeter) * 1000;
}

function densityAltitude(pa, tempC) {
  const isa = 15 - 1.9812 * (pa / 1000);
  return pa + 120 * (tempC - isa);
}

function idwInterpolate(rows, input, outputs) {
  const clean = rows.filter(row => ['pa','temp','weight'].every(k => Number.isFinite(Number(row[k]))) && outputs.every(k => Number.isFinite(Number(row[k]))));
  if (!clean.length) return null;
  const ranges = {};
  for (const key of ['pa','temp','weight']) {
    const vals = clean.map(r => Number(r[key]));
    ranges[key] = Math.max(1, Math.max(...vals) - Math.min(...vals));
  }
  const ranked = clean.map(row => {
    const distance = Math.sqrt(['pa','temp','weight'].reduce((sum,key) => sum + ((Number(row[key]) - input[key]) / ranges[key]) ** 2, 0));
    return { row, distance };
  }).sort((a,b) => a.distance - b.distance).slice(0, Math.min(8, clean.length));
  if (ranked[0].distance < 1e-9) return Object.fromEntries(outputs.map(k => [k, Number(ranked[0].row[k])]));
  const weights = ranked.map(r => 1 / (r.distance ** 2 + 1e-6));
  const denom = weights.reduce((a,b)=>a+b,0);
  return Object.fromEntries(outputs.map(key => [key, ranked.reduce((sum,r,i) => sum + Number(r.row[key]) * weights[i],0) / denom]));
}

function calculatePerformance() {
  const profile = activeProfile();
  const elevation = number($('#perfElevation').value, airportElev(airportFor(state.flight.origin)) || 0);
  const altimeter = number($('#perfAltimeter').value, 29.92);
  const temp = number($('#perfTemperature').value, 15);
  const runwayHeading = number($('#perfRunwayHeading').value, 0);
  const windDir = number($('#perfWindDirection').value, state.flight.windDirection);
  const windSpeed = number($('#perfWindSpeed').value, state.flight.windSpeed);
  const runwayLength = number($('#perfRunwayLength').value, 0);
  const safetyFactor = number($('#perfSafetyFactor').value, 50);
  const pa = pressureAltitude(elevation, altimeter);
  const da = densityAltitude(pa, temp);
  const angle = angularDifference(windDir, runwayHeading) * Math.PI / 180;
  const headwind = runwayHeading ? windSpeed * Math.cos(angle) : 0;
  const crosswind = runwayHeading ? Math.abs(windSpeed * Math.sin(angle)) : 0;
  const takeoffWeight = state.wb?.phases?.takeoff?.weight || 0;
  const landingWeight = state.wb?.phases?.landing?.weight || takeoffWeight;
  const takeoff = profile ? idwInterpolate(profile.performance.takeoff, { pa, temp, weight: takeoffWeight }, ['groundRoll','over50']) : null;
  const landing = profile ? idwInterpolate(profile.performance.landing, { pa, temp, weight: landingWeight }, ['groundRoll','over50']) : null;
  const corrections = profile?.performance?.corrections || {};
  const surface = $('#perfSurface').value;
  const surfacePct = surface === 'grass' ? number(corrections.grassPct) : surface === 'wet' ? number(corrections.wetPct) : surface === 'soft' ? number(corrections.softPct) : 0;
  const windPct = headwind >= 0 ? -headwind * number(corrections.headwindPctPerKt) : Math.abs(headwind) * number(corrections.tailwindPctPerKt);
  const correctionMultiplier = Math.max(.1, 1 + (surfacePct + windPct) / 100);
  const safetyMultiplier = 1 + safetyFactor / 100;
  const apply = result => result ? {
    baseGroundRoll: result.groundRoll,
    baseOver50: result.over50,
    adjustedGroundRoll: result.groundRoll * correctionMultiplier,
    adjustedOver50: result.over50 * correctionMultiplier,
    plannedGroundRoll: result.groundRoll * correctionMultiplier * safetyMultiplier,
    plannedOver50: result.over50 * correctionMultiplier * safetyMultiplier
  } : null;
  state.performance = { elevation, altimeter, temp, pa, da, runwayHeading, windDir, windSpeed, headwind, crosswind, runwayLength, safetyFactor, takeoff: apply(takeoff), landing: apply(landing), profileVerified: !!profile?.verified };
  renderPerformance();
  return state.performance;
}

function renderPerformance() {
  const perf = state.performance;
  const profile = activeProfile();
  const badge = $('#performanceBadge');
  badge.className = `badge ${profile?.verified ? 'success' : 'warning'}`;
  badge.textContent = profile?.verified ? 'PROFILE VERIFIED' : 'UNVERIFIED';
  if (!perf) {
    ['perfPressureAltitude','perfDensityAltitude','perfHeadwind','perfCrosswind'].forEach(id => $(`#${id}`).textContent='—');
    $('#performanceResults').innerHTML = '<div class="data-item"><strong>No calculation</strong><p>Enter conditions and calculate from the active aircraft profile.</p></div>';
    return;
  }
  $('#perfPressureAltitude').textContent = Math.round(perf.pa);
  $('#perfDensityAltitude').textContent = Math.round(perf.da);
  $('#perfHeadwind').textContent = formatNumber(perf.headwind,1);
  $('#perfCrosswind').textContent = formatNumber(perf.crosswind,1);
  const settings = loadSettings();
  const items = [];
  if (!profile?.verified) items.push({ level:'danger', title:'Profile is unverified', text:'Do not use these results operationally until the profile is checked against the current POH/AFM and aircraft records.' });
  if (perf.da > settings.maxDensityAltitude) items.push({ level:'warning', title:'Density altitude threshold exceeded', text:`${Math.round(perf.da)} ft exceeds your configured ${settings.maxDensityAltitude} ft alert.` });
  const xwindLimit = profile?.limits?.maxCrosswind || settings.maxCrosswind;
  if (perf.crosswind > xwindLimit) items.push({ level:'danger', title:'Crosswind threshold exceeded', text:`${formatNumber(perf.crosswind,1)} kt exceeds ${xwindLimit} kt.` });
  for (const [label,result] of [['Takeoff',perf.takeoff],['Landing',perf.landing]]) {
    if (!result) items.push({ level:'danger', title:`${label} table unavailable`, text:'Enter enough POH/AFM table points around the planned pressure altitude, temperature and weight.' });
    else {
      const margin = perf.runwayLength > 0 ? perf.runwayLength - result.plannedOver50 : NaN;
      items.push({ level: Number.isFinite(margin) && margin < 0 ? 'danger' : 'success', title:`${label} planned distance`, text:`Base over-50-ft ${Math.round(result.baseOver50)} ft · corrected ${Math.round(result.adjustedOver50)} ft · with safety factor ${Math.round(result.plannedOver50)} ft${Number.isFinite(margin) ? ` · runway margin ${Math.round(margin)} ft` : ''}.` });
    }
  }
  $('#performanceResults').innerHTML = items.map(i => `<div class="data-item ${i.level}"><strong>${esc(i.title)}</strong><p>${esc(i.text)}</p></div>`).join('');
}

function validateFlight() {
  const issues = [];
  if (!state.flight.origin || !state.flight.destination) issues.push('Origin and destination are required.');
  if (state.flight.origin === state.flight.destination) issues.push('Origin and destination must differ.');
  if (!(state.flight.tas > 0)) issues.push('Cruise TAS is required.');
  if (!(state.flight.fuelBurn > 0)) issues.push('Fuel burn is required.');
  return issues;
}

function completenessItems() {
  const profile = activeProfile();
  const settings = loadSettings();
  const briefAge = ageMinutes(state.briefingFetchedAt);
  const routeIssues = validateFlight();
  const fuelQty = state.wb?.rows?.filter(r => r.station.type === 'fuel').reduce((sum,r)=>sum+r.input,0) || 0;
  return [
    { name:'AIRCRAFT', ok:!!profile?.verified, detail:profile?.verified ? `${profile.name} verified` : 'Profile must be verified' },
    { name:'ROUTE', ok:routeIssues.length===0 && Number.isFinite(state.calculations.distanceNm), detail:routeIssues[0] || (Number.isFinite(state.calculations.distanceNm) ? `${Math.round(state.calculations.distanceNm)} NM calculated` : 'Load airport data') },
    { name:'FUEL', ok:state.calculations.requiredFuel > 0 && fuelQty >= state.calculations.requiredFuel, detail:fuelQty ? `${formatNumber(fuelQty,1)} aboard / ${formatNumber(state.calculations.requiredFuel,1)} required` : 'Enter fuel in W&B' },
    { name:'W&B', ok:!!state.wb?.ok, detail:state.wb?.ok ? 'Ramp, takeoff and landing pass' : 'Load or profile requires attention' },
    { name:'BRIEF', ok:Number.isFinite(briefAge) && briefAge <= settings.briefStaleMinutes, detail:Number.isFinite(briefAge) ? `${Math.round(briefAge)} min old` : 'Not loaded' },
    { name:'NOTAMS', ok:!!state.flight.officialNotamCheck, detail:state.flight.officialNotamCheck ? `Checked ${formatDateTime(state.flight.officialNotamCheck.time)}` : 'Official check required' }
  ];
}

function renderCompleteness() {
  const items = completenessItems();
  const complete = items.filter(i=>i.ok).length;
  $('#completenessLabel').textContent = `${complete} OF ${items.length} COMPLETE`;
  $('#planningChecklist').innerHTML = items.map(i => `<div class="check-tile ${i.ok ? 'ok' : 'bad'}"><strong>${esc(i.name)} · ${i.ok ? 'PASS' : 'OPEN'}</strong><span>${esc(i.detail)}</span></div>`).join('');
  const gate = $('#planningGate');
  if (complete === items.length) { gate.className='badge success'; gate.textContent='PLANNING COMPLETE'; }
  else if (complete >= 3) { gate.className='badge warning'; gate.textContent=`${items.length-complete} ITEMS OPEN`; }
  else { gate.className='badge neutral'; gate.textContent='DRAFT'; }
}

function renderAircraftList() {
  $('#aircraftList').innerHTML = state.profiles.map(p => `<button class="profile-button ${p.id===state.editorProfileId?'active':''}" data-profile-id="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${esc(p.model || p.icao || 'NO MODEL')} · ${esc(p.registration || 'NO REG')} · ${p.verified ? 'VERIFIED' : 'UNVERIFIED'}</span></button>`).join('');
}

function loadEditorDraft(profile) {
  state.editorDraft = structuredCloneSafe(profile || blankProfile());
  renderProfileEditor();
}

function setEditorValue(id, value) {
  const el = $(`#${id}`);
  if (el) el.value = value ?? '';
}

function renderProfileEditor() {
  const p = state.editorDraft || editorProfile();
  if (!p) return;
  $('#profileVerified').checked = !!p.verified;
  setEditorValue('profileName',p.name);
  setEditorValue('profileModel',p.model);
  setEditorValue('profileRegistration',p.registration);
  setEditorValue('profileIcao',p.icao);
  setEditorValue('profileWeightUnit',p.units.weight);
  setEditorValue('profileArmUnit',p.units.arm);
  setEditorValue('profileFuelUnit',p.units.fuel);
  setEditorValue('profileFuelDensity',p.fuelDensity);
  setEditorValue('profileEmptyWeight',p.emptyWeight);
  setEditorValue('profileEmptyArm',p.emptyArm);
  setEditorValue('profileMaxRamp',p.limits.maxRamp);
  setEditorValue('profileMaxTakeoff',p.limits.maxTakeoff);
  setEditorValue('profileMaxLanding',p.limits.maxLanding);
  setEditorValue('profileMaxZeroFuel',p.limits.maxZeroFuel);
  setEditorValue('profileUsableFuel',p.limits.usableFuel);
  setEditorValue('profileDefaultTas',p.defaults.tas);
  setEditorValue('profileDefaultBurn',p.defaults.burn);
  setEditorValue('profileTaxiBurn',p.defaults.taxiBurn);
  setEditorValue('profileMaxCrosswind',p.limits.maxCrosswind);
  setEditorValue('profileRevision',p.revision);
  renderStationEditor();
  renderEnvelopeEditor();
  renderPerformanceEditor();
  renderAircraftList();
}

function renderStationEditor() {
  const p = state.editorDraft;
  $('#stationEditorRows').innerHTML = (p?.stations || []).map(s => `<tr data-station-row="${esc(s.id)}"><td><input data-key="name" value="${esc(s.name)}"></td><td><select data-key="type"><option value="seat" ${s.type==='seat'?'selected':''}>Seat</option><option value="baggage" ${s.type==='baggage'?'selected':''}>Baggage</option><option value="fuel" ${s.type==='fuel'?'selected':''}>Fuel</option><option value="other" ${s.type==='other'?'selected':''}>Other</option></select></td><td><input data-key="arm" type="number" step="0.01" value="${esc(s.arm)}"></td><td><input data-key="max" type="number" step="0.1" value="${esc(s.max)}"></td><td><input data-key="defaultValue" type="number" step="0.1" value="${esc(s.defaultValue)}"></td><td><button class="row-delete" data-delete-station="${esc(s.id)}">×</button></td></tr>`).join('');
}

function renderEnvelopeEditor() {
  const p = state.editorDraft;
  $('#envelopeEditorRows').innerHTML = (p?.envelope || []).map((point,index) => `<tr data-envelope-row="${index}"><td><input data-key="weight" type="number" step="0.1" value="${esc(point.weight)}"></td><td><input data-key="forward" type="number" step="0.01" value="${esc(point.forward)}"></td><td><input data-key="aft" type="number" step="0.01" value="${esc(point.aft)}"></td><td><button class="row-delete" data-delete-envelope="${index}">×</button></td></tr>`).join('');
}

function collectCurrentPerformanceTable() {
  const p = state.editorDraft;
  if (!p) return;
  const tab = state.perfEditorTab;
  if (tab === 'takeoff' || tab === 'landing') {
    p.performance[tab] = $$('[data-performance-row]').map(row => ({
      pa: number($('[data-key="pa"]',row)?.value),
      temp: number($('[data-key="temp"]',row)?.value),
      weight: number($('[data-key="weight"]',row)?.value),
      groundRoll: number($('[data-key="groundRoll"]',row)?.value),
      over50: number($('[data-key="over50"]',row)?.value)
    })).filter(r => Object.values(r).some(v => v !== 0));
  } else if (tab === 'cruise') {
    p.performance.cruise = $$('[data-performance-row]').map(row => ({
      altitude: number($('[data-key="altitude"]',row)?.value),
      power: number($('[data-key="power"]',row)?.value),
      tas: number($('[data-key="tas"]',row)?.value),
      burn: number($('[data-key="burn"]',row)?.value)
    })).filter(r => Object.values(r).some(v => v !== 0));
  } else if (tab === 'corrections') {
    p.performance.corrections = {
      grassPct: number($('#corrGrass')?.value), wetPct: number($('#corrWet')?.value), softPct: number($('#corrSoft')?.value),
      headwindPctPerKt: number($('#corrHeadwind')?.value), tailwindPctPerKt: number($('#corrTailwind')?.value)
    };
  }
}

function renderPerformanceEditor() {
  const p = state.editorDraft;
  $$('[data-perf-editor]').forEach(button => button.classList.toggle('active', button.dataset.perfEditor === state.perfEditorTab));
  const root = $('#performanceEditor');
  const tab = state.perfEditorTab;
  if (tab === 'takeoff' || tab === 'landing') {
    const rows = p.performance[tab] || [];
    root.innerHTML = `<div class="performance-editor-toolbar"><button class="secondary-button compact" id="addPerformanceRow">ADD DATA POINT</button></div><div class="table-wrap"><table class="data-table editable"><thead><tr><th>Pressure alt ft</th><th>Temp °C</th><th>Weight</th><th>Ground roll ft</th><th>Over 50 ft</th><th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr data-performance-row="${i}"><td><input data-key="pa" type="number" value="${esc(r.pa)}"></td><td><input data-key="temp" type="number" value="${esc(r.temp)}"></td><td><input data-key="weight" type="number" value="${esc(r.weight)}"></td><td><input data-key="groundRoll" type="number" value="${esc(r.groundRoll)}"></td><td><input data-key="over50" type="number" value="${esc(r.over50)}"></td><td><button class="row-delete" data-delete-performance="${i}">×</button></td></tr>`).join('')}</tbody></table></div>`;
  } else if (tab === 'cruise') {
    const rows = p.performance.cruise || [];
    root.innerHTML = `<div class="performance-editor-toolbar"><button class="secondary-button compact" id="addPerformanceRow">ADD DATA POINT</button></div><div class="table-wrap"><table class="data-table editable"><thead><tr><th>Altitude ft</th><th>Power %</th><th>TAS kt</th><th>Fuel / hr</th><th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr data-performance-row="${i}"><td><input data-key="altitude" type="number" value="${esc(r.altitude)}"></td><td><input data-key="power" type="number" value="${esc(r.power)}"></td><td><input data-key="tas" type="number" value="${esc(r.tas)}"></td><td><input data-key="burn" type="number" step="0.1" value="${esc(r.burn)}"></td><td><button class="row-delete" data-delete-performance="${i}">×</button></td></tr>`).join('')}</tbody></table></div>`;
  } else {
    const c = p.performance.corrections || {};
    root.innerHTML = `<div class="correction-grid"><label><span>Grass increase %</span><input id="corrGrass" type="number" step="1" value="${esc(c.grassPct || 0)}"></label><label><span>Wet increase %</span><input id="corrWet" type="number" step="1" value="${esc(c.wetPct || 0)}"></label><label><span>Soft increase %</span><input id="corrSoft" type="number" step="1" value="${esc(c.softPct || 0)}"></label><label><span>Headwind reduction % / kt</span><input id="corrHeadwind" type="number" step="0.1" value="${esc(c.headwindPctPerKt || 0)}"></label><label><span>Tailwind increase % / kt</span><input id="corrTailwind" type="number" step="0.1" value="${esc(c.tailwindPctPerKt || 0)}"></label></div>`;
  }
}

function collectProfileEditor() {
  const p = state.editorDraft || blankProfile();
  collectCurrentPerformanceTable();
  p.verified = $('#profileVerified').checked;
  p.name = $('#profileName').value.trim() || 'Unnamed aircraft';
  p.model = $('#profileModel').value.trim();
  p.registration = $('#profileRegistration').value.trim().toUpperCase();
  p.icao = $('#profileIcao').value.trim().toUpperCase();
  p.units = { weight: $('#profileWeightUnit').value, arm: $('#profileArmUnit').value, fuel: $('#profileFuelUnit').value };
  p.fuelDensity = number($('#profileFuelDensity').value);
  p.emptyWeight = number($('#profileEmptyWeight').value);
  p.emptyArm = number($('#profileEmptyArm').value);
  p.limits = {
    maxRamp: number($('#profileMaxRamp').value), maxTakeoff: number($('#profileMaxTakeoff').value), maxLanding: number($('#profileMaxLanding').value),
    maxZeroFuel: number($('#profileMaxZeroFuel').value), usableFuel: number($('#profileUsableFuel').value), maxCrosswind: number($('#profileMaxCrosswind').value)
  };
  p.defaults = { tas: number($('#profileDefaultTas').value), burn: number($('#profileDefaultBurn').value), taxiBurn: number($('#profileTaxiBurn').value) };
  p.revision = $('#profileRevision').value.trim();
  p.stations = $$('[data-station-row]').map(row => ({
    id: row.dataset.stationRow,
    name: $('[data-key="name"]',row).value.trim() || 'Station',
    type: $('[data-key="type"]',row).value,
    arm: number($('[data-key="arm"]',row).value),
    max: number($('[data-key="max"]',row).value),
    defaultValue: number($('[data-key="defaultValue"]',row).value)
  }));
  p.envelope = $$('[data-envelope-row]').map(row => ({
    weight: number($('[data-key="weight"]',row).value), forward: number($('[data-key="forward"]',row).value), aft: number($('[data-key="aft"]',row).value)
  })).filter(r => r.weight > 0).sort((a,b)=>a.weight-b.weight);
  p.updatedAt = new Date().toISOString();
  state.editorDraft = p;
  return p;
}

function saveProfile() {
  const profile = collectProfileEditor();
  const index = state.profiles.findIndex(p => p.id === profile.id);
  if (index >= 0) state.profiles[index] = normalizeProfile(profile); else state.profiles.push(normalizeProfile(profile));
  saveProfiles();
  if (state.activeProfileId === profile.id) {
    state.flight.activeProfileId = profile.id;
    state.wb = calculateWeightBalance();
  }
  renderProfileSelect();
  renderAircraftList();
  renderAll();
  toast('Aircraft profile saved');
}

function chooseEditorProfile(id) {
  const profile = state.profiles.find(p => p.id === id);
  if (!profile) return;
  state.editorProfileId = id;
  loadEditorDraft(profile);
}

function newProfile() {
  const profile = blankProfile();
  state.profiles.push(profile);
  state.editorProfileId = profile.id;
  saveProfiles();
  loadEditorDraft(profile);
  renderProfileSelect();
  toast('New blank profile created');
}

function duplicateProfile() {
  const source = collectProfileEditor();
  const copy = structuredCloneSafe(source);
  copy.id = uid();
  copy.name = `${source.name} Copy`;
  copy.registration = '';
  copy.verified = false;
  copy.stations = copy.stations.map(s => ({ ...s, id: uid() }));
  state.profiles.push(copy);
  state.editorProfileId = copy.id;
  saveProfiles();
  loadEditorDraft(copy);
  renderProfileSelect();
  toast('Profile duplicated and marked unverified');
}

function deleteProfile() {
  if (state.profiles.length <= 1) return toast('At least one aircraft profile is required');
  const profile = editorProfile();
  if (!profile || !confirm(`Delete ${profile.name}?`)) return;
  state.profiles = state.profiles.filter(p => p.id !== profile.id);
  if (state.activeProfileId === profile.id) {
    state.activeProfileId = state.profiles[0].id;
    state.flight.activeProfileId = state.activeProfileId;
    state.flight.load = Object.fromEntries(state.profiles[0].stations.map(s => [s.id,s.defaultValue || 0]));
  }
  state.editorProfileId = state.profiles[0].id;
  saveProfiles();
  renderProfileSelect();
  loadEditorDraft(state.profiles[0]);
  recalculate();
  toast('Profile deleted');
}

function resetLoad() {
  const p = activeProfile();
  if (!p) return;
  state.flight.load = Object.fromEntries(p.stations.map(s => [s.id,s.defaultValue || 0]));
  recalculate();
  toast('Load reset to profile defaults');
}

function renderChecklists() {
  const profile = activeProfile();
  const sections = profile?.checklists || DEFAULT_CHECKLISTS;
  const keyBase = profile?.id || 'default';
  $('#checklistSections').innerHTML = sections.map((section,sIndex) => `<article class="panel checklist-card"><h3>${esc(section.name)}</h3><div class="checklist-items">${(section.items || []).map((item,iIndex) => {
    const key = `${keyBase}:${sIndex}:${iIndex}`;
    const checked = !!state.checklistChecks[key];
    return `<label class="checklist-row ${checked?'checked':''}"><input type="checkbox" data-checklist-key="${esc(key)}" ${checked?'checked':''}><span>${esc(item)}</span></label>`;
  }).join('')}</div></article>`).join('');
  $('#checklistJson').value = JSON.stringify(sections, null, 2);
}

function saveChecklistEditor() {
  const profile = activeProfile();
  if (!profile) return;
  try {
    const parsed = JSON.parse($('#checklistJson').value);
    if (!Array.isArray(parsed) || parsed.some(s => !s.name || !Array.isArray(s.items))) throw new Error('Use an array of sections with name and items.');
    profile.checklists = parsed.map(s => ({ name: String(s.name), items: s.items.map(String) }));
    saveProfiles();
    $('#checklistEditorPanel').classList.add('hidden');
    renderChecklists();
    toast('Aircraft checklists saved');
  } catch (error) { toast(error.message); }
}

function resetChecklistChecks() {
  const profile = activeProfile();
  const prefix = `${profile?.id || 'default'}:`;
  for (const key of Object.keys(state.checklistChecks)) if (key.startsWith(prefix)) delete state.checklistChecks[key];
  localStorage.setItem(STORAGE.checklist, JSON.stringify(state.checklistChecks));
  renderChecklists();
}

async function sha256(value) {
  if (!crypto?.subtle) return 'UNAVAILABLE';
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,'0')).join('');
}

async function makeSnapshot(kind = 'flight') {
  const profile = activeProfile();
  const payload = {
    version: 2,
    kind,
    savedAt: new Date().toISOString(),
    flight: structuredCloneSafe(state.flight),
    profile: structuredCloneSafe(profile),
    calculations: structuredCloneSafe(state.calculations),
    weightBalance: structuredCloneSafe(state.wb),
    performance: structuredCloneSafe(state.performance),
    briefing: {
      fetchedAt: state.briefingFetchedAt,
      sources: structuredCloneSafe(state.briefingSources),
      airports: structuredCloneSafe(state.airports),
      weather: structuredCloneSafe(state.weather),
      hazards: structuredCloneSafe(state.hazards),
      tfrs: structuredCloneSafe(state.tfrs),
      officialNotamCheck: structuredCloneSafe(state.flight.officialNotamCheck)
    }
  };
  payload.hash = await sha256(JSON.stringify(payload));
  return payload;
}

async function saveFlightSnapshot(kind = 'flight') {
  state.flight = collectFlight();
  state.calculations = calculatePlan(state.flight);
  state.wb = calculateWeightBalance();
  const snapshot = await makeSnapshot(kind);
  const saved = loadSavedFlights();
  saved.unshift(snapshot);
  localStorage.setItem(STORAGE.flights, JSON.stringify(saved.slice(0,50)));
  renderSavedFlights();
  toast(kind === 'briefing' ? 'Briefing snapshot saved locally' : 'Flight snapshot saved locally');
}

function renderSavedFlights() {
  const flights = loadSavedFlights();
  $('#savedFlights').innerHTML = flights.length ? flights.map((record,index) => {
    const f = record.flight || {};
    return `<article class="panel saved-card"><span class="eyebrow">${esc((record.kind || 'FLIGHT').toUpperCase())} · ${esc(formatDateTime(record.savedAt))}</span><div class="route">${esc(f.origin || '—')} <span>→</span> ${esc(f.destination || '—')}</div><p>${esc(f.callsign || record.profile?.registration || 'UNNUMBERED')} · ${esc(record.profile?.name || 'AIRCRAFT')} · ${esc(f.departureDate || '')} ${esc(f.departureTime || '')}Z</p><div class="saved-meta"><div><span>DIST</span><strong>${Number.isFinite(record.calculations?.distanceNm) ? `${Math.round(record.calculations.distanceNm)} NM` : '—'}</strong></div><div><span>W&B</span><strong>${record.weightBalance?.ok ? 'PASS' : 'CHECK'}</strong></div><div><span>BRIEF</span><strong>${record.briefing?.fetchedAt ? formatDateTime(record.briefing.fetchedAt) : 'NONE'}</strong></div></div><div class="saved-actions"><button class="secondary-button" data-load-snapshot="${index}">LOAD</button><button class="delete-button" data-delete-snapshot="${index}">×</button></div></article>`;
  }).join('') : '<div class="panel empty-state">No saved flight or briefing snapshots.</div>';
}

function loadSnapshot(index) {
  const record = loadSavedFlights()[index];
  if (!record) return;
  if (record.profile) {
    const existing = state.profiles.findIndex(p => p.id === record.profile.id);
    if (existing >= 0) state.profiles[existing] = normalizeProfile(record.profile); else state.profiles.push(normalizeProfile(record.profile));
    saveProfiles();
  }
  state.airports = record.briefing?.airports || {};
  state.weather = record.briefing?.weather || {metars:[],tafs:[]};
  state.hazards = record.briefing?.hazards || {sigmets:[],gairmets:[],pireps:[]};
  state.tfrs = record.briefing?.tfrs || [];
  state.briefingFetchedAt = record.briefing?.fetchedAt || null;
  state.briefingSources = record.briefing?.sources || {};
  renderProfileSelect();
  applyFlight(record.flight);
  setView('plan');
  renderAll();
  toast('Snapshot loaded');
}

function deleteSnapshot(index) {
  const saved = loadSavedFlights();
  saved.splice(index,1);
  localStorage.setItem(STORAGE.flights, JSON.stringify(saved));
  renderSavedFlights();
}

function download(filename, content, type='application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function exportProfiles() {
  download(`aerobrief-aircraft-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({version:2,profiles:state.profiles},null,2));
}

async function importProfiles(file) {
  try {
    const data = JSON.parse(await file.text());
    const profiles = Array.isArray(data) ? data : data.profiles;
    if (!Array.isArray(profiles) || !profiles.length) throw new Error('No profiles found.');
    const map = new Map(state.profiles.map(p => [p.id,p]));
    profiles.forEach(p => { const normalized=normalizeProfile(p); map.set(normalized.id,normalized); });
    state.profiles = [...map.values()];
    saveProfiles();
    renderProfileSelect();
    renderAircraftList();
    toast(`${profiles.length} profile(s) imported`);
  } catch (error) { toast(`Import failed: ${error.message}`); }
}

function allDataBundle() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    profiles: state.profiles,
    flights: loadSavedFlights(),
    settings: loadSettings(),
    active: safeParse(localStorage.getItem(STORAGE.active), null),
    checklistChecks: state.checklistChecks
  };
}

function exportAllData() {
  download(`aerobrief-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(allDataBundle(),null,2));
}

async function importAllData(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.version !== 2) throw new Error('This is not an AeroBrief v2 backup.');
    if (Array.isArray(data.profiles) && data.profiles.length) localStorage.setItem(STORAGE.profiles,JSON.stringify(data.profiles));
    if (Array.isArray(data.flights)) localStorage.setItem(STORAGE.flights,JSON.stringify(data.flights));
    if (data.settings) localStorage.setItem(STORAGE.settings,JSON.stringify(data.settings));
    if (data.active) localStorage.setItem(STORAGE.active,JSON.stringify(data.active));
    if (data.checklistChecks) localStorage.setItem(STORAGE.checklist,JSON.stringify(data.checklistChecks));
    location.reload();
  } catch (error) { toast(`Import failed: ${error.message}`); }
}

function renderSettings() {
  const s = loadSettings();
  for (const [id,key] of [['minCeilingVfr','minCeilingVfr'],['minVisibilityVfr','minVisibilityVfr'],['minCeilingIfr','minCeilingIfr'],['minVisibilityIfr','minVisibilityIfr'],['maxCrosswind','maxCrosswind'],['maxGustSpread','maxGustSpread'],['maxDensityAltitude','maxDensityAltitude'],['briefStaleMinutes','briefStaleMinutes'],['manualDistance','manualDistance'],['defaultContingency','defaultContingency'],['reserveVfrDay','reserveVfrDay'],['reserveVfrNight','reserveVfrNight'],['reserveIfr','reserveIfr'],['displayDensity','displayDensity']]) setEditorValue(id,s[key]);
  document.body.classList.toggle('compact',s.displayDensity==='compact');
  $('#sourceSettingsList').innerHTML = state.sourceStatus.length ? state.sourceStatus.map(source => `<div class="data-item"><strong>${esc(source.name)} · ${esc(source.mode.toUpperCase())}</strong><p>${esc((source.products || []).join(', '))}</p><div class="meta"><a href="${esc(source.url)}" target="_blank" rel="noopener">OPEN OFFICIAL SOURCE</a></div></div>`).join('') : '<div class="data-item"><strong>Source status not loaded</strong><p>The app will retry when online.</p></div>';
}

function saveMinimaSettings() {
  const s = loadSettings();
  Object.assign(s, {
    minCeilingVfr:number($('#minCeilingVfr').value), minVisibilityVfr:number($('#minVisibilityVfr').value), minCeilingIfr:number($('#minCeilingIfr').value), minVisibilityIfr:number($('#minVisibilityIfr').value),
    maxCrosswind:number($('#maxCrosswind').value), maxGustSpread:number($('#maxGustSpread').value), maxDensityAltitude:number($('#maxDensityAltitude').value), briefStaleMinutes:number($('#briefStaleMinutes').value)
  });
  localStorage.setItem(STORAGE.settings,JSON.stringify(s));
  renderAll(); toast('Personal minima saved');
}

function savePlanningSettings() {
  const s = loadSettings();
  Object.assign(s, {
    manualDistance:$('#manualDistance').value, defaultContingency:number($('#defaultContingency').value), reserveVfrDay:number($('#reserveVfrDay').value), reserveVfrNight:number($('#reserveVfrNight').value), reserveIfr:number($('#reserveIfr').value), displayDensity:$('#displayDensity').value
  });
  localStorage.setItem(STORAGE.settings,JSON.stringify(s));
  document.body.classList.toggle('compact',s.displayDensity==='compact');
  recalculate(); toast('Planning settings saved');
}

function clearData() {
  if (!confirm('Clear all aircraft profiles, flights, loads, settings and briefing data from this browser?')) return;
  Object.values(STORAGE).forEach(key => localStorage.removeItem(key));
  location.reload();
}

function officialNotamCheck() {
  state.flight = collectFlight();
  state.flight.officialNotamCheck = { time:new Date().toISOString(), reference:$('#officialBriefReference').value.trim() };
  persistActive(); renderAll(); toast('Official NOTAM / briefing check recorded');
}

function performanceWorksheetText() {
  const p = state.performance;
  if (!p) return 'No performance calculation.';
  const lines = [
    'AEROBRIEF PERFORMANCE WORKSHEET',
    `Aircraft: ${activeProfile()?.name || ''}`,
    `Route: ${state.flight.origin} - ${state.flight.destination}`,
    `Pressure altitude: ${Math.round(p.pa)} ft`,
    `Density altitude: ${Math.round(p.da)} ft`,
    `Headwind: ${formatNumber(p.headwind,1)} kt`,
    `Crosswind: ${formatNumber(p.crosswind,1)} kt`,
    `Runway length: ${p.runwayLength || 'not entered'} ft`,
    p.takeoff ? `Takeoff planned over-50-ft: ${Math.round(p.takeoff.plannedOver50)} ft` : 'Takeoff table unavailable',
    p.landing ? `Landing planned over-50-ft: ${Math.round(p.landing.plannedOver50)} ft` : 'Landing table unavailable',
    `Profile verified: ${p.profileVerified ? 'YES' : 'NO'}`,
    'VERIFY AGAINST CURRENT POH/AFM AND ACTUAL CONDITIONS.'
  ];
  return lines.join('\n');
}

function setView(name) {
  // Preserve unsaved aircraft-editor work while moving between views.
  if (state.activeView === 'aircraft' && name !== 'aircraft' && state.editorDraft) {
    try { collectProfileEditor(); } catch (error) { console.warn('Could not preserve aircraft editor draft', error); }
  }
  state.activeView = name;
  $$('[data-view-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === name));
  $$('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  const meta = viewMeta[name] || viewMeta.plan;
  $('#viewEyebrow').textContent = meta[0];
  $('#viewTitle').textContent = meta[1];
  if (window.innerWidth <= 920) $('#sidebar').classList.remove('open');
  if (name === 'aircraft') renderProfileEditor();
  if (name === 'checklists') renderChecklists();
  if (name === 'flights') renderSavedFlights();
  if (name === 'settings') renderSettings();
  document.querySelector('.content')?.scrollTo({top:0,behavior:'smooth'});
}

function renderAll() {
  state.calculations = calculatePlan(state.flight);
  state.wb = calculateWeightBalance();
  renderTop();
  renderPlan();
  renderWeather();
  renderHazards();
  renderTfrs();
  renderAlerts();
  renderBriefingHeader();
  renderSources();
  renderWeightBalance();
  renderPerformance();
  renderCompleteness();
  renderChecklists();
  renderSavedFlights();
  renderSettings();
}

let toastTimer;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'),3000);
}

function setBusy(button,busy,label='WORKING…') {
  if (!button) return;
  if (busy) { button.dataset.text=button.textContent; button.textContent=label; button.disabled=true; }
  else { button.textContent=button.dataset.text || button.textContent; button.disabled=false; }
}

async function fetchSourceStatus() {
  try { const data=await fetchJson('/api/source-status'); state.sourceStatus=data.sources || []; renderSettings(); } catch { state.sourceStatus=[]; }
}

function bindEvents() {
  $$('[data-view]').forEach(button => button.addEventListener('click',()=>setView(button.dataset.view)));
  $('#menuButton').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  document.addEventListener('click',event=>{ if (window.innerWidth<=920 && $('#sidebar').classList.contains('open') && !event.target.closest('#sidebar') && !event.target.closest('#menuButton')) $('#sidebar').classList.remove('open'); });

  $$('[data-view-panel="plan"] input, [data-view-panel="plan"] select, [data-view-panel="plan"] textarea').forEach(input => input.addEventListener('input',()=>{
    if (input.classList.contains('icao-input')) input.value=input.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
    recalculate();
  }));
  $('#activeAircraft').addEventListener('change',()=>{
    const oldProfile=activeProfile();
    state.flight=collectFlight();
    state.activeProfileId=$('#activeAircraft').value;
    state.flight.activeProfileId=state.activeProfileId;
    const p=activeProfile();
    if (p && p.id !== oldProfile?.id) {
      state.flight.load=Object.fromEntries(p.stations.map(s=>[s.id,s.defaultValue||0]));
      if (p.defaults.tas) state.flight.tas=p.defaults.tas;
      if (p.defaults.burn) state.flight.fuelBurn=p.defaults.burn;
      if (p.registration) state.flight.callsign=p.registration;
      applyFlight(state.flight);
    }
    renderAll();
  });
  $('#flightRules').addEventListener('change',()=>{
    const s=loadSettings();
    $('#reserveMinutes').value=$('#flightRules').value==='IFR'?s.reserveIfr:s.reserveVfrDay;
    recalculate();
  });

  $('#buildBriefButton').addEventListener('click',async()=>{ const b=$('#buildBriefButton'); setBusy(b,true,'LOADING FAA DATA…'); try { await loadBriefing(); setView('brief'); toast('FAA-source briefing loaded'); } catch(e){toast(e.message);} finally{setBusy(b,false);} });
  $('#refreshBriefButton').addEventListener('click',async()=>{ const b=$('#refreshBriefButton'); setBusy(b,true,'REFRESHING…'); try{await loadBriefing();toast('Briefing refreshed');}catch(e){toast(e.message);}finally{setBusy(b,false);} });
  $('#saveFlightButton').addEventListener('click',()=>saveFlightSnapshot('flight'));
  $('#saveBriefSnapshotButton').addEventListener('click',()=>saveFlightSnapshot('briefing'));
  $('#printPackageButton').addEventListener('click',()=>window.print());
  $('#openNotamButton').addEventListener('click',()=>window.open('https://notams.aim.faa.gov/notamSearch/','aerobrief-notam'));
  $('#openWxBriefButton').addEventListener('click',()=>window.open('https://www.1800wxbrief.com/','aerobrief-wxbrief'));
  $('#confirmNotamButton').addEventListener('click',officialNotamCheck);
  $$('[data-hazard-filter]').forEach(button=>button.addEventListener('click',()=>{state.hazardFilter=button.dataset.hazardFilter;$$('[data-hazard-filter]').forEach(b=>b.classList.toggle('active',b===button));renderHazards();}));

  $('#loadRows').addEventListener('input',event=>{ const input=event.target.closest('[data-load-station]'); if(!input)return; state.flight.load={...(state.flight.load||{}),[input.dataset.loadStation]:number(input.value)}; recalculate(); });
  $('#resetLoadButton').addEventListener('click',resetLoad);
  $('#saveLoadButton').addEventListener('click',()=>{persistActive();toast('Load saved with active flight');});

  $('#calculatePerformanceButton').addEventListener('click',calculatePerformance);
  $('#copyPerformanceButton').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(performanceWorksheetText());toast('Performance worksheet copied');}catch{toast('Clipboard access blocked');}});

  $('#aircraftList').addEventListener('click',event=>{const button=event.target.closest('[data-profile-id]');if(button)chooseEditorProfile(button.dataset.profileId);});
  $('#newAircraftButton').addEventListener('click',newProfile);
  $('#duplicateAircraftButton').addEventListener('click',duplicateProfile);
  $('#saveAircraftButton').addEventListener('click',saveProfile);
  $('#deleteAircraftButton').addEventListener('click',deleteProfile);
  $('#addStationButton').addEventListener('click',()=>{collectProfileEditor();state.editorDraft.stations.push({id:uid(),name:'New station',type:'other',arm:0,max:0,defaultValue:0});renderStationEditor();});
  $('#stationEditorRows').addEventListener('click',event=>{const button=event.target.closest('[data-delete-station]');if(!button)return;collectProfileEditor();state.editorDraft.stations=state.editorDraft.stations.filter(s=>s.id!==button.dataset.deleteStation);renderStationEditor();});
  $('#addEnvelopeButton').addEventListener('click',()=>{collectProfileEditor();state.editorDraft.envelope.push({weight:0,forward:0,aft:0});renderEnvelopeEditor();});
  $('#envelopeEditorRows').addEventListener('click',event=>{const button=event.target.closest('[data-delete-envelope]');if(!button)return;collectProfileEditor();state.editorDraft.envelope.splice(Number(button.dataset.deleteEnvelope),1);renderEnvelopeEditor();});
  $$('[data-perf-editor]').forEach(button=>button.addEventListener('click',()=>{collectProfileEditor();state.perfEditorTab=button.dataset.perfEditor;renderPerformanceEditor();}));
  $('#performanceEditor').addEventListener('click',event=>{
    if(event.target.closest('#addPerformanceRow')){collectCurrentPerformanceTable();const tab=state.perfEditorTab;if(tab==='takeoff'||tab==='landing')state.editorDraft.performance[tab].push({pa:0,temp:0,weight:0,groundRoll:0,over50:0});else if(tab==='cruise')state.editorDraft.performance.cruise.push({altitude:0,power:0,tas:0,burn:0});renderPerformanceEditor();return;}
    const del=event.target.closest('[data-delete-performance]');if(del){collectCurrentPerformanceTable();state.editorDraft.performance[state.perfEditorTab].splice(Number(del.dataset.deletePerformance),1);renderPerformanceEditor();}
  });
  $('#exportAircraftButton').addEventListener('click',exportProfiles);
  $('#importAircraftButton').addEventListener('click',()=>$('#aircraftFileInput').click());
  $('#aircraftFileInput').addEventListener('change',event=>{const file=event.target.files?.[0];if(file)importProfiles(file);event.target.value='';});

  $('#checklistSections').addEventListener('change',event=>{const input=event.target.closest('[data-checklist-key]');if(!input)return;state.checklistChecks[input.dataset.checklistKey]=input.checked;localStorage.setItem(STORAGE.checklist,JSON.stringify(state.checklistChecks));renderChecklists();});
  $('#resetChecklistButton').addEventListener('click',resetChecklistChecks);
  $('#editChecklistButton').addEventListener('click',()=>$('#checklistEditorPanel').classList.toggle('hidden'));
  $('#saveChecklistEditorButton').addEventListener('click',saveChecklistEditor);

  $('#savedFlights').addEventListener('click',event=>{const load=event.target.closest('[data-load-snapshot]');const del=event.target.closest('[data-delete-snapshot]');if(load)loadSnapshot(Number(load.dataset.loadSnapshot));if(del)deleteSnapshot(Number(del.dataset.deleteSnapshot));});
  $('#exportAllButton').addEventListener('click',exportAllData);
  $('#importAllButton').addEventListener('click',()=>$('#backupFileInput').click());
  $('#backupFileInput').addEventListener('change',event=>{const file=event.target.files?.[0];if(file)importAllData(file);event.target.value='';});
  $('#exportDataButton').addEventListener('click',exportAllData);
  $('#clearDataButton').addEventListener('click',clearData);
  $('#saveSettingsButton').addEventListener('click',saveMinimaSettings);
  $('#savePlanningSettingsButton').addEventListener('click',savePlanningSettings);

  $('#safetyAcknowledge').addEventListener('change',event=>$('#acceptSafetyButton').disabled=!event.target.checked);
  $('#acceptSafetyButton').addEventListener('click',()=>{localStorage.setItem(STORAGE.acknowledged,'yes');$('#safetyModal').classList.add('hidden');});
  window.addEventListener('online',updateOnlineStatus);
  window.addEventListener('offline',updateOnlineStatus);
}

function updateOnlineStatus() {
  const online=navigator.onLine;
  $('#onlineDot').classList.toggle('offline',!online);
  $('#onlineLabel').textContent=online?'ONLINE':'OFFLINE';
}

function startClock() {
  const tick=()=>$('#zuluClock').textContent=new Date().toISOString().slice(11,19);
  tick();setInterval(tick,1000);
}

function restoreState() {
  state.profiles=loadProfiles();
  const saved=safeParse(localStorage.getItem(STORAGE.active),null);
  state.activeProfileId=saved?.activeProfileId || saved?.flight?.activeProfileId || state.profiles[0].id;
  state.airports=saved?.airports || {};
  state.weather=saved?.weather || {metars:[],tafs:[]};
  state.hazards=saved?.hazards || {sigmets:[],gairmets:[],pireps:[]};
  state.tfrs=saved?.tfrs || [];
  state.briefingFetchedAt=saved?.briefingFetchedAt || null;
  state.briefingSources=saved?.briefingSources || {};
  state.checklistChecks=safeParse(localStorage.getItem(STORAGE.checklist),{});
  state.editorProfileId=state.activeProfileId;
  renderProfileSelect();
  applyFlight(saved?.flight || defaultFlight());
  loadEditorDraft(editorProfile());
}

async function registerServiceWorker() {
  if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('/sw.js');}catch(e){console.warn('Service worker registration failed',e);}}
}

function init() {
  bindEvents();
  restoreState();
  renderAll();
  updateOnlineStatus();
  startClock();
  fetchSourceStatus();
  registerServiceWorker();
  if(localStorage.getItem(STORAGE.acknowledged)!=='yes') $('#safetyModal').classList.remove('hidden');
  else $('#safetyModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded',init);
