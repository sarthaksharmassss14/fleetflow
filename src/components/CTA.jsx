import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './CTA.css'

const CTA = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleStartTrial = () => {
    if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/signup')
    }
  }

  return (
    <section className="cta section">
      <div className="container">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Optimize Your Logistics?</h2>
          <p className="cta-description">
            Start your free trial today and see how FleetFlow can transform your route planning and reduce costs.
          </p>
          <div className="cta-buttons">
            <button onClick={handleStartTrial} className="btn-primary btn-large">Start Free Trial</button>
            <Link to="/contact" className="btn-outline btn-large">Schedule Demo</Link>
          </div>
          <p className="cta-note">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </div>
    </section>
  )
}

export default CTA
