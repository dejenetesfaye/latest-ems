const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io); // Expose io to controllers

app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    // Auto-seed check
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Database empty. Auto-seeding initial admin accounts...');
      const hashedPassword = await bcrypt.hash('sys1212', await bcrypt.genSalt(10)); // Default secure seeding
      const sys123 = await bcrypt.hash('sys123', await bcrypt.genSalt(10));
      const admin123 = await bcrypt.hash('admin123', await bcrypt.genSalt(10));
      
      const systemadmin = await User.create({
        name: 'System Admin', username: 'sysadmin', password: sys123, role: 'systemadmin'
      });
      await User.create({
        name: 'Abebe Events', username: 'admin', password: admin123, role: 'superadmin', createdBy: systemadmin._id
      });
      console.log('✅ Auto-seed complete: sysadmin/sys123 and admin/admin123 created.');
    }
  })
  .catch((err) => console.error('MongoDB connection error:', err));

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
