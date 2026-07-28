const express = require('express');
const mongoose = require('mongoose');
const redisClient = require('../config/redis');
const router = express.Router();

// Health check endpoint
router.get('/', (_req, res) => {
  const mongoReady = mongoose.connection.readyState === 1;
  const redisReady = redisClient.isReady();
  const healthy = mongoReady && redisReady;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    dependencies: { mongodb: mongoReady, redis: redisReady },
  });
});

module.exports = router; 
