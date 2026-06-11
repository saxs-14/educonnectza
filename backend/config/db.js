import mongoose from 'mongoose';

/**
 * Connect to MongoDB using the URI defined in `.env`.
 * Supports standard `mongodb://` or Atlas SRV (`mongodb+srv://`) URIs.
 */
const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    // Custom DNS SRV Resolver to bypass strict local ISP/Router DNS blocking
    if (mongoUri && mongoUri.startsWith('mongodb+srv://')) {
      console.log('Detected mongodb+srv. Attempting custom DNS resolution to bypass ECONNREFUSED/ETIMEOUT...');
      try {
        const dns = await import('dns/promises');
        dns.setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS
        const url = new URL(mongoUri);
        const hostname = url.hostname;
        
        console.log(`Resolving SRV for _mongodb._tcp.${hostname}...`);
        const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${hostname}`);
        
        if (srvRecords && srvRecords.length > 0) {
          const hosts = srvRecords.map(record => `${record.name}:${record.port}`).join(',');
          
          // Construct standard mongodb:// URI
          let newUri = `mongodb://${url.username}:${url.password}@${hosts}/educonnectza?ssl=true&authSource=admin`;
          if (url.search) {
             const params = new URLSearchParams(url.search);
             params.forEach((value, key) => {
                 if (key !== 'appName' && key !== 'retryWrites') newUri += `&${key}=${value}`;
             });
             newUri += '&retryWrites=true';
          }
          console.log('Successfully resolved raw MongoDB nodes via Google DNS. Bypassing +srv.');
          mongoUri = newUri;
        }
      } catch (dnsError) {
        console.warn('Custom DNS resolution failed, falling back to original URI.', dnsError.message);
      }
    }

    const conn = await mongoose.connect(mongoUri, {
      dbName: 'educonnectza',
      serverSelectionTimeoutMS: 20000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  }
};

export default connectDB;
