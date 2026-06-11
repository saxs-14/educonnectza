import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
    getSystemConfig,
    updateScaling,
    getGlobalContent,
    createGlobalContent,
    getDatabaseInfo,
    getCollectionRecords
} from '../controllers/devController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('DevAdmin'));

router.get('/system', getSystemConfig);
router.put('/system/scaling', updateScaling);

router.route('/content')
    .get(getGlobalContent)
    .post(createGlobalContent);

router.get('/db/collections', getDatabaseInfo);
router.get('/db/:collection', getCollectionRecords);

export default router;
