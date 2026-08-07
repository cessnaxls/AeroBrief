# TOLD Aircraft Profile Guide

The AeroBrief TOLD engine is deliberately data-driven. It does not ship with generic aircraft numbers and should not be populated from memory, an internet forum, another registration’s load sheet, or an unrelated model-year POH.

## Source hierarchy

Use the source applicable to the exact aircraft and operation, such as the current AFM/POH, approved supplement, performance manual, operator manual or an approved runway-analysis source. Record the document name, revision/effective date and configuration assumptions in **Aircraft → TOLD Setup**.

## TOLD setup fields

- **Verified:** Set only after the dataset passes the validation process.
- **Source:** Document title, revision and any table/page references.
- **Obstacle height:** The height used by the source table, commonly—but not universally—50 ft.
- **Takeoff speed labels:** Customize for the aircraft, for example `V1`, `VR`, `V2` or `LIFTOFF`, `VX`, `VY`.
- **Landing speed labels:** Customize for the aircraft, for example `VREF`, `VAPP`.
- **Default configurations:** Exact labels used in the data rows, such as `FLAPS 0`, `FLAPS 10`, `NORMAL`, `SHORT FIELD` or an operator-specific configuration.
- **Wind use:** Choose the basis required by the source/procedure; confirm how gusts are treated.
- **Planning factors:** Additional user/operator margin applied after source-based corrections.

## Takeoff table rows

Each row supports:

- configuration;
- pressure altitude;
- temperature;
- weight;
- ground roll;
- distance over the configured obstacle height;
- optional accelerate-stop distance;
- up to three configurable speeds;
- optional limiting weight.

Use enough rows to represent the source table throughout the intended operating range. The app will reject pressure altitude, temperature or weight outside the entered bounds for the selected configuration.

## Landing table rows

Each row supports:

- configuration;
- pressure altitude;
- temperature;
- weight;
- ground roll;
- distance over the configured obstacle height;
- up to two configurable speeds;
- optional limiting weight.

## Corrections

Separate correction entries are available for takeoff and landing:

- grass;
- wet pavement;
- soft/unprepared surface;
- contaminated surface;
- headwind per knot;
- tailwind per knot;
- upslope per percent;
- downslope per percent.

Enter a value only when the source explicitly supports that correction and confirm whether the published wording means “increase by,” “decrease by,” “not more than,” or another treatment. The app’s correction percentage is applied to the interpolated base distance before the planning factor.

## Runway and weather inputs

The operational worksheet has separate takeoff and landing inputs for:

- airport and runway;
- configuration and phase weight;
- field elevation, altimeter and temperature;
- runway magnetic heading;
- wind direction, steady speed and gust;
- runway slope;
- surface/condition;
- TORA, TODA and ASDA for takeoff;
- LDA for landing;
- notes, technique and MEL/operational considerations.

Available METAR values can be synchronized into the worksheet, but the pilot must verify timeliness, runway-specific wind differences and all source assumptions.

## Report logic

The TOLD report displays:

- pressure altitude and density altitude;
- headwind/tailwind and crosswind components;
- base and corrected/planning distances;
- selected speeds;
- available declared distance and remaining margin;
- warnings, limitations and an overall configured-data PASS/NO-GO status;
- a report ID and preparation time.

The report becomes stale when relevant aircraft, route, W&B or TOLD inputs change. Recalculate after every material change.

## Minimum validation set

At minimum, retain one exact-point and one interpolated test for each configuration at low, middle and high pressure-altitude/temperature/weight regions, plus all applicable correction and declared-distance boundary tests. See `VALIDATION.md` for the complete checklist.
