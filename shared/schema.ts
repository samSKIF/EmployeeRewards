import { pgTable, text, serial, integer, timestamp, doublePrecision, boolean, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, type InferSelectModel } from "drizzle-orm";

// Organizations table (Corporate, Client, Seller)
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'corporate', 'client', 'seller'
  status: text("status").default("active").notNull(), // 'active', 'inactive', 'pending'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
  logoUrl: text("logo_url"),
  settings: jsonb("settings"), // Store org-specific settings like enabled features
  parentOrgId: integer("parent_org_id").references(() => organizations.id), // For hierarchical relationships
});

// Organization features tracking
export const organizationFeatures = pgTable("organization_features", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  featureKey: text("feature_key").notNull(), // 'social', 'rewards', 'marketplace'
  isEnabled: boolean("is_enabled").default(true).notNull(),
  enabledAt: timestamp("enabled_at").defaultNow(),
  enabledBy: integer("enabled_by"),
  settings: jsonb("settings"), // Feature-specific settings/configuration
});

// Users table (extended)
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
  roleType: text("role_type").default("employee").notNull(), // 'corporate_admin', 'client_admin', 'seller_admin', 'employee'
  isAdmin: boolean("is_admin").default(false), // Legacy field: Role: admin or user
  status: text("status").default("active"), // Status: active/inactive
  avatarUrl: text("avatar_url"),         // Profile photo
  hireDate: date("hire_date"),           // Work anniversary date
  firebaseUid: text("firebase_uid"),     // Firebase User ID for authentication
  organizationId: integer("organization_id").references(() => organizations.id), // Which org they belong to
  permissions: jsonb("permissions"), // Specific permissions within their role
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by"),
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

// Seller profiles table
export const sellers = pgTable("sellers", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(), // 'physical_goods', 'digital_goods', 'services'
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  website: text("website"),
  description: text("description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  status: text("status").default("pending").notNull(), // 'pending', 'approved', 'suspended'
  approvedAt: timestamp("approved_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  rating: doublePrecision("rating"),
  paymentInfo: jsonb("payment_info"),
  taxId: text("tax_id"),
  shippingPolicy: text("shipping_policy"),
  returnPolicy: text("return_policy"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Product categories for marketplace
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  parentId: integer("parent_id").references(() => productCategories.id), // For nested categories
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Products table (rewards and marketplace)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").references(() => productCategories.id),
  category: text("category").notNull(), // Legacy field: 'Electronics', 'Gift Cards', etc.
  points: integer("points").notNull(),
  price: doublePrecision("price"), // For marketplace products that can be purchased with real money
  imageUrl: text("image_url").notNull(),
  additionalImages: text("additional_images").array(), // Additional product images
  isActive: boolean("is_active").default(true),
  isReward: boolean("is_reward").default(true), // Whether it's a reward product
  isMarketplace: boolean("is_marketplace").default(false), // Whether it's a marketplace product
  supplier: text("supplier"), // Legacy field: 'tillo', 'carlton'
  sellerId: integer("seller_id").references(() => sellers.id), // Seller who provides this product
  inventory: integer("inventory"), // Available inventory count
  sku: text("sku"), // Stock keeping unit
  status: text("status").default("draft").notNull(), // 'draft', 'pending_review', 'approved', 'rejected'
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"), // Notes from the QC process
  tags: text("tags").array(),
  specifications: jsonb("specifications"), // Product specifications
  weight: doublePrecision("weight"), // Product weight for shipping calculations
  dimensions: jsonb("dimensions"), // Product dimensions
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  updatedAt: timestamp("updated_at"),
});

// Enhanced orders table for both reward redemptions and marketplace purchases
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  productId: integer("product_id").references(() => products.id),
  transactionId: integer("transaction_id").references(() => transactions.id),
  sellerId: integer("seller_id").references(() => sellers.id),
  orderType: text("order_type").notNull().default("reward"), // 'reward' or 'marketplace'
  status: text("status").notNull().default("pending"), // pending, processing, shipped, completed, cancelled, refunded
  paymentMethod: text("payment_method"), // 'points', 'credit_card', etc.
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'completed', 'failed', 'refunded'
  totalAmount: doublePrecision("total_amount"), // For marketplace purchases
  totalPoints: integer("total_points"), // For reward redemptions
  externalRef: text("external_ref"), // Reference from supplier system
  trackingNumber: text("tracking_number"), // Shipping tracking number
  shipmentStatus: text("shipment_status"), // 'pending', 'shipped', 'delivered'
  shipmentMethod: text("shipment_method"), // Shipping method used
  shippingAddress: jsonb("shipping_address"), // Shipping address information
  billingAddress: jsonb("billing_address"), // Billing address information
  notes: text("notes"), // Order notes
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  returnedAt: timestamp("returned_at"),
  returnReason: text("return_reason"),
  organizationId: integer("organization_id").references(() => organizations.id), // Client organization the order belongs to
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Order items (for orders with multiple products)
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: doublePrecision("unit_price"),
  unitPoints: integer("unit_points"),
  totalPrice: doublePrecision("total_price"),
  totalPoints: integer("total_points"),
  discount: doublePrecision("discount").default(0), // Discount amount
  status: text("status").default("pending"), // 'pending', 'shipped', 'delivered', 'returned'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Support tickets for marketplace
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sellerId: integer("seller_id").references(() => sellers.id),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").default("open").notNull(), // 'open', 'in_progress', 'resolved', 'closed'
  priority: text("priority").default("medium").notNull(), // 'low', 'medium', 'high', 'urgent'
  category: text("category").notNull(), // 'order', 'product', 'payment', 'shipping', 'other'
  assignedTo: integer("assigned_to").references(() => users.id),
  attachments: text("attachments").array(),
  resolutionSummary: text("resolution_summary"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Ticket messages for communication
export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  attachments: text("attachments").array(),
  isInternal: boolean("is_internal").default(false), // Internal note visible only to staff
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reviews for marketplace products
export const productReviews = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  rating: integer("rating").notNull(), // 1-5 star rating
  title: text("title"),
  content: text("content"),
  pros: text("pros").array(),
  cons: text("cons").array(),
  images: text("images").array(),
  isVerified: boolean("is_verified").default(false), // Whether reviewer actually purchased the product
  status: text("status").default("published").notNull(), // 'published', 'pending', 'rejected'
  moderatedBy: integer("moderated_by").references(() => users.id),
  moderationReason: text("moderation_reason"),
  helpfulCount: integer("helpful_count").default(0),
  unhelpfulCount: integer("unhelpful_count").default(0),
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

// File templates for system-generated files
export const fileTemplates = pgTable("file_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),           // Template identifier (e.g., "employee_import")
  fileName: text("file_name").notNull(),           // Filename to use when downloading
  contentType: text("content_type").notNull(),     // MIME type (e.g., "text/plain")
  content: text("content").notNull(),              // The actual template content
  description: text("description"),                // Optional description
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  createdBy: integer("created_by").references(() => users.id),
});

// Surveys table - stores main survey information
export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),                  // Survey title
  description: text("description"),                // Survey description
  status: text("status").notNull().default("draft"), // draft, published, closed
  isAnonymous: boolean("is_anonymous").default(false), // Whether responses are anonymous 
  isMandatory: boolean("is_mandatory").default(false), // Whether survey completion is mandatory
  startDate: timestamp("start_date"),              // When survey starts
  endDate: timestamp("end_date"),                  // When survey ends
  templateType: text("template_type"),             // Type of template
  totalRecipients: integer("total_recipients"),    // Count of recipients
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  createdBy: integer("created_by").references(() => users.id),
});

