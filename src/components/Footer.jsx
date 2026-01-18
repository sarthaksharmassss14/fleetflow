import React from 'react'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="logo-icon">🚛</span>
              <span className="logo-text">FleetFlow</span>
            </div>
            <p className="footer-description">
              AI-powered logistics route optimization platform for transportation companies.
            </p>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-title">Product</h4>
            <ul className="footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#benefits">Benefits</a></li>
              <li><a href="#testimonials">Testimonials</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Company</h4>
            <ul className="footer-links">
              <li><a href="#about">About</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-title">Legal</h4>
            <ul className="footer-links">
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#gdpr">GDPR Compliance</a></li>
              <li><a href="#security">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 FleetFlow. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
