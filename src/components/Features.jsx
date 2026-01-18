import React from 'react'
import './Features.css'

const Features = () => {
  const features = [
    {
      icon: '🤖',
      title: 'AI Route Generation',
      description: 'Uses generative AI to create optimal routes based on real-time constraints, traffic, and weather data.'
    },
    {
      icon: '📊',
      title: 'Real-Time Updates',
      description: 'Provides live route and condition updates with automatic re-optimization when significant delays occur.'
    },
    {
      icon: '💰',
      title: 'Cost Analysis',
      description: 'Calculate and compare route costs including fuel, time, tolls, and other operational expenses.'
    },
    {
      icon: '🔐',
      title: 'Secure User Management',
      description: 'Role-based access control with secure authentication for admin, dispatcher, and driver roles.'
    },
    {
      icon: '🗺️',
      title: 'Interactive Maps',
      description: 'Visualize routes, stops, and live updates on interactive maps with traffic and weather overlays.'
    },
    {
      icon: '📅',
      title: 'Exportable Schedules',
      description: 'Export route plans and schedules to PDF, CSV, and iCal formats for easy sharing and integration.'
    }
  ]

  return (
    <section id="features" className="features section">
      <div className="container">
        <h2 className="section-title">Powerful Features</h2>
        <p className="section-subtitle">
          Everything you need to optimize your logistics operations and reduce costs
        </p>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
