import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const userDataStr = searchParams.get('user');

    if (token && userDataStr) {
      try {
        const user = JSON.parse(userDataStr);
        
        // Save to localStorage (compatible with AuthContext)
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Short delay to ensure localStorage is set
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } catch (err) {
        console.error('Failed to parse user data during OAuth success', err);
        navigate('/login');
      }
    } else {
      console.error('Missing token or user data in OAuth success URL');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '20px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #0066ff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <h2 style={{ color: '#1a1a1a' }}>Authenticating...</h2>
      <p style={{ color: '#666' }}>Please wait while we set up your session.</p>
    </div>
  );
};

export default AuthSuccess;
