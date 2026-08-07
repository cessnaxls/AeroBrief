# Premium UI Acceptance Matrix

Version 2.2 is designed around iPhone and iPad Safari/Home Screen use. Complete this matrix on the actual target devices before promoting a deployment to operational use.

## Required device states

Test each view in all of these states:

1. iPhone portrait, drawer closed and open
2. iPhone landscape, drawer closed and open
3. iPad portrait, drawer closed and open
4. iPad landscape, navigation expanded and stowed
5. Rotation from portrait to landscape while each view is active
6. Comfortable and Compact display-density settings

The page must not develop horizontal body overflow. A table or segmented control may scroll inside its own bordered region when its content is intentionally wider than the device.

## PLAN

- Route identifiers, names and route line remain aligned at every width.
- All five route metrics remain legible; narrow phones use a balanced 3-plus-2 arrangement.
- Fuel summary uses a complete four-cell layout with no empty column.
- Planning gate buttons have equal spacing and full touch targets.
- Flight identity, route, remarks and fuel fields remain evenly spaced.
- Completeness tiles have consistent internal padding and do not touch the panel edge.

## BRIEF

- Header status and action buttons wrap without overlap.
- Source chips maintain even height and padding.
- METAR/TAF text wraps inside its card and never expands the page width.
- Hazard filters scroll within their segmented control when necessary.
- NOTAM actions remain full-width and readable on a narrow phone.
- Alert and TFR cards keep clear separation between title, body and metadata.

## W&B

- Desktop/tablet loading table remains contained inside its scroll frame.
- Phone loading rows render as cards with Station, Arm, Input, Weight, Moment and Limit labels.
- Numeric load fields do not trigger Safari page zoom.
- Ramp, takeoff and landing cards remain readable and aligned.
- CG graph fits the available card width and is not clipped.
- W&B warnings have clear spacing below the graph or alongside it on supported tablet widths.

## TOLD

- Departure and arrival sections have identical rhythm and field alignment.
- Two-column iPad forms and single-column iPhone forms do not clip labels.
- PA, DA, headwind and crosswind strips remain evenly divided.
- Generated report actions form a balanced grid on phones.
- TOLD results render as labeled cards on narrow phones and as a contained table on tablets.
- Prepared-by, report-notes and report-ID areas do not overlap.
- Stale, warning and no-go statuses remain visually distinct.

## AIRCRAFT

- Profile chooser is a fixed column on wide layouts and a horizontal chooser on portrait/mobile layouts.
- New, import and export actions remain accessible without crowding.
- Basic aircraft fields use three columns where space permits, two on portrait tablet and one on narrow phone.
- Station, envelope and performance tables scroll only within their own frame.
- Performance subtabs swipe horizontally without wrapping into uneven rows.
- Verified toggle, source fields and delete area have clear separation.

## CHECKLISTS

- Checklist cards use two columns on suitable iPads and one column on phones.
- Every checklist row meets the minimum touch target.
- Checked rows remain readable even with reduced opacity.
- Editor panel, JSON text and Save button fit without page overflow.

## FLIGHTS

- Empty state is centered and visually intentional.
- Saved-flight route, metadata and actions maintain consistent spacing.
- Load and Delete controls remain reachable on phones.
- Cards form one column on phones and balanced columns on iPads.

## SETTINGS

- Settings panels form two columns only where field widths remain comfortable.
- Save buttons align with their panels and do not float against unrelated content.
- Source descriptions and regulatory text maintain readable line lengths.
- Link buttons wrap cleanly and remain touchable.
- Safety modal appears as a centered dialog on iPad and a safe-area-aware bottom sheet on iPhone.

## Navigation and global chrome

- Expanded iPad menu shows full labels and consistent vector icons.
- Stowed iPad menu shows centered icons with no clipped active indicator.
- Mobile drawer covers the full usable height, respects the notch and scrolls when needed.
- Drawer scrim closes the menu and prevents background interaction.
- Short iPhone landscape mode hides nonessential flight-strip content and keeps the top bar compact.
- Top-bar title and UTC clock remain visible in every state.
