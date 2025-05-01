// Import required dependencies
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Verifies a Stripe checkout session and returns customer details
 * @route GET /api/verify-session
 * @param {string} session_id - The Stripe session ID
 * @returns {object} Session details including customer information
 */
router.get('/verify-session', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve the session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer', 'line_items.data.price.product', 'subscription']
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Make sure payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        error: 'Payment not completed',
        paymentStatus: session.payment_status
      });
    }

    // Extract customer details
    const customerDetails = {
      email: session.customer_details.email,
      name: session.customer_details.name,
    };

    // Get plan information
    let planName = "Contraq Subscription";
    if (session.line_items && session.line_items.data.length > 0) {
      planName = session.line_items.data[0].price.product.name;
    }

    // Return session information
    res.json({
      success: true,
      customerDetails,
      plan: planName,
      subscriptionId: session.subscription,
      paymentStatus: session.payment_status
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

module.exports = router; 