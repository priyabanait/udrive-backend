import mongoose from 'mongoose';

const DriverPlanSelectionSchema = new mongoose.Schema({
  driverSignupId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DriverSignup', 
    required: true 
  },
  driverUsername: { type: String },
  driverMobile: { type: String, required: true },
  planId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  planName: { type: String, required: true },
  planType: { 
    type: String, 
    required: true, 
    enum: ['weekly', 'daily'] 
  },
  securityDeposit: { type: Number, default: 0 },
  rentSlabs: { type: Array, default: [] },
  selectedRentSlab: { type: Object, default: null },
  selectedDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    default: 'active', 
    enum: ['active', 'inactive', 'completed', 'cancelled'] 
  }
}, { timestamps: true });

// Index for faster queries
DriverPlanSelectionSchema.index({ driverSignupId: 1 });
DriverPlanSelectionSchema.index({ driverMobile: 1 });
DriverPlanSelectionSchema.index({ planId: 1 });

export default mongoose.models.DriverPlanSelection || mongoose.model('DriverPlanSelection', DriverPlanSelectionSchema);
