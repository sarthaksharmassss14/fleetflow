import React, { useState, useEffect } from 'react';
import socketService from '../services/socket.service';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = socketService.on('notification', (data) => {
      const newNotification = {
        id: Date.now() + Math.random(), // Ensure unique ID
        ...data,
        read: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setNotifications(prev => [newNotification, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);
    });

    return () => unsubscribe();
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="notification-center">
      <button 
        className={`notification-trigger ${showDropdown ? 'active' : ''}`} 
        onClick={toggleDropdown}
        title={showDropdown ? "Close Notifications" : "Show Notifications"}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            <button className="btn-text" onClick={clearNotifications}>Clear all</button>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className={`notification-item ${notif.read ? '' : 'unread'}`}>
                  <div className="notif-icon">
                    {notif.type === 'alert' ? '⚠️' : (notif.type === 'completion' ? '✅' : 'ℹ️')}
                  </div>
                  <div className="notif-content">
                    <p className="notif-text">
                      <strong>{notif.routeName}</strong>: {notif.message || (notif.type === 'update' ? 'Route updated' : notif.type)}
                    </p>
                    <span className="notif-time">{notif.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
