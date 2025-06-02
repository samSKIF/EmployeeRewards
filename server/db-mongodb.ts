
import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URL) {
  throw new Error(
    "MONGODB_URL must be set. Did you forget to provision a MongoDB database?",
  );
}

class MongoDatabase {
  private static instance: MongoDatabase;
  private client: MongoClient;
  private db: Db | null = null;

  private constructor() {
    this.client = new MongoClient(process.env.MONGODB_URL!);
  }

  public static getInstance(): MongoDatabase {
    if (!MongoDatabase.instance) {
      MongoDatabase.instance = new MongoDatabase();
    }
    return MongoDatabase.instance;
  }

  public async connect(): Promise<Db> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db('employee_engagement');
      console.log('Connected to MongoDB');
    }
    return this.db;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }
}

export const mongoDb = MongoDatabase.getInstance();
