# data-raw/ —— 天气数据目录

本仓库天气应用的数据源与抽取出的参考表。
**生成的文件不要手改** —— 改应用源码后重新跑抽取脚本。

## 重新生成

```bash
node data-raw/scripts/extract-weather-data.js
# 读取 js/{i18n,api}.js + weather-window.js + vendor/transverter.js，生成下面的 JSON/MD
```

## 文件说明

| 文件 | 来源 | 内容 |
|---|---|---|
| `languages.json` / `languages.md` | `js/i18n.js` LANGUAGES | 21 种语言：code/name/native/en/flag（含运行时派生的 zh-tw） |
| `wmo-codes.json` / `wmo-codes.md` | `js/api.js` weatherCodeMap | 28 个 WMO 天气代码：日夜两套 Meteocons 图标 + 20 语言描述（MD 表格只列中英；zh-tw 运行时派生，不在文件里） |
| `weekdays.json` | `i18n.js` weekDaysMap | 21 语言星期表（含运行时派生的 zh-tw） |
| `chrome-strings.json` | `i18n.js` CHROME_TEXT | 41 个界面文案 × 21 语言（设置项、九宫格标签、壁纸/玻璃名、提示语；zh-tw 运行时派生） |
| `background-gradients.json` | `api.js` backgroundMap | 每个 WMO 代码的日夜渐变背景（主卡片 + 随天气玻璃模式用） |
| `temp-color-scale.json` | `weather-window.js` TEMP_STOPS | 11 档摄氏度→颜色映射（10 天温度条用） |
| `precip-levels.json` | `weather-window.js` 水滴规则 | 降水概率阈值 → 0~3 级水滴（30/60/90） |
| `wallpapers.json` | `desktop.js` + `data/wallpapers/` | 14 张照片、4 款渐变、5 组昼夜自动、`time` 模式时段映射 |
| `glass-options.json` | 设置项 | 玻璃特效选项（`dark`/`light`/`weather`） |
| `city-overrides.json` / `city-overrides.md` | 手工维护（详见同名 md） | 地名纠错字典：别名→固化地点置顶、fix 修 API 错误字段；改后跑抽取脚本生成 `js/city-overrides.js` |
| `chinese-convert.json` | `js/vendor/transverter.js`（mumuy/chinese-transverter，MIT），抽取脚本第 8 节生成 | 简繁转换数据：2588 组单字映射 `chars`、固定词 `words`、台湾惯用词 `twIdioms`（专名禁用，见 TECHNICAL §4）、单向繁→简 `t2sExtra` |
| `airports.json` | OurAirports（Public Domain，每日更新），`scripts/fetch-geo-data.js` 生成 | 4008 个有 IATA 码+定期航班的机场 `[iata,name,municipality,iso,lat,lon]`；运行时由同脚本生成 `data/airports.db.js`（`<script>` 懒加载，file:// 可用），只管定位不管翻译 |
| `admin-divisions_zh-cn.json` | slightlee/regions-data（MIT，国家地名信息库），同脚本生成 | 中国省/市/区县三级 3212 行 `[code,name,parent,level]`；运行时由同脚本生成 `data/admin-divisions_zh-cn.db.js`（`<script>` 懒加载，file:// 可用），只做查询扩展与 admin2 纠错，不存坐标不做翻译 |
| `open-meteo-api.md` | 手写 | 预报/地理编码/IP 三个接口的参数字段、搜索扩展与合并策略、图标 CDN |
| `storage-keys.md` | 手写 | 10 个 `weatherMac_*` 本地存储键、数据结构、默认值 |
| `wmo-code.csv` | 旧文件 | 老版 WMO 参考（已被 `wmo-codes.json` 取代） |
| `weather_gradient_config.json` | 旧文件 | 老版渐变参考（已被 `background-gradients.json` 取代） |
| `weather_gradient_settings.html` | 旧文件 | 渐变预览页（仅参考） |

## 给谁用

- 应用本体直接读打包好的 `js/i18n.js` + `js/api.js`（内置，可离线）。
- 以后做新东西（小组件、其他端）直接复用这些 JSON，别再手抄数据。

