import type { WallpaperLibraryItem } from "./types.js";

export const WALLPAPER_STYLES = [
  ["anime", "动漫"],
  ["landscape", "风景"],
  ["cinematic", "电影感"],
  ["cyberpunk", "赛博朋克"],
  ["minimalist", "极简"],
  ["seasonal", "季节"]
] as const;

export const WALLPAPER_LIBRARY: WallpaperLibraryItem[] = [
  {
    id: "anime-lakeside-station",
    label: "湖畔车站",
    style: "anime",
    type: "image",
    file: "anime-lakeside-station.png",
    aliases: ["动漫", "车站", "湖畔", "蓝调", "anime", "station"]
  },
  {
    id: "anime-seaside-town",
    label: "海崖晨光",
    style: "anime",
    type: "image",
    file: "anime-seaside-town.png",
    aliases: ["动漫", "海边", "小镇", "晨光", "anime", "seaside"]
  },
  {
    id: "landscape-alpine-lake",
    label: "雾岭镜湖",
    style: "landscape",
    type: "image",
    file: "landscape-alpine-lake.png",
    aliases: ["风景", "山", "湖", "雾", "landscape", "alpine"]
  },
  {
    id: "landscape-coastal-cliffs",
    label: "海岸长风",
    style: "landscape",
    type: "image",
    file: "landscape-coastal-cliffs.png",
    aliases: ["风景", "海岸", "悬崖", "海洋", "landscape", "coast"]
  },
  {
    id: "calligraphy",
    label: "水墨书法",
    style: "minimalist",
    type: "image",
    file: "calligraphy.png",
    aliases: ["书法", "水墨", "calligraphy", "墨韵"]
  },
  {
    id: "earth",
    label: "地球",
    style: "cinematic",
    type: "image",
    file: "earth.png",
    aliases: ["地球", "宇宙", "星球", "earth"]
  },
  {
    id: "evening-cloud",
    label: "傍晚云影",
    style: "seasonal",
    type: "image",
    file: "evening-cloud.png",
    aliases: ["云", "云影", "晚霞", "傍晚", "季节", "seasonal", "evening", "cloud"]
  },
  {
    id: "cinematic-night-city",
    label: "橙蓝夜城",
    style: "cinematic",
    type: "image",
    file: "cinematic-night-city.jpg",
    aliases: ["电影", "电影感", "夜城", "城市", "cinematic", "city"]
  },
  {
    id: "cyberpunk-neon-bridge",
    label: "霓虹光桥",
    style: "cyberpunk",
    type: "image",
    file: "cyberpunk-neon-bridge.jpg",
    aliases: ["赛博朋克", "霓虹", "光桥", "cyberpunk", "neon"]
  },
  {
    id: "cyberpunk-neon-street",
    label: "山城霓虹",
    style: "cyberpunk",
    type: "image",
    file: "cyberpunk-neon-street.jpg",
    aliases: ["赛博朋克", "霓虹", "街道", "山城", "cyberpunk", "street"]
  },
  {
    id: "minimalist-geometry",
    label: "几何晴空",
    style: "minimalist",
    type: "image",
    file: "minimalist-geometry.jpg",
    aliases: ["极简", "建筑", "几何", "晴空", "minimalist", "geometry"]
  },
  {
    id: "seasonal-autumn-path",
    label: "深秋小径",
    style: "seasonal",
    type: "image",
    file: "seasonal-autumn-path.jpg",
    aliases: ["季节", "秋天", "秋日", "森林", "seasonal", "autumn"]
  }
];

export function wallpaperDisplayLabel(item: WallpaperLibraryItem | null | undefined): string {
  if (!item) {
    return "选择壁纸";
  }

  const styleLabel = WALLPAPER_STYLES.find(([style]) => style === item.style)?.[1] ?? item.style;
  return `${item.label} · ${styleLabel}`;
}

export function findWallpaperByInput(input: string): WallpaperLibraryItem | null {
  const normalized = input.toLowerCase();
  return (
    WALLPAPER_LIBRARY.find((item) => {
      if (normalized.includes(item.id.toLowerCase()) || normalized.includes(item.label.toLowerCase())) {
        return true;
      }
      return item.aliases.some((alias) => normalized.includes(alias.toLowerCase()));
    }) ?? null
  );
}

export function nextWallpaperId(currentId: string | null | undefined): string {
  const currentIndex = WALLPAPER_LIBRARY.findIndex((item) => item.id === currentId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % WALLPAPER_LIBRARY.length : 0;
  return WALLPAPER_LIBRARY[nextIndex]?.id ?? WALLPAPER_LIBRARY[0].id;
}
