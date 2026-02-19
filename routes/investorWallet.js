import express from 'express';
import InvestorWallet from '../models/investorWallet.js';

const router = express.Router();

// POST: Add wallet transaction (credit/debit)
router.post('/', async (req, res) => {
  try {
    const { phone, amount, description, type } = req.body;
    if (!phone || !amount || !type) {
      return res.status(400).json({ error: 'Phone, amount, and type are required.' });
    }
    let wallet = await InvestorWallet.findOne({ phone });
    if (!wallet) {
      wallet = new InvestorWallet({ phone, balance: 0, transactions: [] });
    }
    // Update balance
    wallet.balance = type === 'credit' ? wallet.balance + amount : wallet.balance - amount;
    // Add transaction
    wallet.transactions.push({ amount, description, type });
    await wallet.save();
    res.status(201).json(wallet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update wallet', message: error.message });
  }
});

// GET: Get wallet by phone number or username
router.get('/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    // Try to find investor first by phone/username
    const investor = await Investor.findOne({ 
      $or: [
        { phone },
        { username: phone }
      ]
    }).lean();
    
    // Use investor's phone if found, otherwise use input as phone
    const searchPhone = investor ? investor.phone : phone;
    const wallet = await InvestorWallet.findOne({ phone: searchPhone });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet', message: error.message });
  }
});

export default router;
