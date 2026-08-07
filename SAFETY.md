# Operational Safety and Limitations

## What AeroBrief may support

AeroBrief may be used to organize supplemental preflight information, perform calculations based on pilot-entered data, display current data received from listed federal sources, and retain a local planning or TOLD snapshot.

## What it does not establish

AeroBrief does not establish aircraft airworthiness, pilot qualification or currency, legal weather minimums, runway suitability, fuel availability, performance compliance, navigation-database currency, obstacle clearance, dispatch authority, or the completeness of a briefing. It does not replace the POH/AFM, approved supplements, operating specifications, MEL/CDL, company manuals, ATC information, airport/runway source documents, or sound aeronautical decision-making.

A TOLD result marked **PASS** means only that the configured calculation fits within the user-entered limits and declared distances. It is not an FAA-approved runway-analysis result or takeoff/landing authorization.

## Required pilot checks

Before each operational use, the pilot should verify at least:

- the exact aircraft profile and current weight-and-balance source data;
- current POH/AFM performance tables and all applicable notes, limitations and procedures;
- the selected takeoff/landing configuration and any MEL/CDL or anti-ice performance effect;
- weather product issue and valid times;
- complete NOTAMs and TFRs from an official source;
- current charts through a separate suitable chart service;
- runway dimensions, closures, declared distances, displaced thresholds, contamination and braking information;
- whether runway slope and wind corrections are permitted and correctly signed;
- fuel quantity, grade, availability and legally required reserves;
- route, altitude, airspace, terrain, obstacles and alternates;
- network connectivity, battery state and an appropriate backup.

## TOLD and performance data

The performance engine can only be as valid as the entered source tables, configurations and correction rules. POH/AFM notes may:

- prohibit interpolation or require a particular interpolation method;
- require conservative rounding to the next adverse value;
- distinguish ground roll, distance over an obstacle and accelerate-stop distance;
- specify different techniques, flap settings, anti-ice penalties or runway-condition limits;
- impose maximum demonstrated or limiting crosswind/tailwind values;
- omit a correction entirely, meaning the app must not invent one.

AeroBrief rejects inputs outside the entered pressure-altitude, temperature or weight bounds rather than extrapolating. That protection does not prove the entered table is complete or correctly transcribed. Review generated values against the source document and retain the source/revision in the profile.

The user-selected planning factor is applied after configured corrections. It is a planning margin, not a replacement for any regulatory, POH/AFM, operator or runway-analysis factor.

## Declared distances

TORA, TODA, ASDA and LDA must be obtained from a current authoritative source and entered for the correct runway direction. Do not assume published physical runway length equals every declared distance. Confirm temporary reductions and NOTAM effects before use.

## Runway condition

The dry, wet, grass, soft and contaminated selections apply only the correction values stored in the profile. A zero or blank correction is not evidence that no penalty exists. Do not use contaminated-runway calculations unless the aircraft data and operating rules explicitly support the condition and the profile has been validated for it.

## Weight and balance

Moment/arm calculations are mathematical aids. Confirm units, datum, fuel density, unusable fuel treatment, seating/baggage limits, loading sequence, takeoff burn and landing burn. Do not use a generic profile in place of the exact aircraft’s current empty-weight data.

## Connectivity and source failures

A source may be delayed, unavailable, malformed or incomplete. Cached/stored information is not automatically current. When the app cannot retrieve a product, it must be obtained by another appropriate method before flight.

## Device and layout checks

Before using a new iOS/iPadOS version or device:

- verify all fields remain visible in portrait and landscape;
- test the menu expanded, stowed and drawer states;
- confirm report print/share output;
- confirm no stale report survives a changed aircraft, route, load or runway input;
- confirm safe-area spacing does not cover controls;
- retain an appropriate independent backup.

## Commercial and managed operations

Part 91K, 121, 125 and 135 operators should not place this app into operational service without review under the operator’s manuals, EFB program, performance/runway-analysis process, security/data-control process and FAA authorization where applicable.
