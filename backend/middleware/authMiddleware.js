import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { auth } from '../config/firebase.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
  try {
    const decodedToken = await auth.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    
    // Find the MongoDB user linked to this Firebase UID
    req.user = await User.findOne({ firebaseUid });
    
    if (!req.user) {
      res.status(401);
      throw new Error('User profile not found in database. Please complete registration.');
    }
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, Firebase token failed or expired');
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error('Forbidden: insufficient permissions');
    }
    next();
  };
};
