"use strict";
/**
 * File Path: apps/api/src/services/socketService.ts
 *
 * Socket.IO Real-time Service
 *
 * Handles all real-time communication features:
 * - Real-time messaging between consultants and clients
 * - Live notifications for session updates
 * - Dashboard real-time updates
 * - User presence management
 * - Connection management and authentication
 * - Room-based messaging
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupStaleConnections = exports.getConnectionStats = exports.emitToConsultantUsers = exports.emitToUser = exports.setupSocketHandlers = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
/**
 * In-memory store for connected users
 */
const connectedUsers = new Map();
/**
 * Socket event handlers
 */
class SocketEventHandlers {
    constructor(io) {
        this.io = io;
    }
    /**
     * Handle user authentication
     */
    async authenticateSocket(socket, token) {
        try {
            if (!token) {
                socket.emit('auth_error', { message: 'No authentication token provided' });
                return false;
            }
            // Verify JWT token
            const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const prisma = (0, database_1.getPrismaClient)();
            // Get user details based on role
            let user;
            if (payload.role === 'consultant') {
                user = await prisma.consultant.findUnique({
                    where: { id: payload.sub },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        isActive: true
                    }
                });
            }
            else if (payload.role === 'client') {
                user = await prisma.client.findUnique({
                    where: { id: payload.sub },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        consultantId: true,
                        isActive: true
                    }
                });
            }
            if (!user || !user.isActive) {
                socket.emit('auth_error', { message: 'User not found or inactive' });
                return false;
            }
            // Set socket user data
            socket.userId = user.id;
            socket.userRole = payload.role;
            socket.userName = payload.role === 'consultant'
                ? `${user.firstName} ${user.lastName}`
                : user.name;
            socket.consultantId = payload.role === 'consultant' ? user.id : user.consultantId;
            // Store user connection
            const socketUser = {
                socketId: socket.id,
                userId: user.id,
                userRole: payload.role,
                userName: socket.userName || 'Unknown User',
                consultantId: socket.consultantId,
                connectedAt: new Date(),
                lastSeen: new Date()
            };
            connectedUsers.set(socket.id, socketUser);
            // Store in Redis for distributed systems
            await redis_1.realTimeUtils.setUserSocket(user.id, socket.id);
            // Join user-specific room
            socket.join(`user:${user.id}`);
            // Join consultant-specific room if applicable
            if (socket.consultantId) {
                socket.join(`consultant:${socket.consultantId}`);
            }
            socket.emit('auth_success', {
                userId: user.id,
                userName: socket.userName,
                userRole: payload.role
            });
            console.log(`🔌 User connected: ${socket.userName} (${payload.role})`);
            return true;
        }
        catch (error) {
            console.error('❌ Socket authentication error:', error);
            socket.emit('auth_error', { message: 'Authentication failed' });
            return false;
        }
    }
    /**
     * Handle joining conversation room
     */
    async joinConversation(socket, conversationId) {
        try {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            const prisma = (0, database_1.getPrismaClient)();
            // Verify user has access to this conversation
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    OR: [
                        { consultantId: socket.userRole === 'consultant' ? socket.userId : undefined },
                        { clientId: socket.userRole === 'client' ? socket.userId : undefined }
                    ]
                }
            });
            if (!conversation) {
                socket.emit('error', { message: 'Conversation not found or access denied' });
                return;
            }
            // Join conversation room
            socket.join(`conversation:${conversationId}`);
            socket.emit('conversation_joined', { conversationId });
            // Notify other participants that user joined
            socket.to(`conversation:${conversationId}`).emit('user_joined_conversation', {
                userId: socket.userId,
                userName: socket.userName,
                userRole: socket.userRole
            });
            console.log(`💬 ${socket.userName} joined conversation: ${conversationId}`);
        }
        catch (error) {
            console.error('❌ Join conversation error:', error);
            socket.emit('error', { message: 'Failed to join conversation' });
        }
    }
    /**
     * Handle leaving conversation room
     */
    async leaveConversation(socket, conversationId) {
        socket.leave(`conversation:${conversationId}`);
        // Notify other participants that user left
        socket.to(`conversation:${conversationId}`).emit('user_left_conversation', {
            userId: socket.userId,
            userName: socket.userName,
            userRole: socket.userRole
        });
        socket.emit('conversation_left', { conversationId });
    }
    /**
     * Handle sending message in conversation
     */
    async sendMessage(socket, data) {
        try {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            const { conversationId, messageText, attachments = [] } = data;
            const prisma = (0, database_1.getPrismaClient)();
            // Verify conversation access
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    OR: [
                        { consultantId: socket.userRole === 'consultant' ? socket.userId : undefined },
                        { clientId: socket.userRole === 'client' ? socket.userId : undefined }
                    ]
                }
            });
            if (!conversation) {
                socket.emit('error', { message: 'Conversation not found or access denied' });
                return;
            }
            // Create message in database
            const message = await prisma.message.create({
                data: {
                    conversationId,
                    senderType: socket.userRole?.toUpperCase(),
                    senderId: socket.userId,
                    senderName: socket.userName,
                    messageText,
                    attachments: attachments.length > 0 ? attachments : null,
                    isRead: false
                }
            });
            // Update conversation last message time
            await prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() }
            });
            // Broadcast message to all participants in the conversation
            this.io.to(`conversation:${conversationId}`).emit('new_message', {
                id: message.id,
                conversationId,
                messageText: message.messageText,
                senderType: message.senderType,
                senderId: message.senderId,
                senderName: message.senderName,
                attachments: message.attachments,
                sentAt: message.sentAt,
                isRead: message.isRead
            });
            // Send notification to offline users
            const otherParticipantRole = socket.userRole === 'consultant' ? 'client' : 'consultant';
            const otherParticipantId = socket.userRole === 'consultant'
                ? conversation.clientId
                : conversation.consultantId;
            if (otherParticipantId) {
                const otherUserSocket = await redis_1.realTimeUtils.getUserSocket(otherParticipantId);
                if (!otherUserSocket) {
                    // User is offline, could send push notification or email here
                    console.log(`📱 User ${otherParticipantId} is offline, message queued for notification`);
                }
            }
            console.log(`💬 Message sent in conversation ${conversationId} by ${socket.userName}`);
        }
        catch (error) {
            console.error('❌ Send message error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }
    /**
     * Handle marking messages as read
     */
    async markMessagesRead(socket, data) {
        try {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }
            const { conversationId, messageIds } = data;
            const prisma = (0, database_1.getPrismaClient)();
            // Update messages as read
            await prisma.message.updateMany({
                where: {
                    id: { in: messageIds },
                    conversationId,
                    senderType: socket.userRole === 'consultant' ? 'CLIENT' : 'CONSULTANT'
                },
                data: { isRead: true }
            });
            // Notify sender that messages were read
            socket.to(`conversation:${conversationId}`).emit('messages_read', {
                conversationId,
                messageIds,
                readBy: {
                    userId: socket.userId,
                    userName: socket.userName,
                    userRole: socket.userRole
                }
            });
            socket.emit('messages_marked_read', { conversationId, messageIds });
        }
        catch (error) {
            console.error('❌ Mark messages read error:', error);
            socket.emit('error', { message: 'Failed to mark messages as read' });
        }
    }
    /**
     * Handle typing indicators
     */
    handleTyping(socket, data) {
        const { conversationId, isTyping } = data;
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
            userId: socket.userId,
            userName: socket.userName,
            userRole: socket.userRole,
            isTyping
        });
    }
    /**
     * Handle session status updates
     */
    async handleSessionUpdate(socket, data) {
        try {
            if (!socket.userId || socket.userRole !== 'consultant') {
                socket.emit('error', { message: 'Unauthorized' });
                return;
            }
            const { sessionId, status, details } = data;
            const prisma = (0, database_1.getPrismaClient)();
            // Verify session belongs to consultant
            const session = await prisma.session.findFirst({
                where: {
                    id: sessionId,
                    consultantId: socket.userId
                },
                include: {
                    client: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            if (!session) {
                socket.emit('error', { message: 'Session not found' });
                return;
            }
            // Broadcast session update to relevant users
            this.io.to(`user:${session.client.id}`).emit('session_updated', {
                sessionId,
                status,
                details,
                updatedBy: {
                    userId: socket.userId,
                    userName: socket.userName
                }
            });
            // Also emit to consultant's other sessions
            this.io.to(`consultant:${socket.userId}`).emit('session_updated', {
                sessionId,
                status,
                details
            });
            console.log(`📅 Session ${sessionId} updated by ${socket.userName}`);
        }
        catch (error) {
            console.error('❌ Session update error:', error);
            socket.emit('error', { message: 'Failed to update session' });
        }
    }
    /**
     * Handle dashboard real-time updates
     */
    async broadcastDashboardUpdate(consultantId, updateType, data) {
        this.io.to(`consultant:${consultantId}`).emit('dashboard_update', {
            type: updateType,
            data,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Get online users for a consultant
     */
    getOnlineUsers(consultantId) {
        return Array.from(connectedUsers.values()).filter(user => user.consultantId === consultantId);
    }
    /**
     * Handle user disconnect
     */
    async handleDisconnect(socket) {
        if (socket.userId) {
            // Remove from connected users
            connectedUsers.delete(socket.id);
            // Remove from Redis
            await redis_1.realTimeUtils.removeUserSocket(socket.userId);
            // Notify relevant users about disconnection
            if (socket.consultantId) {
                socket.to(`consultant:${socket.consultantId}`).emit('user_disconnected', {
                    userId: socket.userId,
                    userName: socket.userName,
                    userRole: socket.userRole
                });
            }
            console.log(`🔌 User disconnected: ${socket.userName} (${socket.userRole})`);
        }
    }
}
/**
 * Setup Socket.IO event handlers
 */
const setupSocketHandlers = (io) => {
    const eventHandlers = new SocketEventHandlers(io);
    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            // For now, we'll authenticate in the connection handler
            // This allows for better error handling
            next();
        }
        catch (error) {
            console.error('❌ Socket middleware error:', error);
            next(new Error('Authentication failed'));
        }
    });
    // Handle new connections
    io.on('connection', (socket) => {
        console.log(`🔌 New socket connection: ${socket.id}`);
        // Authentication handler
        socket.on('authenticate', async (data) => {
            await eventHandlers.authenticateSocket(socket, data.token);
        });
        // Conversation handlers
        socket.on('join_conversation', async (data) => {
            await eventHandlers.joinConversation(socket, data.conversationId);
        });
        socket.on('leave_conversation', async (data) => {
            await eventHandlers.leaveConversation(socket, data.conversationId);
        });
        socket.on('send_message', async (data) => {
            await eventHandlers.sendMessage(socket, data);
        });
        socket.on('mark_messages_read', async (data) => {
            await eventHandlers.markMessagesRead(socket, data);
        });
        socket.on('typing', (data) => {
            eventHandlers.handleTyping(socket, data);
        });
        // Session handlers
        socket.on('session_update', async (data) => {
            await eventHandlers.handleSessionUpdate(socket, data);
        });
        // Get online users
        socket.on('get_online_users', () => {
            if (socket.consultantId) {
                const onlineUsers = eventHandlers.getOnlineUsers(socket.consultantId);
                socket.emit('online_users', onlineUsers);
            }
        });
        // Ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong');
            // Update last seen
            const user = connectedUsers.get(socket.id);
            if (user) {
                user.lastSeen = new Date();
            }
        });
        // Handle disconnection
        socket.on('disconnect', async (reason) => {
            console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
            await eventHandlers.handleDisconnect(socket);
        });
        // Handle errors
        socket.on('error', (error) => {
            console.error(`❌ Socket error for ${socket.id}:`, error);
        });
    });
    console.log('✅ Socket.IO event handlers initialized');
};
exports.setupSocketHandlers = setupSocketHandlers;
/**
 * Emit event to specific user
 */
