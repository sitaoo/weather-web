// Extracts reusable weather data from app sources into weather-macos/data-raw/ JSON + MD tables.
// Run from repo root: node weather-macos/data-raw/scripts/extract-weather-data.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'weather-macos', 'data-raw');
const JS = path.join(ROOT, 'weather-macos/js');

function balanced(src, start) {
  // start = index of opening '{' or '['; returns [text, endIndex]
  const open = src[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, i = start, str = null;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (str) {
      if (ch === '\\') { i++; continue; }
      if (ch === str) str = null;
      continue;
    }
    if (ch === '"' || ch === "'") { str = ch; continue; }
    if (ch === open) depth++;
    if (ch === close) { depth--; if (!depth) return [src.slice(start, i + 1), i]; }
  }
  throw new Error('unbalanced from ' + start);
}
function grabConst(file, name) {
  const src = fs.readFileSync(path.join(JS, file), 'utf8');
  const key = 'const ' + name + ' =';
  const at = src.indexOf(key);
  if (at < 0) throw new Error('missing ' + name + ' in ' + file);
  let s = at + key.length;
  while (/\s/.test(src[s])) s++;
  const [text] = balanced(src, s);
  return eval('(' + text + ')');
}
function writeJSON(name, obj) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + '\n');
  console.log('wrote', name, Array.isArray(obj) ? obj.length + ' items' : Object.keys(obj).length + ' keys');
}

// 1+2. i18n structures via real module evaluation
global.window = {};
global.window.transverter = require(path.join(JS, 'vendor', 'transverter.js'));
eval(fs.readFileSync(path.join(JS, 'i18n.js'), 'utf8'));
const I18n = global.window.WeatherMacI18n;
writeJSON('languages.json', I18n.LANGUAGES);
writeJSON('weekdays.json', I18n.weekDaysMap);
writeJSON('chrome-strings.json', I18n.CHROME_TEXT);

// 3+4. WMO codes + background gradients (verbatim from api.js)
const wmo = grabConst('api.js', 'weatherCodeMap');
writeJSON('wmo-codes.json', wmo);
writeJSON('background-gradients.json', grabConst('api.js', 'backgroundMap'));

// 5. temp color scale + precip levels (verbatim from weather-window.js)
const stopsSrc = fs.readFileSync(path.join(JS, 'weather-window.js'), 'utf8');
const stopsAt = stopsSrc.indexOf('const TEMP_STOPS =') + 'const TEMP_STOPS ='.length;
const [stopsText] = balanced(stopsSrc, stopsSrc.indexOf('[', stopsAt));
writeJSON('temp-color-scale.json', { unit: 'celsius', stops: eval(stopsText) });
writeJSON('precip-levels.json', {
  unit: 'probability_percent',
  levels: [
    { max: 30, drops: 0 }, { max: 60, drops: 1 }, { max: 90, drops: 2 }, { max: 100, drops: 3 }
  ]
});

// 6. wallpaper catalog (mirrors desktop.js WALLPAPERS/auto mapping + data/wallpapers/ files)
const files = fs.readdirSync(path.join(ROOT, 'weather-macos', 'data', 'wallpapers')).filter((f) => f.endsWith('.jpg')).sort();
writeJSON('wallpapers.json', {
  dir: 'weather-macos/data/wallpapers',
  photos: files,
  gradients: ['sky', 'space', 'sunset', 'gray'],
  autos: {
    'tahoe-auto': { day: 'tahoe-day.jpg', night: 'tahoe-night.jpg', dayHours: [6, 18] },
    'sequoia-auto': { day: 'sequoia-day.jpg', night: 'sequoia-night.jpg', dayHours: [6, 18] },
    'sonoma-auto': { day: 'sonoma-day.jpg', night: 'sonoma-night.jpg', dayHours: [6, 18] },
    'ventura-auto': { day: 'ventura-day.jpg', night: 'ventura-night.jpg', dayHours: [6, 18] },
    'bigsur-auto': { slots: [[5, 8, 'bigsur-dawn.jpg'], [8, 11, 'bigsur-morning.jpg'], [11, 15, 'bigsur-day.jpg'], [15, 18, 'bigsur-afternoon.jpg'], [18, 21, 'bigsur-dusk.jpg'], [21, 5, 'bigsur-night.jpg']] }
  },
  timeMode: { '5-8': 'sonoma-day.jpg', '8-16': 'tahoe-day.jpg', '16-19': 'bigsur-day.jpg', '19-23': 'sonoma-night.jpg', '23-5': 'tahoe-night.jpg' }
});
writeJSON('glass-options.json', [
  { id: 'dark', default: false },
  { id: 'light', default: true },
  { id: 'weather', default: false }
]);

