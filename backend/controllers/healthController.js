import mongoose from 'mongoose';

// @desc    Liveness check
// @route   GET /health/live
// @access  Public
export const getLiveness = (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
};

// @desc    Readiness check
// @route   GET /health/ready
// @access  Public
export const getReadiness = (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  if (dbConnected) {
    return res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      components: {
        database: { status: 'UP', state: 'connected' },
        storage: { status: 'UP', provider: process.env.R2_ACCOUNT_ID ? 'Cloudflare R2' : 'Local Disk' },
      },
    });
  }

  return res.status(503).json({
    status: 'DOWN',
    timestamp: new Date().toISOString(),
    components: {
      database: { status: 'DOWN', state: 'disconnected', readyState: mongoose.connection.readyState },
    },
  });
};
