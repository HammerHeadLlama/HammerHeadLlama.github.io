# DESIGN.md: Grid index

The design system for the redesign. Every later step reads this file first.
Chosen in step 2 (Nov 23, 2026): **Direction A, Grid index**, plus **B's section list** under each page hero as the jump list.
Stress-tested the same day by building all of simulation.html from these rules in a sandbox (not committed) and checking it at 1280 and 390. The fixes from that run are folded in below.

The idea: the site is the city on the home map. Each inner page is the inside of one building, and it says where you are with that building's grid code, read straight from `assets/js/city.js` (columns A–G, rows 1–5). Every page carries the same map. No page gets a style of its own.

Facts come from "Verified record + story beats + held list" only. This file defines no copy. Labels in examples are taken from the current pages.

---

## 1. Places and codes

One name and one code per place, everywhere: tabs, map plate, section indexes, next-stop links, the building panel.

| Page | Building | Code | `LANDMARKS` id (i, j) |
|---|---|---|---|
| index.html | City | MAP | n/a (the map itself) |
| simulation.html | Lab | D2 | lab (3, 1) |
| peptides.html | Bio Lab | B2 | bio (1, 1) |
| exoplanet.html | Observatory | F1 | obs (5, 0) |
| builds.html | Workshop | F4 | work (5, 3) |
| honors.html | Hall | B4 | hall (1, 3) |
| about.html | Home | D4 | home (3, 3) |
| about.html#contact | Post Office | G3 | post (6, 2) |

Rules:
- Code = `"ABCDEFG"[i] + (j + 1)`. If a building moves in `city.js`, its code changes with it. Never type a code by hand that disagrees with the array.
- The tab text is the page name (About, Simulation…), and the code goes in front of it. The current `HOME`/`LAB`/`SHOP` tab codes are replaced by grid codes, so "HOME = About" and the two-buildings-to-About mismatch go away: Home (D4) is the page, and Post Office (G3) is its contact section.

---

## 2. Tokens

Paste this as the `:root` of `site.css` in the build steps. The old names are kept where they existed, so selectors and inline uses keep resolving.

```css
:root{
  /* ground and surfaces */
  --ground:#080B10;          /* page */
  --ground-2:#0C1117;        /* recessed: map plate, widget inner, inputs */
  --panel-solid:#10151C;     /* cards, notes, strips (was #0E131A) */
  --panel:var(--panel-solid);/* inner pages: solid, no glass */
  --panel-glass:rgba(12,16,22,.86); /* only over the home canvas: HUD, #bpanel */
  --line:#1E2731;            /* dividers, card borders (decorative) */
  --line-2:#2B3644;          /* stronger divider, tag outlines (decorative) */
  --line-control:#5F6B7D;    /* borders of inputs and ghost buttons: 3.39:1 on panel */

  /* ink */
  --ink:#E9ECF1;
  --ink-2:#A9B2BF;
  --ink-3:#7C8697;           /* was #717B8C (failed AA); now 4.99:1 on panel */

  /* roles: amber = you / interactive / here. cyan = data. red = events. */
  --amber:#FFB547;
  --amber-hover:#FFC56E;
  --amber-soft:rgba(255,181,71,.12);
  --on-amber:#080B10;
  --cyan:#62D6F5;
  --cyan-soft:rgba(98,214,245,.10);
  --cyan-line:rgba(98,214,245,.35);
  --red:#FF6A5C;             /* was #FF5C4D */

  /* type */
  --display:"Archivo","IBM Plex Sans",system-ui,sans-serif;
  --sans:"IBM Plex Sans","Noto Sans TC",system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"IBM Plex Mono","Noto Sans TC",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --display-stretch:110%;    /* Archivo width; 100% read as a generic grotesk in the prototype */
  --display-weight:700;
  --t-12:.75rem;                         /* functional floor: codes, tags, table heads */
  --t-14:.875rem;                        /* captions, meta, nav, card body */
  --t-17:1.0625rem;                      /* body */
  --t-21:1.3125rem;                      /* lede */
  --t-28:1.75rem;                        /* stat numbers, h3 large */
  --t-40:clamp(2rem,3.6vw,2.5rem);       /* h2 */
  --t-60:clamp(2.5rem,5.6vw,3.75rem);    /* h1 */
  --lh-body:1.62; --lh-tight:1.05;

  /* space: 4px base */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px;
  --s-6:32px; --s-7:48px; --s-8:64px; --s-9:96px;
  --wrap:1240px;
  --index:9rem;              /* left margin column for codes */
  --plate:300px;             /* map plate width */
  --gutter:max(16px,env(safe-area-inset-left,0px));
  --gutter-r:max(16px,env(safe-area-inset-right,0px));
  --tap:44px;

  /* shape and depth */
  --r:2px;                   /* everything: cards, figures, buttons, inputs */
  --r-round:999px;           /* avatar only */
  --shadow-lift:0 12px 32px rgba(0,0,0,.45);  /* offset shadows only; no 0 0 Npx glows */
  --ease:cubic-bezier(.2,.8,.2,1);
  --dur:180ms;

  color-scheme:dark;
}
```

