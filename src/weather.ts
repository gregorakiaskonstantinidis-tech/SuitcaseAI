import type { WeatherEstimate } from './types'

type GeocodingResult = {
  name: string
  admin1?: string
  country?: string
  latitude: number
  longitude: number
}

export type CitySuggestion = Pick<GeocodingResult, 'name' | 'admin1' | 'country' | 'latitude' | 'longitude'>

export async function searchCities(query: string): Promise<CitySuggestion[]> {
  const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
  geocodingUrl.search = new URLSearchParams({ name: query.trim(), count: '6', language: 'en', format: 'json' }).toString()
  const response = await fetch(geocodingUrl)
  if (!response.ok) throw new Error(`Location search returned ${response.status}`)
  const geocoding = await response.json() as { results?: GeocodingResult[] }
  return geocoding.results ?? []
}

type ForecastResponse = {
  daily?: {
    time?: string[]
    temperature_2m_min?: number[]
    temperature_2m_max?: number[]
    precipitation_probability_max?: number[]
    weather_code?: number[]
  }
}

type ArchiveResponse = {
  daily?: {
    time?: string[]
    temperature_2m_min?: number[]
    temperature_2m_max?: number[]
    precipitation_sum?: number[]
  }
}

const weatherCodeLabels: Record<number, string> = {
  0: 'Clear skies',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Cloudy',
  45: 'Misty',
  48: 'Misty',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Steady drizzle',
  56: 'Icy drizzle',
  57: 'Icy drizzle',
  61: 'Light rain',
  63: 'Rain showers',
  65: 'Heavy rain',
  66: 'Icy rain',
  67: 'Icy rain',
  71: 'Light snow',
  73: 'Snow showers',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Passing showers',
  81: 'Rain showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorms',
  96: 'Thunderstorms',
  99: 'Thunderstorms',
}

function categoryFor(maxTemp: number, rainChance: number, codes: number[]) {
  const wetWeather = codes.some((code) => [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code))
  if (rainChance >= 55 || wetWeather && rainChance >= 30) return 'Rainy'
  if (maxTemp >= 24) return 'Warm & sunny'
  if (maxTemp <= 14) return 'Cool & crisp'
  return 'Mild & mixed'
}

function seasonalEstimate(latitude: number, departure: string, location: string, note?: string, fallback = false): WeatherEstimate {
  const date = new Date(`${departure}T12:00:00`)
  const month = date.getUTCMonth() + 1
  const northernSeason = month === 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn'
  const season = latitude >= 0
    ? northernSeason
    : ({ winter: 'summer', spring: 'autumn', summer: 'winter', autumn: 'spring' } as const)[northernSeason]

  let minTemp: number
  let maxTemp: number
  if (Math.abs(latitude) < 23.5) {
    minTemp = 20
    maxTemp = 29
  } else if (season === 'summer') {
    maxTemp = Math.max(17, 31 - Math.abs(latitude) * 0.2)
    minTemp = maxTemp - 9
  } else if (season === 'winter') {
    maxTemp = Math.max(3, 20 - Math.abs(latitude) * 0.32)
    minTemp = maxTemp - 9
  } else {
    maxTemp = Math.max(12, 26 - Math.abs(latitude) * 0.21)
    minTemp = maxTemp - 9
  }
  const rainChance = season === 'spring' || season === 'autumn' ? 35 : 25
  const category = categoryFor(maxTemp, rainChance, [])
  return {
    category,
    summary: season === 'summer' ? 'Seasonal warmth is likely' : season === 'winter' ? 'Seasonal cooler weather is likely' : 'Changeable seasonal weather is possible',
    minTemp,
    maxTemp,
    rainChance,
    source: fallback ? 'fallback' : 'seasonal',
    location,
    coverage: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    note: note ?? 'A broad seasonal estimate. Check the local forecast closer to departure.',
  }
}

