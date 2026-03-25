import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import lotsRoutes from './routes/lots';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json());

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/lots', lotsRoutes);

// Also mount under /api/v1 for API versioning
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/lots', lotsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('[Socket.IO] Client connected:', socket.id);

  socket.on('subscribe', (data: { lotId: string }) => {
    console.log('[Socket.IO] Client subscribed to lot:', data.lotId);
    socket.join(`lot:${data.lotId}`);
  });

  socket.on('unsubscribe', (data: { lotId: string }) => {
    console.log('[Socket.IO] Client unsubscribed from lot:', data.lotId);
    socket.leave(`lot:${data.lotId}`);
  });

  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Client disconnected:', socket.id, reason);
  });
});

// Start server
httpServer.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              Project Uniview Backend API                  ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${config.port}                ║
║  Environment: ${config.nodeEnv.padEnd(43)}║
║  WebSocket: Enabled                                        ║
║                                                            ║
║  Endpoints:                                                ║
║    GET  /health              - Health check                ║
║    POST /auth/login          - User login                  ║
║    POST /auth/register       - User registration           ║
║    GET  /lots                - Get all parking lots        ║
║    GET  /lots/:id            - Get lot details             ║
║    GET  /lots/:id/spaces     - Get lot spaces              ║
║    GET  /lots/:id/prediction - Get occupancy prediction    ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export { io };
export default app;