const emitToUser = async (userId, event, data) => {
    try {
        const socketId = await redis_1.realTimeUtils.getUserSocket(userId);
        if (socketId) {
            // Find the socket instance and emit
            const connectedUser = Array.from(connectedUsers.values()).find(u => u.userId === userId);
            if (connectedUser) {
                // This would need access to the io instance
                // In practice, you'd store the io instance globally or pass it around
                console.log(`📡 Emitting ${event} to user ${userId}`);
                return true;
            }
        }
        return false;
    }
    catch (error) {
        console.error('❌ Emit to user error:', error);
        return false;
    }
};
exports.emitToUser = emitToUser;
/**
 * Emit event to all users of a consultant
 */
const emitToConsultantUsers = (consultantId, event, data) => {
    const consultantUsers = Array.from(connectedUsers.values()).filter(user => user.consultantId === consultantId);
    consultantUsers.forEach(user => {
        // Would emit to each user's socket
        console.log(`📡 Emitting ${event} to consultant ${consultantId} users`);
    });
};
exports.emitToConsultantUsers = emitToConsultantUsers;
/**
 * Get connection statistics
 */
const getConnectionStats = () => {
    const stats = {
        totalConnections: connectedUsers.size,
        consultants: Array.from(connectedUsers.values()).filter(u => u.userRole === 'consultant').length,
        clients: Array.from(connectedUsers.values()).filter(u => u.userRole === 'client').length,
        byConsultant: {}
    };
    // Group by consultant
    Array.from(connectedUsers.values()).forEach(user => {
        if (user.consultantId) {
            stats.byConsultant[user.consultantId] = (stats.byConsultant[user.consultantId] || 0) + 1;
        }
    });
    return stats;
};
exports.getConnectionStats = getConnectionStats;
/**
 * Cleanup stale connections
 */
const cleanupStaleConnections = () => {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    for (const [socketId, user] of connectedUsers.entries()) {
        if (now.getTime() - user.lastSeen.getTime() > staleThreshold) {
            console.log(`🧹 Removing stale connection: ${user.userName}`);
            connectedUsers.delete(socketId);
            redis_1.realTimeUtils.removeUserSocket(user.userId);
        }
    }
};
exports.cleanupStaleConnections = cleanupStaleConnections;
// Cleanup stale connections every 5 minutes
setInterval(exports.cleanupStaleConnections, 5 * 60 * 1000);
exports.default = {
    setupSocketHandlers: exports.setupSocketHandlers,
    emitToUser: exports.emitToUser,
    emitToConsultantUsers: exports.emitToConsultantUsers,
    getConnectionStats: exports.getConnectionStats,
    cleanupStaleConnections: exports.cleanupStaleConnections
};
//# sourceMappingURL=socketService.js.map