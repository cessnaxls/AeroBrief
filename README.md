# AeroBrief 1.0

AeroBrief is a custom, standalone, iPad-first flight-planning and briefing web app for **flight simulation**. It deploys from GitHub to a free Render web service and installs on iPad as a full-screen Progressive Web App.

> **Simulation only.** Do not use AeroBrief for real-world navigation, weather decisions, aircraft performance, dispatch, or operational control.

## Included

- Dark iPad cockpit interface with portrait and landscape layouts.
- Flight identity, route, schedule, altitude, TAS, wind, fuel and reserve planning.
- Great-circle distance, initial true course, wind-adjusted groundspeed, ETE, block time and fuel estimates.
- Live worldwide airport/runway information through AviationWeather.gov.
- Live METAR and TAF briefing for departure, destination and alternate.
- Route-box domestic SIGMET, G-AIRMET and PIREP retrieval.
- Automated operational scan for low flight category, strong gusts, significant weather codes, TAF hazards and reported route hazards.
- Estimated best-runway headwind/crosswind display.
- OpenStreetMap route overview.
- Plaintext simulator OFP with copy, download and print briefing support.
- Latest SimBrief OFP import by username or numeric Pilot ID.
- Local saved-flight library, JSON backup and restore.
- Add-to-Home-Screen PWA support and offline app shell.
- No database, no persistent Render disk and no paid service required.

## Deploy with GitHub and Render

1. Create an empty GitHub repository.
2. Upload **the contents of this folder** to the repository root. `package.json`, `server.mjs`, `render.yaml` and `public` must be at the top level.
3. Commit and push the files.
4. In Render, choose **New → Blueprint**.
5. Connect the GitHub repository and apply the included `render.yaml`.
6. After deployment, open `/api/health`. It should report:

```json
{"ok":true,"service":"aerobrief-ipad","version":"1.0.0"}
```

Every new push to the connected branch will redeploy the app.

## Install on iPad

1. Open the Render HTTPS URL in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Open AeroBrief from the new home-screen icon.

## Local test

Node.js 20 or newer is required.

```bash
npm install
npm run check
npm start
```

Open `http://localhost:3000`.

## Live-data design

AviationWeather.gov currently does not allow cross-origin browser requests, so the Node service proxies narrowly scoped airport, METAR, TAF, advisory and PIREP requests. Responses are cached briefly in process to respect upstream request limits. The free Render filesystem is ephemeral; plans are intentionally stored in the browser and can be exported as JSON.

## SimBrief

The app can retrieve a user's latest SimBrief OFP using the public JSON fetcher and import the core flight fields. The **Open SimBrief** button uses a separate named browser window because a hosted PWA cannot force third-party authenticated pages to run inside an iframe.

## Project structure

```text
.
├── package.json
├── render.yaml
├── server.mjs
├── .github/workflows/check.yml
└── public
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── manifest.webmanifest
    ├── sw.js
    └── icons
```
