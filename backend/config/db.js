import mongoose from 'mongoose';

/**
 * Connect to MongoDB using URI defined in `.env`.
 * In production/staging, strict connection to configured MONGO_URI is required.
 * Falls back to MongoMemoryServer ONLY in development/test modes when remote Atlas is unreachable.
 */
const connectDB = async () => {
  let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/educonnectza';

  // Custom DNS SRV Resolver to bypass strict local ISP/Router DNS blocking
  if (mongoUri && mongoUri.startsWith('mongodb+srv://')) {
    try {
      const dns = await import('dns/promises');
      dns.setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS
      const url = new URL(mongoUri);
      const hostname = url.hostname;
      
      const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${hostname}`);
      
      if (srvRecords && srvRecords.length > 0) {
        const hosts = srvRecords.map(record => `${record.name}:${record.port}`).join(',');
        let newUri = `mongodb://${url.username}:${url.password}@${hosts}/educonnectza?ssl=true&authSource=admin&retryWrites=true`;
        mongoUri = newUri;
      }
    } catch (dnsError) {
      console.warn('[DB] Custom DNS resolution fallback active.');
    }
  }

  const isStrictProductionEnv = ['production', 'staging'].includes(process.env.NODE_ENV);

  try {
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'educonnectza',
      serverSelectionTimeoutMS: isStrictProductionEnv ? 10000 : 3000,
    });
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (isStrictProductionEnv) {
      console.error(`[DB CRITICAL] MongoDB connection failed in ${process.env.NODE_ENV} environment: ${error.message}`);
      mongoose.set('bufferCommands', false);
      throw error;
    }

    console.warn(`[DB DEV] Remote MongoDB connection failed (${error.message}). Starting ephemeral in-memory database...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      const conn = await mongoose.connect(memoryUri, { dbName: 'educonnectza' });
      console.log(`[DB DEV] In-Memory MongoDB Connected successfully: ${conn.connection.host}`);
    } catch (memError) {
      console.error(`[DB DEV] Fallback in-memory MongoDB error: ${memError.message}`);
      mongoose.set('bufferCommands', false);
    }
  }
};

export default connectDB;
