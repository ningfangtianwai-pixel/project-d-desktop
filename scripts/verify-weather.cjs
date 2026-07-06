const fs = require("node:fs");
const path = require("node:path");
const initSqlJs = require("sql.js");

const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast";

function validCoordinate(latitude, longitude) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

function mapOpenWeather(main, id) {
  const normalized = typeof main === "string" ? main.toLowerCase() : "";
  if (normalized === "rain" || normalized === "drizzle" || normalized === "thunderstorm") {
    return "rain";
  }
  if (normalized === "snow") {
    return "snow";
  }
  if (normalized === "mist" || normalized === "fog" || normalized === "haze" || (typeof id === "number" && id >= 700 && id < 800)) {
    return "fog";
  }
  return "clear";
}

function mapWeatherCode(code) {
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return "rain";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }
  if ([45, 48].includes(code)) {
    return "fog";
  }
  return "clear";
}

function locationLabel(...parts) {
  const cleanParts = parts.map((part) => (typeof part === "string" ? part.trim() : "")).filter(Boolean);
  return cleanParts.length > 0 ? cleanParts.join(", ") : null;
}

async function locateByIp() {
  const providers = [
    {
      name: "ipapi",
      url: "https://ipapi.co/json/",
      map: (data) => ({
        city: locationLabel(data.city, data.region, data.country_name),
        latitude: data.latitude,
        longitude: data.longitude
      })
    },
    {
      name: "ipwhois",
      url: "https://ipwho.is/",
      map: (data) => ({
        city: locationLabel(data.city, data.region, data.country),
        latitude: data.latitude,
        longitude: data.longitude
      })
    }
  ];

  for (const provider of providers) {
    try {
      const response = await fetch(provider.url, { signal: AbortSignal.timeout(6000) });
      if (!response.ok) {
        continue;
      }
      const location = provider.map(await response.json());
      if (validCoordinate(location.latitude, location.longitude)) {
        return { ...location, source: provider.name };
      }
    } catch {
      continue;
    }
  }

  throw new Error("IP geolocation failed");
}

async function fetchOpenWeather(location, apiKey) {
  if (!apiKey) {
    return null;
  }

  const url = new URL(OPENWEATHER_URL);
  url.searchParams.set("lat", String(location.latitude));
  url.searchParams.set("lon", String(location.longitude));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "zh_cn");

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new Error(`OpenWeatherMap returned ${response.status}`);
  }

  const data = await response.json();
  return {
    mode: "auto",
    condition: mapOpenWeather(data.weather?.[0]?.main, data.weather?.[0]?.id),
    city: data.name || location.city,
    temperatureC: typeof data.main?.temp === "number" ? data.main.temp : null,
    humidity: typeof data.main?.humidity === "number" ? data.main.humidity : null,
    windSpeed: typeof data.wind?.speed === "number" ? data.wind.speed : null,
    fetchedAt: new Date().toISOString(),
    source: "openweathermap",
    locationSource: location.source
  };
}

async function fetchOpenMeteo(location) {
  const url = new URL(OPENMETEO_URL);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m");

  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new Error(`Open-Meteo returned ${response.status}`);
  }

  const data = await response.json();
  return {
    mode: "auto",
    condition: mapWeatherCode(data.current?.weather_code),
    city: location.city,
    temperatureC: typeof data.current?.temperature_2m === "number" ? data.current.temperature_2m : null,
    humidity: typeof data.current?.relative_humidity_2m === "number" ? data.current.relative_humidity_2m : null,
    windSpeed: typeof data.current?.wind_speed_10m === "number" ? data.current.wind_speed_10m : null,
    fetchedAt: new Date().toISOString(),
    source: "open-meteo",
    locationSource: location.source
  };
}

async function main() {
  const dbPath = process.env.PROJECTD_DB_PATH || path.join(process.env.APPDATA ?? "", "Project D", "database.sqlite");
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    process.exitCode = 1;
    return;
  }

  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file)
  });
  const db = new SQL.Database(fs.readFileSync(dbPath));
  const row = db.exec("SELECT api_key, mode FROM weather_config ORDER BY id LIMIT 1")[0]?.values[0] ?? [];
  const storedKey = typeof row[0] === "string" && row[0].trim() ? row[0].trim() : "";
  const apiKey = storedKey.startsWith("safe:v1:") ? process.env.PROJECTD_OPENWEATHER_API_KEY : storedKey || process.env.PROJECTD_OPENWEATHER_API_KEY;
  const location = await locateByIp();
  const weather = (await fetchOpenWeather(location, apiKey).catch(() => null)) || (await fetchOpenMeteo(location));

  db.run(
    `UPDATE weather_config
     SET mode = 'auto',
         city = ?,
         latitude = ?,
         longitude = ?,
         last_fetched_at = ?
     WHERE id = (SELECT id FROM weather_config ORDER BY id LIMIT 1)`,
    [weather.city, location.latitude, location.longitude, weather.fetchedAt]
  );
  db.run(
    `INSERT INTO app_state(key, value, updated_at)
     VALUES ('weather_cache', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [JSON.stringify(weather)]
  );
  db.run(
    `INSERT INTO app_state(key, value, updated_at)
     VALUES ('weather_location_source', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [location.source]
  );

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  db.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        source: weather.source,
        locationSource: weather.locationSource,
        city: weather.city,
        condition: weather.condition,
        temperatureC: weather.temperatureC,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        fetchedAt: weather.fetchedAt
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
