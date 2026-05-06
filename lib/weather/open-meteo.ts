import { GAME_TIME_ZONE } from '@/lib/games/format-schedule-date'
import type { Recinto } from '@/types'

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const OPEN_METEO_FORECAST_DAYS = 16
const WEATHER_REVALIDATE_SECONDS = 60 * 60
const HISTORICAL_WEATHER_REVALIDATE_SECONDS = 7 * 24 * 60 * 60

type RecintoWeatherLocation = Pick<Recinto, 'latitude' | 'longitude'>

type WeatherConditionTone = 'clear' | 'clouds' | 'fog' | 'rain' | 'storm' | 'snow'

export type WeatherCondition = {
  label: string
  tone: WeatherConditionTone
}

export type MatchWeather = {
  temperatureC: number
  weatherCode: number
  condition: WeatherCondition
  precipitationProbability: number | null
  windSpeedKmh: number | null
  humidity: number | null
  forecastTime: string
}

type OpenMeteoHourly = {
  time: string[]
  temperature_2m: number[]
  weather_code: number[]
  precipitation_probability?: Array<number | null>
  precipitation?: Array<number | null>
  wind_speed_10m?: Array<number | null>
  relative_humidity_2m?: Array<number | null>
}

type OpenMeteoResponse = {
  hourly?: Partial<OpenMeteoHourly>
}

type LocalDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function getLocalDateParts(date: Date, timeZone = GAME_TIME_ZONE): LocalDateParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((item) => item.type === type)?.value
    return part ? Number(part) : 0
  }

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  }
}

function localDateKey(parts: Pick<LocalDateParts, 'year' | 'month' | 'day'>) {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')
}

function dateKeyToUtcMs(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function localComparableMs(parts: LocalDateParts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
}

function openMeteoTimeComparableMs(value: string) {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = 0, minute = 0] = (timePart ?? '').split(':').map(Number)
  return Date.UTC(year, month - 1, day, hour, minute)
}

export function getWeatherCondition(weatherCode: number): WeatherCondition {
  if (weatherCode === 0) return { label: 'Céu limpo', tone: 'clear' }
  if (weatherCode === 1 || weatherCode === 2) return { label: 'Parcialmente nublado', tone: 'clouds' }
  if (weatherCode === 3) return { label: 'Nublado', tone: 'clouds' }
  if (weatherCode === 45 || weatherCode === 48) return { label: 'Nevoeiro', tone: 'fog' }
  if (weatherCode >= 51 && weatherCode <= 57) return { label: 'Chuvisco', tone: 'rain' }
  if (weatherCode >= 61 && weatherCode <= 67) return { label: 'Chuva', tone: 'rain' }
  if (weatherCode >= 71 && weatherCode <= 77) return { label: 'Neve', tone: 'snow' }
  if (weatherCode >= 80 && weatherCode <= 82) return { label: 'Aguaceiros', tone: 'rain' }
  if (weatherCode >= 85 && weatherCode <= 86) return { label: 'Aguaceiros de neve', tone: 'snow' }
  if (weatherCode >= 95 && weatherCode <= 99) return { label: 'Trovoada', tone: 'storm' }
  return { label: 'Meteorologia', tone: 'clouds' }
}

export function isWithinForecastWindow(gameIso: string, now = new Date()) {
  const gameDateKey = localDateKey(getLocalDateParts(new Date(gameIso)))
  const todayKey = localDateKey(getLocalDateParts(now))
  const daysFromToday = Math.floor((dateKeyToUtcMs(gameDateKey) - dateKeyToUtcMs(todayKey)) / 86_400_000)

  return daysFromToday >= 0 && daysFromToday < OPEN_METEO_FORECAST_DAYS
}

export function isHistoricalWeatherCandidate(gameIso: string, now = new Date()) {
  const gameDateKey = localDateKey(getLocalDateParts(new Date(gameIso)))
  const todayKey = localDateKey(getLocalDateParts(now))

  return dateKeyToUtcMs(gameDateKey) < dateKeyToUtcMs(todayKey)
}

function isOpenMeteoHourly(value: OpenMeteoResponse): value is { hourly: OpenMeteoHourly } {
  const hourly = value.hourly
  return Boolean(
    hourly
      && Array.isArray(hourly.time)
      && Array.isArray(hourly.temperature_2m)
      && Array.isArray(hourly.weather_code),
  )
}

export function selectClosestHourlyWeather(
  hourly: OpenMeteoHourly,
  gameIso: string,
): MatchWeather | null {
  const target = localComparableMs(getLocalDateParts(new Date(gameIso)))
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY

  hourly.time.forEach((time, index) => {
    const distance = Math.abs(openMeteoTimeComparableMs(time) - target)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })

  if (bestIndex < 0) return null

  const temperature = hourly.temperature_2m[bestIndex]
  const weatherCode = hourly.weather_code[bestIndex]
  if (typeof temperature !== 'number' || typeof weatherCode !== 'number') return null

  return {
    temperatureC: Math.round(temperature),
    weatherCode,
    condition: getWeatherCondition(weatherCode),
    precipitationProbability: hourly.precipitation_probability?.[bestIndex] ?? null,
    windSpeedKmh: hourly.wind_speed_10m?.[bestIndex] ?? null,
    humidity: hourly.relative_humidity_2m?.[bestIndex] ?? null,
    forecastTime: hourly.time[bestIndex],
  }
}

export async function fetchMatchWeather(
  recinto: RecintoWeatherLocation | null | undefined,
  gameIso: string,
): Promise<MatchWeather | null> {
  if (recinto?.latitude == null || recinto.longitude == null) return null

  const gameDate = localDateKey(getLocalDateParts(new Date(gameIso)))
  const isForecast = isWithinForecastWindow(gameIso)
  const isHistorical = isHistoricalWeatherCandidate(gameIso)
  if (!isForecast && !isHistorical) return null

  const url = isForecast ? OPEN_METEO_FORECAST_URL : OPEN_METEO_ARCHIVE_URL
  const hourly = isForecast
    ? [
        'temperature_2m',
        'relative_humidity_2m',
        'precipitation_probability',
        'weather_code',
        'wind_speed_10m',
      ]
    : [
        'temperature_2m',
        'relative_humidity_2m',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
      ]
  const params = new URLSearchParams({
    latitude: String(recinto.latitude),
    longitude: String(recinto.longitude),
    timezone: GAME_TIME_ZONE,
    start_date: gameDate,
    end_date: gameDate,
    hourly: hourly.join(','),
  })

  try {
    const response = await fetch(`${url}?${params.toString()}`, {
      next: {
        revalidate: isForecast
          ? WEATHER_REVALIDATE_SECONDS
          : HISTORICAL_WEATHER_REVALIDATE_SECONDS,
      },
    })

    if (!response.ok) return null

    const data = await response.json() as OpenMeteoResponse
    if (!isOpenMeteoHourly(data)) return null

    return selectClosestHourlyWeather(data.hourly, gameIso)
  } catch (error) {
    console.error('Failed to fetch match weather', error)
    return null
  }
}
