# Weather Web

English | [简体中文](./README.zh-CN.md)

A lightweight web weather app with a macOS-like desktop style: the browser window simulates a macOS desktop, and a small weather card in the top-right opens the full weather window. Written in plain HTML / CSS / JavaScript, **no build step, no third-party dependencies, no API key required**.

## Features

**Desktop**
- Top menu bar (logo, app name, multilingual clock) and a wallpaper-capable desktop background
- Weather card: draggable with the mouse, position is remembered; long city names are truncated on one line and scroll on hover to show the full name
- Bottom Dock: currently hidden (only one weather icon for now; it will be shown once there are more icons). Two desktop icons in the top-left open Weather and Settings

**Weather window**
- Multi-city list on the left: add, remove, switch by click, reorder by drag; the "current location" row is a special pinned row (always on top, de-duplicated against a user city); geographic coordinate labels are optional
- The sidebar is collapsible (toggle icon in the title bar); when collapsed, the 🔍 icon in the title bar opens a floating search box
- Large current-weather display at the top (gradient background changes with day/night and weather), a 24-hour horizontal forecast (drag or use the floating arrows on each side to page; precipitation probability only appears when it rains), and a 7-day forecast (date, description, icon, droplet, probability, temperature range bar; the precipitation column collapses automatically when there is no rain all week)
- Weather alert banner (China Meteorological Administration + US NWS): shows the latest alert in the first line (its body replaces the title when available), history can be expanded, and clicking opens the original source
- Nine-tile metrics grid: feels-like temperature, humidity, wind speed, precipitation, UV, sunrise/sunset, visibility, pressure, and AQI (real data)

**Settings**
- Temperature unit °C/°F, 21 interface languages (including Traditional Chinese), light/dark appearance, 12/24-hour clock, auto refresh (off / 15 / 30 / 60 minutes)
- Glass effect (deep navy / classic light translucent / follows weather), wallpapers (4 gradients + 5 day/night automatic sets + time-based automatic; wallpapers with multiple images show a count badge and can be previewed and switched fullscreen)
- Three advanced toggles: extended airport database, extended administrative divisions database (on by default), and show match source (off by default, for debugging search hits)

**Search**: English and Chinese city names, airport IATA codes (e.g. `PEK`), IP addresses (e.g. `8.8.8.8`), decimal coordinates (e.g. `39.9,116.4`), and Wikipedia-style latitude/longitude (e.g. `28°22′N 100°14′E`). Simplified and Traditional Chinese are both queried automatically, and output is normalized to the interface language. Well-known places that the API cannot find fall back to a built-in correction dictionary (e.g. Shangri-La, Daocheng Yading).

## Quick Start

```bash
python -m http.server 8000
```

Open http://localhost:8000 in your browser. You can also double-click `index.html` to open it directly (works over `file://` as well).

## Data Sources (all free, no key required)

| Purpose | Source |
|---|---|
| Weather forecast | Open-Meteo forecast (hourly and daily) |
| City search / multilingual place names | Open-Meteo geocoding (GeoNames data) |
| Air quality | Open-Meteo air-quality (US AQI) |
| IP location / weather by IP | Four-service chain (ipwho.is → ipapi.co → ipinfo.io → ip-api.com), HTTPS first, 5s timeout with step-by-step fallback |
| Reverse geocoding (coordinates → place name) | BigDataCloud (no key) |
| Weather alerts (China) | China Meteorological Administration NMC (no key, direct HTTPS+CORS, full list in one request, 10-minute cache) |
| Weather alerts (US) | NWS alerts API (no key, CORS allowed, active alerts by coordinates) |
| Airport database (4008 IATA airports) | OurAirports (public domain, updated daily) |
| Chinese administrative divisions (province / city / county) | Compiled data from the National Place Name Information Database (MIT) |
| Weather icons | Meteocons (unpkg CDN) |

Attribution requirement: keep "Weather data by Open-Meteo.com" visible in the interface.

## SDK for Other Products

`sdk/weather-api.js` is the data-layer superset (v2.1.0): a single file of about 100KB with zero dependencies. Include it in the browser with `<script>` (exposes `window.WeatherAPI`), or `require()` it in Node 18+. It covers the full query surface (forecast / air quality / geocoding / reverse geocoding / IP self + arbitrary / China and US alerts), plus normalization, 21-language output, and an in-memory TTL cache (on by default; `opts.cache === false` disables it). Since v2.1.0 it also contains all pure data processing including warnings (CN title parsing / adcode matching via injected resolver, NWS superset fields, background gradients, icon URLs, rain-code / temp-color / DMS / script-lang / unit helpers). The `SDK-DATA` data block inside the file is generated from data-raw/vendor by the extraction script; do not edit it by hand. See the JSDoc inside the file for full parameters and return shapes.

