import { pgTable, text, serial, integer, timestamp, doublePrecision, boolean, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),          // First name
  surname: text("surname"),              // Last name
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number"),     // Phone number
  jobTitle: text("job_title"),           // Job name/title
  department: text("department"),        // Department
  sex: text("sex"),                      // Gender
  nationality: text("nationality"),      // Nationality
  birthDate: date("birth_date"),         // Date of birth
  isAdmin: boolean("is_admin").default(false), // Role: admin or user
  status: text("status").default("active"), // Status: active/inactive
  avatarUrl: text("avatar_url"),         // Profile photo
  hireDate: date("hire_date"),           // Work anniversary date
  firebaseUid: text("firebase_uid"),     // Firebase User ID for authentication
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Accounts table to track point balances (ledger)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  accountType: text("account_type").notNull(), // 'user', 'system', etc
  balance: doublePrecision("balance").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transactions table (double-entry accounting)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  fromAccountId: integer("from_account_id").references(() => accounts.id),
  toAccountId: integer("to_account_id").references(() => accounts.id),
  amount: doublePrecision("amount").notNull(),
  description: text("description").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  recognitionId: integer("recognition_id").references(() => recognitions.id),
});

// Products table (rewards)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  points: integer("points").notNull(),
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").default(true),
  supplier: text("supplier").notNull(), // 'tillo', 'carlton'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  productId: integer("product_id").references(() => products.id),
  transactionId: integer("transaction_id").references(() => transactions.id),
  status: text("status").notNull().default("pending"), // pending, processing, shipped, completed
  externalRef: text("external_ref"), // Reference from supplier system
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Post schema for social feed
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  type: text("type").notNull().default("standard"), // standard, poll, announcement, recognition
  tags: text("tags").array(),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Comment schema
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Reaction schema
export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(), // like, celebrate, insightful, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Poll schema
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Poll vote schema
export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").references(() => polls.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Recognition schema for peer-to-peer recognition
export const recognitions = pgTable("recognitions", {
  id: serial("id").primaryKey(),
  recognizerId: integer("recognizer_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recipientId: integer("recipient_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }),
  badgeType: text("badge_type").notNull(), // work_anniversary, birthday, teamwork, etc.
  points: integer("points").notNull().default(0),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat schema
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: text("name"),
  isGroup: boolean("is_group").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Employee accounts table - separate from admin users
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                    // First name
  surname: text("surname").notNull(),              // Last name
  email: text("email").notNull().unique(),         // Email address (login)
  password: text("password").notNull(),            // Hashed password
  dateOfBirth: date("date_of_birth"),              // Date of birth
  dateJoined: date("date_joined"),                 // Date joining company
  jobTitle: text("job_title"),                     // Role name
  status: text("status").default("active"),        // active/inactive
  isManager: boolean("is_manager").default(false), // Manager status
  managerEmail: text("manager_email"),             // Direct manager's email
  sex: text("sex"),                                // Gender (optional)
  nationality: text("nationality"),                // Nationality (optional)
  phoneNumber: text("phone_number"),               // Contact phone (optional)
  photoUrl: text("photo_url"),                     // Profile photo URL
  firebaseUid: text("firebase_uid"),               // Firebase User ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdById: integer("created_by_id").references(() => users.id), // Admin who created this employee
});

// Organization branding and settings
export const brandingSettings = pgTable("branding_settings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => users.id), // Reference to admin user
  organizationName: text("organization_name").notNull(),
  logoUrl: text("logo_url"),                       // Company logo URL
  colorScheme: text("color_scheme").default("default"), // "default", "blue", "green", "purple", "custom"
  primaryColor: text("primary_color"),             // Custom primary color (hex)
  secondaryColor: text("secondary_color"),         // Custom secondary color (hex)
  accentColor: text("accent_color"),               // Custom accent color (hex)
  updatedAt: timestamp("updated_at"),
  updatedById: integer("updated_by_id").references(() => users.id),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions, { relationName: "userTransactions" }),
  products: many(products),
  posts: many(posts),
  comments: many(comments),
  reactions: many(reactions),
  pollVotes: many(pollVotes),
  recognitionsGiven: many(recognitions, { relationName: "recognizer" }),
  recognitionsReceived: many(recognitions, { relationName: "recipient" }),
  sentMessages: many(messages, { relationName: "sender" }),
  conversationParticipants: many(conversationParticipants),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  fromAccount: one(accounts, {
    fields: [transactions.fromAccountId],
    references: [accounts.id],
  }),
  toAccount: one(accounts, {
    fields: [transactions.toAccountId],
    references: [accounts.id],
  }),
  creator: one(users, {
    fields: [transactions.createdBy],
    references: [users.id],
    relationName: "userTransactions"
  }),
  recognition: one(recognitions, {
    fields: [transactions.recognitionId],
    references: [recognitions.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  creator: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
  transaction: one(transactions, {
    fields: [orders.transactionId],
    references: [transactions.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  comments: many(comments),
  reactions: many(reactions),
  polls: many(polls),
  recognitions: many(recognitions, { relationName: "postRecognition" }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  post: one(posts, {
    fields: [polls.postId],
    references: [posts.id],
  }),
  votes: many(pollVotes),
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.id],
  }),
  user: one(users, {
    fields: [pollVotes.userId],
    references: [users.id],
  }),
}));

export const recognitionsRelations = relations(recognitions, ({ one }) => ({
  recognizer: one(users, {
    fields: [recognitions.recognizerId],
    references: [users.id],
    relationName: "recognizer"
  }),
  recipient: one(users, {
    fields: [recognitions.recipientId],
    references: [users.id],
    relationName: "recipient"
  }),
  post: one(posts, {
    fields: [recognitions.postId],
    references: [posts.id],
    relationName: "postRecognition"
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  }),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}));

// Employees relations
export const employeesRelations = relations(employees, ({ one }) => ({
  creator: one(users, {
    fields: [employees.createdById],
    references: [users.id],
  }),
}));

// Branding settings relations
export const brandingSettingsRelations = relations(brandingSettings, ({ one }) => ({
  organization: one(users, {
    fields: [brandingSettings.organizationId],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [brandingSettings.updatedById],
    references: [users.id],
  }),
}));

// Insert schemas for validating API inputs
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReactionSchema = createInsertSchema(reactions).omit({ id: true, createdAt: true });
export const insertPollSchema = createInsertSchema(polls).omit({ id: true, createdAt: true });
export const insertPollVoteSchema = createInsertSchema(pollVotes).omit({ id: true, createdAt: true });
export const insertRecognitionSchema = createInsertSchema(recognitions).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({ id: true, joinedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true });
export const insertBrandingSettingsSchema = createInsertSchema(brandingSettings).omit({ id: true });

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;

export type Poll = typeof polls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;

export type PollVote = typeof pollVotes.$inferSelect;
export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;

export type Recognition = typeof recognitions.$inferSelect;
export type InsertRecognition = z.infer<typeof insertRecognitionSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type BrandingSetting = typeof brandingSettings.$inferSelect;
export type InsertBrandingSetting = z.infer<typeof insertBrandingSettingsSchema>;
