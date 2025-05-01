import { Router } from 'express';
import { stripeService } from '../services/stripe-service';
import { config } from '../config';

// Define a request type that includes user
interface AuthenticatedRequest extends Express.Request {
  user?: {
    id?: string | number;
    email?: string;
  };
}

const router = Router();

/**
 * Create a checkout session
 * @route POST /api/stripe/create-checkout-session
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId } = req.body;
    const authenticatedReq = req as AuthenticatedRequest;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    // Get the origin from the request header or use the configured clientUrl
    const origin = req.headers.origin || config.clientUrl;
    console.log(`Creating checkout session with origin: ${origin}`);

    const session = await stripeService.createCheckoutSession({
      priceId,
      successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/cancel`,
      customerEmail: authenticatedReq.user?.email,
      metadata: {
        userId: authenticatedReq.user?.id?.toString() || '',
      },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

/**
 * Verify a checkout session
 * @route GET /api/stripe/verify-session
 */
router.get('/verify-session', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = await stripeService.retrieveSession(session_id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Extract relevant data
    const data = {
      success: true,
      customerDetails: {
        email: session.customer_details?.email,
        name: session.customer_details?.name,
      },
      plan: session.line_items?.data[0]?.price?.product?.name || 'Subscription',
      subscriptionId: session.subscription?.id,
      paymentStatus: session.payment_status,
    };

    res.json(data);
  } catch (error: any) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: error.message || 'Failed to verify session' });
  }
});

/**
 * Handle webhook events from Stripe
 * @route POST /api/stripe/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    // Get the signature from the headers
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Stripe signature is required' });
    }

    // For webhook handlers, req.body is a Buffer when bodyParser.raw is used
    let payload;
    if (req.body instanceof Buffer) {
      payload = req.body.toString('utf8');
    } else {
      // If middleware didn't work as expected, stringify the JSON body
      payload = JSON.stringify(req.body);
    }

    // Process the webhook
    const event = await stripeService.handleWebhookEvent(payload, signature);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        // Handle successful checkout
        console.log('Checkout completed:', event.data.object);
        break;
      case 'customer.subscription.created':
        // Handle subscription creation
        console.log('Subscription created:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router; 