## 天气查询与显示全流程

### 1. 启动初始化

```
载入脚本（i18n → api → titlebar → desktop → weather-window）
  → loadState() 读 localStorage（城市列表/当前城市/单位/语言/主题/壁纸/玻璃/时钟制式/刷新间隔）
  → renderCityList() 画左侧城市列表（定位城市挂「定位」徽标，不可删）
  → bootstrapLocation()：
      无定位标记 → 调定位链（ipwho.is → ipapi.co → ipinfo.io → ip-api） → 用返回城市名调地理编码 → 置顶为定位城市并设为当前
      定位失败 → 列表为空时回退北京
      已有定位标记 → 跳过
  → refreshActive() 拉取并渲染（见第 3 节）
  → 标题栏/选择器/时钟按当前语言渲染，壁纸+主题+玻璃按存储恢复
```

### 2. 城市搜索（300ms 防抖，最少 2 字）

```
输入 → 语言链 [界面语言, 输入语系识别语言]
      查询扩展：短中文查询追加 [原文, 原文+市, 原文+省]
  → 调 geocoding-api.open-meteo.com/v1/search（count=5）
  → 按地点 id 合并去重，优先保留界面语言版本，按 population 倒序
  → 下拉显示「名 · 市/州 · 省 · 国家」（层级完整，同名可辨）
  → 无结果显示本地化空态；异常显示本地化提示
  → 点击结果 → addCity()（去重）→ 存 localStorage → 切为当前 → refreshActive()
```

为什么搜“大理”以前只出四川：GeoNames 短中文查询匹配不到知名地点，必须带“市”字缀才能命中云南大理；“云南省”在该索引里不存在，属于数据源缺口。

### 3. 天气拉取与渲染（refreshActive）

```
取当前城市经纬度 → 调 api.open-meteo.com/v1/forecast
  参数见 open-meteo-api.md（current 8 字段 + hourly 4 字段 + daily 7 字段，单位跟随设置）
  → 存 state.cache（失败时用上次缓存重渲染 + toast，不白屏）
  → 渲染：
      Hero：城市名 / 大温度 / 天气描述（WMO 代码→20 语言）/ 高低温，背景按天气+昼夜渐变
      桌面卡片：城市 / 温度 / 描述 / 高低温 / 天气图标 / 定位箭头（定位城市才显示）
      逐小时：未来 24 格（时间/图标/温度/降水概率，12/24 小时制跟随设置）
      逐日：星期 / 图标 / 低温-温度条-高温（11 档色阶，°F 先转 °C 映射）/ 水滴降水等级
      九宫格：体感 / 湿度 / 风速 / 降水 / UV / 日出日落 / 能见度 / 气压 / AQI（占位）
      玻璃模式为随天气时，桌面卡片背景同步换成当前天气渐变
```

### 4. 设置变更与定时任务

```
设置弹窗 change 事件 → 写 localStorage → applyChromeLang() 全界面重绘文案
  → 时钟重绘 → 重建自动刷新计时器 → refreshActive() 立刻刷一次
壁纸/玻璃选择器：点击即生效 + 持久化（不走 change 事件）
定时器：时钟 30s；壁纸 time/auto 模式 60s 重算；自动刷新按分钟数调 refreshActive()
```

### 5. 异常路径一览

| 场景 | 处理 |
|---|---|
| 预报接口失败 | toast 本地化提示 + 用缓存旧数据重渲染 |
| 地理编码失败/无结果 | 本地化空态或提示，不清空旧列表 |
| IP 定位失败（含 HTTPS 下 HTTP 被拦） | 回退北京（可删）；已有城市时不强制覆盖 |
| 天气图标 CDN 失败 | `onerror` 换内联 SVG 云兜底 |
| localStorage 数据损坏 | try/catch 回退空列表 + 默认值 |
| 未知壁纸 id | 回退 `sky`（后改为 `tahoe-auto`，见 storage-keys.md 默认值） |

