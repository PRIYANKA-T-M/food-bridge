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
import notificationRoutes from './routes/notificationRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import startCronJobs from './cron/cronJobs.js';
import Claim from './models/Claim.js';

dotenv.config();

// Connect to MongoDB
await connectDB();

// Clean older tracking documents that were created before a full GeoJSON point existed.
await Claim.updateMany(
  { currentLocation: { $exists: true }, 'currentLocation.coordinates': { $exists: false } },
  { $unset: { currentLocation: '' } }
);

try {
  const indexes = await Claim.collection.indexes();
  const currentLocationIndex = indexes.find((index) => index.key?.currentLocation === '2dsphere');
  if (currentLocationIndex && !currentLocationIndex.partialFilterExpression) {
    await Claim.collection.dropIndex(currentLocationIndex.name);
  }
  await Claim.syncIndexes();
} catch (error) {
  console.error('Claim geospatial index repair failed:', error.message);
}

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

// Socket Connections
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  // NGOs can join a room based on their userId to receive targeted alerts
  socket.on('join', (userId) => {
    socket.join(userId.toString());
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on('JOIN_CLAIM', (claimId) => {
    socket.join(`claim:${claimId}`);
  });

  socket.on('START_DELIVERY', (payload) => {
    if (payload?.claimId) {
      io.to(`claim:${payload.claimId}`).emit('START_DELIVERY', payload);
    }
  });

  socket.on('LOCATION_UPDATE', (payload) => {
    if (payload?.claimId) {
      io.to(`claim:${payload.claimId}`).emit('LOCATION_UPDATE', payload);
    }
  });

  socket.on('DELIVERY_COMPLETED', (payload) => {
    if (payload?.claimId) {
      io.to(`claim:${payload.claimId}`).emit('DELIVERY_COMPLETED', payload);
    }
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
