import { Router } from 'express';

const router = Router();

// Test basic API functionality
router.get('/', (req, res) => {
  res.json({ message: 'API test endpoint is working!' });
});

// Test stripe integration
router.post('/stripe', (req, res) => {
  console.log('Received stripe test request:', {
    body: req.body,
    headers: req.headers['content-type'],
    origin: req.headers.origin,
  });
  
  res.json({ 
    success: true,
    message: 'Stripe test endpoint working',
    received: req.body
  });
});

export default router; 