# What2Eat

Decide where to eat **right now**, without opening ten listings one at a time.

What2Eat reads your location once, looks at every well-rated kitchen around you,
and answers with **one place** — chosen for its rating, how far you'd actually
walk, whether it suits the hour, and how long it stays open. If you don't like
it, "Another" hands you the next-best. Everything else in the app exists to
support that single answer.

Five tabs: **Now** (the answer), **Nearby** (the ranked list), **Map** (you and
every match around you), **Saved**, and **You** (profile and defaults).

Built with Expo SDK 54, expo-router and React Native 0.81.

---

## Running it

```bash
npm install
npx expo start
```

Then press `i` / `a`, or scan the QR code with Expo Go.

The app works immediately with **no API key**: it builds a hand-written sample
neighbourhood laid out around wherever you actually are, so distances, opening
hours and ranking all exercise the real code paths. If you decline the location
permission, "Browse a demo neighbourhood" gives you a fixed origin to explore.

## Using live restaurant data

Add a **Google Places API (New)** key — enable *Places API (New)* in Google
Cloud and restrict the key to your bundle identifiers.

Either put it in `app.json`:

```json
"extra": { "googlePlacesApiKey": "YOUR_KEY" }
```

or set an environment variable:

```
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=YOUR_KEY
```

The app switches over automatically. If a live request fails or returns nothing
nearby, it falls back to the sample data and says so inline rather than showing
an empty screen.

To add another provider (Foursquare, Yelp, your own backend), write a function
that returns `Place[]` and wire it into `src/lib/places.ts` — that file is the
only place the rest of the app talks to.

## The map

`react-native-maps` on iOS and Android: Apple Maps on iOS, Google Maps on
Android, restyled per colour scheme with POI clutter switched off so our own
pins are the only labels competing for attention. Restaurant **names are drawn
on the pins** rather than hidden behind a callout tap — the point is to read the
neighbourhood at a glance. The top three matches take the accent; closed places
are dimmed; tapping a pin raises a card with rating, distance and directions.

**Android release builds need a Google Maps key** (Expo Go and iOS do not). Add
it under `expo.android.config.googleMaps.apiKey` in `app.json`.

On **web**, `react-native-maps` has no implementation, so `MapSurface.web.tsx`
takes over via Metro's platform resolution: a schematic that plots every place
at its true bearing and distance with range rings for scale, including a greedy
label de-collision pass so names never sit on top of each other. It answers the
same question without pretending to be a tile map.

## Your profile

The **You** tab is where the app's defaults live, not a decorative settings
page. Diet, walking distance, minimum rating and price range set the baseline
every session starts from; the filter sheet still overrides them for a one-off,
and its "Reset" returns to these values. Also there: your name (used for the
greeting), saved/matched/considered counts, location and data-source status
with a privacy note, a haptics toggle, and two-tap-to-confirm resets.

Everything persists to `AsyncStorage` and stays on the device.

---

## How the ranking works

`src/lib/score.ts` is the product. Four weighted signals:

| Signal | Weight | What it does |
|---|---|---|
| Quality | 0.46 | Bayesian rating — a 5.0 from nine people scores below a 4.6 from two thousand |
| Proximity | 0.24 | Exponential decay, ~900 m half-life; nothing is "too far" until it is |
| Meal fit | 0.18 | Does this kitchen actually serve at this hour (adjacent periods count partially) |
| Timing | 0.12 | Open, and not closing before you could reasonably finish |

Filters (`open now`, walk time, minimum rating, price, vegetarian) are a hard
gate applied before the sort, not another weight.

Opening hours handle intervals that run past midnight, so a place closing at
02:00 still reads as open when you check at 00:30, and the hours table labels it
"next day" rather than showing a confusing `12:00 – 2:00`.

---

## Design

Warm editorial: paper-coloured surfaces, an ember accent, **Fraunces** for the
voice and **Karla** for everything functional. Colour is carried by semantic
tokens in `src/theme/tokens.ts` and resolved per scheme — both light and dark
are designed, not inferred from each other.

Specific commitments:

- **One answer per screen.** The home screen is a masthead, one card, and two
  buttons. The ranked list lives behind a tab for when you want to browse.
- **Subtle parallax**, not decoration — the hero photo drifts at a fraction of
  scroll speed on the home card and the detail screen, and the compact title bar
  fades in only once the large title has left.
- **State is never carried by colour alone.** Open/closed uses a filled vs.
  hollow dot *and* wording; selected filters add a border weight and a check.
- **Every tap target is ≥44pt**, every press has feedback within 90ms, and
  motion stays in the 150–320ms band with `useReducedMotion` respected.

## Layout

```
app/
  _layout.tsx          fonts, providers, root stack
  (tabs)/index.tsx     Now — the answer
  (tabs)/nearby.tsx    ranked list, sort + quick filters
  (tabs)/map.tsx       you + surrounding restaurants
  (tabs)/saved.tsx     bookmarks
  (tabs)/profile.tsx   You — identity, defaults, data, resets
  place/[id].tsx       detail, parallax hero, hours
  filters.tsx          modal
src/
  lib/          scoring, geo, time/opening-hours, maps, haptics, providers
  state/        nearby (location + data + filters), saved, profile
  components/   shared UI
  components/map/  MapSurface.tsx (native) + MapSurface.web.tsx (schematic)
  theme/        tokens + scheme resolution
```
