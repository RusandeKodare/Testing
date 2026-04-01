import express from 'express';
import cors from 'cors';
import { DatabaseConfig } from './config/database';
import { UserRepository } from './repositories/UserRepository';
import { AuthService } from './services/AuthService';
import { AuthController } from './controllers/AuthController';
import { createAuthRoutes } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

async function startServer() {
  const dbConfig = new DatabaseConfig();
  await dbConfig.initialize();

  const userRepository = new UserRepository(dbConfig.getDatabase());
  const authService = new AuthService(userRepository);
  const authController = new AuthController(authService);

  app.use('/api/auth', createAuthRoutes(authController));
  
  app.use(errorHandler);

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  process.on('SIGTERM', () => {
    dbConfig.close();
    server.close();
  });

  process.on('SIGINT', () => {
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
