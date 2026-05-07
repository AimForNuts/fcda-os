'use client'

import { useReportWebVitals } from 'next/web-vitals'

const VITALS_ENDPOINT = '/api/performance/vitals'

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const payload = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
      page: window.location.pathname,
      search: window.location.search,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    }
    const body = JSON.stringify(payload)

    if (process.env.NODE_ENV !== 'production') {
      console.info('[web-vitals]', payload)
    }

    if (navigator.sendBeacon) {
      navigator.sendBeacon(VITALS_ENDPOINT, body)
      return
    }

    fetch(VITALS_ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {
      // Metrics should never affect navigation or rendering.
    })
  })

  return null
}
