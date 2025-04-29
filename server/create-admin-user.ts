// Script to create an admin user in Firebase and our database
import { auth } from './firebase-admin';
import { db } from './db';
import { users } from '../shared/schema';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';

async function createAdminUser() {
  try {
    const adminEmail = 'admin@demo.io';
    const adminPassword = 'admin123';
    
    console.log(`Creating admin user: ${adminEmail}`);
    
    // Check if user already exists in Firebase
    try {
      const userRecord = await auth.getUserByEmail(adminEmail);
      console.log('Admin user already exists in Firebase:', userRecord.uid);
      
      // Update custom claims to ensure admin status
      await auth.setCustomUserClaims(userRecord.uid, { isAdmin: true });
      console.log('Updated admin claims for user');
      
      return userRecord;
    } catch (error: any) {
      // User doesn't exist, create a new one
      if (error.code === 'auth/user-not-found') {
        console.log('Admin user not found in Firebase, creating new user...');
        
        const userRecord = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: 'Admin User',
          emailVerified: true
        });
        
        console.log('Admin user created in Firebase:', userRecord.uid);
        
        // Set custom claims for the new user
        await auth.setCustomUserClaims(userRecord.uid, { isAdmin: true });
        console.log('Set admin claims for new user');
        
        // Hash password for database storage
        const hashedPassword = await hash(adminPassword, 10);
        
        // Check if user exists in our database
        const existingUser = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
        
        if (existingUser.length === 0) {
          // Create user in our database
          const newUser = await db.insert(users).values({
            email: adminEmail,
            username: 'admin',
            name: 'Admin User',
            password: hashedPassword,
            firebaseUid: userRecord.uid,
            isAdmin: true,
            status: 'active',
            roleType: 'client_admin'
          }).returning();
          
          console.log('Admin user created in database:', newUser[0].id);
        } else {
          // Update existing user's Firebase UID
          await db.update(users)
            .set({ 
              firebaseUid: userRecord.uid,
              isAdmin: true 
            })
            .where(eq(users.email, adminEmail));
            
          console.log('Updated existing admin user in database with Firebase UID');
        }
        
        return userRecord;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to create admin user:', error);
    throw error;
  }
}

// No need for direct execution check in ESM
// Just export the function for use in other modules
export { createAdminUser };