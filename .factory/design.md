# Family Handoff Calendar — visual thesis

## Direction: the night-market handoff board

Family logistics often happen at the edges of the day: a rushed school gate, a station platform, the five-minute gap between work and practice. The interface borrows from a night-market's hand-painted route signs and pools of electric light. It is not a generic dark dashboard: a warm paper schedule sits inside an inky street scene, with responsibility marked like legible vendor tickets. Decoration explains the product's promise—one glance should reveal who goes where next.

This is an explicitly single-mode product. The dark treatment is integral to the night-market direction, reduces visual glare on a shared kitchen display at night, and lets the warm schedule surface carry the operational content. Print has its own ink-on-paper treatment.

## Palette

- `laneway #090E1A`: page background, like blue-black painted metal.
- `awning #121A2B`: raised chrome and input surfaces.
- `paper #FFF4D8`: primary text and the printable-schedule reference.
- `paper-muted #C8C4B4`: secondary text; 9.8:1 on laneway.
- `mango #FFC857`: primary action and focus; ink contrast `#17120A`.
- `jade #42E8B4`: confirmed/owned state; dark ink labels keep contrast.
- `pink #FF6B9E`: second member marker and handoff connector.
- `blue #7BB7FF`: third member marker and informational state.
- `danger #FF8A7A`: errors, always paired with an icon or words.

Responsibility never relies on hue alone: every colored ticket also includes a member name or initials. All body combinations meet WCAG AA (verified in the browser audit); borders are at least 3:1 where they communicate state.

## Typography

- Display: `Arial Black`, `Avenir Next Heavy`, `Trebuchet MS`, sans-serif. Uppercase is reserved for short signboard headlines and route labels.
- Utility/body: `Avenir Next`, `Segoe UI`, system-ui, sans-serif. No runtime font requests and no third-party CDN.
- Scale: 12 label / 14 metadata / 16 body / 20 section / 28 display / clamp(36–64) h1. Times and dates use tabular figures.

## Spacing and shape

An 8px base rhythm with 4px for tight metadata. Content width is 1180px. Controls are at least 44px high with 8px separation. Corners mix clipped ticket edges (2–6px) with selective 18px “awning” panels; this avoids an undifferentiated card grid. Dashed separators evoke perforated claim tickets and make handoff transitions visible.

On a 390px phone, navigation becomes a wrapped route strip, hero art is cropped to a compact 150px scene, and the 48-hour board becomes a single chronological lane. The week print grid becomes a readable list on screen, while `@media print` restores a seven-column sheet.

## Interaction grammar

- Primary actions are mango sign tabs with a 2px dark offset shadow; press removes the offset.
- Handoff events appear as tickets pinned to a continuous timeline. Ownership changes use a directional arrow between two labeled member chips.
- Forms open in a native dialog from the action's origin and return focus when closed.
- Successful actions produce a short live-region receipt; destructive actions name the event and require confirmation.

## Motion policy

UI changes use 180–240ms opacity and transform transitions. New tickets rise 6px as though placed on the board; the update toast slides from the bottom edge. Nothing loops or flashes. Under `prefers-reduced-motion: reduce`, scrolling is immediate and all animation/transition duration is reduced to 1ms; hierarchy remains through depth, border, scale, and labels.

## Original asset plan and provenance

Hero subject: an overhead editorial still life of a school satchel, two sets of keys, a folded weekly timetable, transit tokens, and one luminous arrow connecting two responsibility tickets. World/materials: rain-dark painted metal, folded warm paper, enamel pins, cyan/pink/mango neon spill. Light/lens: cinematic top light, 35mm overhead, deep ink shadows, clean negative space. Negative list: people, children, faces, readable text, letters, logos, brands, watermark, calendars with fake writing, phone UI, gradients, uncanny objects.

Asset `handoff-market-hero`: generated 2026-08-28 using the factory Azure OpenAI image deployment (`factory-image`). Original prompt is stored beside the source PNG at `assets/src/handoff-market-hero.json`. The chosen image was reviewed for anatomy, text artifacts, seams, unintended brands/symbols, and palette consistency; it contains no people or legible personal information. Delivery uses optimized WebP with explicit dimensions. Generated imagery is original to this product and disclosed in the footer.

Icons are hand-authored inline SVG/CSS primitives using rounded strokes; no external icon set.
