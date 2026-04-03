import express, { Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { DatabaseConfig } from './config/database';
import { UserRepository } from './repositories/UserRepository';
import { AuthService } from './services/AuthService';
import { OAuthService } from './services/OAuthService';
import { AuthController } from './controllers/AuthController';
import { createAuthRoutes } from './routes/authRoutes';
import { createProfileRoutes } from './routes/profileRoutes';
import { createDiaryRoutes } from './routes/diaryRoutes';
import { createOAuthRoutes } from './routes/oauthRoutes';
import { createHealthRoutes } from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';
import { createCsrfProtection } from './middleware/csrfMiddleware';
import { getLogger } from './utils/logger';
import { DiaryRepository } from './repositories/DiaryRepository';

dotenv.config();

const logger = getLogger('server');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const trustProxy = process.env.TRUST_PROXY === 'true';

app.set('trust proxy', trustProxy);

const resolveClientKey = (req: Request): string => req.ip || req.socket.remoteAddress || 'unknown';

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
  frameguard: {
    action: 'deny'
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  throw new Error('ALLOWED_ORIGINS must be explicitly configured in production');
}

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
  keyGenerator: resolveClientKey,
});

const csrfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many CSRF token requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientKey,
});

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many profile requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientKey,
});

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many OAuth requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientKey,
});

const diaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: 'Too many diary requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientKey,
});

app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Increased for profile picture uploads
app.use('/api', createCsrfProtection([
  '/auth/csrf',
  '/health'
]));

async function startServer() {
  logger.info('Starting server initialization');
  
  const dbConfig = new DatabaseConfig();
  await dbConfig.initialize();

  const userRepository = new UserRepository(dbConfig.getDatabase(), dbConfig);
  const diaryRepository = new DiaryRepository(dbConfig.getDatabase(), dbConfig);
  
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET is not set or too short. Application cannot start.');
    throw new Error('JWT_SECRET must be set in environment and be at least 32 characters long');
  }
  
  const authLogger = getLogger('auth');
  const authService = new AuthService(userRepository, JWT_SECRET, authLogger);
  const authController = new AuthController(authService, authLogger);

  // OAuth setup (optional - only if credentials are configured)
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';

  if (googleClientId && googleClientSecret) {
    const oauthService = new OAuthService(
      userRepository,
      googleClientId,
      googleClientSecret,
      googleRedirectUri
    );
    app.use('/api/oauth', oauthLimiter, createOAuthRoutes(oauthService, JWT_SECRET));
  } else {
    if (process.env.NODE_ENV === 'development') {
      logger.info('Google OAuth credentials not configured. OAuth login is disabled in development until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.');
    } else {
      logger.warn('Google OAuth credentials not configured - OAuth login disabled');
    }
  }

  app.use('/api/auth/csrf', csrfLimiter);
  app.use('/api/auth', authLimiter, createAuthRoutes(authController));
  app.use('/api/profile', profileLimiter, createProfileRoutes(userRepository, JWT_SECRET));
  app.use('/api/diary', diaryLimiter, createDiaryRoutes(diaryRepository, JWT_SECRET));
  app.use('/api/health', createHealthRoutes());
  
  app.use(errorHandler);

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, environment: process.env.NODE_ENV, origins: allowedOrigins.join(', ') }, 'Server running');
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