// Survey questions table - stores individual questions for surveys
export const surveyQuestions = pgTable("survey_questions", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  questionText: text("question_text").notNull(),   // The actual question
  questionType: text("question_type").notNull(),   // nps, single, multiple, scale, likert, dropdown, ranking, slider, matrix, semantic, star, numeric, datetime, toggle, text, file, image, constant-sum, heatmap
  isRequired: boolean("is_required").default(true),
  options: jsonb("options"),                       // For choice questions: array of options
  order: integer("order").notNull(),               // Ordering of questions
  branchingLogic: jsonb("branching_logic"),        // Logic for skipping questions
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Survey responses table - tracks who has taken the survey
export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id),  // Null if anonymous
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),          // Null if not completed
  timeToComplete: integer("time_to_complete"),     // Time in seconds
  transactionId: integer("transaction_id").references(() => transactions.id), // Points transaction if awarded
});

// Survey answers table - individual answers to questions
export const surveyAnswers = pgTable("survey_answers", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id").references(() => surveyResponses.id, { onDelete: 'cascade' }).notNull(),
  questionId: integer("question_id").references(() => surveyQuestions.id, { onDelete: 'cascade' }).notNull(),
  answerValue: jsonb("answer_value").notNull(),    // Could be text, number, array of selected options, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relationships
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  parent: one(organizations, { fields: [organizations.parentOrgId], references: [organizations.id] }),
  children: many(organizations, { relationName: "childOrganizations" }),
  features: many(organizationFeatures),
  users: many(users),
  sellers: many(sellers),
  orders: many(orders),
  brandingSettings: many(brandingSettings),
}));

