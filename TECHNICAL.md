# Weather Web 技术文档

> 面向后续维护与复用：讲清每个模块“用什么技术、怎么查、怎么配对、数据从哪来”。
> 与代码不一致时以代码为准；数据表字典见 `./data-raw/README.md`。

## 1. 总体架构

纯前端、无构建、无运行时依赖。7 个 JS 文件按固定顺序以 `<script>` 串联（见 `index.html` 末尾：`i18n → api → geo-db → city-overrides → titlebar → desktop → weather-window`），通过 `window.WeatherMac*` 命名空间通信，无模块打包器。

```
用户输入 ─▶ weather-window.js（搜索编排）
              ├─▶ city-overrides.js（本地纠错字典，常驻内存）
              ├─▶ geo-db.js（机场/区划库，首次使用时懒加载）
              └─▶ api.js ─▶ Open-Meteo / ip-api / BigDataCloud（见 §2）
                        │
                        ▼
              forecast 数据 ─▶ Hero / 逐小时 / 10 天 / 九宫格 / 桌面卡片
```

`desktop.js` 只管桌面层（时钟、壁纸切换、卡片拖动与位置持久化）；`titlebar.js` 是两个弹窗共用的红绿灯标题栏；`weather-window.js` 是业务核心。

## 2. 外部数据源一览

| 接口 | 用途 | 要点 |
|---|---|---|
| `geocoding-api.open-meteo.com/v1/search` | 城市名→坐标 | `name/count=5/language`；底层是 GeoNames 数据，中文县级以下覆盖差，这是做本地字典的根本原因 |
| `geocoding-api.open-meteo.com/v1/get` | 按 `id` 精确取地点 | 语言切换时重取已有城市的多语言显示名，一步到位（含 admin1/admin2/country） |
| `api.open-meteo.com/v1/forecast` | 天气 | 一次请求拿全：`current`（温/体感/湿度/天气码/降水/风速/气压）+ `hourly`（温/天气码/降水概率/能见度，取未来 24h）+ `daily`（天气码/高低温/日出日落/UV/降水概率） |
| `air-quality-api.open-meteo.com/v1/air-quality` | AQI | 取 `current.us_aqi`（美标）；失败不影响天气渲染，保留上次值 |
| IP 定位链（本机定位 / IP 查天气） | ipwho.is → ipapi.co → ipinfo.io → ip-api.com，按序尝试、5s 超时逐级降级，统一归一化形状；私网段返回 `fail` |
| `api.bigdatacloud.net/.../reverse-geocode-client` | 坐标→地名 | 免 Key，用于坐标直查的显示名、无 `id` 城市的语言切换；`localityLanguage` 跟界面语言 |
| NMC `www.nmc.cn/rest/findAlarm` | 气象预警（仅中国） | 免 Key，HTTPS+CORS 直调，一次拿全量（~500 条）并缓存 10 分钟；标题文法固定可解析，匹配逻辑见 §8 |
| unpkg Meteocons | 天气图标 | 按 WMO 天气码映射（`api.js` 内 `weatherCodeMap`，28 个代码 × 昼夜两套图标），URL 形如 `.../fill/{icon}.svg`，加载失败有内联 SVG 兜底 |

## 3. 搜索流水线（按优先级短路）

搜索框 300ms 防抖、最少 2 字。一次搜索按以下顺序尝试，命中即返回：

1. **本地纠错字典**（`city-overrides.js`，常驻）：输入与某条目 `aliases` 一字不差 → 直接注入核实的 `place`（ verified 坐标+层级）置顶。如香格里拉、稻城亚丁（API 里根本没有，只能靠这条）。
2. **本地机场库**（`data/airports.db.js`，首次命中时 `<script>` 懒加载，常开可关）：`PEK` 这类 3–4 位码精确命中 IATA → 坐标直接可用；显示名用该坐标 0.5 度内地理编码最近结果（保证界面语言），找不到才用表里的英文原名。关掉则回退“机场名模糊搜+机场字样置顶”的旧启发式。
3. **IP 地址**（`x.x.x.x`，每段 0–255）：定位链解析 → 拿返回城市名调地理编码 → 选离 IP 坐标 5 度内最近候选（同名城镇多州并存时原始顺序不可靠）；私网段显示本地化无结果。
4. **坐标直查**：十进制（逗号/空格/中文逗号分隔）或维基式 DMS（`28°22′N 100°14′E`，支持分/秒、半球字母定经纬、顺序随意）→ 跳过地理编码直接预报，地名用逆地理补，失败回退显示坐标。
5. **普通地名查询**（开销最大，层层扩展后合并）：
   - 语言链：界面语言先查，无结果按输入语系回退（中/日/韩/俄/阿/泰由 Unicode 范围识别，`detectQueryLang`）；`zh-tw` 跳过后面的 `zh` 那一批（`searchCity` 内部已转简查过）；CJK 查询简/繁各查一次按 id 合并（索引按字形匹配）；
   - 中文短查询追加 `市`/`省` 后缀重试（“大理”→“大理市”）；
   - 区划库（常开可关）按前缀补全标准全名（如“迪庆”→“迪庆藏族自治州”）；
   - 合并：按地点 `id` 去重（字典固化点按坐标去重且 0.05 度内 API 重复点丢弃），字典置顶，其余按人口倒序，机场码查询再把名字含机场的结果置顶，取前 8；
   - 层级纠错：`applyAdminFix`（中国结果、县级以上唯一名匹配或省份确认时，用区划表权威值覆盖 `admin2`，不动坐标）；`applyPlaceFix`（字典 `fixIds/fixNames` 覆盖显示字段）。
