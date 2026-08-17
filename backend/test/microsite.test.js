import { test } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SchoolMicrosite from '../models/SchoolMicrosite.js';
import School from '../models/School.js';

test('SchoolMicrosite schema enforces unique slug', async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  try {
    const school1 = await School.create({
      name: 'Pretoria High',
      uniqueCode: 'PTH001',
      province: 'GP',
    });

    const school2 = await School.create({
      name: 'Pretoria Secondary',
      uniqueCode: 'PTS002',
      province: 'GP',
    });

    await SchoolMicrosite.create({
      schoolId: school1._id,
      slug: 'pretoria-high',
    });

    // Attempting to create duplicate slug must fail
    await assert.rejects(
      async () => {
        await SchoolMicrosite.create({
          schoolId: school2._id,
          slug: 'pretoria-high',
        });
      },
      (err) => err.code === 11000
    );
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
