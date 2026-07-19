import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { apiLimiter, orderLimiter } from '../middleware/rateLimit.js';
import * as firestore from '../services/firestore.js';

const router = Router();

router.use(authenticate);

router.get('/orders', async (req: AuthRequest, res: Response) => {
  try {
    const { status, customerId, riderId } = req.query;
    const filters: any = {};
    if (status) filters.status = status;
    if (customerId) filters.customerId = customerId;
    if (riderId) filters.riderId = riderId;

    const orders = await firestore.listOrders(Object.keys(filters).length > 0 ? filters : undefined);
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/orders/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await firestore.getOrder(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/orders', orderLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const order = await firestore.createOrder({
      ...req.body,
      customerId: req.body.customerId || req.user?.uid
    });
    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/orders/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required' });
      return;
    }
    const order = await firestore.updateOrder(req.params.id, { status });
    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/menu', async (req: AuthRequest, res: Response) => {
  try {
    const items = await firestore.listMenuItems();
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/menu', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const item = await firestore.createMenuItem(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reservations', async (req: AuthRequest, res: Response) => {
  try {
    const reservations = await firestore.listReservations();
    res.json({ success: true, data: reservations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/riders', async (req: AuthRequest, res: Response) => {
  try {
    const riders = await firestore.listRiders();
    res.json({ success: true, data: riders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/riders', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rider = await firestore.createRider(req.body);
    res.status(201).json({ success: true, data: rider });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/users', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const users = await firestore.listUsers();
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/messages', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await firestore.listContactMessages();
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
