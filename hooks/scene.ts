// Blueprint sheet with a real-time clock (upper right) and the solar system as it is today (lower right).
// Time and planet positions are computed when the scene is built; the clock hands then run on CSS animations from that moment.

const CHALK = '#cfe0f5'
const GOLD = '#f2c14e'
const SUN_X = 340
const SUN_Y = 500
const CLOCK_X = 1470
const CLOCK_Y = 195
const CLOCK_R = 102

const DEEP_POOLS: readonly (readonly [number, number, number, number])[] = [
  [-40, -40, 720, 520],
  [1660, -60, 640, 460],
  [1700, 1080, 600, 480],
  [-80, 1080, 560, 420],
]

const round = (v: number): number => Math.round(v * 10) / 10
const hash = (seed: number): number => {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}
const rad = (d: number): number => (d * Math.PI) / 180

// JPL "Keplerian elements for 1800-2050": [a, e, I, L, varpi, Omega] at J2000 then their change per century.
type Elements = readonly number[]
type Planet = { name: string; orbit: number; size: number; color: string; el: Elements; rate: Elements }
const PLANETS: readonly Planet[] = [
  { name: 'Mercury', orbit: 34, size: 4, color: '#c9c2b8', el: [0.38709843, 0.20563661, 7.00559432, 252.25166724, 77.45771895, 48.33961819], rate: [0, 0.00002123, -0.00590158, 149472.67486623, 0.15940013, -0.12214182] },
  { name: 'Venus', orbit: 60, size: 6, color: '#f3d9a0', el: [0.72332102, 0.00676399, 3.39777545, 181.9797085, 131.76755713, 76.67261496], rate: [-0.00000026, -0.00005107, 0.00043494, 58517.8156026, 0.05679648, -0.27274174] },
  { name: 'Earth', orbit: 86, size: 6.5, color: '#7fc3ff', el: [1.00000018, 0.01673163, -0.00054346, 100.46691572, 102.93005885, -5.11260389], rate: [-0.00000003, -0.00003661, -0.01337178, 35999.37306329, 0.3179526, -0.24123856] },
  { name: 'Mars', orbit: 116, size: 5, color: '#ff9a76', el: [1.52371243, 0.09336511, 1.85181869, -4.56813164, -23.91744784, 49.71320984], rate: [0.00000097, 0.00009149, -0.00724757, 19140.29934243, 0.45223625, -0.26852431] },
  { name: 'Jupiter', orbit: 168, size: 12, color: '#f0c89a', el: [5.20248019, 0.0485359, 1.29861416, 34.33479152, 14.27495244, 100.29282654], rate: [-0.00002864, 0.00018026, -0.00322699, 3034.90371757, 0.18199196, 0.13024619] },
  { name: 'Saturn', orbit: 214, size: 9, color: '#ecd9a6', el: [9.54149883, 0.05550825, 2.49424102, 50.07571329, 92.86136063, 113.63998702], rate: [-0.00003065, -0.00032044, 0.00451969, 1222.11494724, 0.54179478, -0.25015002] },
  { name: 'Uranus', orbit: 252, size: 7.5, color: '#9de6e6', el: [19.18797948, 0.0468574, 0.77298127, 314.20276625, 172.43404441, 73.96250215], rate: [-0.00020455, -0.0000155, -0.00180155, 428.49512595, 0.09266985, 0.05739699] },
  { name: 'Neptune', orbit: 288, size: 7.5, color: '#7e9bff', el: [30.06952752, 0.00895439, 1.7700552, 304.22289287, 46.68158724, 131.78635853], rate: [0.00006447, 0.00000818, 0.000224, 218.46515314, 0.01009938, -0.00606302] },
]

