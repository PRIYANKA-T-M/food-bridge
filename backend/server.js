import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import startCronJobs from './cron/cronJobs.js';

dotenv.config();

// Connect to MongoDB
connectDB();

// Start Cron Tasks
startCronJobs();

const app = express();
const server = http.createServer(app);

// Init Socket.io
export const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/upload', uploadRoutes);

// Socket Connections
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  // NGOs can join a room based on their userId to receive targeted alerts
  socket.on('join', (userId) => {
    socket.join(userId.toString());
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

// Basic route
app.get('/', (req, res) => {
  res.send('FoodBridge API is running...');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Restart trigger
