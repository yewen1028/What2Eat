# What2Eat — project guide

React Native + Expo SDK 54 app that answers "what should I eat right now" with
**one** restaurant, ranked from the user's live position and the current hour.
Target market: Malaysia.

## Commands

```bash
npx expo start                  # dev server (run it yourself — see HARNESS.md)
npx tsc --noEmit                # typecheck; the only lint gate in this repo
npx expo export --platform ios  # proves the native bundle compiles
npx expo-doctor                 # dependency/config sanity (needs network)
```

No test suite. `tsc` + a real bundle + a screenshot is the verification loop.

## Architecture

```
app/                    expo-router file routes
  _layout.tsx           fonts → providers → root stack
  (tabs)/index.tsx      Now — the single answer + runners-up
  (tabs)/nearby.tsx     ranked list, sort + quick filters
  (tabs)/map.tsx        map of you + surrounding places
  (tabs)/saved.tsx      bookmarks
  (tabs)/profile.tsx    You — identity, defaults, Places key, resets
  place/[id].tsx        detail, parallax hero, hours, score breakdown
  filters.tsx           modal
src/lib/                pure logic, no React
  types.ts              Place, Suggestion, Filters, ScoreBreakdown
  score.ts              THE PRODUCT — ranking weights and reasons
  time.ts               meal periods + opening hours (handles past-midnight)
  geo.ts                haversine, walk minutes, bearing offset
  places.ts             provider facade — the only data entry point
  embed.ts              Maps Embed API URLs (display only, returns no data)
  providers/google.ts   Google Places (New), tuned for Malaysia
  providers/osm.ts      OpenStreetMap via Overpass — real places, no key
  providers/sample.ts   fictional fallback neighbourhood
src/state/              React context: nearby, profile, saved
src/components/         shared UI (see "Design system")
src/theme/tokens.ts     all colour/space/type/motion values
```

Provider order: `ProfileProvider` → `SavedProvider` → `NearbyProvider`.
`NearbyProvider` reads the profile for filter defaults and the Places key, so it
must nest inside.

## Non-negotiables

**1. Never present invented restaurants as real, and never invent facts about
real ones.**
`providers/sample.ts` is fictional on purpose. Do not swap in real business
names — attaching made-up ratings/hours/prices to real places misinforms about
businesses that exist. Any screen showing sample data must render
`<SampleDataBadge />`; `isLiveData` from `useNearby()` gates it.

The converse now matters just as much, because OpenStreetMap supplies real
names with missing fields. **Unknown must stay unknown**, never a plausible
default: `rating: 0` means unrated (`isRated()`), `priceLevel: undefined` means
no published band, `hoursUnknown` means nobody recorded the hours. Each renders
as "No rating" / nothing / "Hours unknown" rather than 0.0, "$$" or "Closed" —
a fabricated fact about a real restaurant is the worse failure, since the name
lends it credibility.

This binds **both** live providers, not just OSM. Google leaves `priceLevel` and
`regularOpeningHours` off plenty of operational places, so `providers/google.ts`
maps those to `undefined` / `hoursUnknown` rather than defaulting to `2` and a
blank week. It also binds every *rendering* of a missing field, which is where
this keeps breaking: a map pin printing `rating.toFixed(1)`, an accessibility
label, or a dimmed pin claiming "closed". `isRated()` before any number, and
`hoursUnknown` before any open/closed styling.

**1b. Unknown is not the same as failing a filter.**
`passesFilters` excludes a place only on facts it *has*. A place with no rating
survives `minRating`, no price band survives `priceLevels`, and unknown hours
survives `openOnly`. Treating unknown as failure emptied the entire list on OSM
data, where most listings lack all three. Same in `buildSuggestion`: unknown
hours move the timing weight to meal fit rather than scoring zero.

**2. Google Maps only, never Apple Maps.**
`PROVIDER_GOOGLE` on both platforms; directions deep-link to Google Maps.
`src/components/map/capability.ts` decides whether Google Maps can render —
it cannot in Expo Go on iOS or on web, and those fall back to `SchematicMap`,
never to Apple Maps.

**3. Ranking is inspectable.**
`buildSuggestion()` returns a `breakdown` whose numbers are the ones the sort
used. `ScoreBreakdown.tsx` displays them; never recompute for display. Weights
live in one place (`WEIGHTS` in `score.ts`, re-exported as `SCORE_WEIGHTS`).

