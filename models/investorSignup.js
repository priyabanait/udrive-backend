import mongoose from 'mongoose';

const InvestorSignupSchema = new mongoose.Schema({
  investorName: { type: String, required: true },
  email: { type: String, required: false },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'active', 'inactive'] },
  kycStatus: { type: String, default: 'pending', enum: ['pending', 'verified', 'rejected'] },
  signupDate: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.InvestorSignup || mongoose.model('InvestorSignup', InvestorSignupSchema);
