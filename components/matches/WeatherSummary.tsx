import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MatchWeather } from '@/lib/weather/open-meteo'

type Props = {
  weather?: MatchWeather | null
  variant?: 'compact' | 'plain' | 'hero'
  showDetails?: boolean
  className?: string
}

function WeatherIcon({
  tone,
  className,
}: {
  tone: MatchWeather['condition']['tone']
  className?: string
}) {
  if (tone === 'clear') return <Sun className={className} aria-hidden />
  if (tone === 'fog') return <CloudFog className={className} aria-hidden />
  if (tone === 'rain') return <CloudRain className={className} aria-hidden />
  if (tone === 'storm') return <CloudLightning className={className} aria-hidden />
  if (tone === 'snow') return <CloudSnow className={className} aria-hidden />
  if (tone === 'clouds') return <CloudSun className={className} aria-hidden />
  return <Cloud className={className} aria-hidden />
}

function getCompactToneClass(tone: MatchWeather['condition']['tone']) {
  if (tone === 'clear') return 'border-amber-200 bg-amber-50 text-amber-950'
  if (tone === 'rain') return 'border-sky-200 bg-sky-50 text-sky-950'
  if (tone === 'storm') return 'border-violet-200 bg-violet-50 text-violet-950'
  if (tone === 'snow') return 'border-cyan-200 bg-cyan-50 text-cyan-950'
  if (tone === 'fog') return 'border-zinc-200 bg-zinc-50 text-zinc-800'
  return 'border-slate-200 bg-slate-50 text-slate-900'
}

function formatWeatherDetails(weather: MatchWeather) {
  const details: string[] = []
  if (weather.precipitationProbability != null) {
    details.push(`${Math.round(weather.precipitationProbability)}% chuva`)
  }
  if (weather.windSpeedKmh != null) {
    details.push(`${Math.round(weather.windSpeedKmh)} km/h vento`)
  }
  if (weather.humidity != null) {
    details.push(`${Math.round(weather.humidity)}% humidade`)
  }
  return details.join(' · ')
}

export function WeatherSummary({ weather, variant = 'compact', showDetails = true, className }: Props) {
  if (!weather) return null

  const summary = `${weather.temperatureC}°C · ${weather.condition.label}`
  const details = formatWeatherDetails(weather)
  const compactSummary = `${weather.temperatureC}°C`

  if (variant === 'plain') {
    return (
      <div className={cn('min-w-0', className)}>
        <p className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
          <WeatherIcon tone={weather.condition.tone} className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{summary}</span>
        </p>
        {showDetails && details ? (
          <p className="mt-1 text-xs text-muted-foreground">{details}</p>
        ) : null}
      </div>
    )
  }

  if (variant === 'hero') {
    return (
      <div className={cn('min-w-0', className)}>
        <p className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-white">
          <WeatherIcon tone={weather.condition.tone} className="size-4 shrink-0 text-white/62" />
          <span className="truncate">{summary}</span>
        </p>
        {showDetails && details ? (
          <p className="mt-1 text-xs text-white/48">{details}</p>
        ) : null}
      </div>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
        getCompactToneClass(weather.condition.tone),
        className,
      )}
      title={details ? `${summary} · ${details}` : summary}
    >
      <WeatherIcon tone={weather.condition.tone} className="size-3.5 shrink-0" />
      <span className="truncate">{compactSummary}</span>
    </span>
  )
}
