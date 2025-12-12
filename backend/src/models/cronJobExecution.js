import mongoose from 'mongoose';

const cronJobExecutionSchema = new mongoose.Schema({
    jobName: {
        type: String,
        required: true,
        index: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['running', 'success', 'failed'],
        index: true,
    },
    startedAt: {
        type: Date,
        required: true,
        index: true,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    duration: {
        type: Number, // milliseconds
        default: null,
    },
    error: {
        type: String,
        default: null,
    },
    triggeredBy: {
        type: String,
        required: true,
        enum: ['cron', 'manual'],
        index: true,
    },
    triggeredByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
}, {
    timestamps: true,
});

// Compound index for faster queries
cronJobExecutionSchema.index({ jobName: 1, startedAt: -1 });

export const CronJobExecution = mongoose.model('CronJobExecution', cronJobExecutionSchema);




