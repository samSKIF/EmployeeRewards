/**
 * This migration adds tables for employee status icons and assignments
 */
import { Pool } from 'pg';
import { db, pool } from './db';
import { employeeStatusTypes, employeeStatuses } from '@shared/schema';

async function runEmployeeStatusMigration() {
  try {
    console.log('Starting employee status migration...');

    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_status_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        icon_name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#6366F1',
        duration_days INTEGER,
        is_system BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        organization_id INTEGER REFERENCES organizations(id)
      );
      
      CREATE TABLE IF NOT EXISTS employee_statuses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status_type_id INTEGER NOT NULL REFERENCES employee_status_types(id),
        start_date DATE NOT NULL,
        end_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );
    `);

    // Add initial default status types
    await pool.query(`
      INSERT INTO employee_status_types 
        (name, icon_name, description, color, duration_days, is_system, created_at)
      VALUES
        ('On Holiday', 'PalmTree', 'Employee is on vacation', '#10b981', NULL, TRUE, NOW()),
        ('Sick Leave', 'Thermometer', 'Employee is on sick leave', '#ef4444', NULL, TRUE, NOW()),
        ('Birthday', 'Cake', 'Employee is celebrating their birthday', '#f59e0b', 1, TRUE, NOW()),
        ('Work Anniversary', 'Award', 'Employee is celebrating work anniversary', '#6366f1', 1, TRUE, NOW()),
        ('New Position', 'BadgeUp', 'Employee has a new position', '#8b5cf6', 14, TRUE, NOW()),
        ('New Hire', 'PartyPopper', 'Recently joined employee', '#3b82f6', 30, TRUE, NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('Employee status migration completed successfully!');
  } catch (error) {
    console.error('Error during employee status migration:', error);
    throw error;
  }
}

// Run the migration
runEmployeeStatusMigration()
  .then(() => {
    console.log('Employee status migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Employee status migration failed:', error);
    process.exit(1);
  });
