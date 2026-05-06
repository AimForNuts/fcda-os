import { describe, expect, it } from 'vitest'
import {
  getWeatherCondition,
  isHistoricalWeatherCandidate,
  isWithinForecastWindow,
  selectClosestHourlyWeather,
} from '@/lib/weather/open-meteo'

describe('open-meteo weather helpers', () => {
  it('maps Open-Meteo weather codes to Portuguese match labels', () => {
    expect(getWeatherCondition(0)).toEqual({ label: 'Céu limpo', tone: 'clear' })
    expect(getWeatherCondition(61)).toEqual({ label: 'Chuva', tone: 'rain' })
    expect(getWeatherCondition(96)).toEqual({ label: 'Trovoada', tone: 'storm' })
  })

  it('only requests forecast data inside the free forecast window', () => {
    const now = new Date('2026-05-06T10:00:00.000Z')

    expect(isWithinForecastWindow('2026-05-06T20:00:00.000Z', now)).toBe(true)
    expect(isWithinForecastWindow('2026-05-21T20:00:00.000Z', now)).toBe(true)
    expect(isWithinForecastWindow('2026-05-22T20:00:00.000Z', now)).toBe(false)
    expect(isWithinForecastWindow('2026-05-05T20:00:00.000Z', now)).toBe(false)
  })

  it('uses historical weather only for games before today', () => {
    const now = new Date('2026-05-06T10:00:00.000Z')

    expect(isHistoricalWeatherCandidate('2026-05-05T20:00:00.000Z', now)).toBe(true)
    expect(isHistoricalWeatherCandidate('2026-05-06T09:00:00.000Z', now)).toBe(false)
    expect(isHistoricalWeatherCandidate('2026-05-07T20:00:00.000Z', now)).toBe(false)
  })

  it('selects the hourly forecast closest to kickoff time in Portugal', () => {
    const weather = selectClosestHourlyWeather(
      {
        time: ['2026-05-06T19:00', '2026-05-06T20:00', '2026-05-06T21:00'],
        temperature_2m: [15.2, 14.7, 14.1],
        weather_code: [2, 61, 3],
        precipitation_probability: [10, 70, 40],
        wind_speed_10m: [8.4, 10.1, 11.2],
        relative_humidity_2m: [60, 75, 78],
      },
      '2026-05-06T19:30:00.000Z',
    )

    expect(weather).toMatchObject({
      temperatureC: 15,
      weatherCode: 61,
      precipitationProbability: 70,
      windSpeedKmh: 10.1,
      humidity: 75,
      forecastTime: '2026-05-06T20:00',
    })
  })
})
