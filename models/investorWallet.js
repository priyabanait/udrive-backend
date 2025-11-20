import mongoose from 'mongoose';

const InvestorWalletSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  balance: { type: Number, default: 0 },
  transactions: [
    {
      amount: Number,
      description: String,
      type: { type: String, enum: ['credit', 'debit'], default: 'credit' },
      date: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

export default mongoose.models.InvestorWallet || mongoose.model('InvestorWallet', InvestorWalletSchema);