/** Heliocentric ecliptic longitude in degrees (counterclockwise seen from the north) at T centuries after J2000. */
export function longitudeAt(p: Planet, T: number): number {
  const [a, e, I, L, varpi, Omega] = p.el.map((v, i) => v + (p.rate[i] ?? 0) * T) as [number, number, number, number, number, number]
  let M = (((L - varpi) % 360) + 540) % 360 - 180
  M = rad(M)
  let E = M
  for (let i = 0; i < 12; i += 1) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  const xp = a * (Math.cos(E) - e)
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const w = rad(varpi - Omega)
  const O = rad(Omega)
  const i = rad(I)
  const x = (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(i)) * xp + (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(i)) * yp
  const y = (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(i)) * xp + (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(i)) * yp
  return (Math.atan2(y, x) * 180) / Math.PI
}

function solarSystem(now: Date): string {
  const T = (now.getTime() - Date.UTC(2000, 0, 1, 12)) / (86400000 * 36525)
  let out = ''
  // north-up, like a textbook: ecliptic longitude grows counterclockwise on screen
  const at = (r: number, lon: number): [number, number] => [round(SUN_X + r * Math.cos(rad(lon))), round(SUN_Y - r * Math.sin(rad(lon)))]
  for (const p of PLANETS) out += `<circle class="medium" cx="${SUN_X}" cy="${SUN_Y}" r="${p.orbit}"/>`
  out += `<path class="fine chain" d="M${SUN_X - 310} ${SUN_Y}H${SUN_X + 310}M${SUN_X} ${SUN_Y - 310}V${SUN_Y + 310}"/>`
  out += `<circle cx="${SUN_X}" cy="${SUN_Y}" r="16" fill="url(#sunGlow)"/><circle cx="${SUN_X}" cy="${SUN_Y}" r="6" fill="#ffe08a"/>`
  const lonVenus = longitudeAt(PLANETS[1]!, T)
  PLANETS.forEach((p, idx) => {
    const lon = longitudeAt(p, T)
    // Mercury hugs Venus on the sheet: swing its label away from her along its orbit
    const swing = idx === 0 ? (((lon - lonVenus + 540) % 360) - 180 >= 0 ? 32 : -32) : 0
    const [x, y] = at(p.orbit, lon)
    const dir = idx % 2 === 1 ? -1 : 1 // alternate outside/inside so neighbours' labels don't collide
    const [lx, ly] = at(p.orbit + dir * (p.size + 7), lon + swing)
    const c = dir * Math.cos(rad(lon + swing))
    const sn = dir * Math.sin(rad(lon + swing))
    const anchor = c > 0.35 ? 'start' : c < -0.35 ? 'end' : 'middle'
    const base = Math.abs(c) > 0.35 ? 'middle' : sn > 0 ? 'text-after-edge' : 'hanging'
    out += `<path d="M${SUN_X} ${SUN_Y}L${x} ${y}" stroke="${CHALK}" stroke-width=".6" opacity=".1" fill="none"/>`
    if (p.name === 'Saturn') out += `<ellipse cx="${x}" cy="${y}" rx="16" ry="5" transform="rotate(-18 ${x} ${y})" fill="none" stroke="${p.color}" stroke-width="1.2" opacity=".8"/>`
    out += `<circle cx="${x}" cy="${y}" r="${p.size}" fill="${p.color}"/>`
    out += `<text x="${lx}" y="${ly}" text-anchor="${anchor}" dominant-baseline="${base}" font-size="11" fill="#eaf3ff" opacity=".95">${p.name}</text>`
  })
  return out
}

