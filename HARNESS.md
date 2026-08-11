# Verification harness

How to prove a change works in this repo. There are no unit tests; correctness
comes from typecheck → real bundle → looking at the screen.

## Ground rules

**Never leave a background dev server running.** Twice now an orphaned detached
Metro has broken the user's own `npx expo start` ("Port 8081 is being used").
A hidden server the user can't see, stop, or press `r` in is worse than none.

- The user starts `npx expo start` themselves, in their own terminal.
- When verification needs a server, start it and shut it down **in the same
  command** so nothing outlives the check.
- Before finishing, confirm ports 8081/8082/8099 are free unless the user
  explicitly asked for a running server.

## Levels of proof

| Level | Command | Catches |
|---|---|---|
| 1 | `npx tsc --noEmit` | undefined identifiers, prop/type drift |
| 2 | `npx expo export --platform ios` | native bundling, Hermes bytecode |
| 3 | dev bundle fetch (below) | dev-only failures the export misses |
| 4 | web export + Playwright | layout, contrast, truncation, real UI bugs |

Level 2 is a *production* bundle. A dev-mode failure (e.g. a half-applied
rename that Fast Refresh served) only shows at level 3:

```bash
npx expo start --port 8081        # then, in another command:
curl "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true&hot=false&transform.engine=hermes"
```

200 + several MB means the exact bundle the phone loads compiles.

## Visual verification (level 4)

`react-native-maps` aside, the whole app renders on web, so screenshots are
cheap and catch what typechecking cannot.

```bash
npx expo export --platform web --output-dir "$TEMP/w2e-web" --clear
npx serve -s "$TEMP/w2e-web" -l 8099
node scratchpad/shot.js <outdir> light    # and: dark
```

Playwright at 390×844, `deviceScaleFactor: 2`, `colorScheme` light **and** dark
— dark mode has caught bugs light mode did not.

Selector notes, learned the hard way:
- Target `getByLabel(/^Name, rated/)` (the `accessibilityLabel` on the
  pressable), **not** `getByText` — text nodes resolve to the wrong element and
  report absurd bounding boxes.
- `page.mouse.move(195, 420)` before `mouse.wheel`, or the scroll goes to the
  tab bar and nothing moves.
- Stale screenshots lie. If a selector fails the old PNG stays on disk — delete
  the target files before re-running, and sanity-check the content matches the
  change you just made.
- `click({ force: true })` is fine on the map: react-navigation keeps prior
  screens in the DOM on web, so the hit-test is pessimistic. The Map screen is
  genuinely interactive (verified via the filters modal opening).

## Checking images before shipping them

Photo IDs are opaque; a wrong one puts sushi on a ramen listing (this happened).
Build a contact sheet and **look at it**:

```js
// scratchpad/sheet.js — grid of <img> by id, screenshot fullPage, then Read it
```

One screenshot beats N guesses.

## Platform matrix

| Environment | Map surface | How to verify |
|---|---|---|
| iOS dev build + Maps key | Google Maps | device only — cannot verify here |
| iOS Expo Go | `SchematicMap` + note | device only |
| Android | Google Maps | device only |
| Web | `SchematicMap` | Playwright |

**Standing caveat:** no device testing is possible in this environment. Haptics,
native map rendering, and maps deep links are unverified by construction — say
so rather than implying they were tested.

## Environment quirks

- PowerShell 5.1: no `&&`, no ternary. Chain with `; if ($?) { … }`.
- `npx expo start` needs a TTY; it exits immediately when backgrounded with
  stdin on the null device. `Start-Process -WindowStyle Hidden` works but
  detaches invisibly — see ground rules.
- `expo-doctor`'s schema check needs network; a `fetch failed` there is a
  transient blip, not a project fault. Re-run before reporting it.
- Scratchpad needs its own `npm install playwright`; the browser cache is
  already present.
