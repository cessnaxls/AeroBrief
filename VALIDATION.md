# Validation Guide

This repository has software checks, but operational validation must be performed by the user/operator for each aircraft profile and intended use.

## Included software checks

Run:

```bash
npm run validate
```

The command checks JavaScript syntax, required project files, manifest validity, duplicate HTML IDs, static DOM references and key interface elements. The Render health endpoint is `/api/health`.

## Aircraft profile acceptance test

For each profile, retain evidence of:

1. source document identity, revision and effective date;
2. current aircraft empty weight/moment or arm;
3. station and fuel-arm comparison against source documents;
4. CG-envelope and weight-limit comparison;
5. at least three independent W&B cases, including a near-forward and near-aft case;
6. takeoff and landing calculations at low, middle and high table conditions;
7. verification of unit conversions and correction-factor direction;
8. checklist comparison against the approved/current checklist;
9. a second-person review where the operation requires or benefits from it.

Mark the profile verified only after discrepancies are resolved. Re-test after any profile/schema/code change that can affect calculations.

## Preflight functional test

Before relying on a deployment:

- confirm the HTTPS page and `/api/health` load;
- confirm the displayed UTC clock and device date;
- retrieve known-current METAR/TAF data and compare with the official site;
- compare at least one SIGMET/G-AIRMET/PIREP and TFR result with its official page;
- verify official NOTAM Search and 1800WXBRIEF links open correctly;
- export and restore a backup on a test device;
- test iPad portrait and landscape layouts;
- test loss of network connectivity and verify stale/offline indications;
- print or save a sample planning package;
- verify that charts remain available through the separate chart source.

## Change control

Use tagged GitHub releases. Record the deployed commit, validation date, reviewer and known limitations. Do not auto-deploy unreviewed changes into an operational URL. For stricter control, disable Render auto-deploy after the initial deployment and deploy only validated tags/commits.