function clock(now: Date): string {
  const sec = now.getSeconds() + now.getMilliseconds() / 1000
  const min = now.getMinutes() + sec / 60
  const hour = (now.getHours() % 12) + min / 60
  const [cx, cy, r] = [CLOCK_X, CLOCK_Y, CLOCK_R]
  let ticks = ''
  for (let i = 0; i < 60; i += 1) {
    const big = i % 5 === 0
    const a = rad(i * 6 - 90)
    const r0 = big ? r - 14 : r - 7
    ticks += `M${round(cx + r0 * Math.cos(a))} ${round(cy + r0 * Math.sin(a))}L${round(cx + (r - 2) * Math.cos(a))} ${round(cy + (r - 2) * Math.sin(a))}`
  }
  let nums = ''
  for (const [n, k] of [['12', 0], ['3', 3], ['6', 6], ['9', 9]] as const) {
    const a = rad(k * 30 - 90)
    nums += `<text x="${round(cx + (r - 28) * Math.cos(a))}" y="${round(cy + (r - 28) * Math.sin(a))}" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="${CHALK}" opacity=".7">${n}</text>`
  }
  const hand = (cls: string, len: number, tail: number, w: number, color: string, op: number): string =>
    `<path class="${cls}" d="M${cx} ${cy + tail}V${cy - len}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}" fill="none"/>`
  return (
    `<circle class="medium" cx="${cx}" cy="${cy}" r="${r + 10}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#0c2444" fill-opacity=".35" stroke="${CHALK}" stroke-width="1.4" opacity=".7"/>` +
    `<path d="${ticks}" stroke="${CHALK}" stroke-width="1" opacity=".55" fill="none"/>${nums}` +
    hand('hourHand', r * 0.5, 10, 3.4, CHALK, 0.9) + hand('minHand', r * 0.78, 12, 2.4, CHALK, 0.9) + hand('secHand', r * 0.88, 18, 1.2, GOLD, 0.95) +
    `<circle cx="${cx}" cy="${cy}" r="4" fill="${GOLD}"/>` +
    `<style>@keyframes hourRun{from{transform:rotate(${round(hour * 30)}deg)}to{transform:rotate(${round(hour * 30 + 360)}deg)}}` +
    `@keyframes minRun{from{transform:rotate(${round(min * 6)}deg)}to{transform:rotate(${round(min * 6 + 360)}deg)}}` +
    `@keyframes secRun{from{transform:rotate(${round(sec * 6)}deg)}to{transform:rotate(${round(sec * 6 + 360)}deg)}}</style>`
  )
}


