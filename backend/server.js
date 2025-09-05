require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const postsRouter = require('./routes/posts'); // Import the posts router

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/posts', postsRouter); // Use the posts router

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB first, then start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    
    // Start server after successful DB connection
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`Test: http://localhost:${PORT}/api/health`);
      console.log(`Posts: http://localhost:${PORT}/api/posts`);
    });
  })
  .catch(err => {
    console.error('⚠️ MongoDB connection failed:', err.message);
    process.exit(1); // Exit if DB connection fails
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});