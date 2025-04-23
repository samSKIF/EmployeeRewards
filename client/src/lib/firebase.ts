import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, Timestamp } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user exists in our users collection, if not, create a record
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create a new user record in Firestore
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        username: user.email?.split('@')[0] || `user_${Math.floor(Math.random() * 10000)}`,
        isAdmin: false,
        createdAt: Timestamp.now(),
        department: null,
        points: 0
      });
    }
    
    return user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, password: string, name: string, username: string, department?: string) => {
  try {
    // Create user in Firebase Authentication
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Update the user's profile with a display name
    await updateProfile(user, {
      displayName: name
    });
    
    // Create a record in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      name: name,
      username: username,
      department: department || null,
      isAdmin: false,
      createdAt: Timestamp.now(),
      points: 0
    });
    
    return user;
  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Error signing in with email/password:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Firestore data functions
export const getUserData = async (uid: string) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return { 
        uid: userDoc.id,
        email: data.email || null,
        name: data.name || null,
        username: data.username || '',
        photoURL: data.photoURL || null,
        isAdmin: data.isAdmin || false,
        department: data.department || null,
        points: data.points || 0,
        ...data
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

// Posts
export const createPost = async (userId: string, content: string, type: string = 'general') => {
  try {
    const postsRef = collection(db, "posts");
    const newPost = {
      userId,
      content,
      type,
      likes: 0,
      comments: 0,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(postsRef, newPost);
    return { id: docRef.id, ...newPost };
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

export const getPosts = async (limitCount = 20) => {
  try {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting posts:", error);
    throw error;
  }
};

// Comments
export const addComment = async (postId: string, userId: string, content: string) => {
  try {
    const commentsRef = collection(db, "comments");
    const newComment = {
      postId,
      userId,
      content,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(commentsRef, newComment);
    
    // Update the comment count on the post
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);
    
    if (postDoc.exists()) {
      const postData = postDoc.data();
      await updateDoc(postRef, {
        comments: (postData.comments || 0) + 1
      });
    }
    
    return { id: docRef.id, ...newComment };
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

export const getCommentsByPostId = async (postId: string) => {
  try {
    const commentsRef = collection(db, "comments");
    const q = query(commentsRef, where("postId", "==", postId), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting comments:", error);
    throw error;
  }
};

// Points system
export const addPoints = async (userId: string, amount: number, reason: string) => {
  try {
    // Add transaction record
    const transactionsRef = collection(db, "transactions");
    const transaction = {
      userId,
      amount,
      reason,
      type: "credit",
      createdAt: Timestamp.now()
    };
    
    await addDoc(transactionsRef, transaction);
    
    // Update user's points
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentPoints = userData.points || 0;
      
      await updateDoc(userRef, {
        points: currentPoints + amount
      });
    }
    
    return transaction;
  } catch (error) {
    console.error("Error adding points:", error);
    throw error;
  }
};

export const spendPoints = async (userId: string, amount: number, reason: string) => {
  try {
    // Check if user has enough points
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }
    
    const userData = userDoc.data();
    const currentPoints = userData.points || 0;
    
    if (currentPoints < amount) {
      throw new Error("Not enough points");
    }
    
    // Add transaction record
    const transactionsRef = collection(db, "transactions");
    const transaction = {
      userId,
      amount: -amount,
      reason,
      type: "debit",
      createdAt: Timestamp.now()
    };
    
    await addDoc(transactionsRef, transaction);
    
    // Update user's points
    await updateDoc(userRef, {
      points: currentPoints - amount
    });
    
    return transaction;
  } catch (error) {
    console.error("Error spending points:", error);
    throw error;
  }
};

export const getUserTransactions = async (userId: string) => {
  try {
    const transactionsRef = collection(db, "transactions");
    const q = query(transactionsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting user transactions:", error);
    throw error;
  }
};

// Products
export const createProduct = async (name: string, description: string, pointsCost: number, imageUrl: string, quantity: number) => {
  try {
    const productsRef = collection(db, "products");
    const newProduct = {
      name,
      description,
      pointsCost,
      imageUrl,
      quantity,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(productsRef, newProduct);
    return { id: docRef.id, ...newProduct };
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
};

export const getProducts = async () => {
  try {
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting products:", error);
    throw error;
  }
};

// Orders
export const createOrder = async (userId: string, productId: string, quantity: number) => {
  try {
    // Get product details
    const productRef = doc(db, "products", productId);
    const productDoc = await getDoc(productRef);
    
    if (!productDoc.exists()) {
      throw new Error("Product not found");
    }
    
    const productData = productDoc.data();
    const pointsCost = productData.pointsCost * quantity;
    
    // Check inventory
    if (productData.quantity < quantity) {
      throw new Error("Not enough inventory");
    }
    
    // Spend points
    await spendPoints(userId, pointsCost, `Order for ${productData.name}`);
    
    // Create order
    const ordersRef = collection(db, "orders");
    const newOrder = {
      userId,
      productId,
      productName: productData.name,
      quantity,
      pointsCost,
      status: "pending",
      createdAt: Timestamp.now()
    };
    
    const orderRef = await addDoc(ordersRef, newOrder);
    
    // Update product inventory
    await updateDoc(productRef, {
      quantity: productData.quantity - quantity
    });
    
    return { id: orderRef.id, ...newOrder };
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

export const getUserOrders = async (userId: string) => {
  try {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting user orders:", error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status });
    
    return { id: orderId, status };
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

// Exported types
export type FirebaseUser = User;