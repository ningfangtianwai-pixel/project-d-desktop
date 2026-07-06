import type { CurrentWeather, SettingsSnapshot } from "../shared/types.js";
import type { DatabaseService } from "./database.js";
import type { AppLogger } from "./logger.js";

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
}

interface OpenWeatherMapResponse {
  weather?: Array<{ main?: string; id?: number }>;
  main?: {
    temp?: number;
    humidity?: number;
  };
  wind?: {
    speed?: number;
  };
  name?: string;
}

interface IpApiLocationResponse {
  city?: string;
  region?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
}

interface IpWhoIsLocationResponse {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface WeatherLocation {
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  source: "manual-city" | "stored" | "ipapi" | "ipwhois" | "env";
}

export class WeatherService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger
  ) {}

  async getCurrentWeather(): Promise<CurrentWeather> {
    const settings = this.database.getSettings();
    if (settings.weather.mode !== "auto") {
      return this.manualWeather(settings);
    }

    const cached = this.readCache();
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < 20 * 60 * 1000) {
      return { ...cached, source: "cache" };
    }

    try {
      const live = await this.fetchLiveWeather(settings);
      this.database.setAppState("weather_cache", JSON.stringify(live));
      return live;
    } catch (error) {
      const fallback = cached ?? this.manualWeather(settings);
      const result: CurrentWeather = {
        ...fallback,
        source: cached ? "cache" : "fallback",
        error: error instanceof Error ? error.message : String(error)
      };
      this.logger.warn("app", "weather live fetch failed", result);
      return result;
    }
  }

  private manualWeather(settings: SettingsSnapshot): CurrentWeather {
    return {
      mode: settings.weather.mode,
      condition: settings.weather.manualWeather,
      city: settings.weather.city,
      temperatureC: null,
      humidity: null,
      windSpeed: null,
      fetchedAt: new Date().toISOString(),
      source: "manual"
    };
  }

  private readCache(): CurrentWeather | null {
    const raw = this.database.getAppState("weather_cache");
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CurrentWeather;
      if (typeof parsed.condition === "string" && typeof parsed.fetchedAt === "string") {
        return parsed;
      }
    } catch {
      this.logger.warn("app", "failed to parse weather cache");
    }

    return null;
  }

  private async fetchLiveWeather(settings: SettingsSnapshot): Promise<CurrentWeather> {
    const location = await this.resolveLocation(settings);
    const openWeather = await this.tryFetchOpenWeatherMap(settings, location);
    if (openWeather) {
      return openWeather;
    }

    if (location.latitude === null || location.longitude === null) {
      throw new Error("Weather location is not available");
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", location.latitude.toString());
    url.searchParams.set("longitude", location.longitude.toString());
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m");

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(`Open-Meteo returned ${response.status}`);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    return {
      mode: settings.weather.mode,
      condition: this.mapWeatherCode(data.current?.weather_code),
      city: location.city,
      temperatureC: this.numberOrNull(data.current?.temperature_2m),
      humidity: this.numberOrNull(data.current?.relative_humidity_2m),
      windSpeed: this.numberOrNull(data.current?.wind_speed_10m),
      fetchedAt: new Date().toISOString(),
      source: "open-meteo"
    };
  }

  private async tryFetchOpenWeatherMap(settings: SettingsSnapshot, location: WeatherLocation): Promise<CurrentWeather | null> {
    const runtime = this.database.getWeatherRuntimeConfig();
    const apiKey = runtime.apiKey || process.env.PROJECTD_OPENWEATHER_API_KEY;
    if (!apiKey) {
      return null;
    }

    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    if (location.latitude !== null && location.longitude !== null) {
      url.searchParams.set("lat", location.latitude.toString());
      url.searchParams.set("lon", location.longitude.toString());
    } else if (location.city) {
      url.searchParams.set("q", location.city);
    } else {
      return null;
    }
    url.searchParams.set("appid", apiKey);
    url.searchParams.set("units", "metric");
    url.searchParams.set("lang", "zh_cn");

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(`OpenWeatherMap returned ${response.status}`);
    }

    const data = (await response.json()) as OpenWeatherMapResponse;
    return {
      mode: settings.weather.mode,
      condition: this.mapOpenWeather(data.weather?.[0]?.main, data.weather?.[0]?.id),
      city: data.name ?? location.city,
      temperatureC: this.numberOrNull(data.main?.temp),
      humidity: this.numberOrNull(data.main?.humidity),
      windSpeed: this.numberOrNull(data.wind?.speed),
      fetchedAt: new Date().toISOString(),
      source: "openweathermap"
    };
  }

  private async resolveLocation(settings: SettingsSnapshot): Promise<WeatherLocation> {
    const runtime = this.database.getWeatherRuntimeConfig();
    const city = settings.weather.city?.trim() || null;

    if (this.validCoordinate(runtime.latitude, runtime.longitude)) {
      return {
        city,
        latitude: runtime.latitude,
        longitude: runtime.longitude,
        source: "stored"
      };
    }

    if (city) {
      return {
        city,
        latitude: null,
        longitude: null,
        source: "manual-city"
      };
    }

    const envLatitude = process.env.PROJECTD_WEATHER_LATITUDE ? Number(process.env.PROJECTD_WEATHER_LATITUDE) : Number.NaN;
    const envLongitude = process.env.PROJECTD_WEATHER_LONGITUDE ? Number(process.env.PROJECTD_WEATHER_LONGITUDE) : Number.NaN;
    if (this.validCoordinate(envLatitude, envLongitude)) {
      const location = {
        city: null,
        latitude: envLatitude,
        longitude: envLongitude,
        source: "env" as const
      };
      this.database.updateWeatherLocation(location.city, location.latitude, location.longitude, location.source);
      return location;
    }

    const detected = await this.detectLocationByIp();
    this.database.updateWeatherLocation(detected.city, detected.latitude, detected.longitude, detected.source);
    return detected;
  }

  private async detectLocationByIp(): Promise<WeatherLocation> {
    const ipApi = await this.tryFetchIpApi();
    if (ipApi) {
      return ipApi;
    }

    const ipWhoIs = await this.tryFetchIpWhoIs();
    if (ipWhoIs) {
      return ipWhoIs;
    }

    throw new Error("IP geolocation failed");
  }

  private async tryFetchIpApi(): Promise<WeatherLocation | null> {
    try {
      const response = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as IpApiLocationResponse;
      if (!this.validCoordinate(data.latitude, data.longitude)) {
        return null;
      }

      return {
        city: this.locationLabel(data.city, data.region, data.country_name),
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        source: "ipapi"
      };
    } catch (error) {
      this.logger.warn("app", "ipapi location lookup failed", { message: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  private async tryFetchIpWhoIs(): Promise<WeatherLocation | null> {
    try {
      const response = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as IpWhoIsLocationResponse;
      if (data.success === false || !this.validCoordinate(data.latitude, data.longitude)) {
        return null;
      }

      return {
        city: this.locationLabel(data.city, data.region, data.country),
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        source: "ipwhois"
      };
    } catch (error) {
      this.logger.warn("app", "ipwhois location lookup failed", { message: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  private locationLabel(city?: string, region?: string, country?: string): string | null {
    const parts = [city, region, country].map((part) => part?.trim()).filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join(", ") : null;
  }

  private validCoordinate(latitude: unknown, longitude: unknown): latitude is number {
    return (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
    );
  }

  private mapOpenWeather(main: string | undefined, id: number | undefined): string {
    const normalized = main?.toLowerCase();
    if (normalized === "rain" || normalized === "drizzle" || normalized === "thunderstorm") {
      return "rain";
    }
    if (normalized === "snow") {
      return "snow";
    }
    if (normalized === "mist" || normalized === "fog" || normalized === "haze" || (id !== undefined && id >= 700 && id < 800)) {
      return "fog";
    }
    return "clear";
  }

  private mapWeatherCode(code: number | undefined): string {
    if (code === undefined) {
      return "clear";
    }
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

  private numberOrNull(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
}
