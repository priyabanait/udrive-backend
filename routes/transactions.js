import express from 'express';
import Transaction from '../models/transaction.js';
import { authenticateToken } from './middleware.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const list = await Transaction.find().lean();
  
  // Calculate total amount if requested
  if (req.query.include === 'summary') {
    const totalAmount = list.reduce((sum, t) => sum + (t.amount || 0), 0);
    const completedAmount = list.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0);
    const pendingAmount = list.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.amount || 0), 0);
    
    return res.json({
      transactions: list,
      summary: {
        total: list.length,
        totalAmount,
        completedAmount,
        pendingAmount,
        completedCount: list.filter(t => t.status === 'completed').length,
        pendingCount: list.filter(t => t.status === 'pending').length,
        failedCount: list.filter(t => t.status === 'failed').length
      }
    });
  }
  
  res.json(list);
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const transaction = await Transaction.findOne({ id }).lean();
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Include summary if requested
    if (req.query.include === 'summary') {
      // Calculate driver's total transactions
      const driverTransactions = await Transaction.find({ driverId: transaction.driverId }).lean();
      const summary = {
        driverTotal: driverTransactions.length,
        driverTotalAmount: driverTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        driverCompletedAmount: driverTransactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0),
        driverPendingAmount: driverTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.amount || 0), 0),
        driverCompletedCount: driverTransactions.filter(t => t.status === 'completed').length,
        driverPendingCount: driverTransactions.filter(t => t.status === 'pending').length,
      };
      
      return res.json({
        transaction,
        summary
      });
    }
    
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch transaction', error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const max = await Transaction.find().sort({ id: -1 }).limit(1).lean();
  const nextId = (max[0]?.id || 0) + 1;
  const body = req.body || {};
  const tx = await Transaction.create({ id: nextId, ...body });
  res.status(201).json(tx);
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  await Transaction.deleteOne({ id });
  res.json({ message: 'Deleted' });
});

export default router;
