import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
} from '../controllers/calendarController.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getEvents)
  .post(createEvent);

router.route('/:id')
  .put(updateEvent)
  .delete(deleteEvent);

export default router;