// ---- Globe with time zones, centred on where the viewer is ----
// A module has no geolocation and the scene must not phone anyone, so the place is read from the viewer's own time zone:
// IANA name -> a city in it (table below); a zone not listed falls back to its UTC offset (longitude offset x 15, latitude 35).
const CITIES: Readonly<Record<string, readonly [number, number]>> = {
  London: [51.5, -0.1], Dublin: [53.3, -6.3], Lisbon: [38.7, -9.1], Madrid: [40.4, -3.7], Paris: [48.9, 2.4], Brussels: [50.8, 4.4], Amsterdam: [52.4, 4.9],
  Berlin: [52.5, 13.4], Copenhagen: [55.7, 12.6], Oslo: [59.9, 10.8], Stockholm: [59.3, 18.1], Helsinki: [60.2, 24.9], Warsaw: [52.2, 21], Prague: [50.1, 14.4],
  Vienna: [48.2, 16.4], Budapest: [47.5, 19], Rome: [41.9, 12.5], Zurich: [47.4, 8.5], Athens: [38, 23.7], Istanbul: [41, 29], Kyiv: [50.5, 30.5], Kiev: [50.5, 30.5],
  Minsk: [53.9, 27.6], Moscow: [55.8, 37.6], Bucharest: [44.4, 26.1], Sofia: [42.7, 23.3], Belgrade: [44.8, 20.5], Riga: [56.9, 24.1], Vilnius: [54.7, 25.3],
  Tallinn: [59.4, 24.7], Kaliningrad: [54.7, 20.5], Samara: [53.2, 50.1], Yekaterinburg: [56.8, 60.6], Omsk: [55, 73.4], Novosibirsk: [55, 82.9], Krasnoyarsk: [56, 92.9],
  Irkutsk: [52.3, 104.3], Yakutsk: [62, 129.7], Vladivostok: [43.1, 131.9], Magadan: [59.6, 150.8], Kamchatka: [53, 158.6],
  Dubai: [25.2, 55.3], Tehran: [35.7, 51.4], Baghdad: [33.3, 44.4], Riyadh: [24.7, 46.7], Jerusalem: [31.8, 35.2], Karachi: [24.9, 67], Kolkata: [22.6, 88.4],
  Calcutta: [22.6, 88.4], Dhaka: [23.8, 90.4], Bangkok: [13.8, 100.5], Jakarta: [-6.2, 106.8], Singapore: [1.35, 103.8], Kuala_Lumpur: [3.1, 101.7], Manila: [14.6, 121],
  Hong_Kong: [22.3, 114.2], Shanghai: [31.2, 121.5], Taipei: [25, 121.5], Seoul: [37.6, 127], Tokyo: [35.7, 139.7], Tashkent: [41.3, 69.2], Almaty: [43.2, 76.9],
  Kathmandu: [27.7, 85.3], Colombo: [6.9, 79.9], Tbilisi: [41.7, 44.8], Yerevan: [40.2, 44.5], Baku: [40.4, 49.9], Ho_Chi_Minh: [10.8, 106.7], Kabul: [34.5, 69.2],
  Cairo: [30, 31.2], Johannesburg: [-26.2, 28], Lagos: [6.5, 3.4], Nairobi: [-1.3, 36.8], Casablanca: [33.6, -7.6], Algiers: [36.8, 3.1], Addis_Ababa: [9, 38.7], Accra: [5.6, -0.2],
  New_York: [40.7, -74], Chicago: [41.9, -87.6], Denver: [39.7, -105], Los_Angeles: [34.1, -118.2], Phoenix: [33.4, -112], Anchorage: [61.2, -149.9], Honolulu: [21.3, -157.9],
  Toronto: [43.7, -79.4], Vancouver: [49.3, -123.1], Winnipeg: [49.9, -97.1], Edmonton: [53.5, -113.5], Halifax: [44.6, -63.6], Mexico_City: [19.4, -99.1], Bogota: [4.7, -74.1],
  Lima: [-12, -77], Santiago: [-33.4, -70.7], Buenos_Aires: [-34.6, -58.4], Sao_Paulo: [-23.6, -46.6], Caracas: [10.5, -66.9], Havana: [23.1, -82.4],
  Sydney: [-33.9, 151.2], Melbourne: [-37.8, 145], Brisbane: [-27.5, 153], Perth: [-32, 115.9], Adelaide: [-34.9, 138.6], Auckland: [-36.8, 174.8],
}

type Home = { lat: number; lon: number; name: string }
let home: Home = { lat: 35, lon: 0, name: 'UTC' }

function homeOf(now: Date): Home {
  const offset = -now.getTimezoneOffset() / 60
  let id = ''
  try {
    id = new Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  } catch {
    // no Intl here: the offset alone places the globe
  }
  const city = id.split('/').pop() ?? ''
  const at = CITIES[city]
  if (at !== undefined) return { lat: at[0], lon: at[1], name: city.replace(/_/g, ' ') }
  return { lat: 35, lon: offset * 15, name: id === '' ? 'UTC' + (offset >= 0 ? '+' : '') + offset : city.replace(/_/g, ' ') }
}

const GLOBE_X = 1400
const GLOBE_Y = 680
const GLOBE_R = 156

