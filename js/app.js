// Weather Dashboard — data comes from Open-Meteo.
// Two calls: geocoding turns a city name into coordinates,
// then the forecast endpoint returns the actual weather.
// No API key is needed for either one.

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const RECENT_KEY = "weather-recent-searches";
const MAX_RECENT = 4;
const DEFAULT_CITY = "Lahore";

const form = document.getElementById("searchForm");
const input = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const fieldError = document.getElementById("fieldError");
const alertBox = document.getElementById("alertBox");
const alertText = document.getElementById("alertText");
const loadingBox = document.getElementById("loadingBox");
const results = document.getElementById("results");
const recentWrap = document.getElementById("recentWrap");
const recentList = document.getElementById("recentList");
const unitC = document.getElementById("unitC");
const unitF = document.getElementById("unitF");

// The toggle only changes how we display numbers, so we keep the
// last API response around and re-render from it instead of refetching.
let lastData = null; // { place, current, daily }
let unit = "c";

// Open-Meteo returns a numeric WMO weather code instead of text.
// This table maps the codes to a label and an icon group.
// WMO groups: 0 clear, 1-3 cloud cover, 45/48 fog, 51-57 drizzle,
// 61-67 rain, 71-77 + 85/86 snow, 80-82 showers, 95-99 thunder.
const WEATHER_CODES = {
  0:  { label: "Clear sky", icon: "sun" },
  1:  { label: "Mainly clear", icon: "sun" },
  2:  { label: "Partly cloudy", icon: "cloud-sun" },
  3:  { label: "Overcast", icon: "cloud" },
  45: { label: "Foggy", icon: "fog" },
  48: { label: "Fog with frost", icon: "fog" },
  51: { label: "Light drizzle", icon: "drizzle" },
  53: { label: "Drizzle", icon: "drizzle" },
  55: { label: "Heavy drizzle", icon: "drizzle" },
  56: { label: "Freezing drizzle", icon: "drizzle" },
  57: { label: "Freezing drizzle", icon: "drizzle" },
  61: { label: "Light rain", icon: "rain" },
  63: { label: "Rain", icon: "rain" },
  65: { label: "Heavy rain", icon: "rain" },
  66: { label: "Freezing rain", icon: "rain" },
  67: { label: "Freezing rain", icon: "rain" },
  71: { label: "Light snow", icon: "snow" },
  73: { label: "Snow", icon: "snow" },
  75: { label: "Heavy snow", icon: "snow" },
  77: { label: "Snow grains", icon: "snow" },
  80: { label: "Light showers", icon: "rain" },
  81: { label: "Showers", icon: "rain" },
  82: { label: "Heavy showers", icon: "rain" },
  85: { label: "Snow showers", icon: "snow" },
  86: { label: "Snow showers", icon: "snow" },
  95: { label: "Thunderstorm", icon: "storm" },
  96: { label: "Thunderstorm with hail", icon: "storm" },
  99: { label: "Thunderstorm with hail", icon: "storm" }
};

function describeCode(code) {
  return WEATHER_CODES[code] || { label: "Weather code " + code, icon: "cloud" };
}

// Small inline SVGs, one per icon group. Stroke icons, currentColor,
// so they pick up the accent colour from CSS.
const ICON_PATHS = {
  "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  "cloud-sun": '<path d="M12 3a4 4 0 0 1 4 4"/><path d="M7 21h9a4.5 4.5 0 0 0 .4-8.98A6 6 0 0 0 5 14.5 3.5 3.5 0 0 0 7 21z"/>',
  "cloud": '<path d="M17.5 19a4.5 4.5 0 0 0 0-9 6.5 6.5 0 0 0-12.6 1.6A4 4 0 0 0 6 19h11.5z"/>',
  "fog": '<path d="M4 10h16M6 14h12M8 18h8"/><path d="M7 6a5 5 0 0 1 10 0"/>',
  "drizzle": '<path d="M17.5 15a4.5 4.5 0 0 0 0-9 6.5 6.5 0 0 0-12.6 1.6A4 4 0 0 0 6 15h11.5z"/><path d="M8 18v.5M12 18v.5M16 18v.5"/>',
  "rain": '<path d="M17.5 14a4.5 4.5 0 0 0 0-9 6.5 6.5 0 0 0-12.6 1.6A4 4 0 0 0 6 14h11.5z"/><path d="M8 17l-1 3M13 17l-1 3M18 17l-1 3"/>',
  "snow": '<path d="M17.5 14a4.5 4.5 0 0 0 0-9 6.5 6.5 0 0 0-12.6 1.6A4 4 0 0 0 6 14h11.5z"/><path d="M8 18h.01M12 19h.01M16 18h.01M10 21h.01M14 21h.01"/>',
  "storm": '<path d="M17.5 13a4.5 4.5 0 0 0 0-9 6.5 6.5 0 0 0-12.6 1.6A4 4 0 0 0 6 13h11.5z"/><path d="M12 14l-2 4h3l-2 3"/>'
};

function iconSvg(name) {
  const paths = ICON_PATHS[name] || ICON_PATHS.cloud;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";
}

function showTemp(celsius) {
  if (celsius === null || celsius === undefined) return "—";
  const value = unit === "f" ? (celsius * 9) / 5 + 32 : celsius;
  return Math.round(value) + "°" + (unit === "f" ? "F" : "C");
}

function setLoading(isLoading) {
  loadingBox.hidden = !isLoading;
  searchBtn.disabled = isLoading;
  searchBtn.textContent = isLoading ? "Searching…" : "Search";
}

