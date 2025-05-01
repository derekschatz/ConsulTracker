// Import required dependencies
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Creates a Stripe checkout session
 * @route POST /api/create-checkout-session
 * @param {string} priceId - The Stripe price ID
 * @returns {object} url - The URL to redirect to for checkout
 */
router.post('/', async (req, res) => {
  try {
    const { priceId } = req.body;
    
    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    // Get the origin from the request or use CLIENT_URL as fallback
    const origin = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:3000';
    console.log('Creating checkout session with origin:', origin);

    // Create a new checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });

    // Return the checkout session URL
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

module.exports = router; 