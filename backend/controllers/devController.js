import asyncHandler from 'express-async-handler';
import SystemConfig from '../models/SystemConfig.js';
import AcademicContent from '../models/AcademicContent.js';
import mongoose from 'mongoose';

// @desc    Get system configuration
// @route   GET /api/dev/system
// @access  Private/DevAdmin
export const getSystemConfig = asyncHandler(async (req, res) => {
    let config = await SystemConfig.findOne();
    if (!config) {
        config = await SystemConfig.create({
            version: 'v2.4.1',
            history: [
                { version: 'v2.4.0', description: 'Content update: past papers' },
                { version: 'v2.3.9', description: 'Security patch' }
            ]
        });
    }
    res.json(config);
});

// @desc    Update system scaling
// @route   PUT /api/dev/system/scaling
// @access  Private/DevAdmin
export const updateScaling = asyncHandler(async (req, res) => {
    const { minPods, maxPods } = req.body;
    const config = await SystemConfig.findOne();
    if (config) {
        config.minPods = minPods;
        config.maxPods = maxPods;
        await config.save();
        res.json(config);
    } else {
        res.status(404);
        throw new Error('Config not found');
    }
});

// @desc    Get global academic content
// @route   GET /api/dev/content
// @access  Private/DevAdmin
export const getGlobalContent = asyncHandler(async (req, res) => {
    const content = await AcademicContent.find({});
    res.json(content);
});

// @desc    Create global academic content
// @route   POST /api/dev/content
// @access  Private/DevAdmin
export const createGlobalContent = asyncHandler(async (req, res) => {
    const { title, type, grade, subject, url, year } = req.body;
    const content = await AcademicContent.create({
        title, type, grade, subject, url, year
    });
    res.status(201).json(content);
});

// @desc    Get database collections info
// @route   GET /api/dev/db/collections
// @access  Private/DevAdmin
export const getDatabaseInfo = asyncHandler(async (req, res) => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const stats = [];
    
    for (let col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        stats.push({ name: col.name, count });
    }
    
    res.json(stats);
});

// @desc    Get records from a collection
// @route   GET /api/dev/db/:collection
// @access  Private/DevAdmin
export const getCollectionRecords = asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const records = await mongoose.connection.db.collection(collection).find().limit(50).toArray();
    res.json(records);
});
