import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './StaticPages.css';

const PageLayout = ({ title, children }) => (
  <>
    <Header />
    <main className="static-page-container">
      <div className="static-content">
        <h1>{title}</h1>
        {children}
      </div>
    </main>
    <Footer />
  </>
);

export const About = () => (
  <PageLayout title="About FleetFlow">
    <p>FleetFlow is an intelligent logistics optimization platform built to simplify and modernize transportation operations. By leveraging generative AI, FleetFlow helps logistics and transportation companies plan smarter routes, reduce operational costs, and make data-driven decisions in real time.</p>
    <p>At its core, FleetFlow analyzes delivery priorities, time windows, vehicle constraints, traffic conditions, and weather data to generate optimized route plans that are both efficient and physically feasible. The system goes beyond simple distance-based routing by incorporating real-world constraints, ensuring routes are practical, safe, and reliable.</p>
    <p>FleetFlow also provides detailed cost analysis, including fuel consumption, driver wages, maintenance, and toll estimates, giving logistics teams complete visibility into trip economics before execution. With live route updates, teams can quickly respond to delays, disruptions, or changing conditions on the ground.</p>
    <p>The platform features secure user management, interactive map-based visualization, and exportable schedules, making it easy for dispatchers, fleet managers, and drivers to stay aligned. Whether managing a small delivery fleet or large-scale logistics operations, FleetFlow is designed to scale with operational complexity.</p>
    <p>FleetFlow’s mission is to bring intelligence, transparency, and efficiency to logistics—turning complex routing challenges into streamlined, actionable plans.</p>
  </PageLayout>
);

export const Blog = () => (
  <PageLayout title="FleetFlow Blog">
    <div className="blog-posts">
      <article>
        <h3>The Future of AI in Logistics</h3>
        <span className="date">Jan 15, 2026</span>
        <p>Artificial Intelligence is revolutionizing how we ship. From predictive traffic modeling to automated dispatch, learn how AI is driving the future.</p>
      </article>
      <article>
        <h3>Reducing Your Carbon Footprint</h3>
        <span className="date">Jan 02, 2026</span>
        <p>Sustainable shipping isn't just good for the planet; it's good for business. Discover strategies to minimize fuel consumption.</p>
      </article>
    </div>
  </PageLayout>
);

export const Careers = () => (
  <PageLayout title="Careers at FleetFlow">
    <p>Join us in building the future of logistics. We are always looking for talented engineers, designers, and data scientists.</p>
    <div className="job-list">
      <div className="job-item">
        <h4>Senior Full Stack Engineer</h4>
        <p>Remote • Engineering</p>
      </div>
      <div className="job-item">
        <h4>AI Research Scientist</h4>
        <p>London, UK • Intelligence</p>
      </div>
      <div className="job-item">
        <h4>Product Designer</h4>
        <p>Remote • Design</p>
      </div>
    </div>
  </PageLayout>
);

export const Contact = () => (
  <PageLayout title="Contact Us">
    <p>Have questions? We'd love to hear from you.</p>
    <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
      <div className="form-group">
        <label>Name</label>
        <input type="text" placeholder="Your Name" />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" placeholder="you@company.com" />
      </div>
      <div className="form-group">
        <label>Message</label>
        <textarea rows="5" placeholder="How can we help?"></textarea>
      </div>
      <button className="btn-primary">Send Message</button>
    </form>
    <div className="contact-info">
      <p><strong>Email:</strong> support@fleetflow.com</p>
      <p><strong>Phone:</strong> +1 (555) 123-4567</p>
    </div>
  </PageLayout>
);

export const PrivacyPolicy = () => (
  <PageLayout title="Privacy Policy">
    <p>Last Updated: January 2026</p>
    <p>FleetFlow (“we”, “us”, “our”) is committed to protecting the privacy and confidentiality of customer and user data. This Privacy Policy describes how data is collected, processed, stored, and protected when using the FleetFlow platform.</p>
    
    <h3>Data Collection</h3>
    <p>We collect and process only data that is necessary for the provision and improvement of our services, including but not limited to:</p>
    <ul>
      <li>Account and authentication information</li>
      <li>Route, delivery, and scheduling data</li>
      <li>Vehicle, fleet, and operational specifications</li>
      <li>Usage and performance metrics</li>
    </ul>
    <p>FleetFlow does not intentionally collect sensitive personal data unless explicitly required for service delivery and permitted by law.</p>

    <h3>Data Usage</h3>
    <p>Collected data is used strictly for:</p>
    <ul>
      <li>Route optimization and logistics planning</li>
      <li>Cost estimation and operational analytics</li>
      <li>Platform maintenance, monitoring, and improvement</li>
      <li>Customer support and service communication</li>
    </ul>
    <p>FleetFlow <strong>does not sell or monetize personal data</strong>. Data is shared with third-party service providers only to the extent necessary to operate the platform and under appropriate contractual and confidentiality safeguards.</p>

    <h3>Data Retention</h3>
    <p>Data is retained only for as long as necessary to fulfill contractual obligations, comply with legal requirements, or support legitimate business operations. Upon termination of service, customer data may be deleted or anonymized in accordance with applicable laws and agreements.</p>
  </PageLayout>
);

