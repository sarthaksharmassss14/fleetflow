import React from 'react'
import './Benefits.css'

const Benefits = () => {
  const benefits = [
    {
      icon: '⚡',
      metric: '10+ Seconds',
      description: 'Route generation for 100+ stops'
    },
    {
      icon: '📉',
      metric: '30% Cost Reduction',
      description: 'Average savings on fuel and time'
    },
    {
      icon: '⏱️',
      metric: '50% Faster',
      description: 'Route optimization compared to manual planning'
    },
    {
      icon: '✅',
      metric: '99.5% Uptime',
      description: 'Reliable service availability'
    }
  ]

  return (
    <section id="benefits" className="benefits section">
      <div className="container">
        <h2 className="section-title">Why Choose FleetFlow</h2>
        <p className="section-subtitle">
          Join transportation companies already optimizing their logistics operations
        </p>
        <div className="benefits-grid">
          {benefits.map((benefit, index) => (
            <div key={index} className="benefit-card">
              <div className="benefit-icon">{benefit.icon}</div>
              <div className="benefit-metric">{benefit.metric}</div>
              <div className="benefit-description">{benefit.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Benefits
