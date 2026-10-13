(function () {
  'use strict';
  const METEOCONS_CDN = 'https://unpkg.com/@meteocons/svg@latest/fill';

const weatherCodeMap = {
    0: { desc: { zh: '晴', en: 'Clear', es: 'Despejado', fr: 'Dégagé', de: 'Klar', ja: '晴れ', ko: '맑음', pt: 'Limpo', ru: 'Ясно', ar: 'صافي', it: 'Sereno', nl: 'Helder', pl: 'Bezchmurne', th: 'แจ่มใส', vi: 'Trời quang', tr: 'Açık', sv: 'Klart', da: 'Klart', fi: 'Selkeä', uk: 'Ясно' }, icon: 'clear-day', iconNight: 'clear-night' },
    1: { desc: { zh: '晴间多云', en: 'Mainly clear', es: 'Mayormente despejado', fr: 'Principalement dégagé', de: 'Überwiegend klar', ja: '概ね晴れ', ko: '대체로 맑음', pt: 'Principalmente limpo', ru: 'Преимущественно ясно', ar: 'صافيmostly', it: 'Principalmente sereno', nl: 'Overwegend helder', pl: 'Głównie bezchmurne', th: 'ส่วนใหญ่แจ่มใส', vi: 'Phần lớn quang đãng', tr: 'Ağırlıklı olarak açık', sv: 'Övervägande klart', da: 'Overvejende klart', fi: 'Enimmäkseen selkeä', uk: 'Переважно ясно' }, icon: 'partly-cloudy-day', iconNight: 'partly-cloudy-night' },
    2: { desc: { zh: '多云', en: 'Partly cloudy', es: 'Parcialmente nublado', fr: 'Partiellement nuageux', de: 'Teilweise bewölkt', ja: '曇り', ko: '부분적으로 흐림', pt: 'Parcialmente nublado', ru: 'Переменная облачность', ar: 'غائم جزئياً', it: 'Parzialmente nuvoloso', nl: 'Deels bewolkt', pl: 'Częściowe zachmurzenie', th: 'มีเมฆบางส่วน', vi: 'Có mây rải rác', tr: 'Kısmen bulutlu', sv: 'Delvis molnigt', da: 'Delvist skyet', fi: 'Osittain pilvinen', uk: 'Частково хмарно' }, icon: 'partly-cloudy-day', iconNight: 'partly-cloudy-night' },
    3: { desc: { zh: '阴天', en: 'Overcast', es: 'Nublado', fr: 'Couvert', de: 'Bewölkt', ja: '曇天', ko: '흐림', pt: 'Nublado', ru: 'Пасмурно', ar: 'غائم', it: 'Coperto', nl: 'Bewolkt', pl: 'Zachmurzenie', th: 'มีเมฆมาก', vi: 'Nhiều mây', tr: 'Bulutlu', sv: 'Molnigt', da: 'Skyet', fi: 'Pilvinen', uk: 'Хмарно' }, icon: 'overcast', iconNight: 'overcast' },
    45: { desc: { zh: '雾', en: 'Fog', es: 'Niebla', fr: 'Brouillard', de: 'Nebel', ja: '霧', ko: '안개', pt: 'Nevoeiro', ru: 'Туман', ar: 'ضباب', it: 'Nebbia', nl: 'Mist', pl: 'Mgła', th: 'หมอก', vi: 'Sương mù', tr: 'Sis', sv: 'Dimma', da: 'Tåge', fi: 'Sumu', uk: 'Туман' }, icon: 'fog-day', iconNight: 'fog-night' },
    48: { desc: { zh: '雾凇', en: 'Rime fog', es: 'Niebla escarchada', fr: 'Brouillard givrant', de: 'Rauhnebel', ja: '着氷性霧', ko: '상고대', pt: 'Neblina geada', ru: 'Изморозь', ar: 'ضباب صقيع', it: 'Nebbia ghiacciata', nl: 'Rijpnevel', pl: 'Gołoledź', th: 'น้ำค้างแข็ง', vi: 'Sương giá', tr: 'Küf sis', sv: 'Rimdimma', da: 'Rimtåge', fi: 'Härmäsumu', uk: 'Паморозь' }, icon: 'fog-day', iconNight: 'fog-night' },
    51: { desc: { zh: '小毛毛雨', en: 'Light drizzle', es: 'Llovizna ligera', fr: 'Bruine légère', de: 'Leichter Nieselregen', ja: '小雨', ko: '가벼운 이슬비', pt: 'Chuvisco leve', ru: 'Лёгкая морось', ar: 'رذاذ خفيف', it: 'Pioggerella leggera', nl: 'Lichte motregen', pl: 'Lekka mżawka', th: 'ฝนปรอยเบาๆ', vi: 'Mưa phùn nhẹ', tr: 'Hafif çiseleme', sv: 'Lätt duggregn', da: 'Let støvregn', fi: 'Kevyt tihkusade', uk: 'Легка мряка' }, icon: 'drizzle', iconNight: 'drizzle' },
    53: { desc: { zh: '毛毛雨', en: 'Drizzle', es: 'Llovizna', fr: 'Bruine', de: 'Nieselregen', ja: '雨', ko: '이슬비', pt: 'Chuvisco', ru: 'Морось', ar: 'رذاذ', it: 'Pioggerella', nl: 'Motregen', pl: 'Mżawka', th: 'ฝนปรอย', vi: 'Mưa phùn', tr: 'Çiseleme', sv: 'Duggregn', da: 'Støvregn', fi: 'Tihkusade', uk: 'Мряка' }, icon: 'drizzle', iconNight: 'drizzle' },
    55: { desc: { zh: '大毛毛雨', en: 'Dense drizzle', es: 'Llovizna densa', fr: 'Bruine dense', de: 'Dichter Nieselregen', ja: 'やや強い雨', ko: '굵은 이슬비', pt: 'Chuvisco denso', ru: 'Плотная морось', ar: 'رذاذ كثيف', it: 'Pioggerella intensa', nl: 'Dichte motregen', pl: 'Gęsta mżawka', th: 'ฝนปรอยหนัก', vi: 'Mưa phùn đậm đặc', tr: 'Yoğun çiseleme', sv: 'Tätt duggregn', da: 'Tæt støvregn', fi: 'Tiheä tihkusade', uk: 'Густа мряка' }, icon: 'drizzle', iconNight: 'drizzle' },
    56: { desc: { zh: '冻毛毛雨', en: 'Freezing drizzle', es: 'Llovizna helada', fr: 'Bruine verglaçante', de: 'Gefrierender Nieselregen', ja: '着氷性雨', ko: '동결 이슬비', pt: 'Chuvisco gelado', ru: 'Ледяная морось', ar: 'رذاذ متجمد', it: 'Pioggerella gelata', nl: 'Vriesmotregen', pl: 'Marznąca mżawka', th: 'ฝนน้ำค้างแข็ง', vi: 'Mưa phùn đóng băng', tr: 'Dondurucu çiseleme', sv: 'Frusen duggregn', da: 'Frysende støvregn', fi: 'Jäätävä tihkusade', uk: 'Крижана мряка' }, icon: 'drizzle', iconNight: 'drizzle' },
    57: { desc: { zh: '强冻毛毛雨', en: 'Dense freezing drizzle', es: 'Llovizna helada densa', fr: 'Bruine verglaçante dense', de: 'Dichter gefrierender Nieselregen', ja: '強い着氷性雨', ko: '강한 동결 이슬비', pt: 'Chuvisco gelado denso', ru: 'Плотная ледяная морось', ar: 'رذاذ متجمد كثيف', it: 'Pioggerella gelata intensa', nl: 'Dichte vriesmotregen', pl: 'Gęsta marznąca mżawka', th: 'ฝนน้ำค้างแข็งหนัก', vi: 'Mưa phùn đóng băng đậm đặc', tr: 'Yoğun dondurucu çiseleme', sv: 'Tätt frusen duggregn', da: 'Tæt frysende støvregn', fi: 'Tiheä jäätävä tihkusade', uk: 'Густа крижана мряка' }, icon: 'drizzle', iconNight: 'drizzle' },
    61: { desc: { zh: '小雨', en: 'Slight rain', es: 'Lluvia ligera', fr: 'Pluie légère', de: 'Leichter Regen', ja: '小雨', ko: '가벼운 비', pt: 'Chuva leve', ru: 'Небольшой дождь', ar: 'مطر خفيف', it: 'Pioggia leggera', nl: 'Lichte regen', pl: 'Lekki deszcz', th: 'ฝนเบาๆ', vi: 'Mưa nhỏ', tr: 'Hafif yağmur', sv: 'Lätt regn', da: 'Let regn', fi: 'Kevyt sade', uk: 'Невеликий дощ' }, icon: 'rain', iconNight: 'rain' },
    63: { desc: { zh: '中雨', en: 'Moderate rain', es: 'Lluvia moderada', fr: 'Pluie modérée', de: 'Mäßiger Regen', ja: '雨', ko: '보통 비', pt: 'Chuva moderada', ru: 'Умеренный дождь', ar: 'مطر متوسط', it: 'Pioggia moderata', nl: 'Matige regen', pl: 'Umiarkowany deszcz', th: 'ฝนปานกลาง', vi: 'Mưa vừa', tr: 'Orta yağmur', sv: 'Måttligt regn', da: 'Moderat regn', fi: 'Kohtalainen sade', uk: 'Помірний дощ' }, icon: 'rain', iconNight: 'rain' },
    65: { desc: { zh: '大雨', en: 'Heavy rain', es: 'Lluvia intensa', fr: 'Pluie forte', de: 'Starker Regen', ja: '大雨', ko: '강한 비', pt: 'Chuva forte', ru: 'Сильный дождь', ar: 'مطر شديد', it: 'Pioggia intensa', nl: 'Zware regen', pl: 'Silny deszcz', th: 'ฝนหนัก', vi: 'Mưa to', tr: 'Kuvvetli yağmur', sv: 'Tungt regn', da: 'Kraftig regn', fi: 'Voimakas sade', uk: 'Сильний дощ' }, icon: 'rain', iconNight: 'rain' },
    66: { desc: { zh: '冻雨', en: 'Freezing rain', es: 'Lluvia helada', fr: 'Pluie verglaçante', de: 'Gefrierender Regen', ja: '着氷性雨', ko: '동결 비', pt: 'Chuva gelada', ru: 'Ледяной дождь', ar: 'مطر متجمد', it: 'Pioggia gelata', nl: 'Vriesregen', pl: 'Marznący deszcz', th: 'ฝนน้ำค้างแข็ง', vi: 'Mưa đóng băng', tr: 'Dondurucu yağmur', sv: 'Frusen regn', da: 'Frysende regn', fi: 'Jäätävä sade', uk: 'Крижаний дощ' }, icon: 'sleet', iconNight: 'sleet' },
    67: { desc: { zh: '强冻雨', en: 'Heavy freezing rain', es: 'Lluvia helada intensa', fr: 'Pluie verglaçante forte', de: 'Starker gefrierender Regen', ja: '強い着氷性雨', ko: '강한 동결 비', pt: 'Chuva gelada forte', ru: 'Сильный ледяной дождь', ar: 'مطر متجمد شديد', it: 'Pioggia gelata intensa', nl: 'Zware vriesregen', pl: 'Silny marznący deszcz', th: 'ฝนน้ำค้างแข็งหนัก', vi: 'Mưa đóng băng to', tr: 'Kuvvetli dondurucu yağmur', sv: 'Tungt frusen regn', da: 'Kraftig frysende regn', fi: 'Voimakas jäätävä sade', uk: 'Сильний крижаний дощ' }, icon: 'sleet', iconNight: 'sleet' },
    71: { desc: { zh: '小雪', en: 'Slight snow', es: 'Nieve ligera', fr: 'Neige légère', de: 'Leichter Schneefall', ja: '小雪', ko: '가벼운 눈', pt: 'Neve leve', ru: 'Небольшой снег', ar: 'ثلج خفيف', it: 'Neve leggera', nl: 'Lichte sneeuw', pl: 'Lekki śnieg', th: 'หิมะเบาๆ', vi: 'Tuyết nhỏ', tr: 'Hafif kar', sv: 'Lätt snö', da: 'Let sne', fi: 'Kevyt lumi', uk: 'Невеликий сніг' }, icon: 'snow', iconNight: 'snow' },
    73: { desc: { zh: '中雪', en: 'Moderate snow', es: 'Nieve moderada', fr: 'Neige modérée', de: 'Mäßiger Schneefall', ja: '雪', ko: '보통 눈', pt: 'Neve moderada', ru: 'Умеренный снег', ar: 'ثلج متوسط', it: 'Neve moderata', nl: 'Matige sneeuw', pl: 'Umiarkowany śnieg', th: 'หิมะปานกลาง', vi: 'Tuyết vừa', tr: 'Orta kar', sv: 'Måttlig snö', da: 'Moderat sne', fi: 'Kohtalainen lumi', uk: 'Помірний сніг' }, icon: 'snow', iconNight: 'snow' },
    75: { desc: { zh: '大雪', en: 'Heavy snow', es: 'Nieve intensa', fr: 'Neige forte', de: 'Starker Schneefall', ja: '大雪', ko: '강한 눈', pt: 'Neve forte', ru: 'Сильный снег', ar: 'ثلج شديد', it: 'Neve intensa', nl: 'Zware sneeuw', pl: 'Silny śnieg', th: 'หิมะหนัก', vi: 'Tuyết to', tr: 'Kuvvetli kar', sv: 'Tungt snö', da: 'Kraftig sne', fi: 'Voimakas lumi', uk: 'Сильний сніг' }, icon: 'snow', iconNight: 'snow' },
    77: { desc: { zh: '雪粒', en: 'Snow grains', es: 'Granos de nieve', fr: 'Grains de neige', de: 'Schneekörner', ja: '霰', ko: '진눈깨비', pt: 'Flocos de neve', ru: 'Снежные зёрна', ar: 'حبيبات ثلج', it: 'Grani di neve', nl: 'Sneeuwkorrels', pl: 'Ziarna śniegu', th: 'เม็ดหิมะ', vi: 'Hạt tuyết', tr: 'Kar taneleri', sv: 'Snöflingor', da: 'Snefnug', fi: 'Lumijyvä', uk: 'Сніжинки' }, icon: 'snow', iconNight: 'snow' },
    80: { desc: { zh: '小阵雨', en: 'Slight rain showers', es: 'Chubascos ligeros', fr: 'Averses légères', de: 'Leichte Regenschauer', ja: 'にわか雨', ko: '가벼운 소나기', pt: 'Pancadas de chuva leves', ru: 'Небольшой ливень', ar: 'زخات مطر خفيفة', it: 'Piogge leggere', nl: 'Lichte buien', pl: 'Lekkie ulewy', th: 'ฝนตกเบาๆ เป็นครั้งคราว', vi: 'Mưa rào nhỏ', tr: 'Hafif sağanak', sv: 'Lätta regnskurar', da: 'Let regnbyge', fi: 'Kevyt sadekuuro', uk: 'Невеликі зливи' }, icon: 'rain', iconNight: 'rain' },
    81: { desc: { zh: '中阵雨', en: 'Moderate rain showers', es: 'Chubascos moderados', fr: 'Averses modérées', de: 'Mäßige Regenschauer', ja: 'にわか雨', ko: '보통 소나기', pt: 'Pancadas de chuva moderadas', ru: 'Умеренный ливень', ar: 'زخات مطر متوسطة', it: 'Piogge moderate', nl: 'Matige buien', pl: 'Umiarkowane ulewy', th: 'ฝนตกปานกลางเป็นครั้งคราว', vi: 'Mưa rào vừa', tr: 'Orta sağanak', sv: 'Måttliga regnskurar', da: 'Moderate regnbyger', fi: 'Kohtalainen sadekuuro', uk: 'Помірні зливи' }, icon: 'rain', iconNight: 'rain' },
    82: { desc: { zh: '大阵雨', en: 'Violent rain showers', es: 'Chubascos violentos', fr: 'Averses violentes', de: 'Starke Regenschauer', ja: '激しいにわか雨', ko: '강한 소나기', pt: 'Pancadas de chuva violentas', ru: 'Сильный ливень', ar: 'زخات مطر عنيفة', it: 'Piogge violente', nl: 'Zware buien', pl: 'Silne ulewy', th: 'ฝนตกหนักเป็นครั้งคราว', vi: 'Mưa rào to', tr: 'Şiddetli sağanak', sv: 'Häftiga regnskurar', da: 'Kraftige regnbyger', fi: 'Voimakas sadekuuro', uk: 'Сильні зливи' }, icon: 'rain', iconNight: 'rain' },
    85: { desc: { zh: '小阵雪', en: 'Slight snow showers', es: 'Chubascos de nieve ligeros', fr: 'Averses de neige légères', de: 'Leichte Schneeschauer', ja: 'にわか雪', ko: '가벼운 소나기 눈', pt: 'Pancadas de neve leves', ru: 'Небольшой снежный ливень', ar: 'زخات ثلج خفيفة', it: 'Neve leggera', nl: 'Lichte sneeuwbuien', pl: 'Lekkie śnieżne ulewy', th: 'หิมะตกเบาๆ เป็นครั้งคราว', vi: 'Tuyết rơi nhỏ', tr: 'Hafif kar sağanağı', sv: 'Lätta snöskurar', da: 'Let snebyge', fi: 'Kevyt lumikuuro', uk: 'Невеликі снігові зливи' }, icon: 'snow', iconNight: 'snow' },
    86: { desc: { zh: '大阵雪', en: 'Heavy snow showers', es: 'Chubascos de nieve intensos', fr: 'Averses de neige fortes', de: 'Starke Schneeschauer', ja: '激しいにわか雪', ko: '강한 소나기 눈', pt: 'Pancadas de neve fortes', ru: 'Сильный снежный ливень', ar: 'زخات ثلج شديدة', it: 'Neve intensa', nl: 'Zware sneeuwbuien', pl: 'Silne śnieżne ulewy', th: 'หิมะตกหนักเป็นครั้งคราว', vi: 'Tuyết rơi to', tr: 'Kuvvetli kar sağanağı', sv: 'Tunga snöskurar', da: 'Kraftige snebyger', fi: 'Voimakas lumikuuro', uk: 'Сильні снігові зливи' }, icon: 'snow', iconNight: 'snow' },
    95: { desc: { zh: '雷阵雨', en: 'Thunderstorm', es: 'Tormenta', fr: 'Orage', de: 'Gewitter', ja: '雷雨', ko: '뇌우', pt: 'Tempestade', ru: 'Гроза', ar: 'عاصفة رعدية', it: 'Temporale', nl: 'Onweer', pl: 'Burza', th: 'ฝนฟ้าคะนอง', vi: 'Giông bão', tr: 'Fırtına', sv: 'Åska', da: 'Torden', fi: 'Ukkonen', uk: 'Гроза' }, icon: 'thunderstorms', iconNight: 'thunderstorms' },
    96: { desc: { zh: '雷阵雨伴冰雹', en: 'Thunderstorm with hail', es: 'Tormenta con granizo', fr: 'Orage avec grêle', de: 'Gewitter mit Hagel', ja: '雹を伴う雷雨', ko: '우박을 동반한 뇌우', pt: 'Tempestade com granizo', ru: 'Гроза с градом', ar: 'عاصفة رعدية مع برد', it: 'Temporale con grandine', nl: 'Onweer met hagel', pl: 'Burza z gradem', th: 'ฝนฟ้าคะนองลูกเห็บ', vi: 'Giông bão đá', tr: 'Dolu fırtınası', sv: 'Åska med hagel', da: 'Torden med hagl', fi: 'Ukkonen rakeineen', uk: 'Гроза з градом' }, icon: 'thunderstorms', iconNight: 'thunderstorms' },
    99: { desc: { zh: '强雷暴', en: 'Severe thunderstorm', es: 'Tormenta severa', fr: 'Orage violent', de: 'Schweres Gewitter', ja: '激しい雷雨', ko: '강한 뇌우', pt: 'Tempestade severa', ru: 'Сильная гроза', ar: 'عاصفة رعدية شديدة', it: 'Temporale severo', nl: 'Zwaar onweer', pl: 'Silna burza', th: 'พายุฝนฟ้าคะนองรุนแรง', vi: 'Giông bão mạnh', tr: 'Şiddetli fırtına', sv: 'Häftig åska', da: 'Kraftig torden', fi: 'Voimakas ukkonen', uk: 'Сильна гроза' }, icon: 'thunderstorms', iconNight: 'thunderstorms' }
};

const backgroundMap = {
    0: {
        day: 'linear-gradient(135deg, #2A82E4 0%, #3CA5ED 60%, #E68A4F 100%)',
        night: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)'
    },
    1: {
        day: 'linear-gradient(135deg, #3794E7 0%, #6DBEF2 60%, #F59C66 100%)',
        night: 'linear-gradient(135deg, #1A3C6E 0%, #2B579A 50%, #3A77C5 100%)'
    },
    2: {
        day: 'linear-gradient(135deg, #3794E7 0%, #6DBEF2 60%, #F59C66 100%)',
        night: 'linear-gradient(135deg, #1A3C6E 0%, #2B579A 50%, #3A77C5 100%)'
    },
    3: {
        day: 'linear-gradient(135deg, #757F9A 0%, #D7DDE8 100%)',
        night: 'linear-gradient(135deg, #232526 0%, #414345 100%)'
    },
    45: {
        day: 'linear-gradient(135deg, #7F8C8D 0%, #BDC3C7 100%)',
        night: 'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)'
    },
    48: {
        day: 'linear-gradient(135deg, #7F8C8D 0%, #BDC3C7 100%)',
        night: 'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)'
    },
    51: {
        day: 'linear-gradient(135deg, #517FA4 0%, #243949 100%)',
        night: 'linear-gradient(135deg, #09131C 0%, #152736 100%)'
    },
    53: {
        day: 'linear-gradient(135deg, #517FA4 0%, #243949 100%)',
        night: 'linear-gradient(135deg, #09131C 0%, #152736 100%)'
    },
    55: {
        day: 'linear-gradient(135deg, #517FA4 0%, #243949 100%)',
        night: 'linear-gradient(135deg, #09131C 0%, #152736 100%)'
    },
    56: {
        day: 'linear-gradient(135deg, #6c7b95 0%, #a2b9bc 100%)',
        night: 'linear-gradient(135deg, #1C222C 0%, #2D3D4F 100%)'
    },
    57: {
        day: 'linear-gradient(135deg, #6c7b95 0%, #a2b9bc 100%)',
        night: 'linear-gradient(135deg, #1C222C 0%, #2D3D4F 100%)'
    },
    61: {
        day: 'linear-gradient(135deg, #517FA4 0%, #243949 100%)',
        night: 'linear-gradient(135deg, #09131C 0%, #152736 100%)'
    },
    63: {
        day: 'linear-gradient(135deg, #517FA4 0%, #243949 100%)',
        night: 'linear-gradient(135deg, #09131C 0%, #152736 100%)'
    },
    65: {
        day: 'linear-gradient(135deg, #517FA4 0%, #243949 100%)',
        night: 'linear-gradient(135deg, #09131C 0%, #152736 100%)'
    },
    66: {
        day: 'linear-gradient(135deg, #6c7b95 0%, #a2b9bc 100%)',
        night: 'linear-gradient(135deg, #1C222C 0%, #2D3D4F 100%)'
    },
    67: {
        day: 'linear-gradient(135deg, #6c7b95 0%, #a2b9bc 100%)',
        night: 'linear-gradient(135deg, #1C222C 0%, #2D3D4F 100%)'
    },
    71: {
        day: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)',
        night: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)'
    },
    73: {
        day: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)',
        night: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)'
    },
    75: {
        day: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)',
        night: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)'
    },
    77: {
        day: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)',
        night: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)'
    },
    80: {
        day: 'linear-gradient(135deg, #517FA4 0%, #243949 100%)',
        night: 'linear-gradient(135deg, #09131C 0%, #152736 100%)'
    },
    81: {
        day: 'linear-gradient(135deg, #517FA4 0%, #243949 100%)',
        night: 'linear-gradient(135deg, #09131C 0%, #152736 100%)'
    },
    82: {
        day: 'linear-gradient(135deg, #517FA4 0%, #243949 100%)',
        night: 'linear-gradient(135deg, #09131C 0%, #152736 100%)'
    },
    85: {
        day: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)',
        night: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)'
    },
    86: {
        day: 'linear-gradient(135deg, #E0EAFC 0%, #CFDEF3 100%)',
        night: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)'
    },
    95: {
        day: 'linear-gradient(135deg, #141E30 0%, #243B55 100%)',
        night: 'linear-gradient(135deg, #000000 0%, #0F2027 100%)'
    },
    96: {
        day: 'linear-gradient(135deg, #141E30 0%, #243B55 100%)',
        night: 'linear-gradient(135deg, #000000 0%, #0F2027 100%)'
    },
    99: {
        day: 'linear-gradient(135deg, #141E30 0%, #243B55 100%)',
        night: 'linear-gradient(135deg, #000000 0%, #0F2027 100%)'
    }
};

  // Traditional-Chinese helpers (via i18n exports; identity fallback keeps
  // everything working when the vendor script is absent).
  function tw(s, idioms = true) {
    try {
      const f = window.WeatherMacI18n && window.WeatherMacI18n.toTraditional;
      return f ? f(s, idioms) : String(s);
    } catch { return String(s); }
  }
  function ts(s) {
    try {
      const f = window.WeatherMacI18n && window.WeatherMacI18n.toSimplified;
      return f ? f(s) : String(s);
    } catch { return String(s); }
  }
  // NOTE: adapted from weather-web getWeatherInfo: takes explicit lang param
  // (weather-web reads global state.language; this layer is stateless).
  function getWeatherInfo(code, isDay, lang) {
    const weather = weatherCodeMap[code] || weatherCodeMap[0];
    const icon = isDay ? weather.icon : (weather.iconNight || weather.icon);
    if (lang === 'zh-tw' && !weather.desc['zh-tw'] && weather.desc.zh) weather.desc['zh-tw'] = tw(weather.desc.zh);
    const desc = (lang && weather.desc[lang]) || weather.desc.en || weather.desc.zh;
    return { desc, icon };
  }