export const TermsOfService = () => (
  <PageLayout title="Terms of Service">
    <p>By accessing or using FleetFlow, you agree to be bound by these Terms of Service.</p>
    
    <h3>Permitted Use</h3>
    <p>FleetFlow may only be used for <strong>lawful, authorized logistics and transportation operations</strong>. Users must not misuse the platform, attempt to gain unauthorized access, or use the service in violation of applicable laws or regulations.</p>
    
    <h3>AI-Generated Outputs</h3>
    <p>FleetFlow utilizes generative and algorithmic systems to produce route suggestions, cost estimates, and operational insights. These outputs are <strong>advisory in nature</strong> and are based on available data and assumptions at the time of generation.</p>
    <p>Final operational decisions remain the responsibility of the customer.</p>
    
    <h3>Limitation of Liability</h3>
    <p>FleetFlow shall not be liable for:</p>
    <ul>
      <li>Traffic incidents, road conditions, weather disruptions, or delays</li>
      <li>Actions taken by drivers or third parties</li>
      <li>Losses arising from reliance on estimated routes, times, or costs</li>
    </ul>
    <p>To the maximum extent permitted by law, FleetFlow’s total liability shall be limited to the fees paid for the service during the applicable billing period.</p>

    <h3>Service Availability</h3>
    <p>FleetFlow is provided on an “<strong>as-is</strong>” and “<strong>as-available</strong>” basis. While we strive for high availability, uninterrupted service is not guaranteed.</p>
    
    <h3>Enterprise Assurance Statement</h3>
    <p>FleetFlow is designed as a <strong>decision-support platform</strong>, not a replacement for professional judgment. Customers retain full control and responsibility over fleet operations, compliance, and execution.</p>
  </PageLayout>
);

export const GDPRCompliance = () => (
  <PageLayout title="GDPR Compliance">
    <p>FleetFlow acts as a <strong>data processor</strong> for customer-provided data and complies with the <strong>General Data Protection Regulation (GDPR)</strong> and other applicable data protection laws.</p>
    
    <h3>Lawful Basis for Processing</h3>
    <p>Data is processed on the basis of:</p>
    <ul>
      <li>Contractual necessity</li>
      <li>Legitimate business interests</li>
      <li>Legal compliance obligations</li>
    </ul>

    <h3>Data Subject Rights</h3>
    <p>Where applicable, individuals have the right to:</p>
    <ul>
      <li><strong>Access</strong> their personal data</li>
      <li><strong>Rectify</strong> inaccurate or incomplete data</li>
      <li><strong>Erase</strong> personal data, subject to legal and contractual constraints</li>
      <li><strong>Restrict or object</strong> to certain processing activities</li>
    </ul>
    <p>Requests are handled within legally mandated timeframes.</p>
  </PageLayout>
);

export const Security = () => (
  <PageLayout title="Security">
    <p>FleetFlow maintains a comprehensive security program designed to protect customer data against unauthorized access, disclosure, alteration, or destruction. Our security practices are aligned with widely accepted industry standards and best practices for cloud-based enterprise systems.</p>
    
    <h3>Encryption</h3>
    <p>All data transmitted between users and FleetFlow systems is encrypted using <strong>Transport Layer Security (TLS) version 1.3</strong>. Data stored at rest is protected using <strong>AES-256 encryption</strong>, including backups and replicated datasets.</p>
    
    <h3>Access Control</h3>
    <p>FleetFlow enforces <strong>role-based access control (RBAC)</strong> across all environments. Access to systems and data is granted strictly on a <strong>least-privilege basis</strong> and reviewed periodically. Administrative access is restricted to authorized personnel and protected by additional authentication safeguards.</p>
    
    <h3>Operational Safeguards</h3>
    <p>FleetFlow employs monitoring, logging, and auditing mechanisms to detect and respond to potential security incidents. Security controls are reviewed and updated regularly to address evolving threats.</p>
  </PageLayout>
);
