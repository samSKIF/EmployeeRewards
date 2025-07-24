import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from '@shared/mysql-schema';

if (!process.env.MYSQL_DATABASE_URL) {
  throw new Error(
    'MYSQL_DATABASE_URL must be set. Did you forget to provision a MySQL database?'
  );
}

export const mysqlPool = mysql.createPool({
  uri: process.env.MYSQL_DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const mysqlDb = drizzle(mysqlPool, { schema, mode: 'default' });
