import React from 'react'
import './HowItWorks.css'

const HowItWorks = () => {
  const steps = [
    {
      number: '1',
      title: 'Input Delivery Constraints',
      description: 'Enter delivery locations, time windows, vehicle data, and priority settings.'
    },
    {
      number: '2',
      title: 'AI Route Optimization',
      description: 'Our AI engine analyzes real-time traffic, weather, and constraints to generate optimal routes.'
    },
    {
      number: '3',
      title: 'Review & Adjust',
      description: 'View routes on interactive maps, compare costs, and make manual adjustments if needed.'
    },
    {
      number: '4',
      title: 'Deploy & Monitor',
      description: 'Assign routes to drivers, export schedules, and receive live updates throughout the day.'
    }
  ]

  return (
    <section id="how-it-works" className="how-it-works section">
      <div className="container">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">
          Get started with FleetFlow in four simple steps
        </p>
        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={index} className="step">
              <div className="step-number">{step.number}</div>
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
              {index < steps.length - 1 && <div className="step-connector"></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
