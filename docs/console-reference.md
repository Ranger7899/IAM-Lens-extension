# Cloud Console design reference (measured)

Source: live console, project `iam-chrome`, pages read-only: IAM & Admin > Roles (predefined list), a predefined role detail page (Storage Object Viewer), IAM (Allow > View by principals), and the All products page. Values come from `getComputedStyle`. No personal data is stored here.

**Theme captured: DARK ONLY.** The user's console was already in dark theme; the theme was not toggled. Light theme not captured, so no light values are derived. Screenshots were not saved (the IAM page shows account data); screens are described in words.

## What makes it look like the console (summary)

1. Three-layer dark surface: app shell `#282c32`, the main content panel `#353b43` sitting on it with a 20px radius on its top corners only, flush to the right and bottom edges.
2. One typeface, Google Sans Flex (fallback to Roboto), at small sizes: body is 14px/20px, page title 18px/24px weight 500, section titles 18-22px weight 400. Weight 500 is used for tabs, table headers, buttons, nav section headers.
3. Quiet colour: nearly everything is neutral blue-grey text (`#f1f4f9` primary, `#b9c0cc` secondary). The only accent is periwinkle `#a8baff` (text buttons, tab underline) and links `#e5ebff` with an underline.
4. Dense tables: header row 29px tall with fill `#414d5e` and a 1px `#50638b` bottom border; cells 4px 16px padding, no row borders, no zebra, checkbox column on the left, kebab or copy icons on the right.
5. Buttons are flat pills, not Material filled: 32px high, 12px horizontal padding, 12px radius, 1px `#50638b` outline, periwinkle label, no shadow. Text buttons have no border.
6. Left nav is a flat 256px list on the shell colour with 18px monochrome icons (`#9ca6b2`), 36px rows, active item a 12px-radius pill filled `#2a3f5e` with a thin light accent bar on its left edge.
7. No shadows anywhere on the surfaces examined. Elevation comes from tone only.

## Colour tokens (dark)

| Role | Hex |
|---|---|
| App shell / body background | `#282c32` |
| Content panel surface | `#353b43` |
| Table header fill | `#414d5e` |
| Table header bottom border / outlined button border / info banner fill | `#50638b` |
| Active nav item fill | `#2a3f5e` |
| Text primary | `#f1f4f9` |
| Text secondary (table cells, nav labels, kv values) | `#b9c0cc` |
| Table header text, tabs | `#e5ecff` / `#e5ebff` |
| Link (underlined) | `#e5ebff` |
| Accent / text-button label / outlined-button label | `#a8baff` |
| Icon default (nav, star) | `#9ca6b2` |
| Icon in table rows, help icon | `#b9c0cc` |
| Disabled button text / border | `#e8eaed` at 38% / 12% alpha |
| Chip "Preview": fill / text | `#8fbed4` / `#1b2e5d` |
| Checkbox border | `#f1f4f9`, 2px, radius 2px, 16x16 |
| Info banner text | `#f1f4f9` on `#50638b` |

Status colours (error, success, warning) were not present on the pages read; not captured. Tab underline colour is not a computed value (drawn by an indicator element); visually it is periwinkle, likely `#a8baff` (visual estimate).

## Typography

Family: `"Google Sans Flex", sans-serif` (body element itself declares `Roboto, "Helvetica Neue", sans-serif` at 12px/16px, but all components override to Google Sans Flex).

| Use | Size/line-height | Weight | Colour |
|---|---|---|---|
| Page title in header bar (detail page title) | 18px/24px | 500 | `#f1f4f9` |
| Page title "Roles" (list page, breadcrumb-style label) | 14px/24px | 500 | `#b9c0cc` |
| Section title ("Predefined roles") | 18px/24px | 400 | `#f1f4f9` |
| Section heading on IAM / detail pages ("Permissions for project", "Description", "N assigned permissions") | 22px/28px | 400 | `#f1f4f9` |
| Tabs | 14px/20px (36px tall) | 500 | `#e5ebff` |
| Table header | 14px/20px | 500 | `#e5ecff` |
| Table cell | 14px/20px | 400 | `#b9c0cc` |
| Table first-column link | 14px/20px | 400 | `#e5ebff`, underlined |
| Body / paragraph / list item | 14px/20px | 400 | `#f1f4f9` |
| Key/value label (dt) | 14px/20px | 500 | `#f1f4f9`; value 400 `#b9c0cc` |
| Chip | 12px/20px | 500 | `#1b2e5d` |
| Nav section header | 14px/20px | 500 | `#b9c0cc` |
| Nav item | 14px/36px | 400 | `#b9c0cc` |
| Mono | not observed (permission IDs and role IDs render in the same sans) | | |

No letter-spacing or text-transform observed.

## Spacing and density

- Page: content panel padding 24px; viewport is the panel, 256px nav to its left (nav rect 224px wide link, 36px rows).
- Table row: 29px (4px 16px cell padding, 20px line). Header 29px. Checkbox column ~16px box.
- Tabs: 36px tall, 24px horizontal padding on the top-level tabs (120px wide for "Predefined"); sub-tabs ("View by principals") same 36px height with an underline and a 1px divider under the bar.
- Filter bar: 40px-line-height "Filter" label (500) with a funnel icon, then placeholder "Enter property name or value"; no border or fill, inline above the table; help and column-toggle icons right-aligned (24px round icon buttons).
- Description paragraphs: 14px/20px, max width about 40 characters per line on the roles list.
- Banner: 52px tall total, radius 16px, fill `#50638b`, 18px info icon left, full panel width.
- Products page: rows 54px (two-line descriptions), star button 24px round.

