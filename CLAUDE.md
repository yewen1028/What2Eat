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

**1c. A provider must return the *nearest* places, not just some places.**
Both providers cap what they return, so the cap decides which restaurants the
app is even capable of suggesting. Neither may leave that choice to the server's
own ordering. `providers/google.ts` runs a DISTANCE pass alongside POPULARITY;
`providers/osm.ts` asks a tight ring first and sorts by distance before slicing,
because Overpass cannot sort and emits elements in internal id order. Cutting
its full-radius response at 80 kept 80 arbitrary restaurants — median distance
1 km, only 4 of the 80 genuinely nearest, and the closest restaurant of all
(24 m) missing. Distances were all correct; they were attached to the wrong
restaurants, which is the harder bug to see. Do not reintroduce a server-side
`out ... N` as a selection mechanism: it is a runaway guard only, and a tight
one also starves `way` results, since Overpass emits every node first.

**2. Google Maps only, never Apple Maps.**
`PROVIDER_GOOGLE` on both platforms; directions deep-link to Google Maps.
`src/components/map/capability.ts` decides whether Google Maps can render —
it cannot in Expo Go on iOS or on web, and those fall back to `SchematicMap`,
never to Apple Maps.

**2a. `canRenderGoogleMaps` requires a Maps SDK *key*, not just a platform.**
The Google Maps SDK for iOS draws nothing at all until `provideAPIKey` runs, so
a development build with no `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` rendered an empty
view where the schematic should have been — "the map doesn't load". The check
reads the resolved `ios.config.googleMapsApiKey` / `android.config.googleMaps`
from the manifest, not just the env var, because a build made elsewhere carries
the key in the manifest only. Android in Expo Go is the exception: it supplies
its own key.

`EmbedMap`'s `originWhitelist` must cover `googleapis.com`, `gstatic.com` and
`ggpht.com` alongside `google.com`. It gates *navigation*, and the embed pulls
its tiles and sprites from those hosts — whitelisting only `google.com` let the
frame open and then blocked the map inside it. If the embed fails anyway (a key
without the Maps Embed API enabled), `onFailed` drops `PlaceMap` back to the
schematic rather than leaving an empty rectangle.

**2b. The map frames the results; the circle draws the filter.**
Two different numbers, and one constant used for both was the bug. `reachMetres`
is the walk filter converted (`walkRadiusMetres`, capped at `SEARCH_RADIUS_M`)
and is what the circle claims. `radiusMetres` is the viewport, fitted to the
farthest match and bounded by the reach — a dense block puts all 78 matches
inside 300 m, and framing the filter's full 1.6 km squeezed them into a knot at
the centre of two empty kilometres. `MapSurface` re-frames when either changes;
`initialRegion` alone is read once, so widening the filter used to add pins
outside the visible frame.

`SchematicMap` rations *labels*, never dots: `LABEL_BUDGET` names the
best-ranked few (plus the selection, always), and every other marker keeps a
tappable dot. Labelling all 78 turned the de-collision into one vertical column
of names running off the screen, each displaced so far from its dot that the
view stopped answering "what is near me". Labels are also clamped inside the
frame — the container clips, and a flip alone still let long names overflow.

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

**3c. An empty list must name its cause, not guess at it.**
`diagnoseFilters()` relaxes each filter in turn and counts, so `<NoMatches>` can
say which one is responsible and move it in a single tap. Do not replace this
with generic "try widening your filters" copy — the app has the data. Candidates
relax to values that exist on the filters screen (`WALK_OPTIONS`,
`RATING_OPTIONS` in `types.ts`), so the tap leaves the UI in a state the user can
see and reverse. It returns null rather than blaming a filter it has not
identified, and `NoMatches` keeps `places.length === 0` (nothing loaded) separate
from "filters too tight" — they need opposite advice.

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

**5c. A real place must reach Google under its own name, keyless included.**
No key is the *default* state, since OSM needs none, so both handoffs have to
work without one. Two id kinds, two URLs, and sending an OSM place down the
Google-id path is the bug that keeps recurring: a bare `lat,lng` opens a
*dropped pin*, with no name, no hours and no reviews — the exact screen the user
tapped for. `maps.ts` `placeUrl()` sends `query_place_id` for Google ids and a
name search anchored to `/@lat,lng,18z` for OSM ones, where the viewport is what
stops a chain name resolving to a branch across town. `embed.ts` mirrors this:
`embed/v1/place` with `place_id:`, `embed/v1/search` with the name and a locked
`center`. Directions stay coordinate-only on purpose — routing wants the exact
point, not a name that might match elsewhere.

`<PlaceMap>` never renders nothing for a real place. Without a usable embed key
it falls back to `<SchematicMap>` (true bearing and distance) and always carries
the "Photos and reviews on Google Maps" affordance, because ratings and reviews
are precisely what a keyless source cannot supply — the way to them has to be
named, not implied by a tappable card.

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

**Photos come from Google, or they do not come.** `providers/osm.ts` reads a
real photo from the `image` / `wikimedia_commons` tags where one exists, but
coverage is about 3 in 650 — zero in the nearest 80 around Bukit Bintang — so
the designed fallback in `PlaceImage` (tinted field, place's initial) is the
normal case, not an error state. Do not fill the gap with stock food
photography: an image of somewhere else under a real restaurant's name is the
same fabrication as an invented rating, and more convincing. `Category:` values
are rejected for the same reason — a category is a bag of files, so picking one
would be guessing.

- Parallax lives in `<ParallaxImage>` (lists) and hand-rolled styles in
  `HeroPick` / `place/[id]`. It reads position from `measure()` driven by the
  list's `scrollY`, because rows recycle and an `onLayout` y is relative to the
  cell, not the content. It runs **only when there is a real photo** — drifting
  the flat fallback moves the centred initial off centre and buys nothing — and
  **only when `useReducedMotion()` is false**.
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