### Contrast (WCAG 2.2 AA, checked Nov 23, 2026)

| Text | on --ground | on --ground-2 | on --panel |
|---|---|---|---|
| --ink | 16.64 | 16.00 | 15.47 |
| --ink-2 | 9.20 | 8.85 | 8.56 |
| --ink-3 | 5.36 | 5.16 | 4.99 |
| --amber | 11.22 | 10.79 | 10.43 |
| --cyan | 11.69 | 11.24 | 10.87 |
| --red | 7.01 | 6.74 | 6.52 |
| --on-amber on --amber | 11.22 | | |
| --line-control (non-text, 3:1) | 3.65 | 3.51 | 3.39 |

Rules: no text at reduced opacity (the `#city-log li` opacity .6 goes; use `--ink-2`). `--line` and `--line-2` are decorative only and never the only edge of a control.

### Type

- **Archivo** at `--display-stretch` (110%) and `--display-weight` (700) for h1, h2, h3, stat numbers, next-stop names and the brand. Not the old 118–125% widths, which shouted. Not 100% either: the prototype showed it reads as a generic grotesk there.
- **IBM Plex Sans** 400/500/600 for body, ledes, nav and buttons.
- **IBM Plex Mono** 400/500 for codes, indexes, dates, figure labels, tags, formulas, table heads and data.
- **Noto Sans TC**: the `text=` subset must hold every CJK character used on the site (currently missing 高中學生科學研究人才培育計畫 and 台吋). Rebuild it from the pages whenever copy changes.
- Floor: nothing functional under 12px (`--t-12`). Mono uppercase only at `--t-12` with `letter-spacing:.06em`, and only for codes, table heads and `dt` labels.
- Headings: `text-wrap:balance`, `letter-spacing:-.015em` (h1 `-.02em`), h2 `max-width:20ch`, h1 `max-width:16ch`.
- Body measure `max-width:42rem`.

---

## 3. Patterns

### 3.1 Nav (`header.top`, `nav.tabs`)
- Sticky, 56px tall, solid `--ground` with a 1px `--line` bottom border. The backdrop blur can stay.
- Brand: name in Archivo display at 16px, 曾浩允 in Plex Sans 14px `--ink-3`, avatar 28px with a solid 2px `--amber` ring drawn as an offset box-shadow pair (`0 0 0 2px var(--ground),0 0 0 3.5px var(--amber)`). No blur halo.
- Tab: `<i>` code in mono `--t-12` `--ink-3`, then the name in Plex Sans `--t-14` `--ink-2`. Each tab is at least `--tap` tall.
- Current tab (`[aria-current="page"]`): name `--ink`, code `--amber`, and a 2px solid amber bottom border. No `box-shadow` glow.
- Under 820px the tabs scroll sideways under the brand. Keep the edge mask, and keep 44px targets.

