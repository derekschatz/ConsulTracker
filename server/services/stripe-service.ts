import Stripe from 'stripe';
import { config } from '../config';

// Initialize Stripe with the secret key from config
const stripeSecretKey = config.stripe.secretKey;
console.log('Initializing Stripe with key:', stripeSecretKey ? `${stripeSecretKey.substring(0, 7)}...` : 'MISSING KEY');

const stripe = new Stripe(stripeSecretKey);

interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

/**
 * Stripe service to handle checkout sessions and webhook events
 */
export const stripeService = {
  /**
   * Create a checkout session for subscription
   */
  createCheckoutSession: async ({
    priceId,
    successUrl,
    cancelUrl,
    customerEmail,
    metadata = {}
  }: CreateCheckoutSessionParams) => {
    try {
      if (!priceId) {
        throw new Error('Price ID is required');
      }

      console.log(`Creating checkout session for price: ${priceId}`);
      console.log(`Success URL: ${successUrl}`);
      console.log(`Cancel URL: ${cancelUrl}`);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata,
        allow_promotion_codes: true,
      });

      console.log('Checkout session created:', {
        id: session.id,
        url: session.url,
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  },

  /**
   * Retrieve a checkout session
   */
  retrieveSession: async (sessionId: string) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer', 'subscription', 'line_items.data.price.product'],
      });
      return session;
    } catch (error) {
      console.error('Error retrieving session:', error);
      throw error;
    }
  },

  /**
   * Create a customer in Stripe
   */
  createCustomer: async ({ email, name, metadata }: CreateCustomerParams) => {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata,
      });
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  /**
   * Handle webhook events from Stripe
   */
  handleWebhookEvent: async (payload: string, signature: string) => {
    try {
      // If you're using webhooks, uncomment this code and add your webhook secret
      // const event = stripe.webhooks.constructEvent(
      //   payload,
      //   signature,
      //   process.env.STRIPE_WEBHOOK_SECRET || ''
      // );
      // return event;
      
      // For now, just parse the payload
      return JSON.parse(payload);
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  },
}; 