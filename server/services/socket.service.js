import { Server } from "socket.io";

class SocketService {
  constructor() {
    this.io = null;
    this.users = new Map(); // userId -> socketId
  }

  init(server) {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'https://13-211-252-48.sslip.io',
      'https://fleet-flow.duckdns.org'
    ].filter(Boolean);

    this.io = new Server(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      transports: ['websocket', 'polling']
    });

    console.log("🔌 Socket.io initialized");

    this.io.on("connection", (socket) => {
      console.log(`👤 New client connected: ${socket.id}`);

      // Authenticate and join rooms
      socket.on("authenticate", (data) => {
        const { userId, role, companyId } = data;
        if (!userId) return;

        socket.userId = userId;
        socket.role = role;
        socket.companyId = companyId;

        this.users.set(userId, socket.id);
        
        // Join general room
        socket.join("general");

        // Join role-specific room
        if (role) socket.join(`role:${role}`);

        // Join company-specific room
        if (companyId) socket.join(`company:${companyId}`);

        // Join individual user room for specific targetting
        socket.join(`user:${userId}`);

        console.log(`✅ Socket ${socket.id} authenticated for user ${userId} (${role})`);
      });

      socket.on("disconnect", () => {
        if (socket.userId) {
          this.users.delete(socket.userId);
        }
        console.log(`👋 Client disconnected: ${socket.id}`);
      });
    });
  }

  // Send to all
  emitToAll(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Send to specific user
  emitToUser(userId, event, data) {
    const socketId = this.users.get(userId);
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Send to role
  emitToRole(role, event, data) {
    if (this.io) {
      this.io.to(`role:${role}`).emit(event, data);
    }
  }

  // Send to company
  emitToCompany(companyId, event, data) {
    if (this.io) {
      this.io.to(`company:${companyId}`).emit(event, data);
    }
  }

  // Notify of route change
  notifyRouteChange(route, type = 'update', message = '') {
    const data = {
      type,
      message,
      routeId: route._id,
      routeName: `Route #${route._id.toString().slice(-6).toUpperCase()}`,
      status: route.status,
      timestamp: new Date().toISOString()
    };

    // Build unique list of target rooms using a Set
    const rooms = new Set([`role:admin`, `role:dispatcher`]);
    
    if (route.companyId) {
      rooms.add(`company:${route.companyId}`);
    }

    if (route.driverId) {
      const driverId = typeof route.driverId === 'object' ? route.driverId._id : route.driverId;
      rooms.add(`user:${driverId.toString()}`);
    }

    const targetRooms = Array.from(rooms);

    // Emit once to all target rooms (Socket.io ensures uniqueness)
    if (this.io) {
      this.io.to(targetRooms).emit('route_notification', data);
    }
  }
}

export default new SocketService();