### 3.2 Page hero (inner pages)
Order, top to bottom, on every inner page: **hero → lead asset → key (3.4) → jump list → sections.** Proof comes before navigation.

Hero grid on desktop: `grid-template-columns: var(--index) minmax(0,1fr) var(--plate)`, `gap: 0 var(--s-6)`, padding `--s-8` top and `--s-7` bottom.

1. **Address** (index column): the code in mono 600 at `--t-40`, `--amber`, line-height 1. Under it, the building name and its sub-name in mono `--t-14` `--ink-3`, one per line. This replaces the `p.district` dot-and-kicker.
2. **Title block** (middle column): the h1 alone at `--t-60`, then the lede at `--t-21` `--ink`, then `.meta` in **Plex Sans** `--t-14` `--ink-2` (`<b>` in `--ink`). The meta is prose, so it isn't mono. Nothing sits above the h1.
3. **Map plate** (right column, `align-self:start`): a static inline SVG of the 7×5 grid, drawn from the same `LANDMARKS` positions as `city.js`. This page's building is filled `--amber` with a dashed inner square. The others are `--panel-solid` with a `--cyan` edge at 45%. **No text inside the SVG**: at plate size its labels render under 8px, below the floor. Below the map, in HTML: "You are here" (`--t-12` `--ink-3`) on the left, the code and name in `--amber` on the right. Plate: `--ground-2` background, 1px `--line-2` border, `--r`, `--s-3` padding. The SVG has `role="img"` and an `aria-label` ("Map: Lab at grid D2"). It isn't a link.
4. **Lead asset** (optional): the page's strongest real proof, spanning the middle and right columns. Simulation: the TAAI talk photo. It's a normal figure (3.6). At most one per page.
5. **Key**: see 3.4.
6. **Jump list** (from Direction B): `<details class="jump" open>` holding `<summary>` and `nav[aria-label="On this page"]`.
   - Links: one per numbered content section, in page order, plus **one** combined link for the end matter ("Limits · Credit", index `D2.9–10`). Limits and Credit never get two separate links.
   - Each link: the index in mono `--t-12` `--ink-3` (fixed `4.2rem` column), the h2 text in Plex Sans `--t-14` `--ink`, then `↓` in `--amber`. Row at least `--tap` tall, 1px `--line` rules. Hover: text `--amber`.
   - Columns: 3 at ≥1000px, 2 at 820–999px. If the last row would hold a single link, drop a column.
   - Desktop: the `<summary>` is hidden and the list is always open. Under 820px the summary shows ("On this page" plus the count in mono) and the list starts **closed**. That needs one line of JS that removes `open` under 820px. It's new, and it touches no existing selector.
   - Required on Simulation and Builds. Optional on pages with four sections or fewer.

Responsive:
- 820–999px: the plate moves under the title block, `max-width:320px`.
- Under 820px the index column collapses. The address becomes one mono line above the h1 (`D2 · Lab · Urban Informatics`, `--t-14`, code in `--amber`). This is the one place a line sits above the h1, and it holds a code, not a category word. The plate shrinks to a **112px thumbnail** in the top-right corner beside that line, with its HTML caption hidden (the `aria-label` still names it). In the prototype this, plus the closed jump list, brought the first proof photo from about 2,190px down to about 790px at 390×844, and the first section from about 2,330px to about 1,510px.

Home (`index.html`) has no page hero. The city map is the hero, and its directory cards follow 3.5.

