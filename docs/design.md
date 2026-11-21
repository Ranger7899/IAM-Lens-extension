# IAM Lens — Design Direction

## Concept: "Precision instrument, Google-native"

A Material 3 **Expressive** interface (Google's own 2025 design evolution: bolder shape, springy motion, emphasized type). It should feel like it shipped from the Cloud Console team's design lab, without copying any Google logo or product UI.

The memorable idea is **permission anatomy**. Every IAM permission is `service.resource.verb`. We show that structure everywhere and colour-code the verb by how much privilege it grants. Google's four brand hues get a _meaning_:

| Hue                            | Meaning                                      | Example verbs                                                   |
| ------------------------------ | -------------------------------------------- | --------------------------------------------------------------- |
| Blue (primary, `#1A73E8` seed) | Identity and navigation, the service segment | —                                                               |
| Green                          | **Read**                                     | get, list, getIamPolicy, search, export? (read-ish)             |
| Yellow/amber                   | **Write**                                    | create, update, patch, use, run, attach                         |
| Red                            | **Admin / destructive**                      | delete, setIamPolicy, actAs, signBlob, getAccessToken, undelete |

So the brand colours carry information and aren't only decoration. Both the classifier and its verb lists live in `src/core/privilege.ts` and are unit-tested.

## Signature elements

1. **Permission token.** A monospace pill: `storage` (primary) `.objects` (on-surface-variant) `.get` (verb in its risk hue, semibold). Click to copy, with an M3 ripple and a "Copied" snackbar.
2. **Privilege spectrum bar.** On every role row and role header, a thin segmented bar showing the read/write/admin share of the role's permissions, with counts. You can see at a glance that `roles/viewer` is mostly green and `roles/owner` has a red tail.
3. **Least-privilege badge.** In permission detail, the smallest role that grants the permission gets a tonal "Least privilege" chip with a spark icon.
4. **Search bar shape morph.** A full-pill M3 search bar that eases into a 16px-radius sheet on focus. Results stagger in with spring easing (40ms step, capped at 8 items).

## Typography

- **UI / display:** Google Sans Flex (OFL, open-sourced by Google in 2025), self-hosted. Fallback: Figtree.
- **Code / permissions:** Google Sans Code (OFL). Fallback: JetBrains Mono.
- Roboto is not used. Display sizes use tight tracking (-0.5%) and heavier optical weights. Body is 14/20.
- Role IDs and permissions are always set in the mono face. Titles and descriptions use the sans.

## Colour and surface

- M3 tonal palette from seed `#1A73E8` (via material-color-utilities). Separately harmonised custom colours: read green `#1E8E3E`, write amber `#F9AB00`, admin red `#D93025`, each with container and on-container roles for light and dark.
- Surfaces use the M3 surface-container ladder, not flat white. The side-panel background has a faint **dot grid** (1px dots, 16px pitch, `outline-variant` at 35%), a nod to cloud architecture diagrams, which fades out under the content cards.
- Dark mode is first-class and tuned separately: no pure black, `surface` at tone 6, risk hues desaturated about 10% so red doesn't glare.

## Motion

- M3 Expressive spring tokens: `--motion-spring-fast` (200ms, cubic-bezier(0.42,1.67,0.21,0.90)) for chips and state layers, and `--motion-emphasized` (500ms, cubic-bezier(0.2,0,0,1)) for panel transitions.
- Route change (list → detail) is a shared-axis X transition. The detail header morphs from the tapped row.
- All motion respects `prefers-reduced-motion` and falls back to opacity only.

## Layout

- **Popup (380×560):** search plus top results only, no chrome. The "Open in side panel" FAB sits bottom-right, as an extended FAB that collapses on scroll.
- **Side panel:** a top app bar with a segmented button (Search · Find minimal roles · Compare · What's new). Lists use dense M3 list items (56px). Role detail has a large header card (title in display-small, the ID token, a stage chip, the spectrum bar), then permissions grouped by service in collapsible sections with sticky subheaders.
- **Empty state:** shows real example queries as tappable tokens (`storage.objects.get`, `roles/run.invoker`, "bigquery admin") rather than an illustration.

## Accessibility guardrails

Hue is never the only signal. The verb class also shows as an icon (eye / pencil / shield) in the spectrum legend, and the bar has an aria-label like "142 read, 30 write, 4 admin". Contrast is AA in both themes, focus rings are visible (3px, primary), everything works from the keyboard, and `/` focuses search.
