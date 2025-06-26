"use strict";
// /**
//  * File Path: apps/api/src/services/socketService.ts
//  * 
//  * Socket.IO Real-time Service
//  * 
//  * Handles all real-time communication features:
//  * - Real-time messaging between consultants and clients
//  * - Live notifications for session updates
//  * - Dashboard real-time updates
//  * - User presence management
//  * - Connection management and authentication
//  * - Room-based messaging
//  */
// import { Server as SocketIOServer, Socket } from 'socket.io';
// import jwt from 'jsonwebtoken';
// import { getPrismaClient } from '../config/database';
// import { realTimeUtils } from '../config/redis';
// /**
//  * Interface for authenticated socket
//  */
// interface AuthenticatedSocket extends Socket {
//   userId?: string;
//   userRole?: 'consultant' | 'client';
//   userName?: string;
//   consultantId?: string;
// }
// /**
//  * Interface for socket user data
//  */
// interface SocketUser {
//   socketId: string;
//   userId: string;
//   userRole: 'consultant' | 'client';
//   userName: string;
//   consultantId?: string;
//   connectedAt: Date;
//   lastSeen: Date;
// }
// /**
//  * In-memory store for connected users
//  */
// const connectedUsers = new Map<string, SocketUser>();
// /**
//  * Socket event handlers
//  */
// class SocketEventHandlers {
//   private io: SocketIOServer;
//   constructor(io: SocketIOServer) {
//     this.io = io;
//   }
//   /**
//    * Handle user authentication
//    */
//   async authenticateSocket(socket: AuthenticatedSocket, token: string): Promise<boolean> {
//     try {
//       if (!token) {
//         socket.emit('auth_error', { message: 'No authentication token provided' });
//         return false;
//       }
//       // Verify JWT token
//       const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
//       const prisma = getPrismaClient();
//       // Get user details based on role
//       let user;
//       if (payload.role === 'consultant') {
//         user = await prisma.consultant.findUnique({
//           where: { id: payload.sub },
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//             isActive: true
//           }
//         });
//       } else if (payload.role === 'client') {
//         user = await prisma.client.findUnique({
//           where: { id: payload.sub },
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             consultantId: true,
//             isActive: true
//           }
//         });
//       }
//       if (!user || !user.isActive) {
//         socket.emit('auth_error', { message: 'User not found or inactive' });
//         return false;
//       }
//       // Set socket user data
//       socket.userId = user.id;
//       socket.userRole = payload.role;
//       socket.userName = payload.role === 'consultant' 
//         ? `${user.firstName} ${user.lastName}` 
//         : user.name;
//       socket.consultantId = payload.role === 'consultant' ? user.id : user.consultantId;
//       // Store user connection
//       const socketUser: SocketUser = {
//         socketId: socket.id,
//         userId: user.id,
//         userRole: payload.role,
//         userName: socket.userName || 'Unknown User',
//         consultantId: socket.consultantId,
//         connectedAt: new Date(),
//         lastSeen: new Date()
//       };
//       connectedUsers.set(socket.id, socketUser);
//       // Store in Redis for distributed systems
//       await realTimeUtils.setUserSocket(user.id, socket.id);
//       // Join user-specific room
//       socket.join(`user:${user.id}`);
//       // Join consultant-specific room if applicable
//       if (socket.consultantId) {
//         socket.join(`consultant:${socket.consultantId}`);
//       }
//       socket.emit('auth_success', {
//         userId: user.id,
//         userName: socket.userName,
//         userRole: payload.role
//       });
//       console.log(`🔌 User connected: ${socket.userName} (${payload.role})`);
//       return true;
//     } catch (error) {
//       console.error('❌ Socket authentication error:', error);
//       socket.emit('auth_error', { message: 'Authentication failed' });
//       return false;
//     }
//   }
//   /**
//    * Handle joining conversation room
//    * TODO: Implement when conversation models are added to schema
//    */
//   async joinConversation(socket: AuthenticatedSocket, conversationId: string): Promise<void> {
//     // Temporarily disabled - conversation model not implemented yet
//     socket.emit('error', { message: 'Conversations feature not yet implemented' });
//     console.log(`💬 Conversation feature requested but not implemented: ${conversationId}`);
//   }
//   /**
//    * Handle leaving conversation room
//    * TODO: Implement when conversation models are added to schema
//    */
//   async leaveConversation(socket: AuthenticatedSocket, conversationId: string): Promise<void> {
//     // Temporarily disabled - conversation model not implemented yet
//     socket.emit('error', { message: 'Conversations feature not yet implemented' });
//     console.log(`💬 Leave conversation requested but not implemented: ${conversationId}`);
//   }
//   /**
//    * Handle sending message in conversation
//    * TODO: Implement when conversation models are added to schema
//    */
//   async sendMessage(socket: AuthenticatedSocket, data: {
//     conversationId: string;
//     messageText: string;
//     attachments?: any[];
//   }): Promise<void> {
//     // Temporarily disabled - conversation model not implemented yet
//     socket.emit('error', { message: 'Messaging feature not yet implemented' });
//     console.log(`💬 Send message requested but not implemented: ${data.conversationId}`);
//   }
//   /**
//    * Handle marking messages as read
//    */
//   async markMessagesRead(socket: AuthenticatedSocket, data: {
//     conversationId: string;
//     messageIds: string[];
//   }): Promise<void> {
//     try {
//       if (!socket.userId) {
//         socket.emit('error', { message: 'Not authenticated' });
//         return;
//       }
//       const { conversationId, messageIds } = data;
//       const prisma = getPrismaClient();
//       // Update messages as read
//       await prisma.message.updateMany({
//         where: {
//           id: { in: messageIds },
//           conversationId,
//           senderType: socket.userRole === 'consultant' ? 'CLIENT' : 'CONSULTANT'
//         },
//         data: { isRead: true }
//       });
//       // Notify sender that messages were read
//       socket.to(`conversation:${conversationId}`).emit('messages_read', {
//         conversationId,
//         messageIds,
//         readBy: {
//           userId: socket.userId,
//           userName: socket.userName,
//           userRole: socket.userRole
//         }
//       });
//       socket.emit('messages_marked_read', { conversationId, messageIds });
//     } catch (error) {
//       console.error('❌ Mark messages read error:', error);
//       socket.emit('error', { message: 'Failed to mark messages as read' });
//     }
//   }
//   /**
//    * Handle typing indicators
//    */
//   handleTyping(socket: AuthenticatedSocket, data: {
//     conversationId: string;
//     isTyping: boolean;
//   }): void {
//     const { conversationId, isTyping } = data;
//     socket.to(`conversation:${conversationId}`).emit('user_typing', {
//       userId: socket.userId,
//       userName: socket.userName,
//       userRole: socket.userRole,
//       isTyping
//     });
//   }
//   /**
//    * Handle session status updates
//    */
//   async handleSessionUpdate(socket: AuthenticatedSocket, data: {
//     sessionId: string;
//     status: string;
//     details?: any;
//   }): Promise<void> {
//     try {
//       if (!socket.userId || socket.userRole !== 'consultant') {
//         socket.emit('error', { message: 'Unauthorized' });
//         return;
//       }
//       const { sessionId, status, details } = data;
//       const prisma = getPrismaClient();
//       // Verify session belongs to consultant
//       const session = await prisma.session.findFirst({
//         where: {
//           id: sessionId,
//           consultantId: socket.userId
//         },
//         include: {
//           client: {
//             select: { id: true, name: true, email: true }
//           }
//         }
//       });
//       if (!session) {
//         socket.emit('error', { message: 'Session not found' });
//         return;
//       }
//       // Broadcast session update to relevant users
//       this.io.to(`user:${session.client.id}`).emit('session_updated', {
//         sessionId,
//         status,
//         details,
//         updatedBy: {
//           userId: socket.userId,
//           userName: socket.userName
//         }
//       });
//       // Also emit to consultant's other sessions
//       this.io.to(`consultant:${socket.userId}`).emit('session_updated', {
//         sessionId,
//         status,
//         details
//       });
//       console.log(`📅 Session ${sessionId} updated by ${socket.userName}`);
//     } catch (error) {
//       console.error('❌ Session update error:', error);
//       socket.emit('error', { message: 'Failed to update session' });
//     }
//   }
//   /**
//    * Handle dashboard real-time updates
//    */
//   async broadcastDashboardUpdate(consultantId: string, updateType: string, data: any): Promise<void> {
//     this.io.to(`consultant:${consultantId}`).emit('dashboard_update', {
//       type: updateType,
//       data,
//       timestamp: new Date().toISOString()
//     });
//   }
//   /**
//    * Get online users for a consultant
//    */
//   getOnlineUsers(consultantId: string): SocketUser[] {
//     return Array.from(connectedUsers.values()).filter(
//       user => user.consultantId === consultantId
//     );
//   }
//   /**
//    * Handle user disconnect
//    */
//   async handleDisconnect(socket: AuthenticatedSocket): Promise<void> {
//     if (socket.userId) {
//       // Remove from connected users
//       connectedUsers.delete(socket.id);
//       // Remove from Redis
//       await realTimeUtils.removeUserSocket(socket.userId);
//       // Notify relevant users about disconnection
//       if (socket.consultantId) {
//         socket.to(`consultant:${socket.consultantId}`).emit('user_disconnected', {
//           userId: socket.userId,
//           userName: socket.userName,
//           userRole: socket.userRole
//         });
//       }
//       console.log(`🔌 User disconnected: ${socket.userName} (${socket.userRole})`);
//     }
//   }
// }
// /**
//  * Setup Socket.IO event handlers
//  */
// export const setupSocketHandlers = (io: SocketIOServer): void => {
//   const eventHandlers = new SocketEventHandlers(io);
//   // Authentication middleware
//   io.use(async (socket: AuthenticatedSocket, next) => {
//     try {
//       const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
//       if (!token) {
//         return next(new Error('Authentication token required'));
//       }
//       // For now, we'll authenticate in the connection handler
//       // This allows for better error handling
//       next();
//     } catch (error) {
//       console.error('❌ Socket middleware error:', error);
//       next(new Error('Authentication failed'));
//     }
//   });
//   // Handle new connections
//   io.on('connection', (socket: AuthenticatedSocket) => {
//     console.log(`🔌 New socket connection: ${socket.id}`);
//     // Authentication handler
//     socket.on('authenticate', async (data: { token: string }) => {
//       await eventHandlers.authenticateSocket(socket, data.token);
//     });
//     // Conversation handlers
//     socket.on('join_conversation', async (data: { conversationId: string }) => {
//       await eventHandlers.joinConversation(socket, data.conversationId);
//     });
//     socket.on('leave_conversation', async (data: { conversationId: string }) => {
//       await eventHandlers.leaveConversation(socket, data.conversationId);
//     });
//     socket.on('send_message', async (data) => {
//       await eventHandlers.sendMessage(socket, data);
//     });
//     socket.on('mark_messages_read', async (data) => {
//       await eventHandlers.markMessagesRead(socket, data);
//     });
//     socket.on('typing', (data) => {
//       eventHandlers.handleTyping(socket, data);
//     });
//     // Session handlers
//     socket.on('session_update', async (data) => {
//       await eventHandlers.handleSessionUpdate(socket, data);
//     });
//     // Get online users
//     socket.on('get_online_users', () => {
//       if (socket.consultantId) {
//         const onlineUsers = eventHandlers.getOnlineUsers(socket.consultantId);
//         socket.emit('online_users', onlineUsers);
//       }
//     });
//     // Ping/pong for connection health
//     socket.on('ping', () => {
//       socket.emit('pong');
//       // Update last seen
//       const user = connectedUsers.get(socket.id);
//       if (user) {
//         user.lastSeen = new Date();
//       }
//     });
//     // Handle disconnection
//     socket.on('disconnect', async (reason) => {
//       console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
//       await eventHandlers.handleDisconnect(socket);
//     });
//     // Handle errors
//     socket.on('error', (error) => {
//       console.error(`❌ Socket error for ${socket.id}:`, error);
//     });
//   });
//   console.log('✅ Socket.IO event handlers initialized');
// };
// /**
//  * Emit event to specific user
//  */
// export const emitToUser = async (userId: string, event: string, data: any): Promise<boolean> => {
//   try {
//     const socketId = await realTimeUtils.getUserSocket(userId);
//     if (socketId) {
//       // Find the socket instance and emit
//       const connectedUser = Array.from(connectedUsers.values()).find(u => u.userId === userId);
//       if (connectedUser) {
//         // This would need access to the io instance
//         // In practice, you'd store the io instance globally or pass it around
//         console.log(`📡 Emitting ${event} to user ${userId}`);
//         return true;
//       }
//     }
//     return false;
//   } catch (error) {
//     console.error('❌ Emit to user error:', error);
//     return false;
//   }
// };
// /**
//  * Emit event to all users of a consultant
//  */
// export const emitToConsultantUsers = (consultantId: string, event: string, data: any): void => {
//   const consultantUsers = Array.from(connectedUsers.values()).filter(
//     user => user.consultantId === consultantId
//   );
//   consultantUsers.forEach(user => {
//     // Would emit to each user's socket
//     console.log(`📡 Emitting ${event} to consultant ${consultantId} users`);
//   });
// };
// /**
//  * Get connection statistics
//  */
// export const getConnectionStats = () => {
//   const stats = {
//     totalConnections: connectedUsers.size,
//     consultants: Array.from(connectedUsers.values()).filter(u => u.userRole === 'consultant').length,
//     clients: Array.from(connectedUsers.values()).filter(u => u.userRole === 'client').length,
//     byConsultant: {} as Record<string, number>
//   };
//   // Group by consultant
//   Array.from(connectedUsers.values()).forEach(user => {
//     if (user.consultantId) {
//       stats.byConsultant[user.consultantId] = (stats.byConsultant[user.consultantId] || 0) + 1;
//     }
//   });
//   return stats;
// };
// /**
//  * Cleanup stale connections
//  */
// export const cleanupStaleConnections = (): void => {
//   const now = new Date();
//   const staleThreshold = 5 * 60 * 1000; // 5 minutes
//   for (const [socketId, user] of connectedUsers.entries()) {
//     if (now.getTime() - user.lastSeen.getTime() > staleThreshold) {
//       console.log(`🧹 Removing stale connection: ${user.userName}`);
//       connectedUsers.delete(socketId);
//       realTimeUtils.removeUserSocket(user.userId);
//     }
//   }
// };
// // Cleanup stale connections every 5 minutes
// setInterval(cleanupStaleConnections, 5 * 60 * 1000);
// export default {
//   setupSocketHandlers,
//   emitToUser,
//   emitToConsultantUsers,
//   getConnectionStats,
//   cleanupStaleConnections
// };
//# sourceMappingURL=socketService.js.map