- **侧边栏折叠 + 快捷搜索**：title 栏（红绿灯右侧）`[侧边栏图标]`，标题文字居中；收起后出现 `[🔍]`，点开展开 256px 嵌入式搜索框（图标框内左置，覆盖 🔍 位置，允许压标题）；空值失焦自动收回 🔍。与侧栏搜索共用 `runCitySearch(q, box, inputEl, tag)`（独立防抖 timer/序号守卫）；title 栏换语言重建后由 `bindTitlebarControls` 重绑；拖窗 mousedown 在 capture 层对按钮/输入框放行。两侧结果均为下拉浮层（侧栏 `#searchResults` 绝对定位盖住城市列表、`#quickResults` 挂输入框下；有内容才显示，选中/清空/收起即隐藏）。

候选项按钮显示 `名 · 市/州 · 省 · 国` 四级（缺失项自动省略）。“显示匹配来源”开关打开后，尾部括号标注命中来源：`本地纠错 / 本地airports / 本地admin / open-meteo`，仅改按钮文字，不污染入库数据。

## 4. 语言切换与多语言名缓存

每个城市对象带 `names: { lang: {name,admin1,admin2,country} }`：

- **入库即记**：`addCity` 把当前语言的显示快照存入（字典固化城市跳过，永远保持核实名）。
- **切换语言**：命中缓存直接恢复，零请求；未命中才联网——有 `id` 的走 `/v1/get` 精确取，无 `id` 的走逆地理——结果再存入缓存。所以切来切去只在“新语言×城市”组合上花一次请求，切回去都是本地读。
- **设计取舍**：逆地理只能返回当地主要地名（如机场坐标返回州名），这是数据源能力上限；靠“一次查询、永久缓存”保证稳定不跳变。北京兜底城市按当前语言存放中/英两套（`zh`/`zh-tw` 共用中文兜底）。
- **繁体（`zh-tw`）**：Open-Meteo 无繁体（`zh_tw`/`zh_hant` 实测返回空，且 `zh` 地名本身简繁混杂），繁体由客户端派生——`js/vendor/transverter.js`（MIT，30KB 单文件无网络）启动时一次性由 zh 生成全部 `zh-tw` 表项（界面/设置/星期/WMO 描述，专名关闭台湾惯用词：`华盛顿镇区→華盛頓鎮區`）；`searchCity` 内 CJK 双字形查询（简/繁各查一次按 id 合并——索引按字形匹配，`东京` 与 `東京` 命中不同条目）；输出按 UI 语言归一化（`zh` 转简——数据源简繁混杂，`zh-tw` 转繁），`reverseGeocode` 同理；本地 curated/admin 字典按简体匹配（`dictQ`，命中再转回繁体显示）。已知局限：`applyPlaceFix`/`applyAdminFix` 的按名修正对繁体名静默跳过（待后续处理），预警中文暂不转。
- **定位每次必刷**（`relocate()`）：启动必定位，每次 `refreshActive`（含定时刷新）先重定位再拉天气。定位城市是独立特殊城市（`state.located` + `LOCATED_ID`，列表首行单显，可与用户城市重合去重显示）；只刷新定位数据，不抢用户当前选择，悬空 id 自愈为定位/首城；定位失败静默保留旧值（无城市无定位才回退北京）。

