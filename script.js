"use strict";

// The coordinates here are illustrative city-center locations.
const cities = [
  { name: "Manila", lat: 14.5995, lon: 120.9842 },
  { name: "Cebu City", lat: 10.3157, lon: 123.8854 },
  { name: "Davao City", lat: 7.1907, lon: 125.4553 },
    { name: "Cagayan de Oro", lat: 8.4542, lon: 124.6319 },
    { name: "Malaybalay", lat: 8.1575, lon: 125.1278 },
    { name: "Manolo Fortich Bukidnon", lat: 8.36689, lon: 124.86627 },
];

const map = L.map("map").setView([11.2, 123.0], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const apiKeyInput = document.getElementById("apiKey");
const status = document.getElementById("status");
const weatherDetails = document.getElementById("weatherDetails");
const cache = new Map();
const CACHE_MS = 10 * 60 * 1000;
let activeRequest = 0;

function setStatus(message) {
  status.textContent = message;
}
function textElement(tag, content) {
  const node = document.createElement(tag);
  node.textContent = content;
  return node;
}
function weatherView(cityName, data) {
  const card = document.createElement("div");
  card.className = "weather-card";
  const description = data.weather?.[0]?.description ?? "Not available";
  const icon = data.weather?.[0]?.icon ?? "";
  if (/^\d{2}[dn]$/.test(icon)) {
    const image = document.createElement("img");
    image.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    image.alt = description;
    card.append(image);
  }
  const info = document.createElement("div");
  info.append(textElement("strong", cityName));
  info.append(textElement("div", description));
  info.append(
    textElement("div", `Temperature: ${data.main.temp.toFixed(1)} °C`)
  );
  info.append(
    textElement("div", `Feels like: ${data.main.feels_like.toFixed(1)} °C`)
  );
  info.append(textElement("div", `Humidity: ${data.main.humidity}%`));
  info.append(textElement("div", `Wind: ${data.wind?.speed ?? "N/A"} m/s`));
  card.append(info);
  return card;
}

async function getCurrentWeather(city) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) throw new Error("Enter your OpenWeather API key first.");
  // Cache results per location and API key, for ten minutes.
  const cacheId = `${city.name}|${apiKey}`;
  const saved = cache.get(cacheId);
  if (saved && Date.now() - saved.time < CACHE_MS) return saved.data;

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", city.lat);
  url.searchParams.set("lon", city.lon);
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401)
      throw new Error(
        "API key rejected (401). Verify your key and product access."
      );
    if (response.status === 429)
      throw new Error("Request limit exceeded (429). Try again later.");
    throw new Error(`Weather request failed (HTTP ${response.status}).`);
  }
  const data = await response.json();
  if (!data.main || typeof data.main.temp !== "number") {
    throw new Error(
      "Unexpected response: temperature information was missing."
    );
  }
  cache.set(cacheId, { time: Date.now(), data });
  return data;
}

async function showWeather(city, marker) {
  const requestId = ++activeRequest;
  setStatus(`Loading weather for ${city.name}…`);
  marker.bindPopup(`${city.name}: Loading weather…`).openPopup();
  try {
    const data = await getCurrentWeather(city);
    if (requestId !== activeRequest) return;
    weatherDetails.replaceChildren(weatherView(city.name, data));
    const popup = document.createElement("div");
    popup.append(textElement("h3", city.name));
    popup.append(
      textElement(
        "p",
        `${data.main.temp.toFixed(1)} °C — ${
          data.weather?.[0]?.description ?? "Current weather"
        }`
      )
    );
    popup.append(textElement("p", `Humidity: ${data.main.humidity}%`));
    marker.bindPopup(popup).openPopup();
    setStatus(`Showing current weather for ${city.name}.`);
  } catch (error) {
    if (requestId !== activeRequest) return;
    marker.bindPopup(`${city.name}: Weather unavailable.`).openPopup();
    weatherDetails.textContent = error.message;
    setStatus(error.message);
  }
}

cities.forEach((city) => {
  const marker = L.marker([city.lat, city.lon]).addTo(map);
  marker.bindTooltip(city.name);
  marker.on("click", () => showWeather(city, marker));
});

map.on("click", function(event) {
const lat = event.latlng.lat;
const lng = event.latlng.lng;

L.popup()
.setLatLng(event.latlng)
.setContent(
"Latitude: " + lat.toFixed(5) +
"<br>Longitude: " + lng.toFixed(5)
)
.openOn(map);
});