import React, { useState } from 'react';
import apiService from '../services/api.service';

const ProfileModal = ({ user, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const res = await apiService.updateProfile({ name, email });
      if (res.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        onUpdate(res.data.user);
        setTimeout(onClose, 1500);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const res = await apiService.resetPassword(passwords.current, passwords.new);
      if (res.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswords({ current: '', new: '', confirm: '' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to reset password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="modal-content" style={{
        background: 'white', padding: '0', borderRadius: '12px',
        width: '450px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        <div className="modal-header" style={{
          padding: '1.5rem', borderBottom: '1px solid #eee',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0 }}>Account Settings</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer'
          }}>✕</button>
        </div>

        <div className="modal-tabs" style={{
          display: 'flex', borderBottom: '1px solid #eee', background: '#f8f9fa'
        }}>
          <button 
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1, padding: '1rem', border: 'none', background: 'none',
              cursor: 'pointer', fontWeight: 600,
              color: activeTab === 'profile' ? '#0066ff' : '#64748b',
              borderBottom: activeTab === 'profile' ? '2px solid #0066ff' : 'none'
            }}
          >
            Profile Details
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            style={{
              flex: 1, padding: '1rem', border: 'none', background: 'none',
              cursor: 'pointer', fontWeight: 600,
              color: activeTab === 'security' ? '#0066ff' : '#64748b',
              borderBottom: activeTab === 'security' ? '2px solid #0066ff' : 'none'
            }}
          >
            Security
          </button>
        </div>

        <div className="modal-body" style={{ padding: '2rem' }}>
          {message.text && (
            <div style={{
              padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem',
              background: message.type === 'error' ? '#fee2e2' : '#dcfce7',
              color: message.type === 'error' ? '#dc2626' : '#166534',
              fontSize: '0.9rem'
            }}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  marginTop: '1rem', padding: '0.75rem', borderRadius: '6px',
                  background: '#0066ff', color: 'white', border: 'none', fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Current Password</label>
                <input 
                  type="password" 
                  value={passwords.current} 
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>New Password</label>
                <input 
                  type="password" 
                  value={passwords.new} 
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwords.confirm} 
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  marginTop: '1rem', padding: '0.75rem', borderRadius: '6px',
                  background: '#0066ff', color: 'white', border: 'none', fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
