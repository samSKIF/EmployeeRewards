
import { auth } from './firebase-admin';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function syncFirebaseUsers() {
  try {
    // Get all users from PostgreSQL that don't have a Firebase UID
    const dbUsers = await db.select().from(users);
    console.log(`Found ${dbUsers.length} users to process`);

    for (const user of dbUsers) {
      if (!user.firebaseUid) {
        try {
          console.log(`Processing user ${user.email}`);
          
          // Check if user already exists in Firebase
          try {
            const existingUser = await auth.getUserByEmail(user.email);
            console.log(`User ${user.email} already exists in Firebase with UID: ${existingUser.uid}`);
            
            // Update PostgreSQL user with Firebase UID
            await db.update(users)
              .set({ firebaseUid: existingUser.uid })
              .where(eq(users.id, user.id));
              
          } catch (error: any) {
            // User doesn't exist in Firebase, create new account
            if (error.code === 'auth/user-not-found') {
              const firebaseUser = await auth.createUser({
                email: user.email,
                password: 'ChangeMe123!', // Temporary password
                displayName: `${user.name} ${user.surname || ''}`.trim(),
                emailVerified: true
              });
              
              console.log(`Created Firebase user for ${user.email} with UID: ${firebaseUser.uid}`);
              
              // Update PostgreSQL user with new Firebase UID
              await db.update(users)
                .set({ firebaseUid: firebaseUser.uid })
                .where(eq(users.id, user.id));
                
              // Set admin claim if user is admin
              if (user.isAdmin) {
                await auth.setCustomUserClaims(firebaseUser.uid, { isAdmin: true });
                console.log(`Set admin claims for ${user.email}`);
              }
            } else {
              throw error;
            }
          }
        } catch (error) {
          console.error(`Error processing user ${user.email}:`, error);
        }
      }
    }
    
    console.log('Firebase user sync completed');
    
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Execute the sync
syncFirebaseUsers();