async function climateEstimate(latitude: number, longitude: number, departure: string, location: string): Promise<WeatherEstimate | null> {
  const tripDate = new Date(`${departure}T12:00:00Z`)
  const year = tripDate.getUTCFullYear()
  const endYear = Math.min(year - 1, new Date().getUTCFullYear() - 1)
  const startYear = endYear - 4
  const month = String(tripDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(tripDate.getUTCDate()).padStart(2, '0')
  const startDay = month === '02' && day === '29' ? '28' : day
  const startDate = `${startYear}-${month}-${startDay}`
  const endDate = `${endYear}-${month}-${startDay}`

  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    daily: 'temperature_2m_min,temperature_2m_max,precipitation_sum',
    timezone: 'auto',
  }).toString()
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Historical weather returned ${response.status}`)
  const data = await response.json() as ArchiveResponse
  const daily = data.daily
  const dates = daily?.time ?? []
  const lows = daily?.temperature_2m_min ?? []
  const highs = daily?.temperature_2m_max ?? []
  const precipitation = daily?.precipitation_sum ?? []
  const monthDay = `${month}-${startDay}`
  const nearby: number[] = []
  dates.forEach((date, index) => {
    const observed = new Date(`${date}T12:00:00Z`)
    const sameYearCenter = new Date(`${observed.getUTCFullYear()}-${monthDay}T12:00:00Z`)
    const distance = Math.abs(observed.getTime() - sameYearCenter.getTime()) / 86400000
    if (distance <= 7 && Number.isFinite(lows[index]) && Number.isFinite(highs[index])) nearby.push(index)
  })
  if (!nearby.length) return null

  const minTemp = Math.round(nearby.reduce((sum, index) => sum + lows[index], 0) / nearby.length)
  const maxTemp = Math.round(nearby.reduce((sum, index) => sum + highs[index], 0) / nearby.length)
  const wetDays = nearby.filter((index) => (precipitation[index] ?? 0) >= 1).length
  const rainChance = Math.round(wetDays / nearby.length * 100)
  const category = categoryFor(maxTemp, rainChance, [])
  return {
    category,
    summary: 'Based on recent local climate',
    minTemp,
    maxTemp,
    rainChance,
    source: 'climate',
    location,
    coverage: `${endYear - startYear + 1}-year average near these dates`,
    note: 'This is a historical climate pattern, not a trip-date forecast. Conditions vary year to year.',
  }
}

export async function estimateTripWeather(destination: string, departure: string, returnDate: string): Promise<WeatherEstimate> {
  const locationName = destination.trim()
  let latitude: number | null = null
  let longitude: number | null = null
  let resolvedLocation = locationName
  let lookupNote: string | undefined

  try {
    const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
    geocodingUrl.search = new URLSearchParams({ name: locationName, count: '1', language: 'en', format: 'json' }).toString()
    const geocodingResponse = await fetch(geocodingUrl)
    if (!geocodingResponse.ok) throw new Error(`Location search returned ${geocodingResponse.status}`)
    const geocoding = await geocodingResponse.json() as { results?: GeocodingResult[] }
    const result = geocoding.results?.[0]
    if (!result) throw new Error('No matching location was found')
    latitude = result.latitude
    longitude = result.longitude
    resolvedLocation = result.country ? `${result.name}, ${result.country}` : result.name
  } catch {
    lookupNote = 'Could not verify the destination location. This is a broad seasonal estimate; check the destination details.'
  }

  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const tripStart = new Date(`${departure}T00:00:00Z`)
  const tripEnd = new Date(`${returnDate}T00:00:00Z`)
  const forecastLimit = new Date(today)
  forecastLimit.setUTCDate(forecastLimit.getUTCDate() + 15)
  const forecastStart = tripStart > today ? tripStart : today
  const forecastEnd = tripEnd < forecastLimit ? tripEnd : forecastLimit
  const canForecast = latitude !== null && longitude !== null && forecastStart <= forecastEnd

  if (canForecast) {
    try {
      const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
      forecastUrl.search = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        daily: 'weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max',
        timezone: 'auto',
        start_date: forecastStart.toISOString().slice(0, 10),
        end_date: forecastEnd.toISOString().slice(0, 10),
      }).toString()
      const response = await fetch(forecastUrl)
      if (!response.ok) throw new Error(`Forecast returned ${response.status}`)
      const forecast = await response.json() as ForecastResponse
      const daily = forecast.daily
      const lows = daily?.temperature_2m_min?.filter(Number.isFinite) ?? []
      const highs = daily?.temperature_2m_max?.filter(Number.isFinite) ?? []
      const rain = daily?.precipitation_probability_max?.filter(Number.isFinite) ?? []
      const codes = daily?.weather_code ?? []
      if (!lows.length || !highs.length) throw new Error('The forecast did not include daily temperatures')
      const minTemp = Math.round(Math.min(...lows))
      const maxTemp = Math.round(Math.max(...highs))
      const rainChance = Math.round(rain.length ? Math.max(...rain) : 0)
      const category = categoryFor(maxTemp, rainChance, codes)
      const representativeCode = codes.reduce((counts, code) => counts.set(code, (counts.get(code) ?? 0) + 1), new Map<number, number>())
      const mostCommonCode = [...representativeCode.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
      const summary = mostCommonCode === undefined ? 'Forecast available' : weatherCodeLabels[mostCommonCode] ?? 'Variable conditions'
      const partial = forecastEnd < tripEnd
      return {
        category,
        summary,
        minTemp,
        maxTemp,
        rainChance,
        source: 'forecast',
        location: resolvedLocation,
        coverage: partial
          ? `${forecastStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}–${forecastEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
          : `${lows.length} day${lows.length === 1 ? '' : 's'} of forecast`,
        note: partial ? 'The forecast is available for the first part of this trip. Later dates are outside the forecast window.' : undefined,
      }
    } catch {
      lookupNote = 'Live forecast is temporarily unavailable. Showing a seasonal estimate instead.'
    }
  }

  if (latitude !== null && longitude !== null) {
    try {
      const climate = await climateEstimate(latitude, longitude, departure, resolvedLocation)
      if (climate) return climate
    } catch {
      lookupNote = 'Historical climate data is temporarily unavailable. Showing a broad seasonal estimate instead.'
    }
    return seasonalEstimate(latitude, departure, resolvedLocation, lookupNote)
  }
  return seasonalEstimate(40, departure, locationName, lookupNote, true)
}
