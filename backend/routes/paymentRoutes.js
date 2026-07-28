const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { rateLimits } = require('../middlewares/rateLimit');
const tokenStore = require('../utils/tokenStore');
const User = require('../models/User');
const router = express.Router();

const PREMIUM_AMOUNT = Number.parseInt(process.env.PREMIUM_PLAN_AMOUNT || '19900', 10);

function paymentClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

router.get('/razorpay-key', (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return res.status(503).json({ error: 'Payments are not configured' });
  }
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});

router.post('/orders', rateLimits.auth, authMiddleware, async (req, res, next) => {
  try {
    const client = paymentClient();
    if (!client || !Number.isSafeInteger(PREMIUM_AMOUNT) || PREMIUM_AMOUNT <= 0) {
      return res.status(503).json({ error: 'Payments are not configured' });
    }
    if (req.user.isPremium) return res.status(409).json({ error: 'Premium is already active' });

    const receipt = `premium_${req.user._id}_${Date.now()}`.slice(0, 40);
    const order = await client.orders.create({
      amount: PREMIUM_AMOUNT,
      currency: 'INR',
      receipt,
      notes: { userId: String(req.user._id), plan: 'premium' },
    });

    await tokenStore.setEx(`payment:order:${order.id}`, 30 * 60, String(req.user._id));
    return res.status(201).json({
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/verify', rateLimits.auth, authMiddleware, async (req, res, next) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (![orderId, paymentId].every((value) => typeof value === 'string' && value)
      || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) {
      return res.status(400).json({ error: 'Invalid payment verification payload' });
    }

    const orderUserId = await tokenStore.get(`payment:order:${orderId}`);
    if (!orderUserId || orderUserId !== String(req.user._id)) {
      return res.status(400).json({ error: 'Payment order is invalid or expired' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { isPremium: true }, { new: true })
      .select('_id name email role isPremium');
    await tokenStore.setEx(`payment:verified:${paymentId}`, 7 * 24 * 60 * 60, String(req.user._id));
    return res.json({ message: 'Premium activated', user });
  } catch (error) {
    return next(error);
  }
});

module.exports = router; 
