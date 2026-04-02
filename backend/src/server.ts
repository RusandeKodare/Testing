import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import * as winston from 'winston';
import { DatabaseConfig } from './config/database';
import { UserRepository } from './repositories/UserRepository';
import { AuthService } from './services/AuthService';
import { AuthController } from './controllers/AuthController';
import { createAuthRoutes } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

// Configure Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'please-change-this-to-a-random-256-bit-key-in-production') {
  console.error('ERROR: JWT_SECRET must be set in environment variables!');
  console.error('Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('WARNING: Using default JWT_SECRET in development mode - DO NOT USE IN PRODUCTION');
  }
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

async function startServer() {
  const dbConfig = new DatabaseConfig();
  await dbConfig.initialize();

  const userRepository = new UserRepository(dbConfig.getDatabase());
  
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET is not set or too short. Application cannot start.');
    throw new Error('JWT_SECRET must be set in environment and be at least 32 characters long');
  }
  
  const authService = new AuthService(userRepository, JWT_SECRET, logger);
  const authController = new AuthController(authService, logger);

  app.use('/api/auth', authLimiter, createAuthRoutes(authController));
  
  app.use(errorHandler);

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    dbConfig.close();
    server.close();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    dbConfig.close();
    server.close();
    process.exit(0);
  });

  const saveInterval = setInterval(() => {
    dbConfig.save();
  }, 5000);

  process.on('exit', () => {
    clearInterval(saveInterval);
    dbConfig.close();
  });
}

startServer().catch(console.error);