export const organizationFeaturesRelations = relations(organizationFeatures, ({ one }) => ({
  organization: one(organizations, { fields: [organizationFeatures.organizationId], references: [organizations.id] }),
  enabledByUser: one(users, { fields: [organizationFeatures.enabledBy], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, { fields: [users.organizationId], references: [organizations.id] }),
  creator: one(users, { fields: [users.createdBy], references: [users.id] }),
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
  surveys: many(surveys, { relationName: "createdSurveys" }),
  surveyResponses: many(surveyResponses),
  supportTickets: many(supportTickets, { relationName: "userTickets" }),
  assignedTickets: many(supportTickets, { relationName: "assignedTickets" }),
  ticketMessages: many(ticketMessages),
  productReviews: many(productReviews),
  orders: many(orders),
  approvedSellers: many(sellers, { relationName: "approvedSellers" }),
  reviewedProducts: many(products, { relationName: "reviewedProducts" }),
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

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [sellers.organizationId],
    references: [organizations.id],
  }),
  approvedBy: one(users, {
    fields: [sellers.approvedBy],
    references: [users.id],
    relationName: "approvedSellers"
  }),
  products: many(products),
  orders: many(orders),
  supportTickets: many(supportTickets),
}));

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  parent: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
  }),
  subCategories: many(productCategories, { relationName: "subCategories" }),
  products: many(products),
  createdBy: one(users, {
    fields: [productCategories.createdBy],
    references: [users.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  creator: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  seller: one(sellers, {
    fields: [products.sellerId],
    references: [sellers.id],
  }),
  reviewer: one(users, {
    fields: [products.reviewedBy],
    references: [users.id],
    relationName: "reviewedProducts"
  }),
  orders: many(orders),
  orderItems: many(orderItems),
  reviews: many(productReviews),
  supportTickets: many(supportTickets),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
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
  seller: one(sellers, {
    fields: [orders.sellerId],
    references: [sellers.id],
  }),
  organization: one(organizations, {
    fields: [orders.organizationId],
    references: [organizations.id],
  }),
  items: many(orderItems),
  supportTickets: many(supportTickets),
  reviews: many(productReviews),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
    relationName: "userTickets"
  }),
  assignedTo: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
    relationName: "assignedTickets"
  }),
  seller: one(sellers, {
    fields: [supportTickets.sellerId],
    references: [sellers.id],
  }),
  order: one(orders, {
    fields: [supportTickets.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [supportTickets.productId],
    references: [products.id],
  }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id],
  }),
  sender: one(users, {
    fields: [ticketMessages.senderId],
    references: [users.id],
  }),
}));

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productReviews.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [productReviews.orderId],
    references: [orders.id],
  }),
  moderator: one(users, {
    fields: [productReviews.moderatedBy],
    references: [users.id],
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

// File template relations
export const fileTemplateRelations = relations(fileTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [fileTemplates.createdBy],
    references: [users.id],
  }),
}));

// Survey relations
export const surveysRelations = relations(surveys, ({ one, many }) => ({
  creator: one(users, {
    fields: [surveys.createdBy],
    references: [users.id],
    relationName: "createdSurveys"
  }),
  questions: many(surveyQuestions),
  responses: many(surveyResponses),
}));

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyQuestions.surveyId],
    references: [surveys.id],
  }),
  answers: many(surveyAnswers),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyResponses.surveyId],
    references: [surveys.id],
  }),
  user: one(users, {
    fields: [surveyResponses.userId],
    references: [users.id],
  }),
  answers: many(surveyAnswers),
  transaction: one(transactions, {
    fields: [surveyResponses.transactionId],
    references: [transactions.id],
  }),
}));

export const surveyAnswersRelations = relations(surveyAnswers, ({ one }) => ({
  response: one(surveyResponses, {
    fields: [surveyAnswers.responseId],
    references: [surveyResponses.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyAnswers.questionId],
    references: [surveyQuestions.id],
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
export const insertFileTemplateSchema = createInsertSchema(fileTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSurveySchema = createInsertSchema(surveys).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSurveyQuestionSchema = createInsertSchema(surveyQuestions).omit({ id: true, createdAt: true });
export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true, startedAt: true });
export const insertSurveyAnswerSchema = createInsertSchema(surveyAnswers).omit({ id: true, createdAt: true });

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

export type FileTemplate = typeof fileTemplates.$inferSelect;
export type InsertFileTemplate = z.infer<typeof insertFileTemplateSchema>;

// Survey Schema
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;

export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type InsertSurveyQuestion = z.infer<typeof insertSurveyQuestionSchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;

export type SurveyAnswer = typeof surveyAnswers.$inferSelect;
export type InsertSurveyAnswer = z.infer<typeof insertSurveyAnswerSchema>;
