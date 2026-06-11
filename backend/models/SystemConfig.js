import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
    version: { type: String, required: true, default: 'v1.0.0' },
    clusterName: { type: String, default: 'ZA-CPT-01' },
    status: { type: String, enum: ['Healthy', 'Warning', 'Degraded'], default: 'Healthy' },
    minPods: { type: Number, default: 2 },
    maxPods: { type: Number, default: 10 },
    currentReplicas: { type: Number, default: 4 },
    cpuLoad: { type: Number, default: 34 },
    lastRollback: { type: Date },
    history: [{
        version: String,
        description: String,
        deployedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);
export default SystemConfig;
