import mongoose from 'mongoose';

const DriverSignupSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'active', 'inactive', 'suspended'] },
  kycStatus: { type: String, default: 'pending', enum: ['pending', 'verified', 'rejected', 'incomplete'] },
  signupDate: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.DriverSignup || mongoose.model('DriverSignup', DriverSignupSchema);
