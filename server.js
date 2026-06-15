const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load .env file

const app = express();

// Middleware
app.use(cors());

// to allow phone to connect
app.use(express.json());

// JWT Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production');
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', verifyToken, require('./routes/transactions'));
app.use('/api/ai', require('./routes/ai'));

// MongoDB Connection
mongoose.connect("mongodb+srv://expense-tracker:Ismail6321@cluster0.anqk64c.mongodb.net/?appName=Cluster0")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.listen(5000, () => console.log("Server running on port 5000"));
