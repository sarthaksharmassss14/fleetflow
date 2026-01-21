import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Hero.css'

const Hero = () => {
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
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Optimize Your Logistics Routes with
              <span className="gradient-text"> AI-Powered Intelligence</span>
            </h1>
            <p className="hero-description">
              FleetFlow leverages generative AI to optimize logistics routes for transportation companies. 
              Consider real-time traffic, weather, and delivery constraints to generate optimal route plans, 
              cost analyses, and live updates.
            </p>
            <div className="hero-cta">
              <button onClick={handleStartTrial} className="btn-primary btn-large">Start Free Trial</button>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-number">10+</div>
                <div className="stat-label">Seconds</div>
              </div>
              <div className="stat">
                <div className="stat-number">1000+</div>
                <div className="stat-label">Stops Optimized</div>
              </div>
              <div className="stat">
                <div className="stat-number">99.5%</div>
                <div className="stat-label">Uptime</div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card">
              <div className="card-header">
                <div className="card-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="card-content">
                <div className="map-preview">
                  <div className="route-line"></div>
                  <div className="route-point start"></div>
                  <div className="route-point stop"></div>
                  <div className="route-point stop"></div>
                  <div className="route-point end"></div>
                </div>
                <div className="route-info">
                  <div className="route-stat">
                    <span className="stat-icon">⏱️</span>
                    <div>
                      <div className="stat-value">2h 34m</div>
                      <div className="stat-label-small">Total Time</div>
                    </div>
                  </div>
                  <div className="route-stat">
                    <span className="stat-icon">💰</span>
                    <div>
                      <div className="stat-value">$245</div>
                      <div className="stat-label-small">Cost</div>
                    </div>
                  </div>
                  <div className="route-stat">
                    <span className="stat-icon">📍</span>
                    <div>
                      <div className="stat-value">8 Stops</div>
                      <div className="stat-label-small">Deliveries</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
