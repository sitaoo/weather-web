# Weather macOS

[English](./README.md) | 简体中文

一个仿 macOS 风格的桌面天气应用：浏览器窗口模拟 macOS 桌面，右上角天气小卡片点开是完整天气窗口。纯原生 HTML / CSS / JavaScript 实现，**无构建步骤、无第三方依赖、无需 API Key**。

## 功能一览

**桌面**
- 顶部菜单栏（Logo、应用名、多语言时钟）、可换壁纸的桌面背景
- 天气小卡片：可鼠标拖动摆放、位置自动记住；城市名过长单行省略，悬停自动滚动显示全文
- 底部 Dock：暂时隐藏（只有一个天气图标，等图标多了再显示）；左上角还有天气 / 设置两个桌面图标入口

**天气窗口**
- 左侧多城市列表：增删、点击切换、拖动排序；定位城市是独立特殊行（恒置顶、可与用户城市重合去重）；可选显示地理坐标标签
- 侧边栏可折叠（title 栏图标开关），收起后 title 栏 🔍 可展开悬浮搜索框
- 顶部大字当前天气（随昼夜/天气换渐变背景）+ 24 小时横向预报（拖动/两侧悬浮翻页，降雨才显示概率）+ 7 天预报（日期/描述/图标/水滴/概率/温度区间条，降雨列全周无雨自动折叠）
- 气象预警横幅（中国中央气象台 + 美国 NWS）：首行最新一条（有正文则替标题），历史可展开，点击直达原文
- 九宫格指标：体感温度、湿度、风速、降水、UV、日出日落、能见度、气压、AQI（真数据）

**设置**
- 温度单位 °C/°F、21 种界面语言（含繁体中文）、深浅外观、12/24 小时制、自动刷新（关/15/30/60 分钟）
- 玻璃特效（深邃藏青 / 经典浅透 / 随天气变化）、壁纸（4 款渐变 + 5 组昼夜自动 + 时间自动；多图壁纸点数量徽标可全屏预览切换）
- 三个高级开关：扩充机场数据库、扩充行政区划库（默认开）、显示匹配来源（默认关，调试搜索命中来源用）

**搜索**：中英文城市名、机场三字码（如 `PEK`）、IP 地址（如 `8.8.8.8`）、十进制坐标（如 `39.9,116.4`）、维基式经纬度（如 `28°22′N 100°14′E`）。中/繁自动双字形查询、输出按界面语言归一化。搜不到的知名地点可用内置纠错字典兜底（如香格里拉、稻城亚丁）。

## 快速开始

```bash
python -m http.server 8000
```

浏览器打开 http://localhost:8000 即可。也可以直接双击 `index.html` 打开（file:// 同样可用）。

## 数据来源（均为免费、无需 Key）

| 用途 | 来源 |
|---|---|
| 天气预报 | Open-Meteo forecast（含逐小时/逐日） |
| 城市搜索/多语言地名 | Open-Meteo geocoding（GeoNames 数据） |
| 空气质量 | Open-Meteo air-quality（美标 AQI） |
| IP 定位 / IP 查天气 | 四服务链（ipwho.is → ipapi.co → ipinfo.io → ip-api.com），HTTPS 优先，5s 超时逐级降级 |
| 坐标反查地名 | BigDataCloud（免 Key） |
| 气象预警（中国） | 中央气象台 NMC（免 Key，HTTPS+CORS 直调，一次拿全量，10 分钟缓存） |
| 气象预警（美国） | NWS alerts API（免 Key，CORS 放行，按坐标查生效中） |
| 机场库（4008 个 IATA 机场） | OurAirports（公有领域，每日更新） |
| 中国行政区划（省/市/区县） | 国家地名信息库整理数据（MIT） |
| 天气图标 | Meteocons（unpkg CDN） |

署名要求：界面保留 “Weather data by Open-Meteo.com”。

## 给其他产品用的 SDK

