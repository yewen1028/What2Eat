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

The app runs with **no API key**, but read the next section before you trust
what it shows you.

## Where the restaurants come from

Three sources, tried best-first in `src/lib/places.ts`:

| Source | Needs | Gives | Missing |
|---|---|---|---|
| **Google Places (New)** | an API key | names, ratings, reviews, hours, prices, photos | — |
| **OpenStreetMap** (Overpass) | nothing | real names, real coordinates, some hours | ratings, prices, photos |
| **Sample** | nothing | a fictional neighbourhood, clearly badged | it isn't real |

With no key the app runs on **OpenStreetMap**, so every listing is a business
you can verify on any map. The fictional sample set is now only a last resort
for when both networks fail — it used to be the keyless default, which was the
app's worst behaviour: plausible-looking restaurants, at believable distances,
that were not places.

OSM's gap is the other half of the product. It publishes **no ratings**, so
quality — normally 46% of the rank — falls back to a neutral prior and the sort
leans on distance and meal fit. Those fields are left empty rather than guessed:
a real restaurant shown an invented 4.3 is a worse lie than an obviously fake
dataset, because the name lends it credibility. Cards say "No rating", price is
omitted entirely, and places with no `opening_hours` say "Hours unknown" instead
of "Closed".

That last distinction is load-bearing. Only 14 of 80 places around Bukit Bintang
have hours mapped, so treating "unknown" as "closed" — with the default
`open now` filter on — would have hidden almost everything. `passesFilters`
excludes a place only on facts it actually has.

Overpass is a free, shared, volunteer-run service. The provider asks for at most
80 places, uses GET (POST is what proxies drop), and falls through to a second
mirror when the first is rate-limiting.

## Sample data

**When both live sources fail the restaurants are fictional.** The built-in dataset is
a hand-written Malaysian neighbourhood — invented names, invented ratings,
invented hours — laid out around your real position so that distance,
opening-hours and ranking logic all exercise real code paths. It is never
presented as real: a **SAMPLE** badge sits on the Now masthead, the Nearby
header, the map header and every detail page for as long as that data is in use.

The names are deliberately made up. Attaching invented ratings, prices and
opening hours to real Malaysian restaurants would be worse than obviously fake
data — it would misinform about businesses that actually exist, and the numbers
would be wrong from the first day. What *is* modelled accurately is the shape of
the data: mamak and nasi kandar running past midnight, kopitiams shutting
mid-afternoon, prawn mee that sells out by 13:00, and RM price bands.

Real names, ratings and hours come from Google. Two ways to switch over:

**In the app** — *You → Listings → Google Places API key*. Paste a key with
*Places API (New)* enabled and the listings swap immediately, no rebuild. The
key is stored on the device and only ever sent to Google.

The request is tuned for Malaysia: `regionCode: 'MY'` for local address
formatting and result bias, Malaysian restaurant types mapped to meal periods
(mamak → late night, kopitiam → breakfast), `food_court` and `meal_takeaway`
included alongside restaurants and cafés, permanently-closed places dropped, and
`priceRange` read so listings show real money — **RM 12–25** — instead of a row
of dollar signs.

**At build time** — set the environment variable before starting:

```
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=YOUR_KEY
```

If a Google request fails or returns nothing in range, the app drops to
OpenStreetMap and says why; only if that also fails does it show the sample
neighbourhood, re-badged and with the actual error surfaced, rather than
quietly serving invented places as real ones.

To add another provider (Foursquare, Yelp, your own backend), write a function
that returns `Place[]` and wire it into `src/lib/places.ts` — that file is the
only place the rest of the app talks to. Leave unknown fields undefined; the
ranker and the UI already handle absent ratings, prices and hours.

## Google Maps keys

The map and the listings use **separate** Google APIs, and it's easy to conflate
them:

| Key | Read | Needs | Where |
|---|---|---|---|
| Maps SDK | at **build** time | Maps SDK for iOS + Android | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` |
| Places | at **runtime** | Places API (New) | env var *or* the in-app field |
| Embed | at **runtime** | Maps Embed API | falls back to whichever of the above is set |

One key can serve all of them if you enable every API on it. Copy `.env.example`
to `.env` to set the build-time ones.

## The embedded map on a place page

Each detail page carries a real Google map of that one restaurant, via the
**Maps Embed API** — an iframe on web (`EmbedMap.web.tsx`), a WebView on native
(`EmbedMap.tsx`), split by Metro platform resolution so the WebView dependency
never reaches the web bundle. Embedding is free and uncapped, and it works in
Expo Go on iOS, where the native Maps SDK cannot render at all.

Two things it deliberately does **not** do. It carries no data — the Embed API
returns a picture, so ranking still depends entirely on the Places key. And it
is **inert**: it sits inside a vertical ScrollView, where a pannable map
swallows the scroll gesture as soon as a drag starts over it. Tapping the card
opens the place in the Google Maps app, which is where panning belongs.

`placeEmbedUrl()` in `src/lib/embed.ts` returns `null` for sample places and the
card renders nothing. Real tiles under an invented business name would label a
real car park "Kopitiam Sri Muda" — worse than the schematic map, which at least
reads as abstract.

> If the map area renders a Google error page, the key is reaching Google but
> **Maps Embed API** is not enabled on it. That is a separate checkbox from
> Places API (New) in the Cloud Console library.

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY npx expo start
```

`app.config.ts` reads these and writes the Maps key into `ios.config.googleMapsApiKey`
and `android.config.googleMaps.apiKey`.

## The map

**Google Maps on both platforms** (`PROVIDER_GOOGLE`), restyled per colour
scheme with POI clutter switched off so our own pins are the only labels
competing for attention. Restaurant **names are drawn on the pins** rather than
hidden behind a callout tap — the point is to read the neighbourhood at a
glance. The top three matches take the accent; closed places are dimmed; tapping
a pin raises a card with rating, distance and directions. "Directions" hands off
to the Google Maps app (`comgooglemaps://` on iOS, `google.navigation:` on
Android) and falls back to Google Maps on the web — never Apple Maps.

> **Google Maps on iOS needs a development build.** Expo Go bundles only the
> Apple Maps provider, so `PROVIDER_GOOGLE` would render an empty grey view.
> Run `npx expo run:ios` (or an EAS dev build) with
> `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` set. Android needs the same key for release
> builds; Google Maps works in Expo Go there already.

Rather than render blank — or quietly drop back to Apple Maps — the app detects
this and shows the schematic instead, with a line explaining why.
`src/components/map/capability.ts` owns that decision, so the Map tab is
functional in Expo Go, in a dev build, and on the web:

| Environment | Map surface |
|---|---|
| iOS dev build + Maps key | Google Maps |
| iOS Expo Go | schematic + explanation |
| Android (Expo Go or build) | Google Maps |
| Web | schematic |

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

Every listing's detail page shows **How this ranked**: the match score out of
100 plus each component's 0–100 value, its weight, and the input behind it
("260 m from you · about 3 min on foot", "4.6 from 940 reviews, weighted to
4.55"). These are the same numbers the sort used — nothing is recomputed for
display — so the ranking is inspectable rather than asserted, and it re-derives
against wherever you currently are.

Opening hours handle intervals that run past midnight, so a place closing at
02:00 still reads as open when you check at 00:30, and the hours table labels it
"next day" rather than showing a confusing `12:00 – 2:00`.

---

## Design

Slate and terracotta: cool bone surfaces, true-ink text, one warm accent.
**Bricolage Grotesque** for the voice and **Karla** for everything functional.
Colour is carried by semantic tokens in `src/theme/tokens.ts` and resolved per
scheme — both light and dark are designed, not inferred from each other.

The palette is a deliberate step away from the warm-cream-plus-brass-plus-
espresso combination that generated "premium food" interfaces almost always
land on. Beyond avoiding the cliché it does real work: a cool ground makes
warm food photography read hotter, which is the entire job of the chrome in an
app whose content is pictures of food.

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