That includes the weight column. Each `ScoreComponent` carries its own `weight`,
because the effective weights are *not* the constants — 3b moves timing's share
onto fit. `ScoreBreakdown` reading `SCORE_WEIGHTS` printed "18% / 12%" for a sort
that actually ran 30% / 0%. Read `component.weight`.

**3b. Browsing another sitting must not be scored on right-now opening.**
`rank(..., period, scoreTiming)` — when the Map's meal picker is off the
current period, pass `scoreTiming: false`. A kopitiam that shuts at 15:00 is
the *correct* breakfast answer at 18:00; scoring it zero on timing buries it
under whatever happens to be open. The timing weight moves to meal fit, and
pins still show real open/closed state. Meal periods are Malaysian: `late` is
labelled **Supper**, `coffee` is **Tea time** (`MEAL_PERIOD_LABELS`).

**4. Colour is never the only signal.**
Open/closed = filled vs hollow dot **and** wording. Selected chip = fill, border
weight **and** a check glyph. Score bars are always paired with a number.

**5. Three Google APIs, different lifecycles.**
Maps SDK key = build time (`app.config.ts`, from `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`).
Places key = runtime, overridable in-app (You → Listings), stored per-device.
`resolveKey()` in `places.ts` decides precedence. Never log or commit either.
Maps Embed API = the detail-page map; `embedKey()` in `embed.ts` prefers the
Maps key and falls back to the Places key, since one key commonly serves all.

**5b. The embed is display-only, and never covers sample data.**
`placeEmbedUrl()` returns `null` for sample places, so `<PlaceMap>` renders
nothing rather than putting real Google tiles under an invented business name.
The Embed API returns no data — ranking still depends entirely on Places.
`EmbedMap` is inert (`pointerEvents="none"`): it lives in a ScrollView, where a
pannable map swallows the scroll gesture. The card handles the handoff.

## Design system

Slate + terracotta. **Bricolage Grotesque** display / **Karla** UI, cool bone
surfaces, true-ink text, one terracotta accent. Everything comes from
`src/theme/tokens.ts` — no raw hex, no raw spacing numbers in components.

Two deliberate anti-defaults, do not revert them casually:
- **Not Fraunces, not warm cream + brass + espresso.** That palette and that
  serif are the LLM house style for "premium food"; the cool ground also makes
  the food photography read hotter, which is the chrome's whole job.
- **No filled-track progress bars.** `ScoreBreakdown` is a typographic ledger.
  Meter tracks are dashboard furniture and read as a settings screen.

Copy rules: no em-dashes or en-dashes in user-facing strings (ranges use a
hyphen: `RM 8-18`, `12:00 - 15:00`). Never leak internal period keys into copy
— `late` renders as "supper" via `MEAL_PERIOD_LABELS`.

- All tappables go through `<Touchable>` (press scale + opacity + haptics).
  Disabled dimming lives **inside** `useAnimatedStyle` — Reanimated writes
  opacity inline and would override a static style set after it.
- Use `<Toggle>`, not RN `Switch`: react-native-web ignores `thumbColor` and
  renders teal.
- Tap targets ≥44pt (`MIN_TAP`), motion 150–320ms, `useReducedMotion` respected.
- Icons: `@expo/vector-icons` Ionicons only, sized from the `icon` token.

## Conventions

- Path style is relative (`../../src/...`); a `@/*` alias exists in tsconfig but
  is unused — stay consistent with the relative imports.
- Comments explain *why*, not what. Keep the existing density: a short block
  above anything non-obvious, nothing above the obvious.
- Prefer narrow props over passing whole domain objects (e.g. `OpenBadgeState`
  is a `Pick<Suggestion, …>`, not a full `Suggestion`).
- British spelling in user-facing copy ("neighbourhood", "colour").
- Sentence case for UI copy; typographic apostrophes (’) in display strings.

## Known platform traps

- `babel-preset-expo` must stay `~54.x`. npm resolves `latest` (57) which breaks
  Hermes bytecode with "private properties are not supported".
- No custom `babel.config.js` — SDK 54 defaults already wire
  `react-native-worklets` for Reanimated 4.
- `react-native-maps` has no web build; platform resolution via
  `MapSurface.web.tsx` keeps it out of the web bundle.
- `Alert` is a no-op on react-native-web — use the two-tap confirm pattern in
  `profile.tsx` instead.
