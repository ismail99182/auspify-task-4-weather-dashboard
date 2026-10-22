# Weather Dashboard — Task 4

A weather dashboard I built for the Auspify Frontend Internship task list
(Medium). Search a city, see what the weather is doing right now, and check
the next five days.

## Why Open-Meteo

I used [Open-Meteo](https://open-meteo.com/) because it needs no API key and
no sign-up, so anyone can clone this and run it straight away — no secret
keys sitting in frontend code. It is also two honest steps, which made the
code easy to follow:

1. The geocoding API turns a city name into latitude/longitude.
2. The forecast API returns the weather for those coordinates.

## What it does

- Search any city by name, with the weather shown in that city's local time
- Current conditions card: temperature, feels like, humidity, wind speed
  and pressure
- 5-day forecast (the API returns 7 days; I skip today and show the next 5)
- °C / °F toggle in the header — this re-renders from the data already
  fetched, it does not call the API again
- Recent searches: your last 4 cities, saved in `localStorage`, click one
  to load it again
- Loading state while data is being fetched
- Loads Lahore by default so the page is never empty on first open

## Error handling

A few cases I made sure show up in the page, not just in the console:

- **Empty search** — a short message under the search box, no request sent.
- **City not found** — the geocoding API returns no results, so the page
  shows a message suggesting you check the spelling or add the country.
- **Network failure / API error** — both API calls are wrapped in
  try/catch and non-OK HTTP responses throw, so a failed request shows a
  plain "check your connection and try again" message instead of leaving
  a blank or half-updated dashboard.

One detail worth noting: Open-Meteo returns a numeric WMO weather code
(0 = clear, 61 = rain, and so on) instead of a text description, so
`js/app.js` has a small lookup table that maps each code to a label and an
icon. The icons are simple inline SVGs drawn in the same stroke style, so
they match the rest of the page.

## How to run

You need an internet connection — the weather data is live, there is no
local copy.

Opening `index.html` directly in a browser (file://) does work. I would
still recommend a local server, it behaves closer to a real deployment:

```bash
# from this folder, any one of these
npx serve .
python -m http.server 8000
```

Then open the address it prints (usually http://localhost:8000).

## Files

- `index.html` — page structure
- `css/style.css` — all styling, responsive down to small phones (~360px)
- `js/app.js` — geocoding, weather fetch, rendering, unit toggle,
  recent searches