### 3.3 Section heading
```html
<section class="block" id="gate" aria-labelledby="gate-h">
  <p class="idx"><span><b>D2</b>.2</span><small>Built</small></p>
  <div class="body"><h2 id="gate-h">Who talks to whom</h2> …</div>
</section>
```
- Grid `var(--index) minmax(0,1fr)`, gap `--s-4 var(--s-6)`, padding `--s-8` block.
- **Street divider instead of a border.** Each `section.block` is separated by a street drawn the way `city.js` draws roads: an 11px band with a 1px `--line` kerb on each side and a dashed centre line (`rgba(160,175,195,.16)`, 6px dash, 9px gap). This uses a `::before` on the section, not an extra element. It's the one decorative motif below the hero, and it comes from the map.
- `.idx` in the index column: line 1 is the code in `--amber` (`<b>`) plus `.n` in mono `--t-14` `--ink-3`. Line 2 (`<small>`, mono `--t-12` `--ink-3`) is at most one word or one date that adds information the heading doesn't (`Built`, `Results`, `Jul 1–3, 2026`). **It never repeats the heading.** Limits and Credit get the bare index.
- On desktop `.idx` is `position:sticky; top:72px`, so the floor number stays in view while you read the section, like a floor indicator in a lift. Under 820px it is static and sits on one line above the h2 at `--t-12`.
- Numbering runs `.1, .2…` in page order and matches the jump list.
- The h2 is visible, `--t-40`, Archivo display. No h2 is pulled back out of `.sr` to double up a label: either the h2 is the visible heading, or the section has no label.
- `.block > .label` and `.district` are retired. Any `label`/`district` text that carries information (dates like "Jul 1–3, 2026") moves into `.idx`.

