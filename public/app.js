const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE = {
  active: 'aerobrief.active.v1',
  saved: 'aerobrief.saved.v1',
  settings: 'aerobrief.settings.v1'
};

const FALLBACK_AIRPORTS = {
  KIND: { icaoId: 'KIND', name: 'Indianapolis International', lat: 39.7173, lon: -86.2944, elev: 797, runways: [{ runway: '05L/23R', dimension: '11200x150' }, { runway: '05R/23L', dimension: '10000x150' }, { runway: '14/32', dimension: '7605x150' }] },
  KUMP: { icaoId: 'KUMP', name: 'Indianapolis Metropolitan', lat: 39.9352, lon: -86.045, elev: 811, runways: [{ runway: '15/33', dimension: '4004x100' }] },
  KHFY: { icaoId: 'KHFY', name: 'Indy South Greenwood', lat: 39.6284, lon: -86.0879, elev: 822, runways: [{ runway: '01/19', dimension: '5102x100' }] },
  KMIA: { icaoId: 'KMIA', name: 'Miami International', lat: 25.7959, lon: -80.287, elev: 8, runways: [{ runway: '08L/26R', dimension: '8600x150' }, { runway: '08R/26L', dimension: '10506x200' }, { runway: '09/27', dimension: '13016x150' }, { runway: '12/30', dimension: '9355x150' }] },
  KFLL: { icaoId: 'KFLL', name: 'Fort Lauderdale/Hollywood International', lat: 26.0726, lon: -80.1527, elev: 65, runways: [{ runway: '10L/28R', dimension: '9000x150' }, { runway: '10R/28L', dimension: '8000x150' }] },
  KORD: { icaoId: 'KORD', name: "Chicago O'Hare International", lat: 41.9742, lon: -87.9073, elev: 672, runways: [{ runway: '04L/22R' }, { runway: '04R/22L' }, { runway: '09L/27R' }, { runway: '09C/27C' }, { runway: '09R/27L' }, { runway: '10L/28R' }, { runway: '10C/28C' }, { runway: '10R/28L' }] },
  KJFK: { icaoId: 'KJFK', name: 'John F Kennedy International', lat: 40.6413, lon: -73.7781, elev: 13, runways: [{ runway: '04L/22R' }, { runway: '04R/22L' }, { runway: '13L/31R' }, { runway: '13R/31L' }] },
  KLAX: { icaoId: 'KLAX', name: 'Los Angeles International', lat: 33.9416, lon: -118.4085, elev: 128, runways: [{ runway: '06L/24R' }, { runway: '06R/24L' }, { runway: '07L/25R' }, { runway: '07R/25L' }] },
  KATL: { icaoId: 'KATL', name: 'Hartsfield-Jackson Atlanta International', lat: 33.6407, lon: -84.4277, elev: 1026, runways: [{ runway: '08L/26R' }, { runway: '08R/26L' }, { runway: '09L/27R' }, { runway: '09R/27L' }, { runway: '10/28' }] },
  KDFW: { icaoId: 'KDFW', name: 'Dallas/Fort Worth International', lat: 32.8998, lon: -97.0403, elev: 607, runways: [{ runway: '13L/31R' }, { runway: '13R/31L' }, { runway: '17C/35C' }, { runway: '17L/35R' }, { runway: '17R/35L' }, { runway: '18L/36R' }, { runway: '18R/36L' }] },
  KDEN: { icaoId: 'KDEN', name: 'Denver International', lat: 39.8561, lon: -104.6737, elev: 5434, runways: [{ runway: '07/25' }, { runway: '08/26' }, { runway: '16L/34R' }, { runway: '16R/34L' }, { runway: '17L/35R' }, { runway: '17R/35L' }] },
  KSEA: { icaoId: 'KSEA', name: 'Seattle-Tacoma International', lat: 47.4502, lon: -122.3088, elev: 433, runways: [{ runway: '16L/34R' }, { runway: '16C/34C' }, { runway: '16R/34L' }] },
  KBOS: { icaoId: 'KBOS', name: 'Boston Logan International', lat: 42.3656, lon: -71.0096, elev: 20, runways: [{ runway: '04L/22R' }, { runway: '04R/22L' }, { runway: '09/27' }, { runway: '14/32' }, { runway: '15L/33R' }, { runway: '15R/33L' }] },
  KSFO: { icaoId: 'KSFO', name: 'San Francisco International', lat: 37.6213, lon: -122.379, elev: 13, runways: [{ runway: '01L/19R' }, { runway: '01R/19L' }, { runway: '10L/28R' }, { runway: '10R/28L' }] },
  CYYZ: { icaoId: 'CYYZ', name: 'Toronto Pearson International', lat: 43.6777, lon: -79.6248, elev: 569, runways: [{ runway: '05/23' }, { runway: '06L/24R' }, { runway: '06R/24L' }, { runway: '15L/33R' }, { runway: '15R/33L' }] },
  EGLL: { icaoId: 'EGLL', name: 'London Heathrow', lat: 51.47, lon: -0.4543, elev: 83, runways: [{ runway: '09L/27R' }, { runway: '09R/27L' }] },
  LFPG: { icaoId: 'LFPG', name: 'Paris Charles de Gaulle', lat: 49.0097, lon: 2.5479, elev: 392, runways: [{ runway: '08L/26R' }, { runway: '08R/26L' }, { runway: '09L/27R' }, { runway: '09R/27L' }] },
  EHAM: { icaoId: 'EHAM', name: 'Amsterdam Schiphol', lat: 52.3105, lon: 4.7683, elev: -11, runways: [{ runway: '04/22' }, { runway: '06/24' }, { runway: '09/27' }, { runway: '18C/36C' }, { runway: '18L/36R' }, { runway: '18R/36L' }] },
  OMDB: { icaoId: 'OMDB', name: 'Dubai International', lat: 25.2532, lon: 55.3657, elev: 62, runways: [{ runway: '12L/30R' }, { runway: '12R/30L' }] },
  RJTT: { icaoId: 'RJTT', name: 'Tokyo Haneda', lat: 35.5494, lon: 139.7798, elev: 21, runways: [{ runway: '04/22' }, { runway: '05/23' }, { runway: '16L/34R' }, { runway: '16R/34L' }] },
  YSSY: { icaoId: 'YSSY', name: 'Sydney Kingsford Smith', lat: -33.9399, lon: 151.1753, elev: 21, runways: [{ runway: '07/25' }, { runway: '16L/34R' }, { runway: '16R/34L' }] }
};

