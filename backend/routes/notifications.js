import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/notifications', getUserNotifications);
router.patch('/notifications/mark-all-read', markAllNotificationsAsRead);
router.patch('/notifications/:id/read', markNotificationAsRead);

export default router;
