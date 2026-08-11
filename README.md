# AeroPerformance

A responsive Flask web application for aircraft-specific weight & balance, table-driven performance/TOLD, route parsing, aviation weather briefing, NOTAM integration, and printable OFP generation.

## What works now

- Custom aircraft profiles and stations
- Import/export aircraft profile JSON
- Weight, moment, ramp / takeoff / landing weight and CG
- User-entered CG / weight limit validation
- Table-driven takeoff and landing performance interpolation
- Route parsing
- Live METAR + TAF from the AviationWeather.gov Data API
- FAA NOTAM Search fallback
- Optional in-app FAA/NMS NOTAM API adapter
- Printable / PDF OFP
- Responsive layout for desktop, iPad, and iPhone
- LocalStorage persistence (no database required)

## Important operational limitation

The included C172N numbers are **DEMONSTRATION DATA ONLY** and must be replaced before operational use.

This software is not itself FAA-approved and does not turn generic performance data into approved aircraft data. For real-world operation, populate each tail profile using its current approved AFM/POH, supplements, W&B record, and any operator-specific procedures. Independently verify required preflight information.

## Local run

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000`.

## GitHub

Create a new repository, then from this folder:

```bash
git init
git add .
git commit -m "Initial AeroPerformance app"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Render

This repo includes `render.yaml`.

Option A: Render Blueprint
1. Push the project to GitHub.
2. In Render, create a new Blueprint.
3. Select the repository.
4. Render reads `render.yaml` and deploys the Flask service.

Option B: Web Service
- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Health check: `/health`

## Official weather

The backend requests AviationWeather.gov:

- `/api/data/metar`
- `/api/data/taf`

The browser calls your own `/api/weather` endpoint so the source can later be expanded without rewriting the UI.

## FAA/NMS NOTAM integration

FAA NOTAM services require the access method/credentials applicable to your NMS/API enrollment.

Without configuration, the app:
- identifies the airports that need NOTAM review, and
- provides the official FAA NOTAM Search fallback.

For in-app NOTAMs, configure these Render environment variables:

```text
NOTAM_API_URL=<your enrolled FAA/NMS API endpoint>
NOTAM_API_TOKEN=<token if your integration uses bearer auth>
```

`app.py` contains the small adapter to modify if your FAA enrollment uses a different auth scheme or query schema.

## Aircraft profile model

Each profile stores:

```json
{
  "aircraft": {
    "name": "Aircraft name",
    "reg": "N12345",
    "type": "C172N",
    "maxRamp": 2307,
    "mtow": 2300,
    "mlw": 2300,
    "cgMin": 35.0,
    "cgMax": 47.3,
    "fuelArm": 48.0,
    "fuelDensity": 6.0,
    "emptyWeight": 1450,
    "emptyArm": 39.5,
    "stations": [
      {"name": "Front seats", "arm": 37, "min": 0, "max": 400}
    ]
  },
  "performance": [
    {"phase":"TO","weight":2300,"pa":0,"oat":15,"roll":865,"over50":1525}
  ]
}
```

### Performance engine

The engine deliberately avoids invented corrections. It interpolates among the approved points you enter across:
- weight,
- pressure altitude,
- OAT.

Wind, slope, runway surface, obstacle, contamination, configuration, bleed/anti-ice, and other adjustments should be represented according to the exact aircraft's approved data. The current UI captures wind/slope/surface but does **not** silently apply generic factors.

## Recommended next production upgrades

1. Replace rectangular CG limits with weight-dependent CG envelope polygons.
2. Add airport/runway database and runway selection.
3. Add winds aloft / G-AIRMET / SIGMET / PIREP briefing panels.
4. Add true route geometry and leg-by-leg navlog.
5. Add fuel burn and climb/cruise/descent performance tables.
6. Add user accounts + PostgreSQL if you want cross-device aircraft/profile sync.
7. Add operator-configurable regulatory fuel reserve logic.
8. Implement your exact FAA/NMS API schema after enrollment.
9. Add PDF branding and electronic briefing acknowledgement.
10. Add unit tests against manually verified AFM/POH examples.


## Built-in Cessna 172N POH performance preset

This version contains a structured data transcription of the six Cessna Model 172N Section 5 performance pages supplied by the user (1 July 1978):

- Takeoff distance, short field, 2300 lb
- Takeoff distance, short field, 2100 lb and 1900 lb
- Maximum rate of climb
- Time, fuel and distance to climb
- Cruise performance
- Landing distance, short field

The calculator interpolates **only inside the published table bounds**.

Implemented POH note logic:
- Takeoff/landing: -10% distance per 9 kt headwind.
- Tailwind up to 10 kt: +10% distance per 2 kt.
- Takeoff dry grass: add 15% of the corrected ground-roll figure.
- Landing dry grass: add 45% of the corrected ground-roll figure.
- Climb time/fuel/distance: +10% per 10°C above standard temperature.
- Start/taxi/takeoff climb allowance: 1.1 gal.

No extrapolation is performed. If a value is outside the supplied chart or a chart cell is blank, the app reports it as unsupported rather than guessing.

### Weight handling

The takeoff pages provide data at 1900, 2100 and 2300 lb, so the app linearly interpolates by weight between those published values.

The supplied landing, maximum-rate-of-climb, time/fuel/distance-to-climb and cruise pages are published at 2300 lb. The app therefore uses those published 2300-lb values and **does not invent a lower-weight correction**.