const viewMeta = {
  plan: ['FLIGHT PLANNING', 'Build a flight'],
  brief: ['LIVE BRIEFING', 'Weather and route scan'],
  map: ['ROUTE OVERVIEW', 'Map and navigation'],
  ofp: ['DISPATCH PACKAGE', 'Operational flight plan'],
  saved: ['LOCAL LIBRARY', 'Saved flights'],
  settings: ['CONFIGURATION', 'App preferences']
};

const defaultSettings = {
  aircraft: 'C172',
  registration: '',
  tas: 120,
  fuelBurn: 9.5,
  reserve: 45,
  fuelUnit: 'GAL'
};

let state = {
  plan: null,
  airports: {},
  weather: { metars: [], tafs: [] },
  hazards: { sigmets: [], gairmets: [], pireps: [] },
  calculations: {},
  briefingFetchedAt: null,
  importedOfpText: '',
  map: null,
  mapLayers: [],
  hazardFilter: 'all'
};

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function loadSettings() {
  return { ...defaultSettings, ...safeJsonParse(localStorage.getItem(STORAGE.settings), {}) };
}

function loadSavedPlans() {
  const value = safeJsonParse(localStorage.getItem(STORAGE.saved), []);
  return Array.isArray(value) ? value : [];
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHeading(value) {
  return (value % 360 + 360) % 360;
}

function angularDifference(a, b) {
  return ((a - b + 540) % 360) - 180;
}

function formatDuration(hours) {
  if (!Number.isFinite(hours) || hours < 0) return '—';
  const totalMinutes = Math.round(hours * 60);
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString().replace('T', ' ').slice(0, 16) + 'Z';
}

function formatFuel(value) {
  return Number.isFinite(value) ? value.toFixed(value >= 100 ? 0 : 1) : '—';
}

function hpaToInHg(value) {
  return Number.isFinite(Number(value)) ? (Number(value) * 0.0295299830714).toFixed(2) : '—';
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.original = button.textContent;
    button.textContent = label || 'LOADING…';
    button.disabled = true;
  } else {
    button.textContent = button.dataset.original || button.textContent;
    button.disabled = false;
  }
}