## Radii and elevation

- Content panel: 20px top-left/top-right, 0 bottom.
- Buttons: 12px. Nav active pill: 12px. Banner: 16px. Chip: 4px. Checkbox: 2px. Icon buttons: fully round (9999px).
- Box shadows: none on every element measured. Disabled and enabled buttons both flat.

## Components

**App bar** (top, shell colour `#282c32`, no border): hamburger, "Google Cloud" wordmark (not to be reproduced; IAM Lens keeps its own name/icon), a project selector pill (rounded, outlined), a wide centered search field (about 430px at 1568 screenshot width, pill-shaped, slightly lighter than the shell, "Search (/) for resources, docs, products, and more" with a search icon at the right), right-aligned round icon buttons (Gemini sparkle, Cloud Shell, notification badge, overflow) and a circular avatar.

**Breadcrumb** under the app bar: 14px/20px, `#e5ebff`, separated by "/".

**Left nav**: section headers with a chevron (collapsible) at 14px/500; items have an 18px monochrome icon at left (`#9ca6b2`), 14px label, a kebab icon at right; hover/active pill 12px radius. The active item (`#2a3f5e`) gets a short light bar on its left edge. Preview chip inline after the label.

**Tabs** (page level and sub-level): label only, weight 500, active tab has a 2-3px periwinkle underline under the label (sub-tab underline spans the full tab width), inactive tabs have the same colour without underline. A full-width 1px divider sits under the sub-tab bar.

**Buttons**
- Outlined (e.g. "Create from role", "Learn"): 32px high, padding 0 12px, radius 12px, border 1px `#50638b`, label `#a8baff` 14px/500, transparent fill.
- Text (e.g. "Grant access", "Create custom role"): no border, label `#a8baff` 14px/500, leading icon 18px. The "plus" icon sits left of the label.
- Disabled: text `#e8eaed` at 38%, border `#e8eaed` at 12%.
- No filled primary button was present on the read-only pages; none captured.

**Chip / badge** ("Preview"): 20px tall, 4px radius, 0 4px padding, fill `#8fbed4`, text `#1b2e5d`, 12px/500. Light-blue badge, not an outlined pill.

**Table**: header fill `#414d5e` with 1px bottom `#50638b`; no row dividers; first cell checkbox; sortable header shows an arrow glyph next to the active label; row actions as a kebab; copy icon after the role name in the Name column; links in the first column underlined.

**Info banner**: full width, `#50638b` fill, radius 16px, text `#f1f4f9`, small info icon at left.

**Detail page** (role): header bar with a back arrow, 18px/500 title, then two outlined buttons ("Edit role" disabled, "Create from role"). Below: key/value rows (ID with copy icon, launch stage), a 22px "Description" heading and paragraph, a 22px "8 assigned permissions" heading and a plain list of permission strings (14px/20px, no table, no checkboxes), then the info banner.

**Empty state, tooltip, side panel/drawer**: not seen on the pages read; not captured.

## Product icons (navigation and lists)

- Left-nav items carry an 18x18 SVG at the left of the label, single colour `#9ca6b2` (slightly dimmer than the label `#b9c0cc`), no coloured backgrounds, no tiles. Gap to the label about 8px. Icons are Material-style outline/filled glyphs (person-add for IAM, key-card for service accounts, people for groups, shield for access manager, hat for roles, and so on).
- All products page (the "product list"): NO product icons in the list. Each row is: star-to-favourite icon button (24px round, 18px star `#9ca6b2`), product name as an underlined link (`#e5ebff`), description in `#b9c0cc`, then a doc-link icon and an expand chevron on the right (18px, `#b9c0cc`). Category headings sit in a left column (18px) with a short grey description; the products table (header fill `#414d5e`) fills a 400px-wide column.
- Row action icons (kebab, copy, help, column toggle) are 18px glyphs inside 24px round buttons, `#b9c0cc`.

## Pages examined

- Roles list: tabs Predefined/Custom, section title with a text button "Create custom role", intro paragraph, filter bar, 4-column table (checkbox, Title, Product or service, Name, Actions).
- Role detail: described above.
- IAM (Allow tab): top tabs Allow, Deny, Unified Access Policies (Preview badge), Recommendations history; heading "Permissions for project ..."; right-aligned checkbox "Include Google-provided role grants"; sub-tabs View by principals / View by roles; text buttons Grant access and Remove access (disabled); filter bar; table with Type, Principal (sorted), Name, Role, Security insights, Inheritance columns. Multi-role rows stack roles within one tall row (157px for five roles), role cells in primary text, "Advanced security insight" in `#b9c0cc`/dimmer.
- All products page.

## Not captured

Light theme; status colours; filled primary button; tooltip, drawer, empty state, dialog; CSS custom-property token names (blocked by tooling); screenshots/GIFs (not saved to avoid account data).