function getBackgroundGradient(code, isDay) {
    const timeKey = isDay ? 'day' : 'night';
    
    // 直接匹配
    if (backgroundMap[code]) {
        return backgroundMap[code][timeKey];
    }
    
    // 范围匹配
    let targetCode = 0;
    if (code >= 1 && code <= 2) targetCode = 1;
    else if (code === 3) targetCode = 3;
    else if (code === 45 || code === 48) targetCode = 45;
    else if ((code >= 51 && code <= 55) || (code >= 80 && code <= 82)) targetCode = 51;
    else if (code >= 61 && code <= 65) targetCode = 61;
    else if (code === 66 || code === 67) targetCode = 66;
    else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) targetCode = 71;
    else if (code >= 95 && code <= 99) targetCode = 95;
    
    return backgroundMap[targetCode]?.[timeKey] || backgroundMap[0][timeKey];
}
  function getWeatherIconUrl(iconName) { return `${METEOCONS_CDN}/${iconName}.svg`; }
  const PLACE_TEXT_KEYS = ['name', 'admin1', 'admin2', 'admin3', 'admin4', 'country'];
  // zh-tw: Traditional query text doesn't prefix-match Open-Meteo's index
  // (and zh_tw is unsupported), so search in Simplified and convert the
  // returned names back to Traditional for display.
  function traditionalizePlace(p) {
    const out = Object.assign({}, p);
    for (const k of PLACE_TEXT_KEYS) if (typeof out[k] === 'string' && out[k]) out[k] = tw(out[k], false);
    return out;
  }
  // zh source data mixes scripts (e.g. 华盛顿 with 猶他州), so normalize
  // output to Simplified for zh UI (Taiwan idioms map back, e.g. 豪雨->暴雨).
  function simplifyPlace(p) {
    const out = Object.assign({}, p);
    for (const k of PLACE_TEXT_KEYS) if (typeof out[k] === 'string' && out[k]) out[k] = ts(out[k]);
    return out;
  }
  // Dual-script recall lives here (not in the caller): the index matches
  // glyph-by-glyph ('东京' vs '東京' hit different entries), so for zh/zh-tw
  // try both the query and its converted form, then merge by place id.
  // Output is normalized to the UI language in all cases.
  async function searchCity(query, lang = 'zh') {
    const twMode = lang === 'zh-tw';
    const apiLang = twMode ? 'zh' : lang;
    let queries = [query];
    if ((twMode || lang === 'zh') && /[一-鿿]/.test(query)) {
      for (const v of [ts(query), tw(query, false)]) {
        if (v && v !== query && !queries.includes(v)) queries.push(v);
      }
    }
    const seen = new Set();
    const merged = [];
    for (const qq of queries) {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(qq)}&count=5&language=${encodeURIComponent(apiLang)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
      const data = await res.json();
      for (const r of data.results || []) {
        const key = r.id !== undefined ? 'id:' + r.id : `${r.latitude},${r.longitude}`;
        if (!seen.has(key)) { seen.add(key); merged.push(r); }
      }
    }
    if (twMode) return merged.map(traditionalizePlace);
    if (lang === 'zh') return merged.map(simplifyPlace);
    return merged;
  }
  async function getPlace(id, lang = 'zh') {
    const twMode = lang === 'zh-tw';
    const url = `https://geocoding-api.open-meteo.com/v1/get?id=${encodeURIComponent(id)}&language=${encodeURIComponent(twMode ? 'zh' : lang)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Get place failed: ${res.status}`);
    const data = await res.json();
    if (twMode) return traditionalizePlace(data);
    if (lang === 'zh') return simplifyPlace(data);
    return data;
  }
  async function fetchWeather(city, unit = 'celsius') {
    const tempUnit = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    const windUnit = unit === 'fahrenheit' ? 'mph' : 'kmh';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,precipitation,wind_speed_10m,pressure_msl&hourly=temperature_2m,weather_code,precipitation_probability,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=${encodeURIComponent(city.timezone || 'auto')}&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Forecast failed: ${res.status}`);
    return res.json();
  }
  async function fetchWithTimeout(url, ms = 5000, init) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, Object.assign({ signal: ctrl.signal }, init));
    } finally { clearTimeout(t); }
  }
  // IP geolocation provider chain (HTTPS first, HTTP last resort which browsers
  // block on HTTPS pages). Each step normalizes to the ip-api-like shape
  // {status, city, lat, lon, country, countryCode, timezone}; a provider that
  // fails (network, HTTP error, fail-status) yields to the next one.
  function normIpWho(d) {
    if (!d || d.success !== true) throw new Error(`IP lookup failed: ${(d && d.message) || 'unknown'}`);
    return { status: 'success', country: d.country || '', countryCode: d.country_code || '', city: d.city || '',
      lat: d.latitude, lon: d.longitude, timezone: (d.timezone && d.timezone.id) || '' };
  }
  function normIpApiCo(d) {
    if (!d || d.error) throw new Error(`IP lookup failed: ${(d && d.reason) || 'unknown'}`);
    return { status: 'success', country: d.country_name || '', countryCode: d.country_code || '', city: d.city || '',
      lat: d.latitude, lon: d.longitude, timezone: d.timezone || '' };
  }
  function normIpInfo(d) {
    if (!d || !d.city) throw new Error('IP lookup failed: no data');
    const [lat, lon] = String(d.loc || '').split(',').map(Number);
    return { status: 'success', country: '', countryCode: d.country || '', city: d.city || '',
      lat, lon, timezone: d.timezone || '' };
  }
  function normIpApi(d) {
    if (!d || d.status !== 'success') throw new Error(`IP lookup failed: ${(d && d.message) || 'unknown'}`);
    return d;
  }
  async function tryProviders(fns) {
    let lastErr = new Error('IP lookup failed: all providers unreachable');
    for (const fn of fns) {
      try { return await fn(); }
      catch (err) { lastErr = err; }
    }
    throw lastErr;
  }
  async function detectLocationByIP() {
    return tryProviders([
      async () => normIpWho(await (await fetchWithTimeout('https://ipwho.is/')).json()),
      async () => normIpApiCo(await (await fetchWithTimeout('https://ipapi.co/json/')).json()),
      async () => normIpInfo(await (await fetchWithTimeout('https://ipinfo.io/json')).json()),
      async () => normIpApi(await (await fetchWithTimeout('http://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon,timezone')).json())
    ]);
  }
  async function lookupIP(ip) {
    const q = encodeURIComponent(ip);
    return tryProviders([
      async () => normIpWho(await (await fetchWithTimeout(`https://ipwho.is/${q}`)).json()),
      async () => normIpApiCo(await (await fetchWithTimeout(`https://ipapi.co/${q}/json/`)).json()),
      async () => normIpInfo(await (await fetchWithTimeout(`https://ipinfo.io/${q}/json`)).json()),
      async () => normIpApi(await (await fetchWithTimeout(`http://ip-api.com/json/${q}?fields=status,message,country,countryCode,city,lat,lon,timezone,query`)).json())
    ]);
  }
  async function fetchAirQuality(city) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.latitude}&longitude=${city.longitude}&current=us_aqi,pm2_5,pm10&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Air quality failed: ${res.status}`);
    return res.json();
  }
  const RC_TEXT_KEYS = ['city', 'locality', 'principalSubdivision', 'countryName'];
  async function reverseGeocode(lat, lon, lang = 'en') {
    // bigdatacloud has no Traditional Chinese: request zh and normalize output.
    const apiLang = (lang === 'zh' || lang === 'zh-tw') ? 'zh' : lang;
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${encodeURIComponent(apiLang)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
    const data = await res.json();
    if (lang === 'zh-tw' || lang === 'zh') {
      for (const k of RC_TEXT_KEYS) {
        if (data && typeof data[k] === 'string' && data[k]) {
          data[k] = lang === 'zh-tw' ? tw(data[k], false) : ts(data[k]);
        }
      }
    }
    return data;
  }
  const NWS_SEVERITY = { Extreme: '红色', Severe: '橙色', Moderate: '黄色', Minor: '蓝色', Unknown: '蓝色' };
  function toLocalSlash(iso) {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return '';
    const d = new Date(t), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // Normalize an NWS alert feature into the shared warning shape
  // {kind, alertid, issuetime, title, url, publisher, signal, level,
  //  description, instruction}. English proper nouns stay untranslated
  // (same convention as CN publisher names); severity maps onto 蓝/黄/橙/红.
  function normalizeNWSAlert(f, city) {
    const p = (f && f.properties) || {};
    if (!p || p.status !== 'Actual' || p.messageType === 'Cancel') return null;
    return {
      kind: 'nws',
      alertid: p.id || p['@id'] || '',
      sentIso: p.sent || p.effective || '',
      issuetime: toLocalSlash(p.sent || p.effective),
      title: p.headline || p.event || '',
      url: `https://forecast.weather.gov/MapClick.php?lat=${city.latitude}&lon=${city.longitude}`,
      publisher: p.senderName || '',
      signal: p.event || '',
      level: NWS_SEVERITY[p.severity] || '蓝色',
      ends: p.ends || p.expires || '',
      description: (p.description || '').trim(),
      instruction: p.instruction && p.instruction !== 'None' ? p.instruction.trim() : '',
    };
  }
  let nwsCache = { time: 0, key: '', list: null };
  async function fetchUSAlerts(city) {
    const key = `${Number(city.latitude).toFixed(2)},${Number(city.longitude).toFixed(2)}`;
    if (nwsCache.list && nwsCache.key === key && Date.now() - nwsCache.time < 5 * 60 * 1000) return nwsCache.list;
    const res = await fetchWithTimeout(`https://api.weather.gov/alerts/active?point=${city.latitude},${city.longitude}`, 8000);
    if (!res.ok) throw new Error(`NWS alerts failed: ${res.status}`);
    const data = await res.json();
    const list = ((data || {}).features || []).map((f) => normalizeNWSAlert(f, city)).filter(Boolean);
    list.sort((a, b) => String(b.sentIso || '').localeCompare(String(a.sentIso || '')));
    nwsCache = { time: Date.now(), key, list };
    return list;
  }
  let alarmCache = { time: 0, list: null };
  async function fetchAlarms() {
    if (alarmCache.list && Date.now() - alarmCache.time < 10 * 60 * 1000) return alarmCache.list;
    const res = await fetchWithTimeout('https://www.nmc.cn/rest/findAlarm?pageNo=1&pageSize=500', 8000);
    if (!res.ok) throw new Error(`Alarms failed: ${res.status}`);
    const data = await res.json();
    const list = (((data || {}).data || {}).page || {}).list || [];
    alarmCache = { time: Date.now(), list };
    return list;
  }
  const alarmDetailCache = new Map();
  function parseAlarmMarkdown(md) {
    const lines = String(md || '').split('\n').map((l) => l.replace(/\*\*/g, '').trim()).filter(Boolean);
    let body = '';
    for (const l of lines) {
      if (l[0] === '[' || l[0] === '!') continue;
      if (l.includes('预警信号：') || l.includes('预警信号:')) { body = l; break; }
    }
    const guide = [];
    const gi = lines.findIndex((l) => l.includes('防御指南'));
    if (gi >= 0) {
      for (const l of lines.slice(gi + 1, gi + 10)) {
        if (l[0] === '[' || l[0] === '!' || l.includes('推荐服务') || l.includes('天气预报')) break;
        guide.push(l);
      }
    }
    return { body, guide };
  }
  // Alarm body text (NMC detail pages have no CORS headers and no JSON API).
  // Scraper chain: self-hosted FireCrawl first, Jina Reader as fallback
  // (~20 anonymous req/min). Only the newest alert is fetched; results
  // cached 30 min per alertid.
  async function scrapeViaFireCrawl(path) {
    const res = await fetchWithTimeout('https://crawl.iobit.qzz.io/v1/scrape', 15000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.nmc.cn' + path, formats: ['markdown'], onlyMainContent: true }),
    });
    if (!res.ok) throw new Error(`FireCrawl failed: ${res.status}`);
    const data = await res.json();
    const md = data && data.data && data.data.markdown;
    if (!md) throw new Error('FireCrawl failed: empty markdown');
    return md;
  }
  async function scrapeViaJina(path) {
    const res = await fetchWithTimeout('https://r.jina.ai/https://www.nmc.cn' + path, 10000);
    if (!res.ok) throw new Error(`Jina failed: ${res.status}`);
    return res.text();
  }
  async function fetchAlarmDetail(alert) {
    // NWS alerts already carry description/instruction: use directly.
    if (alert && alert.description) {
      return { body: alert.description, guide: alert.instruction ? [alert.instruction] : [] };
    }
    const id = alert && (alert.alertid || alert.url);
    if (!id || !alert.url) return null;
    const hit = alarmDetailCache.get(id);
    if (hit && Date.now() - hit.time < 30 * 60 * 1000) return hit.data;
    let md = null, lastErr = null;
    for (const fn of [() => scrapeViaFireCrawl(alert.url), () => scrapeViaJina(alert.url)]) {
      try { md = await fn(); break; }
      catch (err) { lastErr = err; }
    }
    if (md == null) throw lastErr || new Error('Alarm detail failed: all scrapers unreachable');
    const data = parseAlarmMarkdown(md);
    if (!data.body) return null;
    if (alarmDetailCache.size > 50) alarmDetailCache.delete(alarmDetailCache.keys().next().value);
    alarmDetailCache.set(id, { time: Date.now(), data });
    return data;
  }
  window.WeatherMacApi = { searchCity, getPlace, fetchWeather, detectLocationByIP, lookupIP, fetchAirQuality, reverseGeocode, fetchAlarms, fetchAlarmDetail, fetchUSAlerts, getWeatherInfo, getBackgroundGradient, getWeatherIconUrl };
})();