let toastTimer;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function defaultPlan() {
  const settings = loadSettings();
  const now = new Date();
  const zuluDate = now.toISOString().slice(0, 10);
  const rounded = new Date(Math.ceil(now.getTime() / 15 / 60_000) * 15 * 60_000);
  return {
    id: crypto.randomUUID(),
    callsign: settings.registration || '',
    aircraft: settings.aircraft,
    registration: settings.registration,
    flightRules: 'IFR',
    origin: 'KIND',
    destination: 'KMIA',
    alternate: 'KFLL',
    departureDate: zuluDate,
    departureTime: rounded.toISOString().slice(11, 16),
    cruiseAltitude: 10000,
    tas: settings.tas,
    taxiMinutes: 15,
    route: 'DCT',
    remarks: 'FLIGHT SIMULATION ONLY',
    windDirection: 270,
    windSpeed: 20,
    fuelBurn: settings.fuelBurn,
    fuelUnit: settings.fuelUnit,
    reserveMinutes: settings.reserve,
    extraFuel: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function collectPlan() {
  return {
    ...(state.plan || defaultPlan()),
    callsign: $('#callsign').value.trim().toUpperCase(),
    aircraft: $('#aircraft').value.trim().toUpperCase(),
    registration: $('#registration').value.trim().toUpperCase(),
    flightRules: $('#flightRules').value,
    origin: $('#origin').value.trim().toUpperCase(),
    destination: $('#destination').value.trim().toUpperCase(),
    alternate: $('#alternate').value.trim().toUpperCase(),
    departureDate: $('#departureDate').value,
    departureTime: $('#departureTime').value,
    cruiseAltitude: toNumber($('#cruiseAltitude').value),
    tas: toNumber($('#tas').value),
    taxiMinutes: toNumber($('#taxiMinutes').value),
    route: $('#route').value.trim().toUpperCase(),
    remarks: $('#remarks').value.trim(),
    windDirection: toNumber($('#windDirection').value),
    windSpeed: toNumber($('#windSpeed').value),
    fuelBurn: toNumber($('#fuelBurn').value),
    fuelUnit: $('#fuelUnit').value,
    reserveMinutes: toNumber($('#reserveMinutes').value),
    extraFuel: toNumber($('#extraFuel').value),
    updatedAt: new Date().toISOString()
  };
}

function applyPlan(plan) {
  state.plan = { ...defaultPlan(), ...plan };
  const mapping = {
    callsign: '#callsign', aircraft: '#aircraft', registration: '#registration', flightRules: '#flightRules',
    origin: '#origin', destination: '#destination', alternate: '#alternate', departureDate: '#departureDate',
    departureTime: '#departureTime', cruiseAltitude: '#cruiseAltitude', tas: '#tas', taxiMinutes: '#taxiMinutes',
    route: '#route', remarks: '#remarks', windDirection: '#windDirection', windSpeed: '#windSpeed', fuelBurn: '#fuelBurn',
    fuelUnit: '#fuelUnit', reserveMinutes: '#reserveMinutes', extraFuel: '#extraFuel'
  };
  for (const [key, selector] of Object.entries(mapping)) {
    const element = $(selector);
    if (element) element.value = state.plan[key] ?? '';
  }
  updateStrip();
  recalculate();
}

function validatePlan(plan) {
  const errors = [];
  if (!/^[A-Z0-9]{3,4}$/.test(plan.origin)) errors.push('Origin ICAO is invalid.');
  if (!/^[A-Z0-9]{3,4}$/.test(plan.destination)) errors.push('Destination ICAO is invalid.');
  if (plan.alternate && !/^[A-Z0-9]{3,4}$/.test(plan.alternate)) errors.push('Alternate ICAO is invalid.');
  if (!plan.aircraft) errors.push('Aircraft ICAO is required.');
  if (plan.tas <= 0) errors.push('True airspeed must be greater than zero.');
  if (plan.origin === plan.destination) errors.push('Origin and destination must be different.');
  return errors;
}

function airportFor(id) {
  return state.airports[id] || FALLBACK_AIRPORTS[id] || null;
}

function airportLat(airport) {
  return toNumber(airport?.lat ?? airport?.latitude, NaN);
}

function airportLon(airport) {
  return toNumber(airport?.lon ?? airport?.longitude, NaN);
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
  const course = normalizeHeading(Math.atan2(y, x) * 180 / Math.PI);
  return { distanceNm, course };
}

function calculatePlan(plan) {
  const origin = airportFor(plan.origin);
  const destination = airportFor(plan.destination);
  const nav = greatCircle(origin, destination);
  if (!nav) return { distanceNm: NaN, course: NaN, groundSpeed: plan.tas, eteHours: NaN, blockHours: NaN, tripFuel: NaN, reserveFuel: NaN, totalFuel: NaN };
  const windAngle = angularDifference(plan.windDirection, nav.course) * Math.PI / 180;
  const headwind = plan.windSpeed * Math.cos(windAngle);
  const crosswind = Math.abs(plan.windSpeed * Math.sin(windAngle));
  const groundSpeed = clamp(plan.tas - headwind, Math.max(25, plan.tas * 0.35), plan.tas + Math.abs(plan.windSpeed));
  const eteHours = nav.distanceNm / groundSpeed;
  const blockHours = eteHours + plan.taxiMinutes / 60;
  const tripFuel = eteHours * plan.fuelBurn;
  const reserveFuel = plan.reserveMinutes / 60 * plan.fuelBurn;
  const taxiFuel = plan.taxiMinutes / 60 * plan.fuelBurn;
  const totalFuel = tripFuel + reserveFuel + taxiFuel + plan.extraFuel;
  return { ...nav, groundSpeed, headwind, crosswind, eteHours, blockHours, tripFuel, reserveFuel, taxiFuel, totalFuel };
}

function recalculate() {
  const plan = collectPlan();
  state.plan = plan;
  state.calculations = calculatePlan(plan);
  renderPlanSummary();
  renderMapSummary();
  generateOfp();
  updateStrip();
  localStorage.setItem(STORAGE.active, JSON.stringify({ plan: state.plan, airports: state.airports }));
}

function renderPlanSummary() {
  const plan = state.plan || collectPlan();
  const calc = state.calculations || calculatePlan(plan);
  const origin = airportFor(plan.origin);
  const destination = airportFor(plan.destination);
  $('#heroOrigin').textContent = plan.origin || '—';
  $('#heroDestination').textContent = plan.destination || '—';
  $('#heroOriginName').textContent = origin?.name || 'Airport data not loaded';
  $('#heroDestinationName').textContent = destination?.name || 'Airport data not loaded';
  $('#metricDistance').textContent = Number.isFinite(calc.distanceNm) ? Math.round(calc.distanceNm).toLocaleString() : '—';
  $('#metricCourse').textContent = Number.isFinite(calc.course) ? String(Math.round(calc.course)).padStart(3, '0') : '—';
  $('#metricEte').textContent = formatDuration(calc.eteHours);
  $('#metricBlock').textContent = formatDuration(calc.blockHours);
  $('#metricFuel').textContent = formatFuel(calc.tripFuel);
  $('#metricFuelUnit').textContent = plan.fuelUnit;
  $('#calcGroundSpeed').textContent = Number.isFinite(calc.groundSpeed) ? Math.round(calc.groundSpeed) : '—';
  $('#calcTripFuel').textContent = formatFuel(calc.tripFuel);
  $('#calcReserveFuel').textContent = formatFuel(calc.reserveFuel);
  $('#calcTotalFuel').textContent = formatFuel(calc.totalFuel);
  for (const id of ['calcTripUnit', 'calcReserveUnit', 'calcTotalUnit']) $(id.startsWith('#') ? id : `#${id}`).textContent = plan.fuelUnit;
}

function updateStrip() {
  const plan = state.plan || collectPlan();
  $('#stripCallsign').textContent = plan.callsign || plan.registration || '—';
  $('#stripRoute').textContent = `${plan.origin || '—'} → ${plan.destination || '—'}`;
  $('#stripAircraft').textContent = plan.aircraft || '—';
  $('#stripReg').textContent = plan.registration || '—';
}

function setView(name) {
  const meta = viewMeta[name] || viewMeta.plan;
  $$('.view').forEach(el => el.classList.toggle('active', el.dataset.viewPanel === name));
  $$('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === name));
  $('#viewEyebrow').textContent = meta[0];
  $('#viewTitle').textContent = meta[1];
  $('#sidebar').classList.remove('open');
  if (name === 'map') setTimeout(renderMap, 60);
  if (name === 'saved') renderSavedPlans();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function fetchAirportData(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return;
  const data = await fetchJson(`/api/airport?ids=${encodeURIComponent(unique.join(','))}`);
  for (const airport of data.airports || []) {
    if (airport?.icaoId) state.airports[String(airport.icaoId).toUpperCase()] = airport;
  }
}

function routeBbox(plan) {
  const a = airportFor(plan.origin);
  const b = airportFor(plan.destination);
  if (!a || !b) return null;
  const lat0 = airportLat(a), lon0 = airportLon(a), lat1 = airportLat(b), lon1 = airportLon(b);
  if (![lat0, lon0, lat1, lon1].every(Number.isFinite)) return null;
  const pad = clamp(Math.abs(lat0 - lat1) * .18 + 2.5, 2.5, 8);
  return [Math.max(-90, Math.min(lat0, lat1) - pad), Math.max(-180, Math.min(lon0, lon1) - pad), Math.min(90, Math.max(lat0, lat1) + pad), Math.min(180, Math.max(lon0, lon1) + pad)];
}

async function loadBriefing() {
  const plan = collectPlan();
  const errors = validatePlan(plan);
  if (errors.length) throw new Error(errors.join(' '));
  state.plan = plan;
  await fetchAirportData([plan.origin, plan.destination, plan.alternate]);
  state.calculations = calculatePlan(plan);
  const ids = [plan.origin, plan.destination, plan.alternate].filter(Boolean).join(',');
  const bbox = routeBbox(plan);
  const weatherPromise = fetchJson(`/api/weather?ids=${encodeURIComponent(ids)}`);
  const hazardsPromise = bbox
    ? fetchJson(`/api/hazards?bbox=${encodeURIComponent(bbox.join(','))}&level=${encodeURIComponent(plan.cruiseAltitude || 0)}`)
    : Promise.resolve({ sigmets: [], gairmets: [], pireps: [], fetchedAt: null });
  const [weather, hazards] = await Promise.all([weatherPromise, hazardsPromise]);
  state.weather = weather;
  state.hazards = hazards;
  state.briefingFetchedAt = weather.fetchedAt || new Date().toISOString();
  localStorage.setItem(STORAGE.active, JSON.stringify({ plan: state.plan, airports: state.airports, weather: state.weather, hazards: state.hazards, briefingFetchedAt: state.briefingFetchedAt }));
  renderAll();
}

async function buildFlight() {
  const button = $('#buildButton');
  setButtonBusy(button, true, 'BUILDING…');
  try {
    await loadBriefing();
    $('#planStatus').textContent = 'BRIEFED';
    $('#planStatus').className = 'badge good';
    toast('Flight and briefing built');
    setView('brief');
  } catch (error) {
    $('#planStatus').textContent = 'ERROR';
    $('#planStatus').className = 'badge bad';
    toast(error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

function metarFor(id) {
  return (state.weather.metars || []).find(item => String(item.icaoId).toUpperCase() === id);
}
function tafFor(id) {
  return (state.weather.tafs || []).find(item => String(item.icaoId).toUpperCase() === id);
}

function ceilingFromMetar(metar) {
  const clouds = Array.isArray(metar?.clouds) ? metar.clouds : [];
  const ceilings = clouds.filter(c => ['BKN', 'OVC', 'VV'].includes(String(c.cover).toUpperCase())).map(c => toNumber(c.base, NaN)).filter(Number.isFinite);
  if (Number.isFinite(Number(metar?.vertVis))) ceilings.push(Number(metar.vertVis));
  return ceilings.length ? Math.min(...ceilings) : null;
}

function weatherCard(role, id) {
  const metar = metarFor(id);
  const taf = tafFor(id);
  const airport = airportFor(id);
  const category = metar?.fltCat || 'NA';
  const ceiling = ceilingFromMetar(metar);
  const wind = metar ? `${metar.wdir ?? 'VRB'}° / ${metar.wspd ?? 0}${metar.wgst ? `G${metar.wgst}` : ''} KT` : '—';
  const visibility = metar?.visib != null ? `${metar.visib} SM` : '—';
  const ceilingText = ceiling != null ? `${ceiling.toLocaleString()} FT` : (metar ? 'UNLIMITED' : '—');
  const altimeter = metar?.altim != null ? `${hpaToInHg(metar.altim)} IN` : '—';
  const temp = metar?.temp != null ? `${metar.temp}°C / ${metar.dewp ?? '—'}°C` : '—';
  return `<article class="panel weather-card">
    <div class="weather-card-top">
      <div class="weather-station"><span>${esc(role)}</span><strong>${esc(id || '—')}</strong><small>${esc(airport?.name || metar?.name || 'Airport data unavailable')}</small></div>
      <div class="category ${esc(category)}">${esc(category)}</div>
    </div>
    <div class="wx-metrics">
      <div><span>WIND</span><strong>${esc(wind)}</strong></div>
      <div><span>VIS</span><strong>${esc(visibility)}</strong></div>
      <div><span>CEILING</span><strong>${esc(ceilingText)}</strong></div>
      <div><span>ALTIMETER</span><strong>${esc(altimeter)}</strong></div>
      <div><span>TEMP / DEW</span><strong>${esc(temp)}</strong></div>
      <div><span>OBS TIME</span><strong>${esc(formatDateTime(metar?.obsTime))}</strong></div>
    </div>
    <details class="raw-weather"><summary>RAW METAR / TAF</summary><pre>${esc(metar?.rawOb || 'NO METAR AVAILABLE')}\n\n${esc(taf?.rawTAF || 'NO TAF AVAILABLE')}</pre></details>
  </article>`;
}

function renderWeather() {
  const plan = state.plan;
  if (!plan) return;
  const stations = [['DEPARTURE', plan.origin], ['DESTINATION', plan.destination]];
  if (plan.alternate) stations.push(['ALTERNATE', plan.alternate]);
  $('#weatherGrid').innerHTML = stations.map(([role, id]) => weatherCard(role, id)).join('');
  $('#briefUpdated').textContent = state.briefingFetchedAt ? `UPDATED ${formatDateTime(state.briefingFetchedAt)}` : 'NOT LOADED';
}

function operationalAlerts() {
  const plan = state.plan;
  if (!plan) return [];
  const alerts = [];
  for (const [role, id] of [['Departure', plan.origin], ['Destination', plan.destination], ['Alternate', plan.alternate]]) {
    if (!id) continue;
    const metar = metarFor(id);
    const taf = tafFor(id);
    if (!metar) {
      alerts.push({ level: 'warn', title: `${role} METAR unavailable`, detail: `${id} returned no current observation.` });
      continue;
    }
    if (['IFR', 'LIFR'].includes(metar.fltCat)) alerts.push({ level: metar.fltCat === 'LIFR' ? 'bad' : 'warn', title: `${role} ${metar.fltCat}`, detail: `${id} is reporting ${metar.fltCat} conditions with ${metar.visib ?? 'unknown'} SM visibility and ${ceilingFromMetar(metar) ?? 'unknown'} ft ceiling.` });
    if (toNumber(metar.wgst) >= 25) alerts.push({ level: 'warn', title: `${role} gusts`, detail: `${id} is reporting gusts to ${metar.wgst} kt.` });
    if (String(metar.wxString || '').match(/TS|FZ|SN|GR|SQ|FC/)) alerts.push({ level: 'bad', title: `${role} significant weather`, detail: `${id} reports ${metar.wxString}.` });
    if (!taf) alerts.push({ level: 'warn', title: `${role} TAF unavailable`, detail: `${id} returned no terminal forecast.` });
    else if (String(taf.rawTAF || '').match(/TSRA|\bTS\b|FZRA|\+SN|\bWS\d{3}/)) alerts.push({ level: 'warn', title: `${role} TAF contains hazards`, detail: `${id} forecast includes thunderstorms, freezing precipitation, heavy snow or low-level wind shear terminology.` });
  }
  if ((state.hazards.sigmets || []).length) alerts.push({ level: 'bad', title: 'SIGMETs near route box', detail: `${state.hazards.sigmets.length} current domestic SIGMET item(s) intersect or lack precise coordinates within the route search area.` });
  const significantPireps = (state.hazards.pireps || []).filter(p => String(p.tbInt1 || p.icgInt1 || '').match(/MOD|SEV|EXTM/));
  if (significantPireps.length) alerts.push({ level: 'warn', title: 'Significant PIREPs', detail: `${significantPireps.length} moderate-or-greater turbulence or icing report(s) were returned in the route box.` });
  if (!alerts.length) alerts.push({ level: 'good', title: 'No automatic red flags', detail: 'The automated scan found no low-category terminal weather or significant coded route alert. Review the complete raw briefing.' });
  return alerts;
}

function renderOperationalAlerts() {
  const alerts = operationalAlerts();
  $('#alertCount').textContent = alerts.filter(a => a.level !== 'good').length;
  $('#operationalAlerts').classList.remove('empty-state');
  $('#operationalAlerts').innerHTML = alerts.map(a => `<div class="alert-item ${a.level}"><div class="alert-symbol">${a.level === 'good' ? '✓' : a.level === 'bad' ? '!' : '△'}</div><div><strong>${esc(a.title)}</strong><p>${esc(a.detail)}</p></div></div>`).join('');
  const worst = alerts.some(a => a.level === 'bad') ? 'danger' : alerts.some(a => a.level === 'warn') ? 'warning' : 'info';
  const count = alerts.filter(a => a.level !== 'good').length;
  $('#alertBanner').className = `notice ${worst}`;
  $('#alertBanner').innerHTML = `<strong>${count ? `${count} briefing item${count === 1 ? '' : 's'} need attention` : 'Automated scan complete'}</strong><span>Review raw METARs, TAFs, advisories and PIREPs before starting the simulator flight.</span>`;
}

function runwayNames(airport) {
  const result = [];
  for (const runway of Array.isArray(airport?.runways) ? airport.runways : []) {
    const text = String(runway.runway || runway.ident || runway.id || runway.rwy || '').toUpperCase();
    for (const name of text.split(/[\/\s-]+/)) if (/^(0[1-9]|[12]\d|3[0-6])[LCR]?$/.test(name)) result.push({ name, detail: runway.dimension || runway.dim || runway.length || '' });
  }
  return [...new Map(result.map(item => [item.name, item])).values()];
}

function runwayHeading(name) {
  const number = Number(String(name).slice(0, 2));
  return number === 36 ? 360 : number * 10;
}

function runwayWindData(id) {
  const airport = airportFor(id);
  const metar = metarFor(id);
  const speed = toNumber(metar?.wspd, NaN);
  const direction = Number(metar?.wdir);
  if (!airport || !Number.isFinite(speed) || !Number.isFinite(direction)) return [];
  return runwayNames(airport).map(runway => {
    const heading = runwayHeading(runway.name);
    const angle = angularDifference(direction, heading) * Math.PI / 180;
    const headwind = speed * Math.cos(angle);
    const crosswind = speed * Math.sin(angle);
    return { ...runway, heading, headwind, crosswind, score: headwind - Math.abs(crosswind) * 0.2 };
  }).sort((a, b) => b.score - a.score);
}

function renderRunwayWind() {
  const rows = [];
  for (const [label, id] of [['DEP', state.plan?.origin], ['DEST', state.plan?.destination]]) {
    if (!id) continue;
    const best = runwayWindData(id)[0];
    if (!best) continue;
    rows.push(`<div class="runway-card"><div><strong>${esc(label)} ${esc(id)} RWY ${esc(best.name)}</strong><small>${esc(best.detail || `Heading ${best.heading}°`)}</small></div><div class="wind-number"><span>HEADWIND</span><b>${Math.round(best.headwind)} KT</b></div><div class="wind-number"><span>CROSSWIND</span><b>${Math.round(Math.abs(best.crosswind))} KT</b></div><div class="wind-number"><span>SIDE</span><b>${best.crosswind > 0 ? 'RIGHT' : 'LEFT'}</b></div></div>`);
  }
  $('#runwayWind').classList.toggle('empty-state', !rows.length);
  $('#runwayWind').innerHTML = rows.length ? rows.join('') : 'Airport runway and numeric wind data are required.';
}

function hazardItems() {
  const sigmets = (state.hazards.sigmets || []).map(item => ({ type: 'sigmet', label: item.seriesId || item.alphaChar || 'SIGMET', hazard: item.hazard || 'SIGMET', time: item.validTimeTo, text: item.rawAirSigmet || `${item.qualifier || ''} ${item.hazard || ''}`.trim() }));
  const gairmets = (state.hazards.gairmets || []).map(item => ({ type: 'gairmet', label: `${item.product || 'G-AIRMET'} ${item.tag || ''}`.trim(), hazard: item.hazard || item.due_to || 'ADVISORY', time: item.validTime || item.expireTime, text: item.due_to || `${item.hazard || 'G-AIRMET'} forecast hour ${item.forecastHour ?? 0}` }));
  const pireps = (state.hazards.pireps || []).map(item => ({ type: 'pirep', label: `${item.icaoId || 'PIREP'} ${item.acType || ''}`.trim(), hazard: item.tbInt1 || item.icgInt1 || item.wxString || 'PIREP', time: item.obsTime, text: item.rawOb || item.rawPirep || [item.fltLvl ? `FL${item.fltLvl}` : '', item.tbInt1 ? `TB ${item.tbInt1} ${item.tbType1 || ''}` : '', item.icgInt1 ? `ICG ${item.icgInt1} ${item.icgType1 || ''}` : '', item.wxString || ''].filter(Boolean).join(' / ') }));
  return [...sigmets, ...gairmets, ...pireps];
}

function renderHazards() {
  const items = hazardItems().filter(item => state.hazardFilter === 'all' || item.type === state.hazardFilter);
  $('#hazardList').classList.toggle('empty-state', !items.length);
  $('#hazardList').innerHTML = items.length ? items.map(item => `<div class="hazard-item ${item.type}"><div class="hazard-meta"><span>${esc(item.type.toUpperCase())}</span><strong>${esc(item.label)}</strong><span>${esc(item.hazard)}</span><span>${esc(formatDateTime(item.time))}</span></div><p>${esc(item.text || 'No decoded text available.')}</p></div>`).join('') : 'No matching route hazards were returned.';
}

function initMap() {
  if (state.map || !window.L) return;
  state.map = L.map('routeMap', { zoomControl: true, attributionControl: true }).setView([39, -96], 4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);
}

function clearMapLayers() {
  if (!state.map) return;
  for (const layer of state.mapLayers) state.map.removeLayer(layer);
  state.mapLayers = [];
}

function renderMap() {
  initMap();
  if (!state.map) {
    $('#mapFallback').textContent = 'Map library unavailable. Route calculations remain available.';
    return;
  }
  setTimeout(() => state.map.invalidateSize(), 30);
  clearMapLayers();
  const plan = state.plan;
  const a = airportFor(plan?.origin);
  const b = airportFor(plan?.destination);
  if (!a || !b) {
    $('#mapFallback').style.display = 'grid';
    return;
  }
  $('#mapFallback').style.display = 'none';
  const aLatLng = [airportLat(a), airportLon(a)], bLatLng = [airportLat(b), airportLon(b)];
  if (![...aLatLng, ...bLatLng].every(Number.isFinite)) return;
  const markerA = L.circleMarker(aLatLng, { radius: 7, color: '#63d6ff', weight: 2, fillColor: '#0d2634', fillOpacity: 1 }).bindTooltip(`${plan.origin} — ${a.name || ''}`);
  const markerB = L.circleMarker(bLatLng, { radius: 7, color: '#63d6ff', weight: 2, fillColor: '#0d2634', fillOpacity: 1 }).bindTooltip(`${plan.destination} — ${b.name || ''}`);
  const line = L.polyline([aLatLng, bLatLng], { color: '#63d6ff', weight: 3, opacity: .85, dashArray: '8 8' });
  markerA.addTo(state.map); markerB.addTo(state.map); line.addTo(state.map);
  state.mapLayers.push(markerA, markerB, line);
  if (plan.alternate) {
    const alt = airportFor(plan.alternate);
    if (alt && [airportLat(alt), airportLon(alt)].every(Number.isFinite)) {
      const altLine = L.polyline([bLatLng, [airportLat(alt), airportLon(alt)]], { color: '#ffc56e', weight: 2, opacity: .8, dashArray: '5 8' });
      const altMarker = L.circleMarker([airportLat(alt), airportLon(alt)], { radius: 5, color: '#ffc56e', fillColor: '#33240c', fillOpacity: 1 }).bindTooltip(`${plan.alternate} — alternate`);
      altLine.addTo(state.map); altMarker.addTo(state.map); state.mapLayers.push(altLine, altMarker);
    }
  }
  state.map.fitBounds(line.getBounds().pad(.2), { maxZoom: 7 });
}

function renderMapSummary() {
  const plan = state.plan || collectPlan();
  const calc = state.calculations || calculatePlan(plan);
  const values = [
    ['ORIGIN', `${plan.origin || '—'} ${airportFor(plan.origin)?.name ? `— ${airportFor(plan.origin).name}` : ''}`],
    ['DESTINATION', `${plan.destination || '—'} ${airportFor(plan.destination)?.name ? `— ${airportFor(plan.destination).name}` : ''}`],
    ['DISTANCE', Number.isFinite(calc.distanceNm) ? `${Math.round(calc.distanceNm).toLocaleString()} NM` : '—'],
    ['INITIAL COURSE', Number.isFinite(calc.course) ? `${String(Math.round(calc.course)).padStart(3, '0')}°T` : '—'],
    ['CRUISE', plan.cruiseAltitude ? `${Number(plan.cruiseAltitude).toLocaleString()} FT` : '—'],
    ['EST GS', Number.isFinite(calc.groundSpeed) ? `${Math.round(calc.groundSpeed)} KT` : '—']
  ];
  $('#mapSummary').innerHTML = values.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('');
}

function generateOfp() {
  const plan = state.plan || collectPlan();
  const calc = state.calculations || calculatePlan(plan);
  const now = new Date().toISOString();
  const metarLines = [plan.origin, plan.destination, plan.alternate].filter(Boolean).map(id => `${id}  ${metarFor(id)?.rawOb || 'NO METAR'}`);
  const tafLines = [plan.origin, plan.destination, plan.alternate].filter(Boolean).map(id => `${id}  ${tafFor(id)?.rawTAF || 'NO TAF'}`);
  const alerts = operationalAlerts().map(a => `${a.level === 'bad' ? 'RED' : a.level === 'warn' ? 'AMBER' : 'INFO'}  ${a.title}: ${a.detail}`);
  const hazardSummary = hazardItems().slice(0, 30).map(item => `${item.type.toUpperCase()}  ${item.label}  ${item.hazard}  ${formatDateTime(item.time)}\n${item.text}`);
  const departureZulu = `${plan.departureDate || '----/--/--'} ${plan.departureTime || '--:--'}Z`;
  const ofp = [
    'AEROBRIEF SIMULATOR OPERATIONAL FLIGHT PLAN',
    '============================================================',
    `GENERATED     ${now}`,
    `FLIGHT        ${plan.callsign || plan.registration || 'N/A'}`,
    `AIRCRAFT      ${plan.aircraft || 'N/A'}   REG ${plan.registration || 'N/A'}`,
    `RULES         ${plan.flightRules}`,
    `ROUTE         ${plan.origin || '----'} → ${plan.destination || '----'}   ALT ${plan.alternate || 'NONE'}`,
    `SCHEDULE      ${departureZulu}`,
    '',
    'PLANNING SUMMARY',
    '------------------------------------------------------------',
    `DISTANCE      ${Number.isFinite(calc.distanceNm) ? `${Math.round(calc.distanceNm)} NM` : 'N/A'}`,
    `INITIAL CRS   ${Number.isFinite(calc.course) ? `${String(Math.round(calc.course)).padStart(3, '0')} TRUE` : 'N/A'}`,
    `CRUISE ALT    ${plan.cruiseAltitude ? `${Number(plan.cruiseAltitude).toLocaleString()} FT` : 'N/A'}`,
    `TAS / EST GS  ${plan.tas || 'N/A'} KT / ${Number.isFinite(calc.groundSpeed) ? `${Math.round(calc.groundSpeed)} KT` : 'N/A'}`,
    `ETE / BLOCK   ${formatDuration(calc.eteHours)} / ${formatDuration(calc.blockHours)}`,
    `ROUTE STRING  ${plan.route || 'DCT'}`,
    '',
    'FUEL PLAN',
    '------------------------------------------------------------',
    `BURN RATE     ${plan.fuelBurn || 0} ${plan.fuelUnit}/HR`,
    `TAXI          ${formatFuel(calc.taxiFuel)} ${plan.fuelUnit}`,
    `TRIP          ${formatFuel(calc.tripFuel)} ${plan.fuelUnit}`,
    `RESERVE       ${formatFuel(calc.reserveFuel)} ${plan.fuelUnit} (${plan.reserveMinutes} MIN)`,
    `EXTRA         ${formatFuel(plan.extraFuel)} ${plan.fuelUnit}`,
    `TOTAL         ${formatFuel(calc.totalFuel)} ${plan.fuelUnit}`,
    '',
    'TERMINAL WEATHER — METAR',
    '------------------------------------------------------------',
    ...(metarLines.length ? metarLines : ['NOT LOADED']),
    '',
    'TERMINAL WEATHER — TAF',
    '------------------------------------------------------------',
    ...(tafLines.length ? tafLines : ['NOT LOADED']),
    '',
    'AUTOMATED OPERATIONAL SCAN',
    '------------------------------------------------------------',
    ...(alerts.length ? alerts : ['NOT LOADED']),
    '',
    'ROUTE HAZARDS / PIREPS',
    '------------------------------------------------------------',
    ...(hazardSummary.length ? hazardSummary : ['NO ITEMS LOADED']),
    '',
    'REMARKS',
    '------------------------------------------------------------',
    plan.remarks || 'NONE',
    '',
    'SIMULATION USE ONLY — NOT FOR REAL-WORLD FLIGHT OPERATIONS'
  ].join('\n');
  $('#ofpText').textContent = state.importedOfpText || ofp;
  return ofp;
}

function deep(obj, ...paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => acc?.[key], obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function parseSimBrief(ofp) {
  const airline = String(deep(ofp, 'general.icao_airline', 'general.icao_airline_code', 'general.airline') || '').toUpperCase();
  const flightNumber = String(deep(ofp, 'general.flight_number', 'general.fltnum') || '');
  const rawTime = String(deep(ofp, 'times.sched_out', 'times.est_out') || '');
  let departureDate = state.plan?.departureDate;
  let departureTime = state.plan?.departureTime;
  if (/^\d{10,13}$/.test(rawTime)) {
    const epoch = Number(rawTime) * (rawTime.length === 10 ? 1000 : 1);
    const date = new Date(epoch);
    if (!Number.isNaN(date.getTime())) { departureDate = date.toISOString().slice(0, 10); departureTime = date.toISOString().slice(11, 16); }
  }
  const plan = {
    ...(state.plan || defaultPlan()),
    callsign: String(deep(ofp, 'atc.callsign', 'general.callsign') || `${airline}${flightNumber}`).toUpperCase(),
    aircraft: String(deep(ofp, 'aircraft.icaocode', 'aircraft.icao_code', 'aircraft.icao') || state.plan?.aircraft || '').toUpperCase(),
    registration: String(deep(ofp, 'aircraft.reg', 'aircraft.registration') || state.plan?.registration || '').toUpperCase(),
    origin: String(deep(ofp, 'origin.icao_code', 'origin.icao') || '').toUpperCase(),
    destination: String(deep(ofp, 'destination.icao_code', 'destination.icao') || '').toUpperCase(),
    alternate: String(deep(ofp, 'alternate.icao_code', 'alternate.icao') || '').toUpperCase(),
    route: String(deep(ofp, 'general.route', 'general.route_ifps') || 'DCT').toUpperCase(),
    cruiseAltitude: toNumber(deep(ofp, 'general.initial_altitude', 'general.cruise_altitude'), state.plan?.cruiseAltitude || 0),
    departureDate, departureTime,
    remarks: String(deep(ofp, 'general.manual_rmk', 'general.remarks') || state.plan?.remarks || ''),
    updatedAt: new Date().toISOString()
  };
  const text = deep(ofp, 'text.plan', 'text.plan_html', 'text.ofp', 'general.ofp_text');
  return { plan, text: typeof text === 'string' ? text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+\n/g, '\n').trim() : '' };
}

async function importSimBrief() {
  const user = $('#simbriefUser').value.trim();
  if (!user) return toast('Enter a SimBrief username or Pilot ID');
  const button = $('#importSimBriefButton');
  setButtonBusy(button, true, 'IMPORTING…');
  try {
    const data = await fetchJson(`/api/simbrief?user=${encodeURIComponent(user)}`);
    const parsed = parseSimBrief(data.ofp);
    state.importedOfpText = parsed.text;
    applyPlan(parsed.plan);
    $('#simbriefStatus').className = 'notice info';
    $('#simbriefStatus').innerHTML = `<strong>Imported</strong><span>${esc(parsed.plan.origin)} → ${esc(parsed.plan.destination)} from the latest SimBrief OFP.</span>`;
    await loadBriefing();
    setView('ofp');
    toast('Latest SimBrief OFP imported');
  } catch (error) {
    $('#simbriefStatus').className = 'notice danger';
    $('#simbriefStatus').innerHTML = `<strong>Import failed</strong><span>${esc(error.message)}</span>`;
    toast(error.message);
  } finally {
    setButtonBusy(button, false);
  }
}

function renderAll() {
  updateStrip();
  renderPlanSummary();
  renderWeather();
  renderOperationalAlerts();
  renderRunwayWind();
  renderHazards();
  renderMapSummary();
  renderMap();
  generateOfp();
}

function saveCurrentPlan() {
  const plan = collectPlan();
  const errors = validatePlan(plan);
  if (errors.length) return toast(errors[0]);
  state.plan = plan;
  const saved = loadSavedPlans();
  const record = { ...plan, calculations: calculatePlan(plan), savedAt: new Date().toISOString() };
  const index = saved.findIndex(item => item.id === plan.id);
  if (index >= 0) saved[index] = record; else saved.unshift(record);
  localStorage.setItem(STORAGE.saved, JSON.stringify(saved.slice(0, 100)));
  renderSavedPlans();
  toast('Flight saved locally');
}

function renderSavedPlans() {
  const plans = loadSavedPlans();
  $('#savedPlans').innerHTML = plans.length ? plans.map(plan => `<article class="panel saved-card">
    <div class="route">${esc(plan.origin)} <span>→</span> ${esc(plan.destination)}</div>
    <p>${esc(plan.callsign || plan.registration || 'UNNUMBERED')} · ${esc(plan.aircraft || 'AIRCRAFT')} · ${esc(plan.departureDate || 'NO DATE')} ${esc(plan.departureTime || '')}Z</p>
    <div class="saved-meta"><div><span>DIST</span><strong>${Number.isFinite(plan.calculations?.distanceNm) ? `${Math.round(plan.calculations.distanceNm)} NM` : '—'}</strong></div><div><span>ETE</span><strong>${formatDuration(plan.calculations?.eteHours)}</strong></div><div><span>FUEL</span><strong>${formatFuel(plan.calculations?.totalFuel)} ${esc(plan.fuelUnit || '')}</strong></div></div>
    <div class="saved-actions"><button class="secondary-button" data-load-plan="${esc(plan.id)}">LOAD FLIGHT</button><button class="delete-button" data-delete-plan="${esc(plan.id)}" aria-label="Delete flight">×</button></div>
  </article>`).join('') : '<div class="panel empty-state">No saved flights yet.</div>';
}

function loadSavedPlan(id) {
  const plan = loadSavedPlans().find(item => item.id === id);
  if (!plan) return;
  state.importedOfpText = '';
  state.weather = { metars: [], tafs: [] };
  state.hazards = { sigmets: [], gairmets: [], pireps: [] };
  applyPlan(plan);
  setView('plan');
  toast('Saved flight loaded');
}

function deleteSavedPlan(id) {
  const saved = loadSavedPlans().filter(item => item.id !== id);
  localStorage.setItem(STORAGE.saved, JSON.stringify(saved));
  renderSavedPlans();
  toast('Saved flight deleted');
}

function downloadText(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportPlans() {
  downloadText(`aerobrief-flights-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), plans: loadSavedPlans() }, null, 2), 'application/json');
}

async function importPlansFile(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : data.plans;
    if (!Array.isArray(incoming)) throw new Error('The file does not contain a plans array.');
    const current = loadSavedPlans();
    const merged = new Map(current.map(item => [item.id, item]));
    for (const item of incoming) if (item?.id && item?.origin && item?.destination) merged.set(item.id, item);
    localStorage.setItem(STORAGE.saved, JSON.stringify([...merged.values()].slice(0, 100)));
    renderSavedPlans();
    toast(`${incoming.length} flight record(s) imported`);
  } catch (error) {
    toast(`Import failed: ${error.message}`);
  }
}

function loadSettingsForm() {
  const settings = loadSettings();
  $('#settingAircraft').value = settings.aircraft;
  $('#settingRegistration').value = settings.registration;
  $('#settingTas').value = settings.tas;
  $('#settingFuelBurn').value = settings.fuelBurn;
  $('#settingReserve').value = settings.reserve;
  $('#settingFuelUnit').value = settings.fuelUnit;
}

function saveSettings() {
  const settings = {
    aircraft: $('#settingAircraft').value.trim().toUpperCase(),
    registration: $('#settingRegistration').value.trim().toUpperCase(),
    tas: toNumber($('#settingTas').value, 120),
    fuelBurn: toNumber($('#settingFuelBurn').value, 9.5),
    reserve: toNumber($('#settingReserve').value, 45),
    fuelUnit: $('#settingFuelUnit').value
  };
  localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
  toast('Preferences saved');
}

function clearAllData() {
  const confirmation = window.confirm('Clear the active plan, saved flights, briefing data and preferences from this device?');
  if (!confirmation) return;
  Object.values(STORAGE).forEach(key => localStorage.removeItem(key));
  state = { ...state, plan: null, airports: {}, weather: { metars: [], tafs: [] }, hazards: { sigmets: [], gairmets: [], pireps: [] }, importedOfpText: '', briefingFetchedAt: null };
  applyPlan(defaultPlan());
  loadSettingsForm();
  renderAll();
  renderSavedPlans();
  toast('Local data cleared');
}

function openSimBrief() {
  window.open('https://dispatch.simbrief.com/options/new', 'aerobrief-simbrief');
}

function bindEvents() {
  $$('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#menuButton').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  document.addEventListener('click', event => {
    if (window.innerWidth <= 920 && $('#sidebar').classList.contains('open') && !event.target.closest('#sidebar') && !event.target.closest('#menuButton')) $('#sidebar').classList.remove('open');
  });
  $$('#view-plan input, #view-plan select, #view-plan textarea').forEach(input => input.addEventListener('input', () => {
    if (input.classList.contains('icao-input')) input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    state.importedOfpText = '';
    recalculate();
  }));
  $('#buildButton').addEventListener('click', buildFlight);
  $('#refreshBriefButton').addEventListener('click', async () => {
    const button = $('#refreshBriefButton'); setButtonBusy(button, true, 'REFRESHING…');
    try { await loadBriefing(); toast('Briefing refreshed'); } catch (error) { toast(error.message); } finally { setButtonBusy(button, false); }
  });
  $('#savePlanButton').addEventListener('click', saveCurrentPlan);
  $('#openSimBriefButton').addEventListener('click', openSimBrief);
  $('#openSimBriefFromOfp').addEventListener('click', openSimBrief);
  $('#printBriefButton').addEventListener('click', () => window.print());
  $('#copyOfpButton').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#ofpText').textContent); toast('OFP copied'); } catch { toast('Clipboard access was blocked'); }
  });
  $('#downloadOfpButton').addEventListener('click', () => {
    const plan = state.plan || collectPlan();
    downloadText(`AeroBrief-${plan.origin || 'ORIG'}-${plan.destination || 'DEST'}.txt`, $('#ofpText').textContent);
  });
  $('#importSimBriefButton').addEventListener('click', importSimBrief);
  $$('[data-hazard-filter]').forEach(button => button.addEventListener('click', () => {
    state.hazardFilter = button.dataset.hazardFilter;
    $$('[data-hazard-filter]').forEach(el => el.classList.toggle('active', el === button));
    renderHazards();
  }));
  $('#savedPlans').addEventListener('click', event => {
    const load = event.target.closest('[data-load-plan]');
    const del = event.target.closest('[data-delete-plan]');
    if (load) loadSavedPlan(load.dataset.loadPlan);
    if (del) deleteSavedPlan(del.dataset.deletePlan);
  });
  $('#exportPlansButton').addEventListener('click', exportPlans);
  $('#importPlansButton').addEventListener('click', () => $('#planFileInput').click());
  $('#planFileInput').addEventListener('change', event => { const file = event.target.files?.[0]; if (file) importPlansFile(file); event.target.value = ''; });
  $('#saveSettingsButton').addEventListener('click', saveSettings);
  $('#clearDataButton').addEventListener('click', clearAllData);
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

function updateOnlineStatus() {
  const online = navigator.onLine;
  $('#onlineDot').classList.toggle('offline', !online);
  $('#onlineLabel').textContent = online ? 'ONLINE' : 'OFFLINE';
}

function startClock() {
  const tick = () => { $('#zuluClock').textContent = new Date().toISOString().slice(11, 19); };
  tick(); setInterval(tick, 1000);
}

function restoreState() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE.active), null);
  if (saved?.airports && typeof saved.airports === 'object') state.airports = saved.airports;
  if (saved?.weather) state.weather = saved.weather;
  if (saved?.hazards) state.hazards = saved.hazards;
  if (saved?.briefingFetchedAt) state.briefingFetchedAt = saved.briefingFetchedAt;
  applyPlan(saved?.plan || defaultPlan());
}

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('/sw.js'); } catch (error) { console.warn('Service worker registration failed', error); }
  }
}

function init() {
  bindEvents();
  restoreState();
  loadSettingsForm();
  renderSavedPlans();
  renderAll();
  updateOnlineStatus();
  startClock();
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);