type Pt = readonly [number, number] // [lon, lat]
const LAND: readonly (readonly Pt[])[] = [
  [[-9,37],[-9,43],[-1,46],[-4,48],[2,51],[8,54],[8,57],[10,59],[5,62],[14,68],[25,71],[40,68],[60,69],[80,73],[105,77],[130,72],[160,70],[180,68],[180,65],[165,60],[155,57],[140,53],[135,45],[130,42],[127,38],[126,35],[122,40],[120,35],[122,30],[118,24],[108,21],[106,10],[100,13],[103,2],[98,8],[97,17],[92,22],[87,21],[80,15],[77,8],[73,17],[67,25],[57,25],[57,27],[50,30],[48,29],[56,22],[52,16],[43,13],[35,28],[34,31],[36,36],[27,36],[26,40],[23,37],[20,40],[18,40],[12,44],[8,44],[3,43],[-1,37]],
  [[-17,21],[-10,30],[-6,36],[10,37],[11,33],[20,31],[32,31],[34,28],[43,12],[51,12],[41,-2],[40,-15],[35,-24],[32,-29],[20,-35],[17,-30],[12,-17],[13,-6],[9,3],[-8,4],[-17,14]],
  [[-168,66],[-160,71],[-140,70],[-110,73],[-95,72],[-82,68],[-65,60],[-60,50],[-66,44],[-76,38],[-81,31],[-80,25],[-82,29],[-90,30],[-97,26],[-97,20],[-87,21],[-83,10],[-77,8],[-80,8],[-92,14],[-105,20],[-110,25],[-115,30],[-117,33],[-124,40],[-124,48],[-135,58],[-150,60],[-165,60]],
  [[-77,8],[-72,12],[-62,10],[-52,5],[-35,-6],[-39,-18],[-48,-26],[-58,-38],[-65,-42],[-68,-52],[-73,-52],[-73,-40],[-71,-20],[-76,-14],[-81,-5],[-80,2]],
  [[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[131,-31],[115,-34]],
  [[-55,60],[-45,60],[-20,70],[-20,80],[-60,82],[-72,78],[-55,68]],
  [[-5,50],[1,51],[-2,56],[-5,58],[-6,55],[-3,54]],
]

/** Orthographic projection about the viewer's place (home). Points on the far side are pushed onto the rim, so a filled shape still closes. */
function globePoint(lon: number, lat: number): { x: number; y: number; front: boolean } {
  const p = rad(lat), p0 = rad(home.lat), dl = rad(lon - home.lon)
  const x = GLOBE_R * Math.cos(p) * Math.sin(dl)
  const y = GLOBE_R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(dl))
  const front = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(dl) > 0
  const len = Math.hypot(x, y)
  const k = front || len === 0 ? 1 : GLOBE_R / len
  return { x: GLOBE_X + x * k, y: GLOBE_Y - y * k, front }
}

/** Closed outline, each side cut into steps of about 3 degrees so it bends with the sphere. */
function globePolygon(pts: readonly Pt[]): string {
  let d = ''
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length]!
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3))
    for (let k = 0; k < n; k += 1) {
      const q = globePoint(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n)
      d += `${d === '' ? 'M' : 'L'}${round(q.x)} ${round(q.y)}`
    }
  })
  return `${d}z`
}

/** A meridian as visible stretches only. */
function meridian(lon: number): string {
  let d = ''
  let pen = false
  for (let lat = -85; lat <= 85; lat += 5) {
    const q = globePoint(lon, lat)
    if (q.front) { d += `${pen ? 'L' : 'M'}${round(q.x)} ${round(q.y)}`; pen = true } else pen = false
  }
  return d
}

