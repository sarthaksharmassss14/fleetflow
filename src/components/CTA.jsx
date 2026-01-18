import React from 'react'
import './CTA.css'

const CTA = () => {
  return (
    <section className="cta section">
      <div className="container">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Optimize Your Logistics?</h2>
          <p className="cta-description">
            Start your free trial today and see how FleetFlow can transform your route planning and reduce costs.
          </p>
          <div className="cta-buttons">
            <button className="btn-primary btn-large">Start Free Trial</button>
            <button className="btn-outline btn-large">Schedule Demo</button>
          </div>
          <p className="cta-note">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </div>
    </section>
  )
}

export default CTA
