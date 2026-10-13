// Generated from weather-macos/data-raw/city-overrides.json — do not hand-edit; re-run extractor.
window.WeatherMacOverrides = {
  "version": 1,
  "entries": [
    {
      "key": "shangri-la",
      "aliases": [
        "香格里拉",
        "香格里拉县",
        "香格里拉市",
        "中甸",
        "中甸县"
      ],
      "place": {
        "name": "香格里拉市",
        "latitude": 27.826,
        "longitude": 99.707,
        "timezone": "Asia/Shanghai",
        "country": "中国",
        "admin1": "云南",
        "admin2": "迪庆藏族自治州"
      },
      "fixIds": [],
      "fixNames": [],
      "fields": {},
      "note": "原名中甸县，2001年更名香格里拉县，2014年撤县设市，州府驻建塘镇（27.83N,99.71E）。API 索引缺失该市（精确搜“香格里拉市”为空），且“中甸”点位行政区划错误，故直接固化正确地点置顶。"
    },
    {
      "key": "daocheng-yading",
      "aliases": [
        "稻城亚丁",
        "亚丁",
        "亚丁景区",
        "亚丁村"
      ],
      "place": {
        "name": "稻城亚丁",
        "latitude": 28.456,
        "longitude": 100.338,
        "timezone": "Asia/Shanghai",
        "country": "中国",
        "admin1": "四川",
        "admin2": "甘孜藏族自治州"
      },
      "fixIds": [],
      "fixNames": [],
      "fields": {},
      "note": "四川甘孜稻城县自然风景区（亚丁藏语意“向阳之地”，亚丁村属香格里拉镇）。精确搜“稻城亚丁”为空；搜“亚丁”首条是德格县的同名点（32.41N,99.03E），正确点（API id 10211775，28.456N,100.338E，经逆地理确认为稻城县）排第二。故固化正确点置顶，德格县同名点保留不动。未收“稻城”别名：稻城县城（金珠镇）与景区相距约70公里，天气不同，不做模糊归并。"
    }
  ]
};
