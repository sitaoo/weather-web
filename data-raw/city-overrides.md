# 城市纠错字典（city-overrides.json）

open-meteo/GeoNames 不会修他们的数据（短中文查不到知名地点、行政区划错误、整市缺失），所以自己维护这份字典。源文件 `weather-macos/data-raw/city-overrides.json`，跑抽取脚本生成页面直接加载的 `weather-macos/js/city-overrides.js`：

```bash
node weather-macos/data-raw/scripts/extract-weather-data.js
```

## 字段说明

| 字段 | 作用 |
|---|---|
| `key` | 条目唯一标识（英文短横线） |
| `aliases` | 用户可能输入的写法；搜索框输入与之一字不差匹配时，直接把 `place` 置顶为首条结果 |
| `place` | 核实过的正确地点（`name/latitude/longitude/timezone/country/admin1/admin2`），**坐标以政府/维基公开值为准**，天气按此坐标拉取 |
| `fixIds` / `fixNames` | 命中 API 结果（按 id 或精确名称）后，用 `fields` 覆盖其显示字段；**只覆盖名/行政区等显示字段，永不改坐标** |
| `fields` | 要覆盖的字段键值 |
| `note` | 考证说明（为什么需要这条） |

## 生效位置

1. 搜索：别名命中 → 固化地点置顶；API 结果命中 fix → 显示已修正；与固化地点 0.05 度内的 API 重复点自动丢弃。
2. 入库：`addCity` 存之前先过一遍修正。
3. 列表：渲染城市名/副标题时用修正后的值（存量老数据也生效）。

## 加新条目流程

用户反馈地名错误 → 先调 API 确认是缺失还是错误 → 在 `city-overrides.json` 加 entry（坐标必须公开可查）→ 跑抽取脚本 → 搜一遍验证 → 提交。
