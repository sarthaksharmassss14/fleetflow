import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Header.css'

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isAuthenticated, logout, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <nav className="nav">
          <Link to="/" className="logo">
            <span className="logo-icon">🚛</span>
            <span className="logo-text">FleetFlow</span>
          </Link>
          
          <ul className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#benefits">Benefits</a></li>
            <li><a href="#testimonials">Testimonials</a></li>
          </ul>

          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="btn-secondary">
                  {user?.name || 'Dashboard'}
                </Link>
                <button className="btn-primary" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">Login</Link>
                <Link to="/signup" className="btn-primary">Get Started</Link>
              </>
            )}
          </div>

          <button 
            className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Header
