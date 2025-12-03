import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true,
  },
  climberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['present', 'absent'],
  },
  markedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  markedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index
attendanceRecordSchema.index({ sessionId: 1, climberId: 1 }, { unique: true });

export const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);
