import mongoose from 'mongoose';

const competitionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  sport: {
    type: String,
    required: true,
    trim: true,
  },
  groups: {
    type: String,
    default: '',
    trim: true,
  },
  rank: {
    type: String,
    required: true,
    trim: true,
  },
  sourceUrl: {
    type: String,
    default: 'https://bfka.org/calendar.php',
  },
  importedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
competitionSchema.index({ date: 1 });
competitionSchema.index({ location: 1 });
competitionSchema.index({ sport: 1 });
competitionSchema.index({ rank: 1 });
competitionSchema.index({ date: 1, location: 1 });

export const Competition = mongoose.model('Competition', competitionSchema);

