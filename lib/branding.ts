export const branding = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? 'NexSight',
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? 'Intelligence Platform',
  primaryColor: process.env.NEXT_PUBLIC_BRAND_COLOR ?? '#22d3ee',
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL ?? null,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  fromEmail: process.env.RESEND_FROM_EMAIL ?? 'alerts@nexsight.app',
}
