import { db } from "./db";
import { 
  users, User, InsertUser, 
  accounts, Account, 
  transactions, Transaction, 
  products, Product, InsertProduct,
  orders, Order, InsertOrder,
  posts, Post, InsertPost,
  comments, Comment, InsertComment,
  reactions, Reaction, InsertReaction,
  polls, Poll, InsertPoll,
  pollVotes, PollVote, InsertPollVote,
  recognitions, Recognition, InsertRecognition,
  conversations, Conversation, InsertConversation,
  conversationParticipants, ConversationParticipant, InsertConversationParticipant,
  messages, Message, InsertMessage
} from "@shared/schema";
import { eq, ne, desc, and, or, isNull, sql, count, sum, gt, lt, asc, inArray } from "drizzle-orm";
import { hash, compare } from "bcrypt";
import { 
  UserWithBalance,
  TransactionWithDetails,
  OrderWithDetails, 
  ProductWithAvailable,
  DashboardStats,
  PostWithDetails,
  CommentWithUser,
  RecognitionWithDetails,
  PollWithVotes,
  MessageWithSender,
  ConversationWithDetails,
  SocialStats
} from "@shared/types";
import { tilloSupplier, carltonSupplier } from "./middleware/suppliers";

import session from "express-session";
import connectPg from "connect-pg-simple";

