import React from 'react'
import './Testimonials.css'

const Testimonials = () => {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Operations Manager',
      company: 'LogiTrans Inc.',
      content: 'FleetFlow has revolutionized our route planning. We\'ve reduced delivery times by 35% and cut fuel costs significantly. The AI optimization is incredibly accurate.',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Fleet Director',
      company: 'Urban Delivery Co.',
      content: 'The real-time updates and automatic re-optimization features are game-changers. Our drivers are more efficient, and customer satisfaction has improved dramatically.',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Dispatch Manager',
      company: 'Nationwide Logistics',
      content: 'Best logistics optimization platform we\'ve used. The interface is intuitive, and the cost analysis helps us make data-driven decisions. Highly recommended!',
      rating: 5
    }
  ]

  return (
    <section id="testimonials" className="testimonials section">
      <div className="container">
        <h2 className="section-title">What Our Customers Say</h2>
        <p className="section-subtitle">
          Trusted by leading transportation companies worldwide
        </p>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-rating">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i}>⭐</span>
                ))}
              </div>
              <p className="testimonial-content">"{testimonial.content}"</p>
              <div className="testimonial-author">
                <div className="author-info">
                  <div className="author-name">{testimonial.name}</div>
                  <div className="author-role">{testimonial.role} at {testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
