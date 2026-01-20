import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:5000";

class SocketClient {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }

  connect(userData) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    this.socket.on("connect", () => {
      console.log("🔌 Connected to notification server");
      
      // Authenticate with user info
      if (userData) {
        this.socket.emit("authenticate", {
          userId: userData.id,
          role: userData.role,
          companyId: userData.companyId
        });
      }
    });

    this.socket.on("route_notification", (data) => {
      console.log("🔔 Route Notification:", data);
      this.trigger("notification", data);
    });

    this.socket.on("disconnect", () => {
      console.log("👋 Disconnected from notification server");
    });
  }

  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
    return () => this.off(event, callback); // Return unsubscribe function
  }

  off(event, callback) {
    const hooks = this.callbacks.get(event);
    if (hooks) {
      if (callback) {
        this.callbacks.set(event, hooks.filter(cb => cb !== callback));
      } else {
        this.callbacks.delete(event);
      }
    }
  }

  trigger(event, data) {
    const hooks = this.callbacks.get(event);
    if (hooks) {
      hooks.forEach(cb => cb(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketClient();
