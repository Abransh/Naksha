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
import { Server as SocketIOServer } from 'socket.io';
/**
 * Setup Socket.IO event handlers
 */
export declare const setupSocketHandlers: (io: SocketIOServer) => void;
/**
 * Emit event to specific user
 */
export declare const emitToUser: (userId: string, event: string, data: any) => Promise<boolean>;
/**
 * Emit event to all users of a consultant
 */
export declare const emitToConsultantUsers: (consultantId: string, event: string, data: any) => void;
/**
 * Get connection statistics
 */
export declare const getConnectionStats: () => {
    totalConnections: number;
    consultants: number;
    clients: number;
    byConsultant: Record<string, number>;
};
/**
 * Cleanup stale connections
 */
export declare const cleanupStaleConnections: () => void;
declare const _default: {
    setupSocketHandlers: (io: SocketIOServer) => void;
    emitToUser: (userId: string, event: string, data: any) => Promise<boolean>;
    emitToConsultantUsers: (consultantId: string, event: string, data: any) => void;
    getConnectionStats: () => {
        totalConnections: number;
        consultants: number;
        clients: number;
        byConsultant: Record<string, number>;
    };
    cleanupStaleConnections: () => void;
};
export default _default;
//# sourceMappingURL=socketService.d.ts.map