function globe(now: Date): string {
  home = homeOf(now)
  const zone = Math.round(-now.getTimezoneOffset() / 60)
  const land = LAND.map(poly => `<path d="${globePolygon(poly)}" fill="${CHALK}" fill-opacity=".22" stroke="${CHALK}" stroke-width=".8" stroke-opacity=".7"/>`).join('')
  let lines = ''
  for (let z = -12; z <= 12; z += 1) lines += meridian(z * 15 - 7.5)
  let parallels = ''
  for (const lat of [-60, -30, 0, 30, 60]) {
    let d = ''
    let pen = false
    for (let lon = -180; lon <= 180; lon += 5) {
      const q = globePoint(lon, lat)
      if (q.front) { d += `${pen ? 'L' : 'M'}${round(q.x)} ${round(q.y)}`; pen = true } else pen = false
    }
    parallels += d
  }
  // the viewer's own time zone, a band of 15 degrees
  const edge = (lon: number): Pt[] => Array.from({ length: 35 }, (_, i) => [lon, -85 + i * 5] as Pt)
  const band = [...edge(zone * 15 - 7.5), ...edge(zone * 15 + 7.5).reverse()]
  const bandPath = `M${band.map(([lo, la]) => { const q = globePoint(lo, la); return `${round(q.x)} ${round(q.y)}` }).join('L')}z`
  let labels = ''
  for (let z = -12; z <= 12; z += 1) {
    const q = globePoint(z * 15, 0)
    const edgeOn = Math.abs(q.x - GLOBE_X) / GLOBE_R
    if (!q.front || edgeOn > 0.8) continue
    labels += `<text x="${round(q.x)}" y="${round(q.y + 3)}" text-anchor="middle" font-size="8" fill="${z === zone ? GOLD : '#eaf3ff'}" opacity="${z === zone ? 1 : 0.7}">${z > 0 ? '+' : ''}${z}</text>`
  }
  // where the sun is overhead right now
  const day = (now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000
  const sunLat = 23.44 * Math.sin(((2 * Math.PI) / 365.25) * (day - 80))
  const sunLon = -(now.getUTCHours() + now.getUTCMinutes() / 60 - 12) * 15
  const sun = globePoint(sunLon, sunLat)
  const sunMark = sun.front ? `<circle cx="${round(sun.x)}" cy="${round(sun.y)}" r="9" fill="url(#sunGlow)"/><circle cx="${round(sun.x)}" cy="${round(sun.y)}" r="3.5" fill="#ffe08a"/>` : ''
  const sign = zone >= 0 ? '+' : ''
  return (
    `<clipPath id="globeClip"><circle cx="${GLOBE_X}" cy="${GLOBE_Y}" r="${GLOBE_R}"/></clipPath>` +
    `<circle cx="${GLOBE_X}" cy="${GLOBE_Y}" r="${GLOBE_R}" fill="#0c2444" fill-opacity=".45"/>` +
    `<g clip-path="url(#globeClip)">${land}<path d="${parallels}" stroke="${CHALK}" stroke-width=".5" opacity=".2" fill="none"/>` +
    `<path d="${bandPath}" fill="${GOLD}" fill-opacity=".16"/><path d="${lines}" stroke="${CHALK}" stroke-width=".7" opacity=".4" fill="none"/>${labels}${sunMark}</g>` +
    `<circle cx="${GLOBE_X}" cy="${GLOBE_Y}" r="${GLOBE_R}" fill="none" stroke="${CHALK}" stroke-width="1.4" opacity=".7"/>` +
    `<circle cx="${GLOBE_X}" cy="${GLOBE_Y}" r="${GLOBE_R + 9}" class="medium"/>` +
    `<circle cx="${GLOBE_X}" cy="${GLOBE_Y}" r="2.5" fill="${GOLD}"/><circle cx="${GLOBE_X}" cy="${GLOBE_Y}" r="7" fill="none" stroke="${GOLD}" stroke-width="1"/>` +
    `<text x="${GLOBE_X}" y="${GLOBE_Y + GLOBE_R + 26}" text-anchor="middle" font-size="11" fill="#eaf3ff" opacity=".9">${home.name} · UTC${sign}${zone}</text>`
  )
}

function toothSpecks(): string {
  let s = ''
  for (let i = 0; i < 46; i += 1) {
    const light = hash(i + 131) > 0.45
    s += `<rect x="${round(hash(i + 3) * 160)}" y="${round(hash(i + 71) * 160)}" width="${light ? 1.2 : 1.6}" height="1.2" fill="${light ? '#dce8f7' : '#0b2347'}" opacity="${light ? 0.07 : 0.1}"/>`
  }
  return s
}

const columnRamp = (inside: number): string =>
  `<stop offset="0" stop-color="#fff"/><stop offset=".1" stop-color="#fff"/><stop offset=".32" stop-color="#fff" stop-opacity="${inside}"/><stop offset=".7" stop-color="#fff" stop-opacity="${inside}"/><stop offset=".92" stop-color="#fff"/><stop offset="1" stop-color="#fff"/>`

export function clockSolarSvg(now: Date = new Date()): string {
  const wash = DEEP_POOLS.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#washDeep)"/>`).join('')
  const style = `
.medium{fill:none;stroke:${CHALK};stroke-width:1;opacity:.24}
.fine{fill:none;stroke:${CHALK};stroke-width:.8;opacity:.2}
.chain{stroke-dasharray:26 5 4 5}
.hourHand,.minHand,.secHand{transform-origin:${CLOCK_X}px ${CLOCK_Y}px}
.hourHand{animation:hourRun 43200s linear infinite}
.minHand{animation:minRun 3600s linear infinite}
.secHand{animation:secRun 60s steps(60) infinite}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}`
  const defs = `
<radialGradient id="washDeep"><stop offset="0" stop-color="#0e2c58" stop-opacity=".78"/><stop offset=".4" stop-color="#0e2c58" stop-opacity=".46"/><stop offset=".72" stop-color="#0e2c58" stop-opacity=".15"/><stop offset="1" stop-color="#0e2c58" stop-opacity="0"/></radialGradient>
<radialGradient id="sunGlow"><stop offset="0" stop-color="#ffe08a" stop-opacity=".9"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>
<pattern id="tooth" width="160" height="160" patternUnits="userSpaceOnUse">${toothSpecks()}</pattern>
<pattern id="minorGrid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M20.5 0v100M40.5 0v100M60.5 0v100M80.5 0v100M0 20.5h100M0 40.5h100M0 60.5h100M0 80.5h100" stroke="${CHALK}" stroke-opacity=".07" fill="none"/></pattern>
<pattern id="oddMajorGrid" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M100.5 0v200M0 100.5h200" stroke="${CHALK}" stroke-opacity=".14" fill="none"/></pattern>
<pattern id="evenMajorGrid" width="200" height="200" patternUnits="userSpaceOnUse"><path d="M.5 0v200M0 .5h200" stroke="${CHALK}" stroke-opacity=".14" fill="none"/></pattern>
<linearGradient id="r0">${columnRamp(0)}</linearGradient><linearGradient id="r1">${columnRamp(0.35)}</linearGradient>
<mask id="notInColumn" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000"><rect width="1600" height="1000" fill="url(#r0)"/></mask>
<mask id="fainterInColumn" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000"><rect width="1600" height="1000" fill="url(#r1)"/></mask>`
  const grid = `<rect width="1600" height="1000" fill="url(#minorGrid)" mask="url(#notInColumn)"/><rect width="1600" height="1000" fill="url(#oddMajorGrid)" mask="url(#notInColumn)"/><rect width="1600" height="1000" fill="url(#evenMajorGrid)" mask="url(#fainterInColumn)"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" font-family="monospace" color="#888"><style>${style}</style><defs>${defs}</defs><rect width="1600" height="1000" fill="#22508e"/>${wash}<rect width="1600" height="1000" fill="url(#tooth)"/>${grid}${solarSystem(now)}${clock(now)}${globe(now)}</svg>`
}

// Self-check: Earth's longitude on the March equinox 2025 (Mar 20 09:01 UTC) is ~180° (sun seen at 0°), within a degree or two.
export function selfCheck(): void {
  const T = (Date.UTC(2025, 2, 20, 9, 1) - Date.UTC(2000, 0, 1, 12)) / (86400000 * 36525)
  const earth = PLANETS[2]!
  const lon = ((longitudeAt(earth, T) % 360) + 360) % 360
  if (Math.abs(lon - 180) > 2) throw new Error(`Earth longitude ${lon}`)
}
