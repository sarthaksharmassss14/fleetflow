import React, { useState } from 'react';
import apiService from '../services/api.service';
import { loadRazorpayScript } from '../utils/razorpay';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './Pricing.css';

const Pricing = () => {
  const { user, checkAuth } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const currentPlan = user?.subscription?.plan || 'free';

  const handlePayment = async (plan, price) => {
    if (!user) {
      showToast('Please login to purchase a plan', 'info');
      setTimeout(() => window.location.href = '/login', 2000);
      return;
    }

    if (plan === currentPlan) {
      showToast(`You are already on the ${plan} plan.`, 'info');
      return;
    }

    if (price === 0) {
      // Downgrade Logic (For now just alert, in real app call API)
      showToast("Downgraded to free plan.", 'success');
      // In a real app we would call an API to cancel subscription here
      return;
    }

    setLoading(true);
    try {
      // 1. Load Razorpay SDK
      const res = await loadRazorpayScript();
      if (!res) {
        showToast('Razorpay SDK failed to load. Are you online?', 'error');
        return;
      }

      // 2. Create Order on Backend
      const orderResponse = await apiService.createPaymentOrder(price, plan);
      if (!orderResponse.success) {
        throw new Error('Failed to create order');
      }

      const { order, key_id } = orderResponse;

      // 3. Open Razorpay Checkout
      const options = {
        key: key_id, 
        amount: order.amount,
        currency: order.currency,
        name: 'FleetFlow',
        description: `${plan.toUpperCase()} Plan Subscription`,
        image: '/logo192.png', // Ensure this exists or use a URL
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await apiService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              showToast('Payment Successful! Your subscription is active.', 'success');
              await checkAuth(); // Refresh user data immediately
              setTimeout(() => window.location.href = '/dashboard', 2000);
            } else {
              showToast('Payment Verification Failed', 'error');
            }
          } catch (error) {
            console.error(error);
            showToast('Error verifying payment', 'error');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#3b82f6',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error(error);
      showToast('Payment initialization failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="pricing-page">
        <div className="pricing-header">
          <h1>Simple, Transparent Pricing</h1>
          <p>Choose the plan that fits your logistics needs.</p>
        </div>
        
        <div className="pricing-cards">
          <div className="price-card">
            <h3>Starter</h3>
            <div className="price">₹0</div>
            <span>per month</span>
            <ul>
              <li>50 Routes / month</li>
              <li>Basic Optimization</li>
              <li>Email Support</li>
            </ul>
            <button 
              className="btn-outline" 
              onClick={() => handlePayment('free', 0)}
              disabled={currentPlan === 'free'}
            >
              {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
            </button>
          </div>

          <div className="price-card recommended">
            <div className="badge">Most Popular</div>
            <h3>Pro</h3>
            <div className="price">₹2,499</div>
            <span>per month</span>
            <ul>
              <li>Unlimited Routes</li>
              <li>Traffic & Weather AI</li>
              <li>Priority Verification</li>
              <li>Export to PDF/Excel</li>
            </ul>
            <button 
              className="btn-primary" 
              onClick={() => handlePayment('pro', 2499)}
              disabled={loading || currentPlan === 'pro'}
            >
              {loading ? 'Processing...' : (currentPlan === 'pro' ? 'Current Plan' : 'Upgrade Now')}
            </button>
          </div>

          <div className="price-card">
            <h3>Enterprise</h3>
            <div className="price">₹9,999</div>
            <span>per month</span>
            <ul>
              <li>Custom Integrations</li>
              <li>Dedicated Support</li>
              <li>SLA Guarantee</li>
              <li>Advanced Analytics</li>
            </ul>
            <button className="btn-outline" onClick={() => window.location.href = '/contact'}>Contact Sales</button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Pricing;
