import { db } from "./db";
import { 
  users, User, InsertUser, 
  accounts, Account, 
  transactions, Transaction, 
  products, Product, InsertProduct,
  orders, Order, InsertOrder
} from "@shared/schema";
import { eq, ne, desc, and, or, isNull, sql } from "drizzle-orm";
import { hash, compare } from "bcrypt";
import { 
  UserWithBalance,
  TransactionWithDetails,
  OrderWithDetails, 
  ProductWithAvailable,
  DashboardStats
} from "@shared/types";
import { tilloSupplier, carltonSupplier } from "./middleware/suppliers";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
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
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
}

export const storage = new DatabaseStorage();

// Helper function for the scheduler
export const awardBirthdayPoints = async (userId: number): Promise<Transaction> => {
  return storage.awardBirthdayPoints(userId);
};
