import mongoose from 'mongoose';

const offlineSyncSchema = mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
    syncedAt: { type: Date },
  },
  { timestamps: true }
);

const OfflineSyncQueue = mongoose.model('OfflineSyncQueue', offlineSyncSchema);
export default OfflineSyncQueue;
