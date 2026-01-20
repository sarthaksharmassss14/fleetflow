import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.model.js';
import User from '../models/User.model.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Initialize Razorpay
let razorpay;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } else {
    console.warn("WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in .env. Payment features will not work.");
  }
} catch (error) {
  console.error("Failed to initialize Razorpay:", error.message);
}

// Create Order
router.post('/create-order', authenticate, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ 
        success: false, 
        message: "Payment gateway not configured on server" 
      });
    }

    const { amount, currency = 'INR', plan } = req.body;

    const options = {
      amount: amount * 100, // Razorpay works in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        plan: plan || 'pro',
      },
    };

    const order = await razorpay.orders.create(options);

    // Create Payment Record
    const payment = new Payment({
      userId: req.user._id,
      razorpayOrderId: order.id,
      amount: amount,
      currency: currency,
      status: 'created',
    });

    await payment.save();

    res.json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID, // Send key context to client
    });
  } catch (error) {
    console.error('Payment Order Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      razorpayError: error.error // Catch Razorpay specific error object
    });
  }
});

// Verify Payment
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment Successful
      const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
      if (payment) {
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.status = 'paid';
        await payment.save();
      }

      // Upgrade User Plan
      // Assuming 'Pro' plan for this demo, valid for 30 days
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      await User.findByIdAndUpdate(req.user._id, {
        'subscription.plan': 'pro',
        'subscription.status': 'active',
        'subscription.validUntil': validUntil,
      });

      res.json({ success: true, message: 'Payment verified and subscription activated' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid Signature' });
    }
  } catch (error) {
    console.error('Payment Verify Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
