import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import 'express-async-errors';

import { testConnection, closeConnection, healthCheck } from './database/connection';
import { ApiResponse, AppError } from './types';

// Import routes
import authRoutes from './routes/auth';
import phaseRoutes from './routes/phases';
import projectRoutes from './routes/projects';
import workLogRoutes from './routes/work-logs';
import userRoutes from './routes/users';
import smartTestRoutes from './routes/smart-test';
import profileRoutes from './routes/profile';
import progressRoutes from './routes/progress';
import importDataRoutes from './routes/import-data';

dotenv.config();

class App {
  public app: Application;
  public server: any;
  public io!: Server;
  private port: number;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = parseInt(process.env.PORT || '5005', 10);

    this.initializeMiddleware();
    this.initializeSocketIO();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Trust proxy for rate limiting behind reverse proxy (Coolify)
    this.app.set('trust proxy', 1);

    // Security middleware - Enhanced security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding resources from different origins
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
      hidePoweredBy: true,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Response compression (gzip)
    this.app.use(compression());

    // Request logging
    if (process.env.NODE_ENV === 'production') {
      this.app.use(morgan('combined'));
    } else if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }

    // Global rate limiting
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(globalLimiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private initializeSocketIO(): void {
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.on('connection', (socket) => {
      // Reduced logging to prevent console spam
      if (process.env.NODE_ENV === 'development') {
        // console.log(`✅ Client connected: ${socket.id}`);
      }

      socket.on('disconnect', () => {
        // console.log(`❌ Client disconnected: ${socket.id}`);
      });

      socket.on('join_project', (projectId: number) => {
        socket.join(`project_${projectId}`);
        console.log(`Client ${socket.id} joined project ${projectId}`);
      });

      socket.on('leave_project', (projectId: number) => {
        socket.leave(`project_${projectId}`);
        console.log(`Client ${socket.id} left project ${projectId}`);
      });

      socket.on('join_user_room', (userId: number) => {
        socket.join(`user_${userId}`);
        console.log(`Client ${socket.id} joined user room ${userId}`);
      });
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      const dbHealth = await healthCheck();

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: dbHealth
      });
    });

    // Strict rate limiting for authentication endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per 15 minutes
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Don't count successful logins
    });

    // API routes
    this.app.use('/api/v1/auth', authLimiter, authRoutes);
    this.app.use('/api/v1/projects', projectRoutes);
    this.app.use('/api/v1/phases', phaseRoutes);
    this.app.use('/api/v1/work-logs', workLogRoutes);
    this.app.use('/api/v1/users', userRoutes);
    this.app.use('/api/v1/smart-test', smartTestRoutes);
    this.app.use('/api/v1/profile', profileRoutes);
    this.app.use('/api/v1/progress', progressRoutes);
    this.app.use('/api/v1/import-data', importDataRoutes);

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', err);

      const statusCode = (err as any).statusCode || 500;
      const message = err.message || 'Internal server error';

      res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      try {
        // Close server
        this.server.close(() => {
          console.log('HTTP server closed');
        });

        // Close Socket.IO connections
        this.io.close(() => {
          console.log('Socket.IO connections closed');
        });

        // Close database connections
        await closeConnection();

        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      const dbConnected = await testConnection();
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }

      // Start server
      this.server.listen(this.port, () => {
        console.log('='.repeat(50));
        console.log('🚀 Track Management System API Started');
        console.log('='.repeat(50));
        console.log(`📡 Port: ${this.port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🏥 Health Check: http://localhost:${this.port}/health`);
        console.log('='.repeat(50));
      });

      this.setupGracefulShutdown();
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  // Method to emit real-time updates
  public emitToProject(projectId: number, event: string, data: any): void {
    this.io.to(`project_${projectId}`).emit(event, data);
  }

  public emitToUser(userId: number, event: string, data: any): void {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  public emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }
}

// Create and export app instance
const app = new App();

// Start server if this file is run directly
if (require.main === module) {
  app.start().catch((error) => {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  });
}

export default app;
export { App };
export const io = app.io;