
import { getFirestore } from 'firebase-admin/firestore';
import { auth } from './firebase-admin';
import { hash, compare } from 'bcrypt';

const db = getFirestore();

// Collections
const usersCollection = db.collection('users');
const postsCollection = db.collection('posts');
const commentsCollection = db.collection('comments');
const reactionsCollection = db.collection('reactions');
const pollsCollection = db.collection('polls');
const pollVotesCollection = db.collection('pollVotes');
const recognitionsCollection = db.collection('recognitions');
const accountsCollection = db.collection('accounts');
const transactionsCollection = db.collection('transactions');
const productsCollection = db.collection('products');
const ordersCollection = db.collection('orders');
const conversationsCollection = db.collection('conversations');
const messagesCollection = db.collection('messages');

export const storage = {
  // User management
  async createUser(userData: any) {
    const hashedPassword = await hash(userData.password, 10);
    const userRef = await usersCollection.add({
      ...userData,
      password: hashedPassword,
      createdAt: new Date()
    });
    return { id: userRef.id, ...userData };
  },

  async getUserByEmail(email: string) {
    const snapshot = await usersCollection.where('email', '==', email).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async getUserByFirebaseUid(firebaseUid: string) {
    const snapshot = await usersCollection.where('firebaseUid', '==', firebaseUid).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async verifyPassword(password: string, hashedPassword: string) {
    return compare(password, hashedPassword);
  },

  // Posts and social features
  async createPost(userId: string, postData: any) {
    const postRef = await postsCollection.add({
      ...postData,
      userId,
      createdAt: new Date()
    });
    return { id: postRef.id, ...postData };
  },

  async getPosts(limit = 20, offset = 0) {
    const snapshot = await postsCollection
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // Points and transactions
  async getUserBalance(userId: string) {
    const snapshot = await accountsCollection
      .where('userId', '==', userId)
      .get();
    
    if (snapshot.empty) {
      await accountsCollection.add({
        userId,
        balance: 0,
        createdAt: new Date()
      });
      return 0;
    }

    return snapshot.docs[0].data().balance;
  },

  async createTransaction(data: any) {
    const batch = db.batch();
    
    // Update account balances
    if (data.fromAccountId) {
      const fromRef = accountsCollection.doc(data.fromAccountId);
      batch.update(fromRef, {
        balance: data.currentFromBalance - data.amount
      });
    }
    
    if (data.toAccountId) {
      const toRef = accountsCollection.doc(data.toAccountId);
      batch.update(toRef, {
        balance: data.currentToBalance + data.amount
      });
    }

    // Create transaction record
    const transactionRef = transactionsCollection.doc();
    batch.set(transactionRef, {
      ...data,
      createdAt: new Date()
    });

    await batch.commit();
    return { id: transactionRef.id, ...data };
  }

  // Add other methods as needed...
};
