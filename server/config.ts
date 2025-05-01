/**
 * Application configuration
 */
export const config = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  clientUrl: process.env.CLIENT_URL || 'https://edd23553-3183-444b-a8ec-ce8d5c3e49a1-00-1z4yje4poe45f.janeway.replit.dev',
}; 