`sdk/weather-api.js` 是数据层超集（v2.0.0）：单文件约 80KB、零依赖，浏览器用 `<script>` 引入（`window.WeatherAPI`），Node 18+ 可 `require()`。覆盖全部查询面（预报/空气/地理编码/逆地理/IP/中美预警）+ 归一化 + 21 语言输出 + 内存 TTL 缓存（默认开，`opts.cache === false` 关）。文件内 `SDK-DATA` 数据区由抽取脚本从 data-raw/vendor 生成，勿手改；完整参数与返回结构见文件内 JSDoc。

```html
<script src="sdk/weather-api.js"></script>
<script>
  const [city] = await WeatherAPI.searchPlaces('上海', { language: 'zh' });
  const w = await WeatherAPI.getWeather(city.latitude, city.longitude, { lang: 'zh' });
  console.log(w.current.temperature + w.units.temperature, w.current.description);
</script>
```

| 方法 | 说明 |
|---|---|
| `searchPlaces(query, {language, count})` | 地名搜索（中/繁双字形合并、输出按语言归一化） |
| `getPlace(id, {language})` | 按 id 精确取地点（语言切换重取显示名用） |
| `getWeather(lat, lon, {unit, lang, timezone, forecastDays, pastDays})` | 当前 + 逐小时 + 预报（21 语言描述、图标 URL 自带） |
| `getAirQuality(lat, lon, {lang})` | 美标 AQI + PM2.5/PM10 + 本地化等级（无数据返回 null，不抛错） |
| `locateByIP()` | IP 粗定位（城市/坐标/时区，4 路链） |
| `reverseGeocode(lat, lon, {language})` | 坐标→地名（中/繁输出归一化） |
| `describe(code, {lang, isDay})` | WMO 天气码→文字描述+图标（21 语言） |
| `getWeekdays(lang)` | 星期名（21 语言） |
| `describeAqi(aqi, lang)` | AQI 数值→等级+本地化描述 |
| `getChinaWarnings()` | NMC 预警全量裸列表（adcode 匹配见主应用） |
| `getUSAlerts(lat, lon)` | NWS 生效中预警（归一化，色级+正文直给） |
| `getWarningBody(alert, {firecrawl})` | 预警正文（默认 jina，可配自托管 FireCrawl） |
| `clearCache()` | 清空内存缓存 |

## 简要技术说明

- 数据流：搜索先过本地纠错字典 → 本地机场库（IATA 精确命中）→ 线上地理编码（多语言回退 + 行政区划扩展 + 合并去重）→ 拿坐标调预报接口 → 渲染。详见 `TECHNICAL.md`。
- 状态全部存在 `localStorage`（`weatherMac_*` 前缀）：城市列表、当前城市、单位、语言、主题、壁纸、玻璃特效、开关等；每个城市还缓存各语言下显示过的名称，切语言回看不重复请求。
- 语言切换后，已存城市会自动按新语言重新拉取显示名（有 `id` 的走精确查询，无 `id` 的走逆地理），字典固化的地名不受影响。

## 目录结构

```
weather-web/
  index.html          入口（桌面 + 窗口 + 设置弹窗骨架）
  css/desktop.css     桌面、菜单栏、卡片、Dock
  css/window.css      天气窗口、设置弹窗
  js/i18n.js          21 语言文案（界面 + 天气描述 + 星期，zh-tw 运行时派生）
  js/api.js           所有外部接口封装
  js/geo-db.js        本地机场/区划库懒加载
  js/city-overrides.js 地名纠错字典（由 data-raw 生成，勿手改）
  js/titlebar.js      macOS 标题栏公共模块
  js/desktop.js       桌面交互（时钟、壁纸、卡片拖动）
  js/weather-window.js 窗口内全部逻辑（搜索、预报渲染、设置）
  data/               运行时资源：地理数据库（懒加载）+ 本地壁纸 + 图标
```

`./data-raw/` 下有全部可复用数据表（语言、WMO 天气代码、行政区划、机场库等）及抽取脚本，详见该目录 README。