// 7. city name corrections -> weather-macos/js/city-overrides.js (page loads it directly)
const ov = JSON.parse(fs.readFileSync(path.join(OUT, 'city-overrides.json'), 'utf8'));
if (!ov.meta || ov.meta.version !== 1 || !Array.isArray(ov.entries)) throw new Error('bad city-overrides.json: meta.version/entries');
for (const e of ov.entries) {
  if (!e.key || !Array.isArray(e.aliases) || !e.place) throw new Error('bad override entry: ' + e.key);
  for (const k of ['name', 'latitude', 'longitude']) {
    if (e.place[k] === undefined) throw new Error('override ' + e.key + ' place missing ' + k);
  }
}
fs.writeFileSync(path.join(ROOT, 'weather-macos/js/city-overrides.js'),
  '// Generated from weather-macos/data-raw/city-overrides.json — do not hand-edit; re-run extractor.\n' +
  'window.WeatherMacOverrides = ' + JSON.stringify({ version: ov.meta.version, entries: ov.entries }, null, 2) + ';\n');
console.log('wrote city-overrides.js', ov.entries.length + ' entries');

// 8. Simplified/Traditional conversion tables from the vendored transverter
// (js/vendor/transverter.js, MIT). Parsed from source so data-raw mirrors the
// exact runtime mapping: per-char pairs, fixed words, Taiwan idioms, and the
// one-way Traditional->Simplified extras.
const tvSrc = fs.readFileSync(path.join(JS, 'vendor', 'transverter.js'), 'utf8');
function tvStrings(name) {
  // collects `var <name> = '...'` plus later `<name> += '...'` in order
  const out = [];
  const re = new RegExp('(?:var\\s+)?' + name + '\\s*(?:=|\\+=)\\s*\'([^\']*)\'', 'g');
  let m;
  while ((m = re.exec(tvSrc)) !== null) out.push(m[1]);
  if (!out.length) throw new Error('missing ' + name + ' in transverter.js');
  return out.join('');
}
function tvObject(name) {
  const key = 'var ' + name + ' =';
  const at = tvSrc.indexOf(key);
  if (at < 0) throw new Error('missing ' + name + ' in transverter.js');
  const [text] = balanced(tvSrc, tvSrc.indexOf('{', at));
  return eval('(' + text + ')');
}
const simpChars = tvStrings('simplified_chinese');
const tradChars = tvStrings('traditional_chinese');
if (simpChars.length !== tradChars.length) throw new Error('s2t char tables misaligned');
const s2tChars = {};
for (let i = 0; i < simpChars.length; i++) s2tChars[simpChars[i]] = tradChars[i];
writeJSON('chinese-convert.json', {
  source: 'weather-macos/js/vendor/transverter.js (mumuy/chinese-transverter, MIT)',
  note: 'chars: one-to-one Simplified->Traditional (index-aligned); words: fixed multi-char mappings both directions; twIdioms: Simplified->Taiwan usage (proper nouns should skip these); t2sExtra: one-way Traditional->Simplified singles',
  counts: { chars: Object.keys(s2tChars).length },
  chars: s2tChars,
  words: tvObject('words'),
  twIdioms: tvObject('zh_TW'),
  t2sExtra: tvObject('toSimplified'),
});
// 9. SDK embedded data: replace the SDK-DATA region in sdk/weather-api.js
// with the vendor text-converter factory plus WMO/weekday/AQI tables
// (zh-tw derived via transverter where the source lacks it).
const sdkPath = path.join(ROOT, 'weather-macos', 'sdk', 'weather-api.js');
let sdkSrc = fs.readFileSync(sdkPath, 'utf8');
const sdkBegin = '/* SDK-DATA-BEGIN: generated by data-raw/scripts/extract-weather-data.js — do not hand-edit */';
const sdkEnd = '/* SDK-DATA-END */';
const bi = sdkSrc.indexOf(sdkBegin), ei = sdkSrc.indexOf(sdkEnd);
if (bi < 0 || ei < 0 || ei < bi) throw new Error('SDK data markers missing');
const facMatch = tvSrc.match(/,\s*function\s*\(\)\s*\{/);
if (!facMatch) throw new Error('transverter factory not found');
const [facText] = balanced(tvSrc, facMatch.index + facMatch[0].length - 1);
const facSrc = 'function createTextConverter()' + facText;
const wmoSrc = JSON.parse(fs.readFileSync(path.join(OUT, 'wmo-codes.json'), 'utf8'));
for (const code of Object.keys(wmoSrc)) {
  const d = wmoSrc[code].desc;
  if (!d['zh-tw'] && d.zh) d['zh-tw'] = global.window.transverter({ type: 'traditional', str: d.zh, language: 'zh_TW' });
}
const wmoSlim = {};
for (const code of Object.keys(wmoSrc)) {
  wmoSlim[code] = { icon: wmoSrc[code].icon, night: wmoSrc[code].iconNight, desc: wmoSrc[code].desc };
}
const chromeSrc = JSON.parse(fs.readFileSync(path.join(OUT, 'chrome-strings.json'), 'utf8'));
const AQI_LEVELS = ['aqiGood', 'aqiModerate', 'aqiUsg', 'aqiUnhealthy', 'aqiVeryUnhealthy', 'aqiHazardous'];
const aqiTable = {};
for (const key of AQI_LEVELS) {
  aqiTable[key] = {};
  for (const lang of Object.keys(chromeSrc)) {
    if (chromeSrc[lang][key]) aqiTable[key][lang] = chromeSrc[lang][key];
  }
}
const weekdaySrc = JSON.parse(fs.readFileSync(path.join(OUT, 'weekdays.json'), 'utf8'));
const sdkData = '  ' + facSrc.replace(/\n/g, '\n  ') +
  '\n  const WMO_TABLE = ' + JSON.stringify(wmoSlim, null, 2).replace(/\n/g, '\n  ') + ';' +
  '\n  const WEEKDAY_TABLE = ' + JSON.stringify(weekdaySrc, null, 2).replace(/\n/g, '\n  ') + ';' +
  '\n  const AQI_TABLE = ' + JSON.stringify(aqiTable, null, 2).replace(/\n/g, '\n  ') + ';';
sdkSrc = sdkSrc.slice(0, bi + sdkBegin.length) + '\n' + sdkData + '\n  ' + sdkSrc.slice(ei);
fs.writeFileSync(sdkPath, sdkSrc);
console.log('wrote sdk/weather-api.js data region');

// ---- Markdown tables ----
function mdTable(headers, rows) {
  const esc = (v) => String(v).replace(/\|/g, '\\|');
  return '| ' + headers.join(' | ') + ' |\n|' + headers.map(() => '---').join('|') + '|\n' +
    rows.map((r) => '| ' + r.map(esc).join(' | ') + ' |').join('\n') + '\n';
}
fs.writeFileSync(path.join(OUT, 'languages.md'),
  '# Languages\n\n> Generated from `weather-macos/js/i18n.js` LANGUAGES. Do not hand-edit; re-run extractor.\n\n' +
  mdTable(['code', 'name', 'native', 'en', 'flag'], I18n.LANGUAGES.map((l) => [l.code, l.name, l.native, l.en, l.flag])));
const wmoCodes = Object.keys(wmo).map(Number).sort((a, b) => a - b);
fs.writeFileSync(path.join(OUT, 'wmo-codes.md'),
  '# WMO Weather Codes\n\n> Generated from `weather-macos/js/api.js` weatherCodeMap. Descriptions cover 20 languages in `wmo-codes.json`; table shows zh/en. Icons are Meteocons names (`https://unpkg.com/@meteocons/svg@latest/fill/{icon}.svg`).\n\n' +
  mdTable(['code', 'icon_day', 'icon_night', 'zh', 'en'], wmoCodes.map((c) => [c, wmo[c].icon, wmo[c].iconNight, wmo[c].desc.zh, wmo[c].desc.en])));
console.log('wrote languages.md, wmo-codes.md');