界面其余文案（设置项、九宫格标签、壁纸/玻璃名、提示语）走 `i18n.js` 的 `CHROME_TEXT`（54 个键 × 21 语言，其中 `zh-tw` 由 zh 运行时派生），`UI_TEXT` 管天气描述，`weekDaysMap` 管星期。新增文案键必须跑 `key-coverage` 类检查保证 21 语言齐全。

## 5. 渲染模块

- **Hero**：城市名（+可选坐标标签 `39.9,116.4`）/ 大温度 / 描述 / 高低温；背景按天气码+昼夜取 `background-gradients.json` 对应渐变；“随天气变化”玻璃模式会把同一渐变同步给桌面卡片。
- **逐小时**：未来 24 格，12/24 小时制跟设置；鼠标按住可拖动横滑（触摸保持原生滚动），两侧悬浮 `‹` `›` 点按翻约一页（hover 才现身，到头尾消失）。降水概率只在降雨类天气码（毛毛雨/雨/阵雨/雷暴 51–67、80–82、95–99）下显示于图标下方（11px 小字贴紧图标），其余格子留空行保持对齐。
- **7 天预报**：六列 grid 固定轨道（星期 56px / 描述弹性 / 图标 30px / 水滴 26px / 概率 36px / 范围弹性），跨行天然对齐；水滴与概率仅降雨类天气码有内容（晴天渲染空 span 占轨）；温度条弹性撑满整轨（旧 200px/320px 上限已删，删时发现的残留规则一并清理）。默认全部完整显示；全周无雨则容器挂 `no-rain` 整列折叠水滴+概率（四轨重排），窄屏（<380px，`ResizeObserver`，`compact`）同理；描述再不够才省略，范围最后。
- **九宫格**：体感/湿度/风速/降水/UV/日出日落/能见度/气压/AQI，前 8 个来自预报接口，AQI 来自空气质量接口（失败保留旧值，首屏占位）。
- **桌面卡片**：城市（单行省略+悬停滚动+`title` 全名）/ 大温度 / 描述 / 高低温 / 天气图标 / 定位箭头（定位城市才显示）；可拖动，位置存 `weatherMac_widgetPosition`。
- **城市列表**：两行式（首行城市名+坐标标签+定位徽标，次行州-省-国），悬停才显示删除键（定位城市无删除键且程序拦截），支持拖动排序（定位城市锁定），超长自动滚动。

## 6. 设置与持久化

设置弹窗分三段：基础（单位/语言/外观/时间制式/自动刷新）→ 玻璃特效/壁纸可视化选择（多图壁纸点左上角图层数徽标开全屏预览，左右箭头/`←`→键/Esc 切换关闭）→ 高级开关（机场库/区划库/来源标注/坐标标签）。`localStorage` 全用 `weatherMac_*` 前缀（键表见 `./data-raw/storage-keys.md`），10 分钟级自动刷新用 `setInterval` 重调预报，壁纸 `time/auto` 模式每分钟按小时重算。

## 7. 本地数据库的构建与更新

`data/*.db.js` 是生成物，勿手改：
- `airports.db.js`（4008 行）：`data-raw/scripts/fetch-geo-data.js` 从 OurAirports CSV（Public Domain）过滤“有 IATA 码+定期航班+机场类型”生成；
- `admin-divisions_zh-cn.db.js`（3212 行）：同脚本从国家地名信息库整理数据取省/市/区县三级生成；
- `city-overrides.js`：`extract-weather-data.js` 从 `data-raw/city-overrides.json` 生成。
三者都走 `<script>` 懒加载（file:// 下 `fetch` 被禁，这是刻意设计），加载失败自动降级为纯线上路径。数据更新时重跑对应脚本即可；各表来源与许可见 `./data-raw/README.md`。

## 8. 气象预警（中国 + 美国）

数据：NMC `findAlarm`，一次拿全量，`api.js` 内 10 分钟缓存；匹配与渲染失败一律静默（无横幅），绝不影响天气主流程。

