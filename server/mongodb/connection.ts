import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || 'employee_engagement_social';

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    
    console.log('Connected to MongoDB successfully');
    
    // Create indexes for better performance
    await createIndexes();
    
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function createIndexes() {
  try {
    // Social posts indexes
    await db.collection('social_posts').createIndex({ organizationId: 1, createdAt: -1 });
    await db.collection('social_posts').createIndex({ authorId: 1, createdAt: -1 });
    await db.collection('social_posts').createIndex({ type: 1, createdAt: -1 });
    await db.collection('social_posts').createIndex({ tags: 1 });
    await db.collection('social_posts').createIndex({ mentions: 1 });
    await db.collection('social_posts').createIndex({ isDeleted: 1 });

    // Comments indexes
    await db.collection('comments').createIndex({ postId: 1, createdAt: 1 });
    await db.collection('comments').createIndex({ authorId: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ organizationId: 1, createdAt: -1 });
    await db.collection('comments').createIndex({ isDeleted: 1 });

    // Notifications indexes
    await db.collection('notifications').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('notifications').createIndex({ organizationId: 1, createdAt: -1 });
    await db.collection('notifications').createIndex({ isRead: 1, userId: 1 });
    await db.collection('notifications').createIndex({ type: 1, userId: 1 });

    console.log('MongoDB indexes created successfully');
  } catch (error) {
    console.error('Error creating MongoDB indexes:', error);
  }
}

export function getMongoDb(): Db {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectToMongoDB() first.');
  }
  return db;
}

export async function closeMongoConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}