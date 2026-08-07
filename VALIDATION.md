# Validation Guide

This repository has software checks, but operational validation must be performed by the user/operator for each aircraft profile, performance dataset, device class and intended use.

## Included software checks

Run:

```bash
npm run check
npm run validate
```

The commands check JavaScript syntax, required project files, manifest validity, duplicate HTML IDs, static DOM references and key interface elements. The Render health endpoint is `/api/health`.

## Aircraft profile acceptance test

For each profile, retain evidence of:

1. source document identity, revision and effective date;
2. current aircraft empty weight/moment or arm;
3. station and fuel-arm comparison against source documents;
4. CG-envelope and weight-limit comparison;
5. at least three independent W&B cases, including a near-forward and near-aft case;
6. verification of unit conversions and correction-factor direction;
7. checklist comparison against the approved/current checklist;
8. a second-person review where the operation requires or benefits from it.

Mark the profile verified only after discrepancies are resolved. Re-test after any profile/schema/code change that can affect calculations.

## TOLD dataset acceptance test

For every takeoff and landing configuration:

1. Verify every transcribed pressure altitude, temperature, weight and distance value against the source.
2. Verify speed values and labels against the exact configuration and weight basis.
3. Test exact table points at low, middle and high conditions.
4. Test values between table points using an independently calculated comparison.
5. Test one input below and one above every table boundary; each must be rejected as out of range.
6. Test dry, wet, grass, soft and contaminated selections only where source-supported corrections exist.
7. Verify headwind, tailwind, upslope and downslope signs and percentages with known examples.
8. Verify ground roll against TORA, obstacle distance against TODA, accelerate-stop against ASDA and landing distance against LDA.
9. Test a value one foot below and one foot above each available-distance threshold.
10. Verify crosswind/tailwind warnings and any configured aircraft limit.
11. Change the aircraft, route, W&B or TOLD input after calculation and confirm the prior report is marked **RECALC REQUIRED**.
12. Copy, download, share and print a report and compare every displayed value with the on-screen result.

A dataset should remain unverified until all applicable tests pass and its source/revision is recorded.

## Responsive-device acceptance matrix

Test at minimum:

| Device state | Required result |
|---|---|
| iPad landscape, menu expanded | Full labels visible; content not covered |
| iPad landscape, menu stowed | Icon rail visible; main content expands |
| iPad portrait, drawer closed | Menu button available; content full width |
| iPad portrait, drawer open | Drawer and scrim visible; tap/click closes it |
| iPhone portrait, drawer closed/open | No horizontal page overflow; controls remain touchable |
| iPhone landscape, drawer closed/open | Header and TOLD controls fit within short viewport |
| Rotation during use | Active view retained and no controls become unreachable |
| Home Screen standalone mode | Safe-area insets protect status/home-indicator regions |

Repeat this matrix after significant CSS, iOS/iPadOS or Safari changes.

## Preflight functional test

Before relying on a deployment:

- confirm the HTTPS page and `/api/health` load;
- confirm the displayed UTC clock and device date;
- retrieve known-current METAR/TAF data and compare with the official site;
- compare at least one SIGMET/G-AIRMET/PIREP and TFR result with its official page;
- verify official NOTAM Search and 1800WXBRIEF links open correctly;
- calculate a known TOLD case and compare with the approved source/manual calculation;
- export and restore a backup on a test device;
- test loss of network connectivity and verify stale/offline indications;
- print or save a sample planning package and TOLD report;
- verify that charts remain available through the separate chart source.

## Change control

Use tagged GitHub releases. Record the deployed commit, validation date, reviewer and known limitations. Do not auto-deploy unreviewed changes into an operational URL. For stricter control, disable Render auto-deploy after the initial deployment and deploy only validated tags/commits.