### 3.4 Stat strip (`.stats`), drawn as a map key
- One row between the lead asset and the jump list (directly under the hero when there's no lead asset), never inside a box. The grid is `var(--index) repeat(n, minmax(0,1fr))`, where n is 2–4, with 1px `--line` rules above and below and `--s-5` padding.
- The index column holds the word "Key" in mono `--t-12` uppercase `--ink-3`.
- `.stat b`: Archivo display at `--t-28`, tabular numbers, `--ink`. `.stat span`: `--t-14` `--ink-2`.
- Simulated values (`.stat.sim`): the number in `--cyan` plus a `sim` tag (3.6). Never amber.
- At most four stats a page. No cells, no gap-as-border grid, no panel fill.
- Under 1000px: two columns. Two columns hold down to 360px, and one column below that. Under 820px "Key" drops. (At 390px a one-column key cost a full screen in the prototype.)

### 3.5 Cards (`.dir`, `.card`, `.hob`, `.next a`)
- One card family: `--panel-solid` fill, 1px `--line` border, `--r`, `--s-5` padding, no gradient fill, no inset glow.
- Meta line (`.k`): mono `--t-12` `--ink-3`, with the building code first in `--amber` (`F4 · VEX 23083Z`).
- Title: h3, Archivo display at `--t-21`. Body: `--t-14` to `--t-17` `--ink-2`.
- A linked card on hover or focus-within: border `--amber`, `translateY(-2px)`, over `--dur` `--ease`. A photo inside zooms 1.02 within its frame (`overflow:hidden`). **No rotate**: `.hob:hover rotate(-.3deg)` is gone. No glow.
- The hobby bento grid is retired. "Off the clock" uses the same card grid as everything else (`repeat(auto-fill,minmax(min(100%,17rem),1fr))`), with spans only for media that needs them.
- `.hob-big` gradient text is gone. Big words are plain `--ink` Archivo at `--t-28`.
- **Next stop** (`nav.next`): two cards, the previous and the next building in tab order (City, About, Simulation, Peptides, Exoplanet, Builds, Honors). Each card shows the code with an arrow in mono `--t-12` (`← D4`, `B2 →`) over the building name in Archivo display `--t-21` (`Home`, `Bio Lab`). One wording site-wide. No "Back to the city map" card: that link lives in the footer only, so it appears once per page. The first and last pages link to City (MAP) on the open side.
- **Builds bench**: a compact grouped list (rows: code · name · one line · link), not 16 equal cards.

### 3.6 Figures
- `figure`: grid, `--s-2` gap. Image or video: 1px `--line` border, `--r`, `--ground-2` background behind any transparency.
- `figcaption`: `--t-14` `--ink-2`, `max-width:60ch`. Starts with the label in mono `--cyan` (`Fig. 3`, `Rec. 2`). Captions stay: they carry the source ("From the midterm deck", "shared with permission") and the honesty tags.
- **Every figure showing simulation output** carries `<span class="tag-sim">simulation</span>`: mono `--t-12` `--ink-3`, 1px `--line-2` border, `--r`. Never remove it to clean up a layout.
- Zoomable images keep `data-zoom` and `data-caption`. The lightbox uses `--shadow-lift`, not a glow.
- `video[data-auto]` keeps `preload="none"` and its poster. The audit P2 (the 2.9 MB video downloads on scroll-in) is fixed in a later step without renaming `data-auto`.
- `.figrow`: `repeat(auto-fit,minmax(min(100%,17rem),1fr))`, `--s-5` gap, `align-items:start`.
- Charts and light curves sit on `--ground-2`, never on `#fff`. A white-background source image goes on a `--panel-solid` mat with `--s-2` padding.
- **Wide text diagrams** (`figure.diagram`: sim-loop, the OTP flowchart, anything with small text in a 16:7 frame): under 820px the `<img>` sits in a `.pan` wrapper (`overflow-x:auto`) at `min-width:680px`, and the figcaption stays **outside** the wrapper so it never gets cut off. Tap-to-zoom (`data-zoom`) still works. Photos and recordings don't pan: they scale.

### 3.6b Log entries and quotes
- `.log` (dated stories): 2px `--line-2` left rule, `--s-4` left padding, `max-width:44rem`. The date (`time` / `.when`) is mono `--t-14` `--ink-3`. It was amber, but amber means you or interactive, and a date is neither. h3 at `--t-21`.
- `.quote`: Archivo display `--t-28`, 2px `--amber` left rule (it's your line), `cite` in mono `--t-14` `--ink-3`. At most one per page.

### 3.7 Limits and Credit blocks
Every project page ends with **Limits**, then **Credit** where others built part of it. Exoplanet gets a Limits block (audit P2).
- Visible h2 "Limits" / "Credit". The `.idx` holds only the code and number (`D2.9`).
- Body: `dl.facts` drawn as a notes table. 1px `--line-2` border, `--r`, `max-width:48rem`, grid `8.5rem minmax(0,1fr)`, rows split by 1px `--line`.
- `dt`: mono `--t-12` uppercase `--ink-3`, `letter-spacing:.06em`.
- `dd`: body size `--t-17` `--ink`. Limits are read, not skimmed, so they never get small type.
- Credit: same table, with the person or role in `dt` and what they built in `dd`. The `.prose` credit line stays as it is in the copy. Links (`ul.links`) follow in mono `--t-14`, each at least `--tap` tall.
- No warning colours: Limits aren't events, so no red.
- Under 560px: `dt` stacks above `dd`.

### 3.8 Footer (`footer.foot`)
- 1px `--line` top border, `--s-6` padding, mono `--t-12` `--ink-3` for the line "Daniel Tsen · Hong Kong · updated <month year>".
- Links (email, LinkedIn, CV, Back to the map) in mono `--t-14` `--ink-2`, each a block at least `--tap` tall (currently 21px). Hover: `--amber`.
- "Back to the map" lives here and nowhere else on inner pages.

### 3.9 Buttons, inputs, widgets
- One button pair. `.btn`: `--amber` fill, `--on-amber` text, `--r`, min-height `--tap`, Plex Sans 500 `--t-14`. Hover goes to `--amber-hover`. Press: `translateY(1px)`. `.btn.ghost`: transparent, 1px `--line-control` border, `--ink` text. Hover: border and text turn `--amber`. `.btn.small` keeps 40px+ height (44px under 1000px). `[aria-pressed="true"]` keeps the amber-soft state.
- Inputs: `--ground-2`, 1px `--line-control`, `--r`. Focus: 2px `--amber` outline. Range inputs get a 44px hit area (wrapper padding) around the 22px track.
- Widgets (`.widget`): flat `--ground-2` with 1px `--cyan-line` border, `--r`, no gradient. The header label is mono `--t-12` `--cyan`. The gate meter fill turns `--amber` on `.pass`, with no glow. The threshold marker stays `--red`.

### 3.10 Motion and focus
- Allowed: the 2px card lift, the 1.02 photo zoom, button step and press, underline and colour changes, the `#bpanel.pop` entrance and the map zoom-in on enter. All at `--dur` `--ease`.
- Not allowed: tilt, scroll-triggered fades, parallax, glows, infinite autoplaying reels (the Builds reel is dropped).
- `prefers-reduced-motion`: drop transforms and long animations. Keep colour, border and state changes (`.pass`, `.hit`/`.miss`, `[aria-pressed]`) so feedback still shows.
- Focus: `outline:2px solid var(--amber); outline-offset:3px` on everything, never removed. `#bpanel` moves focus to `#bp-title` on open and back to the canvas on close (audit P1; JS step).

### 3.11 Home page specifics
- Under 1000px: the HUD collapses to one line (clock · agents · hash) plus a "Controls" disclosure. `#city-log` shows 1–2 lines. The canvas is about 420px tall (audit P1).
- `.intro`, `.proof`, `.cta` keep their roles. `.proof b` labels use mono `--t-12` `--amber`, and the links are at least `--tap` tall.
- Directory cards (`.dir`) follow 3.5. `.k` becomes the building code plus name (`D2 · Lab`).

---

## 4. Retired

| Retired | Replaced by |
|---|---|
| `p.district` (dot and uppercase kicker) | hero address (3.2) |
| `.block > .label` kicker over a heading | `.idx` in the index column (3.3) |
| h2s pulled out of `.sr` (v3 override at site.css:356) | one visible h2 per section, no duplicate labels |
| `.hob-big` gradient-clipped text | plain Archivo `--ink` |
| `box-shadow:0 0 Npx` glows (tabs, `.district`, `.me img`, `.pass .meter .fill`, `#bpanel` ring) | solid 2px borders and rings, `--shadow-lift` |
| `.hob:hover` rotate | 2px lift |
| hobby bento grid | the shared card grid |
| `.reel` infinite photo reel | dropped |
| 1px `--line` top border on sections | street divider (3.3) |
| amber dates on `.log` | `--ink-3` mono dates (3.6b) |
| "Back to the city map" next-stop card | footer link only (3.8) |
| `.widget` gradient fill | flat `--ground-2` |
| layered override blocks ("review fixes", "v3 editorial") | one stylesheet in token order; each selector defined once |
| hard-coded colours and inline `style=` | tokens and utility classes |

## 5. Must keep working

Restyle freely, but don't rename or remove these. The full list is in "Site audit — Step 1".
- **IDs:** city-wrap, city, bg, bpanel, bp-close, bp-enter, bp-kicker, bp-stat, bp-text, bp-title, bp-walk, btn-play, btn-quake, btn-replay, btn-base, walk-toggle, walk-hint, city-log, hud-clock, hud-agents, hud-talks, hud-branch, hud-hash, lightbox, board-clock, filter-count, gate, g-fill, g-score, g-verdict, g-rel, g-aff, g-ctx, g-soc, cache, h-calls, h-in, h-out, h-run, h-state, km-chips, km-in, km-stats, km-warn, pep-hero, transit, tr-b, tr-b-v, tr-depth, tr-geo, tr-p, tr-p-v, tr-play, and the `#walk` hash.
- **Classes and states:** `.tabs [aria-current]`, `.flap`, `.pass`, `.pop`, `.panel-open`, `.walking`, `.on`, `.hit`/`.miss` on `#h-state`, `.hob-video`.
- **Data attributes:** data-auto, data-copy, data-filter, data-tags, data-video, data-poster, data-placeholder, data-optional, data-zoom, data-caption, data-close, data-open, data-preset, data-k.
- **Queried elements:** `video[data-auto]`, `img[data-zoom]`, `img[data-optional]`, `a[data-placeholder]`, figcaption inside figures, and tr / li / figure ancestors.

If a pattern here needs a renamed class, keep the old class on the element alongside the new one.