function showAlert(message) {
  alertText.textContent = message;
  alertBox.hidden = false;
}

function hideAlert() {
  alertBox.hidden = true;
}

document.getElementById("alertClose").addEventListener("click", hideAlert);

async function fetchCity(name) {
  const url = GEO_URL + "?name=" + encodeURIComponent(name) + "&count=1&language=en&format=json";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed (" + res.status + ")");
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  return data.results[0];
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto"
  });
  const res = await fetch(FORECAST_URL + "?" + params.toString());
  if (!res.ok) throw new Error("Weather request failed (" + res.status + ")");
  return res.json();
}

async function searchCity(name) {
  hideAlert();
  fieldError.hidden = true;
  setLoading(true);

  try {
    const place = await fetchCity(name);
    if (!place) {
      showAlert('Could not find "' + name + '". Check the spelling, or try adding the country — for example "Paris, France".');
      return;
    }

    const weather = await fetchWeather(place.latitude, place.longitude);
    lastData = { place: place, current: weather.current, daily: weather.daily };
    renderAll();
    saveRecent(place.name);
  } catch (err) {
    // fetch() only rejects on network problems, HTTP errors are
    // handled above. Either way the user sees a message here in
    // the page instead of a blank screen.
    console.error(err);
    showAlert("Something went wrong while loading the weather. Check your internet connection and try again.");
  } finally {
    setLoading(false);
  }
}

function renderAll() {
  if (!lastData) return;
  renderCurrent();
  renderForecast();
  results.hidden = false;

  const now = new Date();
  document.getElementById("updatedNote").textContent =
    "Last updated just now (" + now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " your time). Search again to refresh.";
}

function renderCurrent() {
  const place = lastData.place;
  const c = lastData.current;
  const info = describeCode(c.weather_code);

  const placeLine = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  document.getElementById("cityName").textContent = placeLine;

  // current.time comes back in the city's local time because of timezone=auto
  const local = new Date(c.time);
  document.getElementById("currentMeta").textContent =
    local.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }) +
    ", " + local.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " local time";

  document.getElementById("currentDesc").textContent = info.label;
  document.getElementById("currentIcon").innerHTML = iconSvg(info.icon);

  document.getElementById("tempNow").textContent = showTemp(c.temperature_2m);
  document.getElementById("tempFeels").textContent = "Feels like " + showTemp(c.apparent_temperature);

  document.getElementById("statHumidity").textContent = Math.round(c.relative_humidity_2m) + "%";
  document.getElementById("statWind").textContent = Math.round(c.wind_speed_10m) + " km/h";
  document.getElementById("statPressure").textContent = Math.round(c.pressure_msl) + " hPa";
  document.getElementById("statFeels").textContent = showTemp(c.apparent_temperature);
}

function renderForecast() {
  const daily = lastData.daily;
  const row = document.getElementById("forecastRow");
  row.innerHTML = "";

  // Index 0 is today, so the 5-day forecast is indexes 1 to 5.
  for (let i = 1; i <= 5 && i < daily.time.length; i++) {
    const date = new Date(daily.time[i] + "T00:00:00");
    const info = describeCode(daily.weather_code[i]);

    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML =
      '<div class="day-name"></div>' +
      '<div class="day-date"></div>' +
      '<div class="day-icon">' + iconSvg(info.icon) + "</div>" +
      '<div class="day-desc"></div>' +
      '<div class="day-temps"><span class="hi"></span> / <span class="lo"></span></div>';

    card.querySelector(".day-name").textContent = date.toLocaleDateString([], { weekday: "short" });
    card.querySelector(".day-date").textContent = date.toLocaleDateString([], { day: "numeric", month: "short" });
    card.querySelector(".day-desc").textContent = info.label;
    card.querySelector(".hi").textContent = showTemp(daily.temperature_2m_max[i]);
    card.querySelector(".lo").textContent = showTemp(daily.temperature_2m_min[i]);

    row.appendChild(card);
  }
}

/* ---------- recent searches ---------- */

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveRecent(cityName) {
  const list = getRecent().filter(function (c) { return c.toLowerCase() !== cityName.toLowerCase(); });
  list.unshift(cityName);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  renderRecent();
}

function renderRecent() {
  const list = getRecent();
  recentWrap.hidden = list.length === 0;
  recentList.innerHTML = "";

  list.forEach(function (city) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "recent-chip";
    chip.textContent = city;
    chip.addEventListener("click", function () {
      input.value = city;
      searchCity(city);
    });
    recentList.appendChild(chip);
  });
}

/* ---------- events ---------- */

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = input.value.trim();

  if (!name) {
    fieldError.hidden = false;
    input.focus();
    return;
  }
  searchCity(name);
});

input.addEventListener("input", function () {
  fieldError.hidden = true;
});

function setUnit(next) {
  if (unit === next) return;
  unit = next;
  unitC.classList.toggle("is-active", unit === "c");
  unitF.classList.toggle("is-active", unit === "f");
  unitC.setAttribute("aria-pressed", unit === "c");
  unitF.setAttribute("aria-pressed", unit === "f");
  renderAll(); // re-render from lastData, no new API call
}

unitC.addEventListener("click", function () { setUnit("c"); });
unitF.addEventListener("click", function () { setUnit("f"); });

// First load: recent chips + a default city so the page is not empty.
renderRecent();
searchCity(DEFAULT_CITY);
