# Open-Meteo 接口用法

预报接口：`https://api.open-meteo.com/v1/forecast`，地理编码：`https://geocoding-api.open-meteo.com/v1/search`。免 Key。

## 预报请求参数（weather-macos 实际用的）

| 参数 | 取值 |
|---|---|
| `latitude` / `longitude` | 所选城市的经纬度 |
| `timezone` | 城市时区，缺失回退 `auto` |
| `temperature_unit` | `celsius` / `fahrenheit`（跟界面单位） |
| `wind_speed_unit` | `kmh` / `mph`（跟界面单位） |
| `current` | `temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,precipitation,wind_speed_10m,pressure_msl` |
| `hourly` | `temperature_2m,weather_code,precipitation_probability,visibility`（取未来 24 小时） |
| `daily` | `weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max` |

## 地理编码请求参数

| 参数 | 取值 |
|---|---|
| `name` | 用户输入；短中文查询会额外带 `市` / `省` 后缀重试；`PEK` 这类 3-4 位机场码直查后把名字含机场/airport 的结果置顶 |
| `count` | `5` |
| `language` | 界面语言先查，无结果再按输入语系回退（`zh/ja/ko/ru/ar/th`） |
| 合并 | 按 `id` 去重，优先保留界面语言版本，合并后按 `population` 倒序 |

`GET https://geocoding-api.open-meteo.com/v1/get?id=&language=` 返回单地点完整记录（含本地化 `name/admin1/admin2/country`）。切换界面语言时优先用它精确重取已有 `id` 城市的显示名；无 `id` 的城市回退逆地理编码。

## 坐标直查（wttr.in 风格）

输入 `纬度,经度`（逗号/空格/中文逗号分隔，如 `39.9,116.4`）或维基式 DMS（如 `28°22′N 100°14′E`，支持分/秒、半球字母定经纬、顺序随意）跳过地理编码，直接拉预报（`timezone=auto`）；地名用 BigDataCloud 逆地理编码补（`api.bigdatacloud.net/data/reverse-geocode-client`，`localityLanguage` 跟界面语言，失败回退显示坐标）。

## 空气质量（AQI）

`GET https://air-quality-api.open-meteo.com/v1/air-quality?latitude=&longitude=&current=us_aqi,pm2_5,pm10&timezone=auto`（免 Key）。取 `current.us_aqi`（美标），按 EPA 分档显示等级：0-50 优 / 51-100 良 / 101-150 轻度污染 / 151-200 中度污染 / 201-300 重度污染 / 300+ 严重污染（等级名 20 语言在 `chrome-strings.json` 的 `aqi*` 键）。请求失败不影响天气渲染，保留上次 AQI。

## IP 定位链

按序尝试（HTTPS 优先，各 5s 超时，失败逐级降级，统一归一化为 ip-api 形状）：`https://ipwho.is/` → `https://ipapi.co/json/` → `https://ipinfo.io/json` → `http://ip-api.com/json/?fields=...`（HTTP 兜底，HTTPS 页面下会被浏览器拦截而跳过）。全部失败 → 走默认城市。

## IP 查天气（`x.x.x.x` 格式）

`{ip}` 分别试 `https://ipwho.is/{ip}` → `https://ipapi.co/{ip}/json/` → `https://ipinfo.io/{ip}/json` → `http://ip-api.com/json/{ip}?fields=...`（同链）。IPv4 四段每段 0-255 才触发；私网段等返回 `fail` → 显示本地化无结果。成功后用返回城市名再调地理编码，并**优先选离 IP 坐标 5 度内最近的候选**（同名城镇多州并存时，原始顺序不可靠），显示四级层级。

## 图标

Meteocons 走 unpkg：`https://unpkg.com/@meteocons/svg@latest/fill/{图标名}.svg`。图标名来自 `wmo-codes.json` 的 `icon` / `iconNight`。
