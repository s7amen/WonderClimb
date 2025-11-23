import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  climberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

// Compound index to ensure one record per session/climber
attendanceRecordSchema.index({ sessionId: 1, climberId: 1 }, { unique: true });

// Index on markedById for coach queries
attendanceRecordSchema.index({ markedById: 1 });

export const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

