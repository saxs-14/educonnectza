import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

export const connectTestDb = async () => {
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await mongoose.connect(mongod.getUri(), { dbName: 'educonnectza-test' });
};

export const clearTestDb = async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};

export const disconnectTestDb = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};
