# AeroBrief Flight Operations 2.0

AeroBrief is an iPad-first progressive web app for **supplemental real-world preflight planning**. It combines route and fuel calculations, configurable aircraft weight-and-balance profiles, POH/AFM-derived performance worksheets, checklists, personal minima, and live federal aviation-weather/TFR data.

It intentionally does **not** include charts. Keep a current chart source suitable for the operation.

## Regulatory position

AeroBrief is not itself FAA-certified or individually “FAA approved.” Software placed on an iPad does not become approved merely because it uses FAA data. For Part 91 operations, pilots may use EFBs consistent with FAA AC 91-78A while remaining responsible for the completeness, currency, suitability, and backup of the information used. Part 91K/121/125/135 use must be covered by the operator’s EFB program and applicable FAA authorization under AC 120-76E.

Treat AeroBrief as a planning and organization tool, not as certified navigation equipment, a terrain-warning system, an FMS, or an automatic substitute for a complete preflight briefing.

## Authoritative data design

| Product | In-app behavior | Source |
|---|---|---|
| METAR / TAF | Retrieved through the Render server proxy | FAA Aviation Weather Center Data API / NOAA-NWS data |
| SIGMET / G-AIRMET / PIREP | Retrieved through the server and filtered near the planned route | FAA Aviation Weather Center Data API |
| TFR | Retrieved from the FAA Graphic TFR export, with official detail links | FAA TFR service |
| NOTAM | Opens FAA NOTAM Search; pilot records the completed check | FAA NOTAM Search |
| Recorded briefing / filing | Opens 1800WXBRIEF; pilot may record the briefing reference | FAA Flight Service (Leidos) |
| Airport/runway reference | Airport lookup through AWC; official NASR/AIS links supplied | FAA Aeronautical Information Services |
| Charts | Not included | Use a separate current chart source |

Public anonymous access to the complete FAA NOTAM machine interface is not assumed. The app never substitutes an unofficial scraper or third-party NOTAM feed when an official interface is unavailable.

## Major functions

- Route, wind, groundspeed, ETE, schedule, taxi and fuel planning
- VFR/IFR reserve and contingency settings
- Unlimited user-created aircraft profiles
- Aircraft-specific registration, serial number, units and revision/source notes
- Editable empty weight, empty arm and ramp/takeoff/landing/zero-fuel limits
- Unlimited loading stations and fuel tanks with arms, maxima and defaults
- Editable multi-point CG envelope
- Ramp, takeoff and landing weight/moment/CG calculations
- Graphical CG-envelope display
- Profile-level verification lock and conspicuous unverified warnings
- User-entered POH/AFM takeoff, landing and cruise tables
- Pressure altitude, density altitude and wind-component worksheets
- Configurable runway, surface, wind and safety-factor corrections
- Aircraft-specific JSON checklists
- Configurable personal weather, wind, gust and density-altitude minima
- FAA-source weather/hazard/TFR briefing
- Explicit official NOTAM/Flight Service completion gate
- Local saved flights and tamper-evident briefing snapshots using SHA-256 hashes
- Full JSON backup/restore for moving data between devices
- Standalone iPad Home Screen installation and offline application shell

## Safety-first aircraft setup

The included aircraft profile is deliberately blank and **unverified**. Before operational use:

1. Create a profile for the exact aircraft or approved fleet configuration.
2. Enter basic empty weight and moment/arm from current aircraft records—not a generic POH example.
3. Enter limitations, stations, fuel arms/density and CG envelope from the current POH/AFM and supplements.
4. Enter performance data and correction rules from the applicable POH/AFM tables.
5. Record the source and revision date.
6. Independently compare several W&B and performance test cases against hand calculations or another validated method.
7. Mark the profile verified only after that review.

Any maintenance, equipment, weighing or document change that affects the profile should cause it to be reviewed and re-verified.

## Deploy to GitHub and Render

1. Create a new GitHub repository.
2. Upload all files from this project folder to the repository root.
3. In Render, choose **New → Blueprint** and select the repository.
4. Apply `render.yaml`.
5. Open the generated HTTPS URL in iPad Safari.
6. Use **Share → Add to Home Screen**.
7. Create and validate aircraft profiles, then export a backup.

Render must be online to retrieve live data. The interface and previously stored local information remain available offline, but the app clearly marks the device offline and cannot make a current briefing while disconnected.

## Local development

```bash
npm ci
npm run validate
npm start
```

Open `http://localhost:3000`.

## Data storage and privacy

Aircraft profiles, loads, flights, checklists, settings and briefing snapshots are stored in browser local storage on that device. No account or database is included. Live federal-data requests pass through the app’s server only to solve browser cross-origin restrictions; the included server does not persist those requests.

Export backups regularly. Clearing Safari website data, deleting the Home Screen app, or changing devices may erase local data.

## Operational release checklist

Read `SAFETY.md` and `VALIDATION.md` before using the app for an actual flight. A green in-app planning gate is a completeness aid only; it is not a dispatch release, airworthiness determination, legal approval, or guarantee that a flight is safe.
