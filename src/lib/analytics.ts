'use client'

// ═══════════════════════════════════════════════════════════
// SUBLIME SST — Camada de Analytics
// Abstração para GA4, Meta Pixel e eventos futuros
// ═══════════════════════════════════════════════════════════

type AnalyticsEvent =
  | 'hero_cta_clicked'
  | 'eligibility_started'
  | 'lead_captured'
  | 'eligibility_completed'
  | 'eligible_result_viewed'
  | 'backoffice_result_viewed'
  | 'registration_started'
  | 'registration_completed'
  | 'asaas_checkout_clicked'
  | 'partner_page_viewed'
  | 'partner_registration_started'
  | 'partner_registration_completed'
  | 'partner_referral_submitted'
  | 'whatsapp_clicked'
  | string

interface EventProps {
  [key: string]: string | number | boolean | undefined
}

declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params?: object) => void
    fbq?: (command: string, eventName: string, params?: object) => void
    dataLayer?: unknown[]
  }
}

export function track(event: AnalyticsEvent, props: EventProps = {}) {
  if (typeof window === 'undefined') return

  // GA4
  if (window.gtag) {
    window.gtag('event', event, props)
  }

  // Meta Pixel
  if (window.fbq) {
    window.fbq('track', event, props)
  }

  // Dev logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[ANALYTICS]', event, props)
  }
}
