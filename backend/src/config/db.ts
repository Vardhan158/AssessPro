import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000
    });

    // Remove the legacy index from the earlier StudentProfile schema.
    // The current schema uses `studentId`; keeping a unique index on the
    // removed `registrationNumber` field makes every missing value `null`
    // and prevents more than one profile from being created.
    try {
      await mongoose.connection.collection('studentprofiles').dropIndex('registrationNumber_1');
      logger.info('Removed legacy registrationNumber index from studentprofiles');
    } catch (error: any) {
      // MongoDB returns IndexNotFound when the migration has already run.
      if (error?.codeName !== 'IndexNotFound' && error?.code !== 27) {
        logger.warn('Could not remove legacy registrationNumber index', error);
      }
    }
    logger.info('Connected to MongoDB successfully');
  } catch (error) {
    logger.warn('Local MongoDB connection unavailable, running with in-memory database mode');
  }
}