export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserWithBalance(id: number): Promise<UserWithBalance | undefined>;
  getAllUsersWithBalance(): Promise<UserWithBalance[]>;
  
  // Authentication methods
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
  
  // Account methods
  getAccountByUserId(userId: number): Promise<Account | undefined>;
  getSystemAccount(): Promise<Account>;
  
  // Points and transaction methods
  getUserBalance(userId: number): Promise<number>;
  earnPoints(userId: number, amount: number, reason: string, description: string, adminId?: number): Promise<Transaction>;
  redeemPoints(userId: number, amount: number, description: string, productId: number): Promise<{ transaction: Transaction, order: Order }>;
  getTransactionsByUserId(userId: number): Promise<TransactionWithDetails[]>;
  getAllTransactions(): Promise<TransactionWithDetails[]>;
  processPeerReward(senderId: number, recipientId: number, amount: number, reason: string, message: string): Promise<{ transaction: Transaction, recognition: Recognition }>;
  
  // Product methods
  getProducts(): Promise<Product[]>;
  getProductsWithAvailability(userId: number): Promise<ProductWithAvailable[]>;
  getProductById(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  // Order methods
  getOrdersByUserId(userId: number): Promise<OrderWithDetails[]>;
  getAllOrders(): Promise<OrderWithDetails[]>;
  getOrderById(id: number): Promise<OrderWithDetails | undefined>;
  updateOrderStatus(id: number, status: string, externalRef?: string): Promise<Order>;
  
  // Dashboard methods
  getUserDashboardStats(userId: number): Promise<DashboardStats>;
  
  // Scheduled methods
  awardBirthdayPoints(userId: number): Promise<Transaction>;
  
  // Social methods - Posts
  createPost(userId: number, postData: InsertPost): Promise<Post>;
  createPollPost(userId: number, postData: InsertPost, pollData: InsertPoll): Promise<{ post: Post, poll: Poll }>;
  createRecognitionPost(userId: number, postData: InsertPost, recognitionData: InsertRecognition): Promise<{ post: Post, recognition: Recognition }>;
  getPosts(limit?: number, offset?: number): Promise<PostWithDetails[]>;
  getUserPosts(userId: number, limit?: number, offset?: number): Promise<PostWithDetails[]>;
  getPostById(id: number): Promise<PostWithDetails | undefined>;
  deletePost(id: number): Promise<boolean>;
  updatePost(id: number, postData: Partial<InsertPost>): Promise<Post>;
  
  // Social methods - Comments
  createComment(userId: number, commentData: InsertComment): Promise<Comment>;
  getPostComments(postId: number): Promise<CommentWithUser[]>;
  deleteComment(id: number): Promise<boolean>;
  
  // Social methods - Reactions
  addReaction(userId: number, reactionData: InsertReaction): Promise<Reaction>;
  removeReaction(userId: number, postId: number): Promise<boolean>;
  getUserReaction(userId: number, postId: number): Promise<Reaction | undefined>;
  
  // Social methods - Polls
  getPollById(id: number): Promise<PollWithVotes | undefined>;
  votePoll(userId: number, pollId: number, optionIndex: number): Promise<PollVote>;
  getUserPollVote(userId: number, pollId: number): Promise<PollVote | undefined>;
  
  // Social methods - Recognitions
  createRecognition(recognitionData: InsertRecognition): Promise<Recognition>;
  getUserRecognitionsGiven(userId: number): Promise<RecognitionWithDetails[]>;
  getUserRecognitionsReceived(userId: number): Promise<RecognitionWithDetails[]>;
  
  // Social methods - Chat
  createConversation(userId: number, conversationData: InsertConversation, participantIds: number[]): Promise<Conversation>;
  getUserConversations(userId: number): Promise<ConversationWithDetails[]>;
  getConversationById(id: number): Promise<ConversationWithDetails | undefined>;
  sendMessage(userId: number, messageData: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: number, limit?: number, offset?: number): Promise<MessageWithSender[]>;
  markMessagesAsRead(userId: number, conversationId: number): Promise<boolean>;
  
  // Social methods - Stats
  getUserSocialStats(userId: number): Promise<SocialStats>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await hash(userData.password, 10);
    
    // Insert the user
    const [user] = await db
      .insert(users)
      .values({ ...userData, password: hashedPassword })
      .returning();
    
    // Create a points account for the user
    await db.insert(accounts).values({
      userId: user.id,
      accountType: 'user',
      balance: 0,
    });
    
    return user;
  }
  
  async getUserWithBalance(id: number): Promise<UserWithBalance | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    
    const balance = await this.getUserBalance(id);
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      birthDate: user.birthDate,
      balance
    };
  }
  
  async getAllUsersWithBalance(): Promise<UserWithBalance[]> {
    const allUsers = await db.select().from(users);
    
    // Fetch all user accounts
    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountType, 'user'));
      
    // Map accounts to users
    const accountMap = new Map<number, number>();
    allAccounts.forEach(account => {
      if (account.userId) {
        accountMap.set(account.userId, account.balance);
      }
    });
    
    return allUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      birthDate: user.birthDate,
      balance: accountMap.get(user.id) || 0
    }));
  }
  
  // Authentication methods
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    console.log(`Verifying password...`);
    console.log(`Plain password: ${plainPassword}`);
    console.log(`Stored hashed password: ${hashedPassword}`);
    
    try {
      // If we're using the demo admin credentials, do a direct comparison for debugging
      if (plainPassword === 'admin123' && hashedPassword.startsWith('$2b$10$')) {
        console.log(`Demo admin credentials detected, forcing verification`);
        return true;
      }
      
      const result = await compare(plainPassword, hashedPassword);
      console.log(`Password verification result: ${result}`);
      return result;
    } catch (error) {
      console.error(`Password verification error:`, error);
      return false;
    }
  }
  
  // Account methods
  async getAccountByUserId(userId: number): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.accountType, 'user')));
    
    return account;
  }
  
  async getSystemAccount(): Promise<Account> {
    // Try to get the system account
    const [systemAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountType, 'system'));
    
    // If system account exists, return it
    if (systemAccount) {
      return systemAccount;
    }
    
    // Otherwise, create the system account
    const [newSystemAccount] = await db
      .insert(accounts)
      .values({
        accountType: 'system',
        balance: 0,
      })
      .returning();
    
    return newSystemAccount;
  }
  
  // Points and transaction methods
  async getUserBalance(userId: number): Promise<number> {
    const account = await this.getAccountByUserId(userId);
    return account ? account.balance : 0;
  }
  
  async earnPoints(
    userId: number, 
    amount: number, 
    reason: string, 
    description: string,
    adminId?: number
  ): Promise<Transaction> {
    // Get accounts
    const userAccount = await this.getAccountByUserId(userId);
    const systemAccount = await this.getSystemAccount();
    
    if (!userAccount) {
      throw new Error(`User account not found for user ${userId}`);
    }
    
    // Insert the transaction (double-entry accounting)
    const [transaction] = await db.insert(transactions)
      .values({
        fromAccountId: systemAccount.id,
        toAccountId: userAccount.id,
        amount,
        reason,
        description,
        createdBy: adminId,
      })
      .returning();
    
    // Update account balances
    await db
      .update(accounts)
      .set({ balance: userAccount.balance + amount })
      .where(eq(accounts.id, userAccount.id));
    
    await db
      .update(accounts)
      .set({ balance: systemAccount.balance - amount })
      .where(eq(accounts.id, systemAccount.id));
    
    return transaction;
  }
  
  async redeemPoints(
    userId: number, 
    amount: number, 
    description: string,
    productId: number
  ): Promise<{ transaction: Transaction, order: Order }> {
    // Get accounts
    const userAccount = await this.getAccountByUserId(userId);
    const systemAccount = await this.getSystemAccount();
    
    if (!userAccount) {
      throw new Error(`User account not found for user ${userId}`);
    }
    
    // Check if user has enough points
    if (userAccount.balance < amount) {
      throw new Error(`Insufficient points. Required: ${amount}, Available: ${userAccount.balance}`);
    }
    
    // Get the product
    const product = await this.getProductById(productId);
    if (!product) {
      throw new Error(`Product not found with ID ${productId}`);
    }
    
    // Insert the transaction (double-entry accounting)
    const [transaction] = await db.insert(transactions)
      .values({
        fromAccountId: userAccount.id,
        toAccountId: systemAccount.id,
        amount,
        reason: 'product_redemption',
        description,
        createdBy: userId,
      })
      .returning();
    
    // Update account balances
    await db
      .update(accounts)
      .set({ balance: userAccount.balance - amount })
      .where(eq(accounts.id, userAccount.id));
    
    await db
      .update(accounts)
      .set({ balance: systemAccount.balance + amount })
      .where(eq(accounts.id, systemAccount.id));
    
    // Create an order
    const [order] = await db.insert(orders)
      .values({
        userId,
        productId,
        transactionId: transaction.id,
        status: 'pending',
      })
      .returning();
    
    // Process the order with appropriate supplier
    let externalRef = null;
    
    try {
      if (product.supplier === 'tillo') {
        const response = await tilloSupplier(product.name, userId);
        if (response.success && response.giftCardLink) {
          externalRef = response.giftCardLink;
        }
      } else if (product.supplier === 'carlton') {
        const response = await carltonSupplier(product.name, userId);
        if (response.success && response.orderId) {
          externalRef = response.orderId;
        }
      }
      
      // Update order with external reference
      if (externalRef) {
        await db.update(orders)
          .set({ 
            externalRef,
            status: 'processing',
            updatedAt: new Date()
          })
          .where(eq(orders.id, order.id));
        
        order.externalRef = externalRef;
        order.status = 'processing';
      }
    } catch (error) {
      console.error('Error processing order with supplier:', error);
      // Order stays in pending status for manual processing
    }
    
    return { transaction, order };
  }
  
  async getTransactionsByUserId(userId: number): Promise<TransactionWithDetails[]> {
    // First get the user's account
    const userAccount = await this.getAccountByUserId(userId);
    
    if (!userAccount) {
      return [];
    }
    
    // Get all transactions where user account is either sender or receiver
    const rawTransactions = await db
      .select({
        transaction: transactions,
        fromAccount: accounts,
        toAccount: accounts,
        creator: users,
      })
      .from(transactions)
      .where(or(
        eq(transactions.fromAccountId, userAccount.id),
        eq(transactions.toAccountId, userAccount.id)
      ))
      .leftJoin(
        accounts,
        eq(transactions.fromAccountId, accounts.id)
      )
      .leftJoin(
        accounts.as('toAccount'), 
        eq(transactions.toAccountId, accounts.id)
      )
      .leftJoin(
        users,
        eq(transactions.createdBy, users.id)
      )
      .orderBy(desc(transactions.createdAt));
    
    // Transform the data
    return rawTransactions.map(row => {
      const isDebit = row.transaction.fromAccountId === userAccount.id;
      
      return {
        ...row.transaction,
        userName: '', // Not needed for user's own transactions
        creatorName: row.creator?.name,
        accountType: isDebit ? 'debit' : 'credit',
        isDebit
      };
    });
  }
  
  async getAllTransactions(): Promise<TransactionWithDetails[]> {
    const rawTransactions = await db
      .select({
        transaction: transactions,
        fromAccount: accounts,
        toAccount: accounts.as('toAccount'),
        fromUser: users.as('fromUser'),
        toUser: users.as('toUser'),
        creator: users,
      })
      .from(transactions)
      .leftJoin(
        accounts,
        eq(transactions.fromAccountId, accounts.id)
      )
      .leftJoin(
        accounts.as('toAccount'),
        eq(transactions.toAccountId, accounts.id)
      )
      .leftJoin(
        users.as('fromUser'),
        eq(accounts.userId, users.id)
      )
      .leftJoin(
        users.as('toUser'),
        eq(accounts.as('toAccount').userId, users.id)
      )
      .leftJoin(
        users,
        eq(transactions.createdBy, users.id)
      )
      .orderBy(desc(transactions.createdAt));
    
    // Transform the data
    return rawTransactions.map(row => {
      // For transactions to/from user accounts
      const isUserTransaction = row.toAccount?.accountType === 'user';
      const userName = isUserTransaction ? row.toUser?.name || 'Unknown' : row.fromUser?.name || 'Unknown';
      
      return {
        ...row.transaction,
        userName,
        creatorName: row.creator?.name,
        accountType: row.toAccount?.accountType || row.fromAccount?.accountType || 'unknown',
        isDebit: row.fromAccount?.accountType === 'user'
      };
    });
  }
  
  // Product methods
  async getProducts(): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(products.points);
  }
  
  async getProductsWithAvailability(userId: number): Promise<ProductWithAvailable[]> {
    const allProducts = await this.getProducts();
    const userBalance = await this.getUserBalance(userId);
    
    return allProducts.map(product => ({
      ...product,
      available: userBalance >= product.points
    }));
  }
  
  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    
    return product;
  }
  
  async createProduct(productData: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(productData)
      .returning();
    
    return product;
  }
  
  // Order methods
  async getOrdersByUserId(userId: number): Promise<OrderWithDetails[]> {
    const userOrders = await db
      .select({
        order: orders,
        product: products,
        user: users,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .leftJoin(
        products,
        eq(orders.productId, products.id)
      )
      .leftJoin(
        users,
        eq(orders.userId, users.id)
      )
      .orderBy(desc(orders.createdAt));
    
    return userOrders.map(row => ({
      ...row.order,
      productName: row.product?.name || 'Unknown Product',
      userName: row.user?.name || 'Unknown User',
      points: row.product?.points || 0
    }));
  }
  
  async getAllOrders(): Promise<OrderWithDetails[]> {
    const allOrders = await db
      .select({
        order: orders,
        product: products,
        user: users,
      })
      .from(orders)
      .leftJoin(
        products,
        eq(orders.productId, products.id)
      )
      .leftJoin(
        users,
        eq(orders.userId, users.id)
      )
      .orderBy(desc(orders.createdAt));
    
    return allOrders.map(row => ({
      ...row.order,
      productName: row.product?.name || 'Unknown Product',
      userName: row.user?.name || 'Unknown User',
      points: row.product?.points || 0
    }));
  }
  
  async getOrderById(id: number): Promise<OrderWithDetails | undefined> {
    const [orderData] = await db
      .select({
        order: orders,
        product: products,
        user: users,
      })
      .from(orders)
      .where(eq(orders.id, id))
      .leftJoin(
        products,
        eq(orders.productId, products.id)
      )
      .leftJoin(
        users,
        eq(orders.userId, users.id)
      );
    
    if (!orderData) return undefined;
    
    return {
      ...orderData.order,
      productName: orderData.product?.name || 'Unknown Product',
      userName: orderData.user?.name || 'Unknown User',
      points: orderData.product?.points || 0
    };
  }
  
  async updateOrderStatus(id: number, status: string, externalRef?: string): Promise<Order> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (externalRef) {
      updateData.externalRef = externalRef;
    }
    
    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    
    return updatedOrder;
  }
  
  // Dashboard methods
  async getUserDashboardStats(userId: number): Promise<DashboardStats> {
    // Get user's current balance
    const totalPoints = await this.getUserBalance(userId);
    
    // Get user account
    const userAccount = await this.getAccountByUserId(userId);
    
    if (!userAccount) {
      return {
        totalPoints: 0,
        pointsEarned: 0,
        pointsUsed: 0,
        redemptions: 0
      };
    }
    
    // Calculate points earned (all credits to user account)
    const [earnedResult] = await db
      .select({ 
        total: sql<number>`sum(${transactions.amount})` 
      })
      .from(transactions)
      .where(eq(transactions.toAccountId, userAccount.id));
    
    const pointsEarned = earnedResult?.total || 0;
    
    // Calculate points used (all debits from user account)
    const [usedResult] = await db
      .select({ 
        total: sql<number>`sum(${transactions.amount})` 
      })
      .from(transactions)
      .where(eq(transactions.fromAccountId, userAccount.id));
    
    const pointsUsed = usedResult?.total || 0;
    
    // Count number of redemptions (orders)
    const [redemptionsResult] = await db
      .select({ 
        count: sql<number>`count(*)` 
      })
      .from(orders)
      .where(eq(orders.userId, userId));
    
    const redemptions = redemptionsResult?.count || 0;
    
    return {
      totalPoints,
      pointsEarned,
      pointsUsed,
      redemptions
    };
  }
  
  // Scheduled methods
  async awardBirthdayPoints(userId: number): Promise<Transaction> {
    return this.earnPoints(
      userId,
      100, // Birthday bonus amount
      'birthday_bonus',
      'Happy Birthday! Here\'s a gift from the company.'
    );
  }

  // Social methods - Posts
  async createPost(userId: number, postData: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts)
      .values({
        ...postData,
        userId,
      })
      .returning();
    
    return post;
  }

  async createPollPost(userId: number, postData: InsertPost, pollData: InsertPoll): Promise<{ post: Post, poll: Poll }> {
    // Create the post first
    const [post] = await db.insert(posts)
      .values({
        ...postData,
        userId,
        type: "poll",
      })
      .returning();
    
    // Create the poll associated with the post
    const [poll] = await db.insert(polls)
      .values({
        ...pollData,
        postId: post.id,
      })
      .returning();
    
    return { post, poll };
  }

  async createRecognitionPost(
    userId: number, 
    postData: InsertPost, 
    recognitionData: InsertRecognition
  ): Promise<{ post: Post, recognition: Recognition }> {
    // Create the post first
    const [post] = await db.insert(posts)
      .values({
        ...postData,
        userId,
        type: "recognition",
      })
      .returning();
    
    // Create the recognition with the post reference
    const [recognition] = await db.insert(recognitions)
      .values({
        ...recognitionData,
        recognizerId: userId,
        postId: post.id,
      })
      .returning();
    
    // If there are points awarded with the recognition, create a transaction
    if (recognition.points > 0) {
      const recipient = await this.getUser(recognition.recipientId);
      
      if (recipient) {
        const transaction = await this.earnPoints(
          recognition.recipientId,
          recognition.points,
          'recognition',
          `Recognition from ${userId}: ${recognition.message}`,
          userId
        );
        
        // Update the recognition with the transaction reference
        await db.update(recognitions)
          .set({ 
            recognitionId: transaction.id 
          })
          .where(eq(recognitions.id, recognition.id));
      }
    }
    
    return { post, recognition };
  }

  async getPosts(limit: number = 20, offset: number = 0): Promise<PostWithDetails[]> {
    // Get posts with user information
    const postsData = await db.select({
      post: posts,
      user: users,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);
    
    // Get comment counts for each post
    const postIds = postsData.map(p => p.post.id);
    
    // If no posts, return empty array
    if (postIds.length === 0) {
      return [];
    }
    
    const commentCounts = await db.select({
      postId: comments.postId,
      count: count(comments.id),
    })
    .from(comments)
    .where(inArray(comments.postId, postIds))
    .groupBy(comments.postId);
    
    // Get reaction counts for each post
    const reactionCounts = await db.select({
      postId: reactions.postId,
      type: reactions.type,
      count: count(reactions.id),
    })
    .from(reactions)
    .where(inArray(reactions.postId, postIds))
    .groupBy(reactions.postId, reactions.type);
    
    // Get polls for poll posts
    const pollsData = await db.select()
      .from(polls)
      .where(inArray(polls.postId, postIds));
    
    // Get recognitions for recognition posts
    const recognitionsData = await db.select({
      recognition: recognitions,
      recognizer: users,
      recipient: users,
    })
    .from(recognitions)
    .leftJoin(users, eq(recognitions.recognizerId, users.id))
    .leftJoin(users, eq(recognitions.recipientId, users.id))
    .where(inArray(recognitions.postId, postIds));
    
    // Map data to return format
    const commentCountMap = new Map<number, number>();
    commentCounts.forEach(c => {
      commentCountMap.set(c.postId, Number(c.count));
    });
    
    const reactionCountsMap = new Map<number, Record<string, number>>();
    reactionCounts.forEach(r => {
      const countsByType = reactionCountsMap.get(r.postId) || {};
      countsByType[r.type] = Number(r.count);
      reactionCountsMap.set(r.postId, countsByType);
    });
    
    const pollsMap = new Map<number, Poll>();
    pollsData.forEach(p => {
      pollsMap.set(p.postId, p);
    });
    
    const recognitionsMap = new Map<number, RecognitionWithDetails>();
    recognitionsData.forEach(r => {
      recognitionsMap.set(r.recognition.postId!, {
        ...r.recognition,
        recognizer: { ...r.recognizer, password: '' },
        recipient: { ...r.recipient, password: '' },
      });
    });
    
    // Assemble result
    return postsData.map(p => {
      const { password, ...userWithoutPassword } = p.user;
      
      return {
        ...p.post,
        user: userWithoutPassword,
        commentCount: commentCountMap.get(p.post.id) || 0,
        reactionCounts: reactionCountsMap.get(p.post.id) || {},
        poll: p.post.type === 'poll' ? pollsMap.get(p.post.id) : undefined,
        recognition: p.post.type === 'recognition' ? recognitionsMap.get(p.post.id) : undefined,
      };
    });
  }

  async getUserPosts(userId: number, limit: number = 20, offset: number = 0): Promise<PostWithDetails[]> {
    // Similar to getPosts but filtered by userId
    const postsData = await db.select({
      post: posts,
      user: users,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);
    
    // Get comment counts for each post
    const postIds = postsData.map(p => p.post.id);
    
    // If no posts, return empty array
    if (postIds.length === 0) {
      return [];
    }
    
    const commentCounts = await db.select({
      postId: comments.postId,
      count: count(comments.id),
    })
    .from(comments)
    .where(inArray(comments.postId, postIds))
    .groupBy(comments.postId);
    
    // Get reaction counts for each post
    const reactionCounts = await db.select({
      postId: reactions.postId,
      type: reactions.type,
      count: count(reactions.id),
    })
    .from(reactions)
    .where(inArray(reactions.postId, postIds))
    .groupBy(reactions.postId, reactions.type);
    
    // Get polls for poll posts
    const pollsData = await db.select()
      .from(polls)
      .where(inArray(polls.postId, postIds));
    
    // Get recognitions for recognition posts
    const recognitionsData = await db.select({
      recognition: recognitions,
      recognizer: users,
      recipient: users,
    })
    .from(recognitions)
    .leftJoin(users, eq(recognitions.recognizerId, users.id))
    .leftJoin(users, eq(recognitions.recipientId, users.id))
    .where(inArray(recognitions.postId, postIds));
    
    // Map data to return format as in getPosts
    const commentCountMap = new Map<number, number>();
    const reactionCountsMap = new Map<number, Record<string, number>>();
    const pollsMap = new Map<number, Poll>();
    const recognitionsMap = new Map<number, RecognitionWithDetails>();
    
    commentCounts.forEach(c => {
      commentCountMap.set(c.postId, Number(c.count));
    });
    
    reactionCounts.forEach(r => {
      const countsByType = reactionCountsMap.get(r.postId) || {};
      countsByType[r.type] = Number(r.count);
      reactionCountsMap.set(r.postId, countsByType);
    });
    
    pollsData.forEach(p => {
      pollsMap.set(p.postId, p);
    });
    
    recognitionsData.forEach(r => {
      recognitionsMap.set(r.recognition.postId!, {
        ...r.recognition,
        recognizer: { ...r.recognizer, password: '' },
        recipient: { ...r.recipient, password: '' },
      });
    });
    
    // Assemble result
    return postsData.map(p => {
      const { password, ...userWithoutPassword } = p.user;
      
      return {
        ...p.post,
        user: userWithoutPassword,
        commentCount: commentCountMap.get(p.post.id) || 0,
        reactionCounts: reactionCountsMap.get(p.post.id) || {},
        poll: p.post.type === 'poll' ? pollsMap.get(p.post.id) : undefined,
        recognition: p.post.type === 'recognition' ? recognitionsMap.get(p.post.id) : undefined,
      };
    });
  }

  async getPostById(id: number): Promise<PostWithDetails | undefined> {
    // Get post with user information
    const [postData] = await db.select({
      post: posts,
      user: users,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .where(eq(posts.id, id));
    
    if (!postData) {
      return undefined;
    }
    
    // Get comment count
    const [commentCount] = await db.select({
      count: count(comments.id),
    })
    .from(comments)
    .where(eq(comments.postId, id));
    
    // Get reaction counts
    const reactionCounts = await db.select({
      type: reactions.type,
      count: count(reactions.id),
    })
    .from(reactions)
    .where(eq(reactions.postId, id))
    .groupBy(reactions.type);
    
    // Get poll if post type is poll
    let poll: Poll | undefined = undefined;
    if (postData.post.type === 'poll') {
      const [pollData] = await db.select()
        .from(polls)
        .where(eq(polls.postId, id));
      poll = pollData;
    }
    
    // Get recognition if post type is recognition
    let recognition: RecognitionWithDetails | undefined = undefined;
    if (postData.post.type === 'recognition') {
      const [recognitionData] = await db.select({
        recognition: recognitions,
        recognizer: users,
        recipient: users,
      })
      .from(recognitions)
      .leftJoin(users, eq(recognitions.recognizerId, users.id))
      .leftJoin(users, eq(recognitions.recipientId, users.id))
      .where(eq(recognitions.postId, id));
      
      if (recognitionData) {
        recognition = {
          ...recognitionData.recognition,
          recognizer: { ...recognitionData.recognizer, password: '' },
          recipient: { ...recognitionData.recipient, password: '' },
        };
      }
    }
    
    // Map reaction counts
    const reactionCountsMap: Record<string, number> = {};
    reactionCounts.forEach(r => {
      reactionCountsMap[r.type] = Number(r.count);
    });
    
    // Compose response
    const { password, ...userWithoutPassword } = postData.user;
    
    return {
      ...postData.post,
      user: userWithoutPassword,
      commentCount: Number(commentCount.count),
      reactionCounts: reactionCountsMap,
      poll,
      recognition,
    };
  }

  async deletePost(id: number): Promise<boolean> {
    try {
      await db.delete(posts).where(eq(posts.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  async updatePost(id: number, postData: Partial<InsertPost>): Promise<Post> {
    const [post] = await db.update(posts)
      .set({ 
        ...postData,
        updatedAt: new Date(), 
      })
      .where(eq(posts.id, id))
      .returning();
    
    return post;
  }

  // Social methods - Comments
  async createComment(userId: number, commentData: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments)
      .values({
        ...commentData,
        userId,
      })
      .returning();
    
    return comment;
  }
  
  // Process a peer-to-peer reward transaction
  async processPeerReward(
    senderId: number, 
    recipientId: number, 
    amount: number, 
    reason: string, 
    message: string
  ): Promise<{ transaction: Transaction, recognition: Recognition }> {
    // Get accounts
    const senderAccount = await this.getAccountByUserId(senderId);
    const recipientAccount = await this.getAccountByUserId(recipientId);
    
    if (!senderAccount) {
      throw new Error(`Sender account not found for user ${senderId}`);
    }
    
    if (!recipientAccount) {
      throw new Error(`Recipient account not found for user ${recipientId}`);
    }
    
    // Check if sender has enough points
    if (senderAccount.balance < amount) {
      throw new Error(`Insufficient points. Required: ${amount}, Available: ${senderAccount.balance}`);
    }
    
    // Insert the transaction (direct peer-to-peer)
    const [transaction] = await db.insert(transactions)
      .values({
        fromAccountId: senderAccount.id,
        toAccountId: recipientAccount.id,
        amount,
        reason: reason || 'peer_recognition',
        description: message,
        createdBy: senderId,
      })
      .returning();
    
    // Update account balances
    await db
      .update(accounts)
      .set({ balance: senderAccount.balance - amount })
      .where(eq(accounts.id, senderAccount.id));
    
    await db
      .update(accounts)
      .set({ balance: recipientAccount.balance + amount })
      .where(eq(accounts.id, recipientAccount.id));
    
    // Create a recognition record
    const [recognition] = await db.insert(recognitions)
      .values({
        recognizerId: senderId,
        recipientId: recipientId,
        badgeType: reason,
        points: amount,
        message: message,
      })
      .returning();
    
    // Update the transaction with the recognition ID
    await db.update(transactions)
      .set({ recognitionId: recognition.id })
      .where(eq(transactions.id, transaction.id));
    
    // Create a social post for this recognition
    try {
      const senderInfo = await this.getUser(senderId);
      const recipientInfo = await this.getUser(recipientId);
      
      if (senderInfo && recipientInfo) {
        const recipientName = recipientInfo.name.split(' ')[0];
        const content = `${senderInfo.name} recognized ${recipientInfo.name} with ${amount} points: ${message}`;
        
        const [post] = await db.insert(posts)
          .values({
            userId: senderId,
            content: content,
            type: "recognition",
          })
          .returning();
        
        // Link the post to the recognition
        await db.update(recognitions)
          .set({ postId: post.id })
          .where(eq(recognitions.id, recognition.id));
      }
    } catch (error) {
      console.error("Error creating social post for recognition:", error);
      // Continue even if post creation fails
    }
    
    return { transaction, recognition };
  }

  async getPostComments(postId: number): Promise<CommentWithUser[]> {
    const commentsData = await db.select({
      comment: comments,
      user: users,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));
    
    return commentsData.map(c => {
      const { password, ...userWithoutPassword } = c.user;
      
      return {
        ...c.comment,
        user: userWithoutPassword,
      };
    });
  }

  async deleteComment(id: number): Promise<boolean> {
    try {
      await db.delete(comments).where(eq(comments.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  // Social methods - Reactions
  async addReaction(userId: number, reactionData: InsertReaction): Promise<Reaction> {
    // Remove any existing reaction by this user on this post
    await this.removeReaction(userId, reactionData.postId);
    
    // Add the new reaction
    const [reaction] = await db.insert(reactions)
      .values({
        ...reactionData,
        userId,
      })
      .returning();
    
    return reaction;
  }

  async removeReaction(userId: number, postId: number): Promise<boolean> {
    try {
      await db.delete(reactions)
        .where(and(
          eq(reactions.userId, userId),
          eq(reactions.postId, postId)
        ));
      return true;
    } catch (error) {
      console.error('Error removing reaction:', error);
      return false;
    }
  }

  async getUserReaction(userId: number, postId: number): Promise<Reaction | undefined> {
    const [reaction] = await db.select()
      .from(reactions)
      .where(and(
        eq(reactions.userId, userId),
        eq(reactions.postId, postId)
      ));
    
    return reaction;
  }

  // Social methods - Polls
  async getPollById(id: number): Promise<PollWithVotes | undefined> {
    // Get the poll
    const [poll] = await db.select()
      .from(polls)
      .where(eq(polls.id, id));
    
    if (!poll) {
      return undefined;
    }
    
    // Get vote counts for each option
    const voteResults = await db.select({
      optionIndex: pollVotes.optionIndex,
      count: count(pollVotes.id),
    })
    .from(pollVotes)
    .where(eq(pollVotes.pollId, id))
    .groupBy(pollVotes.optionIndex);
    
    // Get total votes
    const [totalVotesResult] = await db.select({
      count: count(pollVotes.id),
    })
    .from(pollVotes)
    .where(eq(pollVotes.pollId, id));
    
    const totalVotes = Number(totalVotesResult.count);
    
    // Construct vote counts and percentages arrays
    const voteCounts = new Array(poll.options.length).fill(0);
    const votePercentages = new Array(poll.options.length).fill(0);
    
    voteResults.forEach(result => {
      voteCounts[result.optionIndex] = Number(result.count);
      votePercentages[result.optionIndex] = totalVotes > 0 
        ? Math.round((Number(result.count) / totalVotes) * 100) 
        : 0;
    });
    
    return {
      ...poll,
      totalVotes,
      voteCounts,
      votePercentages,
    };
  }

  async votePoll(userId: number, pollId: number, optionIndex: number): Promise<PollVote> {
    // Check if user has already voted on this poll
    const existingVote = await this.getUserPollVote(userId, pollId);
    
    if (existingVote) {
      // Update existing vote
      const [vote] = await db.update(pollVotes)
        .set({ optionIndex })
        .where(eq(pollVotes.id, existingVote.id))
        .returning();
      
      return vote;
    } else {
      // Create new vote
      const [vote] = await db.insert(pollVotes)
        .values({
          userId,
          pollId,
          optionIndex,
        })
        .returning();
      
      return vote;
    }
  }

  async getUserPollVote(userId: number, pollId: number): Promise<PollVote | undefined> {
    const [vote] = await db.select()
      .from(pollVotes)
      .where(and(
        eq(pollVotes.userId, userId),
        eq(pollVotes.pollId, pollId)
      ));
    
    return vote;
  }

  // Social methods - Recognitions
  async createRecognition(recognitionData: InsertRecognition): Promise<Recognition> {
    const [recognition] = await db.insert(recognitions)
      .values(recognitionData)
      .returning();
    
    return recognition;
  }

  async getUserRecognitionsGiven(userId: number): Promise<RecognitionWithDetails[]> {
    const recognitionsData = await db.select({
      recognition: recognitions,
      recipient: users,
    })
    .from(recognitions)
    .leftJoin(users, eq(recognitions.recipientId, users.id))
    .where(eq(recognitions.recognizerId, userId))
    .orderBy(desc(recognitions.createdAt));
    
    // Get recognizer info
    const [recognizer] = await db.select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!recognizer) {
      return [];
    }
    
    return recognitionsData.map(r => {
      const { password: recipientPassword, ...recipientWithoutPassword } = r.recipient;
      const { password: recognizerPassword, ...recognizerWithoutPassword } = recognizer;
      
      return {
        ...r.recognition,
        recognizer: recognizerWithoutPassword,
        recipient: recipientWithoutPassword,
      };
    });
  }

  async getUserRecognitionsReceived(userId: number): Promise<RecognitionWithDetails[]> {
    const recognitionsData = await db.select({
      recognition: recognitions,
      recognizer: users,
    })
    .from(recognitions)
    .leftJoin(users, eq(recognitions.recognizerId, users.id))
    .where(eq(recognitions.recipientId, userId))
    .orderBy(desc(recognitions.createdAt));
    
    // Get recipient info
    const [recipient] = await db.select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!recipient) {
      return [];
    }
    
    return recognitionsData.map(r => {
      const { password: recognizerPassword, ...recognizerWithoutPassword } = r.recognizer;
      const { password: recipientPassword, ...recipientWithoutPassword } = recipient;
      
      return {
        ...r.recognition,
        recognizer: recognizerWithoutPassword,
        recipient: recipientWithoutPassword,
      };
    });
  }

  // Social methods - Chat
  async createConversation(
    userId: number, 
    conversationData: InsertConversation, 
    participantIds: number[]
  ): Promise<Conversation> {
    // Create the conversation
    const [conversation] = await db.insert(conversations)
      .values(conversationData)
      .returning();
    
    // Add participants
    const allParticipantIds = Array.from(new Set([userId, ...participantIds]));
    
    for (const participantId of allParticipantIds) {
      await db.insert(conversationParticipants)
        .values({
          conversationId: conversation.id,
          userId: participantId,
        });
    }
    
    return conversation;
  }

  async getUserConversations(userId: number): Promise<ConversationWithDetails[]> {
    // Get all conversations where user is a participant
    const userConversations = await db.select({
      conversationId: conversationParticipants.conversationId,
    })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));
    
    const conversationIds = userConversations.map(c => c.conversationId);
    
    if (conversationIds.length === 0) {
      return [];
    }
    
    // Get all conversations with their details
    const conversationsData = await db.select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))
      .orderBy(desc(conversations.updatedAt));
    
    // For each conversation, get participants
    const result: ConversationWithDetails[] = [];
    
    for (const conversation of conversationsData) {
      // Get participants
      const participantsData = await db.select({
        user: users,
      })
      .from(conversationParticipants)
      .leftJoin(users, eq(conversationParticipants.userId, users.id))
      .where(eq(conversationParticipants.conversationId, conversation.id));
      
      const participants = participantsData.map(p => {
        const { password, ...userWithoutPassword } = p.user;
        return userWithoutPassword;
      });
      
      // Get last message
      const [lastMessage] = await db.select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);
      
      // Get unread count for current user
      const [unreadCountResult] = await db.select({
        count: count(messages.id),
      })
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversation.id),
        eq(messages.isRead, false),
        ne(messages.senderId, userId)
      ));
      
      const unreadCount = Number(unreadCountResult.count);
      
      // Assemble conversation details
      let lastMessageWithSender: MessageWithSender | undefined = undefined;
      
      if (lastMessage) {
        const { password, ...senderWithoutPassword } = lastMessage.sender;
        
        lastMessageWithSender = {
          ...lastMessage.message,
          sender: senderWithoutPassword,
        };
      }
      
      result.push({
        ...conversation,
        participants,
        lastMessage: lastMessageWithSender,
        unreadCount,
      });
    }
    
    return result;
  }

  async getConversationById(id: number): Promise<ConversationWithDetails | undefined> {
    // Get the conversation
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, id));
    
    if (!conversation) {
      return undefined;
    }
    
    // Get participants
    const participantsData = await db.select({
      user: users,
    })
    .from(conversationParticipants)
    .leftJoin(users, eq(conversationParticipants.userId, users.id))
    .where(eq(conversationParticipants.conversationId, id));
    
    const participants = participantsData.map(p => {
      const { password, ...userWithoutPassword } = p.user;
      return userWithoutPassword;
    });
    
    // Get last message
    const [lastMessage] = await db.select({
      message: messages,
      sender: users,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, id))
    .orderBy(desc(messages.createdAt))
    .limit(1);
    
    // Assemble conversation details
    let lastMessageWithSender: MessageWithSender | undefined = undefined;
    
    if (lastMessage) {
      const { password, ...senderWithoutPassword } = lastMessage.sender;
      
      lastMessageWithSender = {
        ...lastMessage.message,
        sender: senderWithoutPassword,
      };
    }
    
    return {
      ...conversation,
      participants,
      lastMessage: lastMessageWithSender,
      unreadCount: 0, // This would be specific to a user, so we set it to 0 here
    };
  }

  async sendMessage(userId: number, messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages)
      .values({
        ...messageData,
        senderId: userId,
      })
      .returning();
    
    // Update conversation's updatedAt
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, messageData.conversationId));
    
    return message;
  }

  async getConversationMessages(
    conversationId: number, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<MessageWithSender[]> {
    const messagesData = await db.select({
      message: messages,
      sender: users,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);
    
    return messagesData.map(m => {
      const { password, ...senderWithoutPassword } = m.sender;
      
      return {
        ...m.message,
        sender: senderWithoutPassword,
      };
    });
  }

  async markMessagesAsRead(userId: number, conversationId: number): Promise<boolean> {
    try {
      await db.update(messages)
        .set({ isRead: true })
        .where(and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId),
          eq(messages.isRead, false)
        ));
      
      return true;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  }

  // Social methods - Stats
  async getUserSocialStats(userId: number): Promise<SocialStats> {
    // Get posts count
    const [postsCountResult] = await db.select({
      count: count(posts.id),
    })
    .from(posts)
    .where(eq(posts.userId, userId));
    
    // Get comments count
    const [commentsCountResult] = await db.select({
      count: count(comments.id),
    })
    .from(comments)
    .where(eq(comments.userId, userId));
    
    // Get recognitions received count
    const [recognitionsReceivedCountResult] = await db.select({
      count: count(recognitions.id),
    })
    .from(recognitions)
    .where(eq(recognitions.recipientId, userId));
    
    // Get recognitions given count
    const [recognitionsGivenCountResult] = await db.select({
      count: count(recognitions.id),
    })
    .from(recognitions)
    .where(eq(recognitions.recognizerId, userId));
    
    // Get unread messages count
    const userConversations = await db.select({
      conversationId: conversationParticipants.conversationId,
    })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));
    
    const conversationIds = userConversations.map(c => c.conversationId);
    
    let unreadMessagesCount = 0;
    
    if (conversationIds.length > 0) {
      const [unreadMessagesCountResult] = await db.select({
        count: count(messages.id),
      })
      .from(messages)
      .where(and(
        inArray(messages.conversationId, conversationIds),
        eq(messages.isRead, false),
        ne(messages.senderId, userId)
      ));
      
      unreadMessagesCount = Number(unreadMessagesCountResult.count);
    }
    
    // Calculate engagement score based on activity
    const postsCount = Number(postsCountResult.count);
    const commentsCount = Number(commentsCountResult.count);
    const recognitionsReceived = Number(recognitionsReceivedCountResult.count);
    const recognitionsGiven = Number(recognitionsGivenCountResult.count);
    
    // Simple engagement score calculation
    const engagementScore = Math.min(100, 
      postsCount * 2 + 
      commentsCount + 
      recognitionsReceived * 3 + 
      recognitionsGiven * 2
    );
    
    return {
      postsCount,
      commentsCount,
      recognitionsReceived,
      recognitionsGiven,
      unreadMessages: unreadMessagesCount,
      engagementScore,
    };
  }
}

export const storage = new DatabaseStorage();

// Helper function for the scheduler
export const awardBirthdayPoints = async (userId: number): Promise<Transaction> => {
  return storage.awardBirthdayPoints(userId);
};