- **解析**：标题文法固定为 `{发布单位}发布{灾害}{蓝/黄/橙/红}预警`，`parseAlarmTitle` 提发布单位 + 灾害归一化（19 类，`WARN_SIGNALS` 按长度优先，处理“海上雷雨大风”“山洪灾害气象风险”等变体）+ 等级。
- **匹配**：`alertid` 前 6 位即发布单位行政区划码（省 `xx0000` / 地市 `xxxx00` / 区县其他），与城市代码（区划表 `resolveCityAdcode` 解析，歧义名用层级链消歧）做任一方向的上下级包含判断——省预警覆盖全省、地市预警覆盖本级及下属区县（如阳春县预警会显示给阳江市），跨州远县精确排除；区划码缺失/城市无法解析时回退发布单位名包含匹配。
- **渲染**：Hero 下方横幅，首行即最新一条（官方信号图标 + 标题 + 发布方/时间/等级，整行点开 NMC 原文）；有历史时首行最右侧挂弱化“历史预警 (+N)”按钮（常态半透明，hover 才显形），点击展开其余。正文抓到后标题自动隐藏只剩正文（2 行截断，超长点正文展开/收起，语言无关 ▾/▴）；抓不到则保持标题显示。
- **正文**：NMC 详情页无 CORS 且无 JSON 接口（REST 猜测全 404），浏览器直取不可行；实测 allorigins/codetabs 对 nmc.cn 返回 522，`r.jina.ai` 可用（markdown 全文，浏览器/file:// 均放行，匿名 20 次/分钟），后切自托管 FireCrawl 为主（`v1/scrape` + `onlyMainContent`，CORS `*`，无限流）+ jina 兜底。只取最新一条，`alertid` 30 分钟缓存（上限 50 条）；双挂时静默回退无正文状态，横幅其余部分不受影响。
- **桌面徽标**：桌面小组件天气描述右侧挂等级色徽标（`!` + 灾害简称，蓝/黄/橙/红带透明度弱化），hover 显示最新标题（有正文则升级为正文），纯 hint 不可点击；与描述弹性共享行宽（描述优先定宽不拉伸，徽标以 40px 为基准吃富余、上限内容宽，`...` 截断）；只反映 6 小时内预警（超时自动隐藏，时间缺失则保持显示），无预警/非中国城市/切换城市时自动隐藏或清空。
- **文案**：灾害 19 键 + 等级 4 键 + `warnHistory` × 21 语言（`warnLatest` 已删；`zh-tw` 运行时派生），发布单位与正文是中文原文不翻译（繁体范围暂不含预警，见下）。
- **美国（NWS）**：`api.weather.gov/alerts/active?point=lat,lon`，免 Key + CORS `*`，按坐标直接返回生效中预警，无需匹配；`normalizeNWSAlert` 归一化为同一结构（`Actual` + 排除 `Cancel`，`severity` 五级→蓝/黄/橙/红：Minor/Unknown→蓝、Moderate→黄、Severe→橙、Extreme→红），事件名/标题/发布方保持英文原文；`description`/`instruction` 直作正文（不走抓取链）；行链接指向城市级 `forecast.weather.gov/MapClick` 页；城市级 5 分钟缓存；徽标不按 `sent` 算 6 小时（高温预警持续一整天是常态），改为按 `ends/expires` 有效期门控——生效中即显示。

## 9. SDK（sdk/weather-api.js，数据层超集 v2.0.0）

单文件约 80KB、零依赖（仅 `fetch`），覆盖全部查询面（预报/空气/地理编码/逆地理/IP/中美预警）+ 归一化 + 21 语言输出 + 内存 TTL 缓存（默认开）。`SDK-DATA` 数据区由抽取脚本第 9 节生成（转换器工厂 + WMO/星期/AQI 表），禁手改。主应用不引用 SDK（继续走 `js/api.js`）。

**明确不支持、留主应用侧的功能**：

- **CN 预警 adcode 匹配**（§8 的上下级包含 + 层级链消歧，依赖 3212 行区划表）：SDK 的 `getChinaWarnings` 只给 NMC 裸列表。
- **搜索召回增强**：curated 纠错字典、机场库、admin 扩展、市/省后缀重试、序号守卫——SDK 只有双字形合并 + 输出归一化。
- **城市状态层**：多语言名快照缓存、语言切换恢复、北京兜底、定位城市置顶/不可删（`localStorage` 全套）。
- **全部渲染**：横幅、历史展开、桌面徽标、逐小时/逐日/九宫格、壁纸画廊、玻璃特效。
- **UI chrome 文案**（`CHROME_TEXT` 54 键）：界面文字不是数据输出，不进 SDK。
- **FireCrawl 只留示例位**：内网地址不写进 SDK，各产品经 `getWarningBody(alert, { firecrawl })` 自填；NMC 正文依赖第三方 reader（jina 匿名 20 次/分钟），可用性不保证。
- **未覆盖的 Open-Meteo 接口**：elevation、marine、ensemble 等（forecast/air-quality/geocoding 之外按需再加）。
- **语言源头**：`wmo-codes.json` 仍是 20 语言源文件（zh-tw 在生成时派生进 SDK），改描述先改 `js/api.js` 再跑抽取脚本。
