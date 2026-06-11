import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import schoolRoutes from './routes/schoolRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import studyGroupRoutes from './routes/studyGroupRoutes.js';
import offlineRoutes from './routes/offlineRoutes.js';
import allocationRoutes from './routes/allocationRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import forumRoutes from './routes/forumRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import devRoutes from './routes/devRoutes.js';

import { errorHandler, notFound } from './middleware/errorMiddleware.js';

dotenv.config();
connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/study-groups', studyGroupRoutes);
app.use('/api/offline', offlineRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dev', devRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
