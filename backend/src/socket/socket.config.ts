import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

export const setupSocketIO = (io: SocketIOServer) => {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id} (User: ${socket.data.userId})`);

    // Join subaccount-specific room
    socket.on('join-subaccount', async (subaccountId: string) => {
      // TODO: Verify user owns this subaccount before joining room
      // For now, trust the client (in production, add ownership check)
      socket.join(subaccountId);
      console.log(`📡 User ${socket.data.userId} joined room: ${subaccountId}`);

      // Acknowledge join
      socket.emit('room-joined', { subaccountId });
    });

    // Leave subaccount room
    socket.on('leave-subaccount', (subaccountId: string) => {
      socket.leave(subaccountId);
      console.log(`📴 User ${socket.data.userId} left room: ${subaccountId}`);

      // Acknowledge leave
      socket.emit('room-left', { subaccountId });
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} (Reason: ${reason})`);
    });

    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};
