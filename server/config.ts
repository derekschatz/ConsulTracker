/**
 * Application configuration
 */
export const config = {
  stripe: {
    // Provide fallback test values for development
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_51R3LYQKC0x0Qg4vJ9PzI4aBlS2NNTe9mUXiyBNRjp0P8MWj9xqppD9tVgkFIfWtbXq9LiIsY2dGbvGvNAkx9aQGy00shV9uhws',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51R3LYQKC0x0Qg4vJ9PzI4aBlS2NNTe9mUXiyBNRjp0P8MWj9xqppD9tVgkFIfWtbXq9LiIsY2dGbvGvNAkx9aQGy00shV9uhws',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  clientUrl: process.env.CLIENT_URL || 'https://edd23553-3183-444b-a8ec-ce8d5c3e49a1-00-1z4yje4poe45f.janeway.replit.dev',
}; 