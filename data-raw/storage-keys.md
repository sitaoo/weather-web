# 本地存储键

前缀统一 `weatherMac_*`（和 weather-web 的 `weatherApp_*` 隔离）。

| 键 | 内容 | 默认值 |
|---|---|---|
| `weatherMac_cities` | 城市数组 JSON（`name,latitude,longitude,timezone,country,admin1,admin2,pinned?`，另有 `names: {lang: {name,admin1,admin2,country}}` 多语言名缓存） | `[]` → IP 定位 → 北京兜底 |
| `weatherMac_active` | 当前城市 `"纬度.toFixed(3),经度.toFixed(3)"` | 第一个城市 |
| `weatherMac_unit` | `celsius` / `fahrenheit` | `celsius` |
| `weatherMac_lang` | 界面语言代码（20 种，见 `languages.json`） | 浏览器语言 → `zh` |
| `weatherMac_theme` | `dark` / `light` | `dark` |
| `weatherMac_wallpaper` | 壁纸 id / `*-auto` / `time`（见 `wallpapers.json`） | `tahoe-auto` |
| `weatherMac_glass` | `dark` / `light` / `weather` | `light` |
| `weatherMac_hour12` | `12` / `24`（老数据 `1` / `0` 自动迁移） | `24` |
| `weatherMac_refresh` | 自动刷新分钟数（`0` = 关） | `60` |
| `weatherMac_expandAirports` | 扩充机场数据库开关（`1` 开 / `0` 关） | `1` |
| `weatherMac_expandAdmin` | 扩充行政区划库开关（`1` 开 / `0` 关） | `1` |
| `weatherMac_showSource` | 显示匹配来源开关（`1` 开 / `0` 关，调试用） | `0` |
| `weatherMac_showCoords` | 显示地理坐标开关（`1` 开 / `0` 关） | `0` |
| `weatherMac_widgetPosition` | 桌面卡片位置 JSON `{x, y}` | 右上角默认位置 |