```html
<script src="sdk/weather-api.js"></script>
<script>
  const [city] = await WeatherAPI.searchPlaces('上海', { language: 'zh' });
  const w = await WeatherAPI.getWeather(city.latitude, city.longitude, { lang: 'zh' });
  console.log(w.current.temperature + w.units.temperature, w.current.description);
</script>
```

| Method | Description |
|---|---|
| `searchPlaces(query, {language, count})` | Place search (Simplified/Traditional results merged, output normalized by language) |
| `getPlace(id, {language})` | Fetch a place exactly by id (used to re-fetch display names when switching language) |
| `getWeather(lat, lon, {unit, lang, timezone, forecastDays, pastDays})` | Current + hourly + forecast (21-language descriptions, icon URLs included) |
| `getAirQuality(lat, lon, {lang})` | US AQI + PM2.5/PM10 + localized level (returns null when no data, does not throw) |
| `locateByIP()` | Rough IP location (city / coordinates / timezone, 4-service chain, 5s per-provider timeout) |
| `lookupIP(ip)` | Locate an arbitrary IP (same 4-service chain) |
| `reverseGeocode(lat, lon, {language})` | Coordinates → place name (Simplified/Traditional output normalized) |
| `describe(code, {lang, isDay})` | WMO weather code → text description + icon (21 languages) |
| `getBackgroundGradient(code, isDay)` | Gradient background by WMO code + day/night (range fallback) |
| `getWeatherIconUrl(iconName)` | Meteocons SVG URL for an icon name |
| `getWeekdays(lang)` | Weekday names (21 languages) |
| `describeAqi(aqi, lang)` | AQI value → level + localized description |
| `getChinaWarnings()` | Full raw list of NMC warnings (10-min cache, 8s timeout) |
| `matchChinaWarnings(city, list, {resolveAdcode})` | Match NMC warnings to a city (title parsing + adcode containment; admin table injected, name fallback without it) |
| `parseAlarmTitle(title)` / `scopeLevel` / `alarmApplies` / `alarmAgeMs` | CN warning primitives (signal+level parsing, adcode scope, containment check, age gating) |
| `getUSAlerts(lat, lon)` | Active NWS alerts (normalized newest-first, English + legacy Chinese-compatible fields) |
| `getWarningBody(alert, {firecrawl})` | Warning body text (jina by default, 10s timeout; self-hosted FireCrawl 15s can be configured) |
| `isRainCode(code)` / `tempColor(c)` / `precipDrops(p)` | Rain-code check, temperature color scale, droplet count |
| `parseDMSCoord(q)` / `detectQueryLang(q)` | DMS coordinate parsing, script-aware geocoding language hint |
| `clearCache()` | Clear the in-memory cache |

## Technical Notes

- Data flow: search first checks the local correction dictionary → local airport database (exact IATA match) → online geocoding (multilingual fallback + administrative division expansion + merge and dedupe) → forecast API with the coordinates → render. See `TECHNICAL.md` for details.
- All state is stored in `localStorage` (prefix `weatherMac_*`): city list, current city, unit, language, theme, wallpaper, glass effect, toggles, etc. Each city also caches the names displayed in each language, so switching back to a language does not trigger repeated requests.
- After a language change, saved cities automatically re-fetch their display names in the new language (cities with an `id` use an exact lookup, cities without one use reverse geocoding). Names fixed by the dictionary are not affected.

## Project Structure

```
weather-web/
  index.html          Entry point (desktop + window + settings dialog skeleton)
  css/desktop.css     Desktop, menu bar, card, Dock
  css/window.css      Weather window, settings dialog
  js/i18n.js          Copy for 21 languages (UI + weather descriptions + weekdays; zh-tw is derived at runtime)
  js/api.js           Wrappers for all external APIs
  js/geo-db.js        Lazy loading of the local airport / division databases
  js/city-overrides.js Place-name correction dictionary (generated from data-raw; do not edit by hand)
  js/titlebar.js      Shared macOS-style title bar module
  js/desktop.js       Desktop interaction (clock, wallpaper, card dragging)
  js/weather-window.js All logic inside the window (search, forecast rendering, settings)
  data/               Runtime assets: geographic databases (lazy-loaded) + local wallpapers + icons
```

`./data-raw/` contains all reusable data tables (languages, WMO weather codes, administrative divisions, airport database, etc.) and the extraction scripts. See the README in that directory for details.
