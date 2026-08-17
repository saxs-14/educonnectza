import express from 'express';
import {
  calculateLearnerAps,
  getUniversitiesAndProgrammes,
  getMatchingBursaries,
} from '../controllers/apsController.js';

const router = express.Router();

router.post('/calculate', calculateLearnerAps);
router.get('/universities', getUniversitiesAndProgrammes);
router.get('/bursaries', getMatchingBursaries);

export default router;
