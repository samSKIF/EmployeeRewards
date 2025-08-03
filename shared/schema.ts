import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  doublePrecision,
  boolean,
  date,
  jsonb,
  time,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations, type InferSelectModel } from 'drizzle-orm';

// Organizations table (Corporate, Client, Seller)
export const organizations: any = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(), // URL-friendly organization identifier
  type: text('type').notNull(), // 'corporate', 'client', 'seller'
  status: text('status').default('active').notNull(), // 'active', 'inactive', 'pending'

  // Contact Information
  contact_name: text('contact_name'),
  contact_email: text('contact_email'),
  contact_phone: text('contact_phone'),
  superuser_email: text('superuser_email'),

  // Organization Details
  industry: text('industry'),
  address: jsonb('address'), // {street, city, state, country, zip}

  // Legacy and System Fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  created_by: integer('created_by'),
  logo_url: text('logo_url'),
  settings: jsonb('settings'), // Store org-specific settings like enabled features
  parent_org_id: integer('parent_org_id').references(() => organizations.id), // For hierarchical relationships
  current_subscription_id: integer('current_subscription_id'), // Will reference subscriptions table
});

// Subscription management table
export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  last_payment_date: timestamp('last_payment_date').notNull(),
  subscription_period: text('subscription_period').notNull(), // 'quarter', 'year', 'custom'
  custom_duration_days: integer('custom_duration_days'), // Only for 'custom' period
  expiration_date: timestamp('expiration_date').notNull(), // Calculated server-side
  subscribed_users: integer('subscribed_users').notNull().default(50), // Number of users they paid for (this is the user limit)
  price_per_user_per_month: doublePrecision('price_per_user_per_month')
    .notNull()
    .default(10.0), // Monthly cost per user
  total_monthly_amount: doublePrecision('total_monthly_amount')
    .notNull()
    .default(500.0), // Total monthly subscription cost
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Organization features tracking
export const organization_features = pgTable('organization_features', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  feature_key: text('feature_key').notNull(), // 'social', 'rewards', 'marketplace'
  is_enabled: boolean('is_enabled').default(true).notNull(),
  enabled_at: timestamp('enabled_at').defaultNow(),
  enabled_by: integer('enabled_by'),
  settings: jsonb('settings'), // Feature-specific settings/configuration
});

// Custom departments per organization
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  name: text('name').notNull(),
  color: text('color').default('#6B7280'), // For UI theming
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: integer('created_by').references(() => users.id),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Custom locations per organization  
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  name: text('name').notNull(),
  address: text('address'),
  timezone: text('timezone'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: integer('created_by').references(() => users.id),
});

// Users table (extended)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(), // First name
  surname: text('surname'), // Last name
  email: text('email').notNull().unique(),
  phone_number: text('phone_number'), // Phone number
  job_title: text('job_title'), // Job name/title
  department: text('department'), // Department
  sex: text('sex'), // Gender
  nationality: text('nationality'), // Nationality
  birth_date: date('birth_date'), // Date of birth
  role_type: text('role_type').default('employee').notNull(), // 'corporate_admin', 'client_admin', 'seller_admin', 'employee'
  is_admin: boolean('is_admin').default(false), // Legacy field: Role: admin or user
  status: text('status').default('active'), // Status: active/inactive
  avatar_url: text('avatar_url'), // Profile photo
  hire_date: date('hire_date'), // Work anniversary date
  firebase_uid: text('firebase_uid'), // Firebase User ID for authentication
  organization_id: integer('organization_id').references(() => organizations.id), // Which org they belong to
  permissions: jsonb('permissions'), // Specific permissions within their role
  title: text('title'), // Job title for profile
  location: text('location'), // Location/office
  responsibilities: text('responsibilities'), // Job responsibilities
  about_me: text('about_me'), // About me section for profile
  cover_photo_url: text('cover_photo_url'), // Profile cover photo
  last_seen_at: timestamp('last_seen_at'), // Last login/activity timestamp
  manager_id: integer('manager_id').references(() => users.id), // Reference to manager (self-referencing)
  manager_email: text('manager_email'), // Manager's email address for building org hierarchy
  admin_scope: text('admin_scope').default('none'), // 'super', 'site', 'department', 'hybrid', 'none'
  allowed_sites: text('allowed_sites').array().default([]), // Array of sites this admin can manage (multiple sites possible)
  allowed_departments: text('allowed_departments').array().default([]), // Array of departments this admin can manage (multiple departments possible)
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: integer('created_by'),
});

// Accounts table to track point balances (ledger)
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),
  account_type: text('account_type').notNull(), // 'user', 'system', etc
  balance: doublePrecision('balance').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transactions table (double-entry accounting)
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  from_account_id: integer('from_account_id').references(() => accounts.id),
  to_account_id: integer('to_account_id').references(() => accounts.id),
  amount: doublePrecision('amount').notNull(),
  description: text('description').notNull(),
  reason: text('reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  created_by: integer('created_by').references(() => users.id),
  recognition_id: integer('recognition_id').references(() => recognitions.id),
});

// Seller profiles table
export const sellers = pgTable('sellers', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  businessName: text('business_name').notNull(),
  businessType: text('business_type').notNull(), // 'physical_goods', 'digital_goods', 'services'
  contactEmail: text('contact_email').notNull(),
  contactPhone: text('contact_phone'),
  website: text('website'),
  description: text('description'),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  status: text('status').default('pending').notNull(), // 'pending', 'approved', 'suspended'
  approvedAt: timestamp('approved_at'),
  approvedBy: integer('approved_by').references(() => users.id),
  rating: doublePrecision('rating'),
  paymentInfo: jsonb('payment_info'),
  taxId: text('tax_id'),
  shippingPolicy: text('shipping_policy'),
  returnPolicy: text('return_policy'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// Product categories for marketplace
export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  parentId: integer('parent_id').references(() => productCategories.id), // For nested categories
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id),
});

// Products table (rewards and marketplace)
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  categoryId: integer('category_id').references(() => productCategories.id),
  category: text('category').notNull(), // Legacy field: 'Electronics', 'Gift Cards', etc.
  points: integer('points').notNull(),
  price: doublePrecision('price'), // For marketplace products that can be purchased with real money
  imageUrl: text('image_url').notNull(),
  additionalImages: text('additional_images').array(), // Additional product images
  isActive: boolean('is_active').default(true),
  isReward: boolean('is_reward').default(true), // Whether it's a reward product
  isMarketplace: boolean('is_marketplace').default(false), // Whether it's a marketplace product
  supplier: text('supplier'), // Legacy field: 'tillo', 'carlton'
  sellerId: integer('seller_id').references(() => sellers.id), // Seller who provides this product
  inventory: integer('inventory'), // Available inventory count
  sku: text('sku'), // Stock keeping unit
  status: text('status').default('draft').notNull(), // 'draft', 'pending_review', 'approved', 'rejected'
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewNotes: text('review_notes'), // Notes from the QC process
  tags: text('tags').array(),
  specifications: jsonb('specifications'), // Product specifications
  weight: doublePrecision('weight'), // Product weight for shipping calculations
  dimensions: jsonb('dimensions'), // Product dimensions
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id),
  updatedAt: timestamp('updated_at'),
});

// Enhanced orders table for both reward redemptions and marketplace purchases
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),
  productId: integer('product_id').references(() => products.id),
  transactionId: integer('transaction_id').references(() => transactions.id),
  sellerId: integer('seller_id').references(() => sellers.id),
  orderType: text('order_type').notNull().default('reward'), // 'reward' or 'marketplace'
  status: text('status').notNull().default('pending'), // pending, processing, shipped, completed, cancelled, refunded
  paymentMethod: text('payment_method'), // 'points', 'credit_card', etc.
  paymentStatus: text('payment_status').default('pending'), // 'pending', 'completed', 'failed', 'refunded'
  totalAmount: doublePrecision('total_amount'), // For marketplace purchases
  totalPoints: integer('total_points'), // For reward redemptions
  externalRef: text('external_ref'), // Reference from supplier system
  trackingNumber: text('tracking_number'), // Shipping tracking number
  shipmentStatus: text('shipment_status'), // 'pending', 'shipped', 'delivered'
  shipmentMethod: text('shipment_method'), // Shipping method used
  shippingAddress: jsonb('shipping_address'), // Shipping address information
  billingAddress: jsonb('billing_address'), // Billing address information
  notes: text('notes'), // Order notes
  estimatedDeliveryDate: timestamp('estimated_delivery_date'),
  actualDeliveryDate: timestamp('actual_delivery_date'),
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),
  returnedAt: timestamp('returned_at'),
  returnReason: text('return_reason'),
  organization_id: integer('organization_id').references(() => organizations.id), // Client organization the order belongs to
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// Order items (for orders with multiple products)
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: doublePrecision('unit_price'),
  unitPoints: integer('unit_points'),
  totalPrice: doublePrecision('total_price'),
  totalPoints: integer('total_points'),
  discount: doublePrecision('discount').default(0), // Discount amount
  status: text('status').default('pending'), // 'pending', 'shipped', 'delivered', 'returned'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Support tickets for marketplace
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sellerId: integer('seller_id').references(() => sellers.id),
  orderId: integer('order_id').references(() => orders.id),
  productId: integer('product_id').references(() => products.id),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  status: text('status').default('open').notNull(), // 'open', 'in_progress', 'resolved', 'closed'
  priority: text('priority').default('medium').notNull(), // 'low', 'medium', 'high', 'urgent'
  category: text('category').notNull(), // 'order', 'product', 'payment', 'shipping', 'other'
  assignedTo: integer('assigned_to').references(() => users.id),
  attachments: text('attachments').array(),
  resolutionSummary: text('resolution_summary'),
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// Ticket messages for communication
export const ticketMessages = pgTable('ticket_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .references(() => supportTickets.id, { onDelete: 'cascade' })
    .notNull(),
  senderId: integer('sender_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  attachments: text('attachments').array(),
  isInternal: boolean('is_internal').default(false), // Internal note visible only to staff
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Reviews for marketplace products
export const productReviews = pgTable('product_reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  orderId: integer('order_id').references(() => orders.id),
  rating: integer('rating').notNull(), // 1-5 star rating
  title: text('title'),
  content: text('content'),
  pros: text('pros').array(),
  cons: text('cons').array(),
  images: text('images').array(),
  isVerified: boolean('is_verified').default(false), // Whether reviewer actually purchased the product
  status: text('status').default('published').notNull(), // 'published', 'pending', 'rejected'
  moderatedBy: integer('moderated_by').references(() => users.id),
  moderationReason: text('moderation_reason'),
  helpfulCount: integer('helpful_count').default(0),
  unhelpfulCount: integer('unhelpful_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// Post schema for social feed
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  type: text('type').notNull().default('standard'), // standard, poll, announcement, recognition
  tags: text('tags').array(),
  isPinned: boolean('is_pinned').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// Comment schema
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// Reaction schema
export const reactions = pgTable('reactions', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // like, celebrate, insightful, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Comment reactions table
export const commentReactions = pgTable('comment_reactions', {
  id: serial('id').primaryKey(),
  commentId: integer('comment_id')
    .references(() => comments.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull().default('like'), // like, celebrate, insightful, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Poll schema
export const polls = pgTable('polls', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .references(() => posts.id, { onDelete: 'cascade' })
    .notNull(),
  question: text('question').notNull(),
  options: text('options').array().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Poll vote schema
export const pollVotes = pgTable('poll_votes', {
  id: serial('id').primaryKey(),
  pollId: integer('poll_id')
    .references(() => polls.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  optionIndex: integer('option_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Recognition schema for peer-to-peer recognition
export const recognitions = pgTable('recognitions', {
  id: serial('id').primaryKey(),
  recognizerId: integer('recognizer_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  recipientId: integer('recipient_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  postId: integer('post_id').references(() => posts.id, {
    onDelete: 'cascade',
  }),
  badgeType: text('badge_type').notNull(), // work_anniversary, birthday, teamwork, etc.
  points: integer('points').notNull().default(0),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  type: text('type', { enum: ['peer', 'manager', 'system'] }).default('peer'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default(
    'pending'
  ),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectedReason: text('rejected_reason'),
});

// Recognition Settings schema for the recognition microservice
export const recognitionSettings = pgTable('recognition_settings', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  costPerPoint: doublePrecision('cost_per_point').notNull().default(0.1),

  // Peer-to-peer recognition settings
  peerEnabled: boolean('peer_enabled').notNull().default(true),
  peerRequiresApproval: boolean('peer_requires_approval')
    .notNull()
    .default(true),
  peerPointsPerRecognition: integer('peer_points_per_recognition')
    .notNull()
    .default(10),
  peerMaxRecognitionsPerMonth: integer('peer_max_recognitions_per_month')
    .notNull()
    .default(5),

  // Manager recognition settings
  managerEnabled: boolean('manager_enabled').notNull().default(true),
  managerRequiresApproval: boolean('manager_requires_approval')
    .notNull()
    .default(false),
  managerApprovalEmail: text('manager_approval_email'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// Manager budgets schema for tracking point allocations
export const managerBudgets = pgTable('manager_budgets', {
  id: serial('id').primaryKey(),
  managerId: integer('manager_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  organization_id: integer('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  totalPoints: integer('total_points').notNull().default(0),
  remainingPoints: integer('remaining_points').notNull().default(0),
  month: integer('month').notNull(),
  year: integer('year').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
});

// Chat schema
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  name: text('name'),
  isGroup: boolean('is_group').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

export const conversationParticipants = pgTable('conversation_participants', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' })
    .notNull(),
  senderId: integer('sender_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Note: employees table removed - consolidated into users table with proper role management

// Organization branding and settings
export const brandingSettings = pgTable('branding_settings', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id').references(() => organizations.id), // Reference to organization
  organizationName: text('organization_name').notNull(),
  logoUrl: text('logo_url'), // Company logo URL
  colorScheme: text('color_scheme').default('default'), // "default", "blue", "green", "purple", "custom"
  primaryColor: text('primary_color'), // Custom primary color (hex)
  secondaryColor: text('secondary_color'), // Custom secondary color (hex)
  accentColor: text('accent_color'), // Custom accent color (hex)
  updatedAt: timestamp('updated_at'),
  updatedById: integer('updated_by_id').references(() => users.id),
});

// File templates for system-generated files
export const fileTemplates = pgTable('file_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // Template identifier (e.g., "employee_import")
  fileName: text('file_name').notNull(), // Filename to use when downloading
  contentType: text('content_type').notNull(), // MIME type (e.g., "text/plain")
  content: text('content').notNull(), // The actual template content
  description: text('description'), // Optional description
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
});

// Surveys table - stores main survey information
export const surveys = pgTable('surveys', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(), // Survey title
  description: text('description'), // Survey description
  status: text('status').notNull().default('draft'), // draft, published, closed
  isAnonymous: boolean('is_anonymous').default(false), // Whether responses are anonymous
  isMandatory: boolean('is_mandatory').default(false), // Whether survey completion is mandatory
  startDate: timestamp('start_date'), // When survey starts
  endDate: timestamp('end_date'), // When survey ends
  templateType: text('template_type'), // Type of template
  totalRecipients: integer('total_recipients'), // Count of recipients
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
});

// Survey questions table - stores individual questions for surveys
export const surveyQuestions = pgTable('survey_questions', {
  id: serial('id').primaryKey(),
  surveyId: integer('survey_id')
    .references(() => surveys.id, { onDelete: 'cascade' })
    .notNull(),
  questionText: text('question_text').notNull(), // The actual question
  questionType: text('question_type').notNull(), // nps, single, multiple, scale, likert, dropdown, ranking, slider, matrix, semantic, star, numeric, datetime, toggle, text, file, image, constant-sum, heatmap
  isRequired: boolean('is_required').default(true),
  options: jsonb('options'), // For choice questions: array of options
  order: integer('order').notNull(), // Ordering of questions
  branchingLogic: jsonb('branching_logic'), // Logic for skipping questions
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Survey responses table - tracks who has taken the survey
export const surveyResponses = pgTable('survey_responses', {
  id: serial('id').primaryKey(),
  surveyId: integer('survey_id')
    .references(() => surveys.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id').references(() => users.id), // Null if anonymous
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'), // Null if not completed
  timeToComplete: integer('time_to_complete'), // Time in seconds
  transactionId: integer('transaction_id').references(() => transactions.id), // Points transaction if awarded
});

// Survey answers table - individual answers to questions
export const surveyAnswers = pgTable('survey_answers', {
  id: serial('id').primaryKey(),
  responseId: integer('response_id')
    .references(() => surveyResponses.id, { onDelete: 'cascade' })
    .notNull(),
  questionId: integer('question_id')
    .references(() => surveyQuestions.id, { onDelete: 'cascade' })
    .notNull(),
  answerValue: jsonb('answer_value').notNull(), // Could be text, number, array of selected options, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Leave Types table - defines different kinds of leave (vacation, sick, etc.)
export const leaveTypes = pgTable('leave_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').notNull().default('#4A90E2'), // For calendar display
  defaultDays: integer('default_days'), // Default entitlement per year
  requiresApproval: boolean('requires_approval').default(true),
  allowsHalfDay: boolean('allows_half_day').default(true),
  isPaidLeave: boolean('is_paid_leave').default(true),
  documentationRequired: boolean('documentation_required').default(false),
  maxConsecutiveDays: integer('max_consecutive_days'), // Optional limit
  minAdvanceNotice: integer('min_advance_notice'), // Days required before leave
  organization_id: integer('organization_id').references(() => organizations.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
  isActive: boolean('is_active').default(true),
});

// Leave Entitlements table - tracks how many days of each leave type an employee has
export const leaveEntitlements = pgTable('leave_entitlements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  leaveTypeId: integer('leave_type_id')
    .references(() => leaveTypes.id)
    .notNull(),
  year: integer('year').notNull(), // The year this entitlement is for
  totalDays: doublePrecision('total_days').notNull(), // Total allocated days
  usedDays: doublePrecision('used_days').default(0).notNull(), // Days used so far
  remainingDays: doublePrecision('remaining_days'), // Days remaining
  adjustedDays: doublePrecision('adjusted_days').default(0), // Additional days granted
  expiryDate: date('expiry_date'), // When this entitlement expires
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
});

// Leave Requests table - stores leave applications
export const leaveRequests = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  leaveTypeId: integer('leave_type_id')
    .references(() => leaveTypes.id)
    .notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  startTime: time('start_time'), // For half-day or hourly leaves
  endTime: time('end_time'), // For half-day or hourly leaves
  duration: doublePrecision('duration').notNull(), // In days
  reason: text('reason'),
  status: text('status').default('pending').notNull(), // pending, approved, rejected, cancelled
  attachmentUrl: text('attachment_url'), // For supporting documents
  approverId: integer('approver_id').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  cancellationReason: text('cancellation_reason'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// Leave Adjustments table - tracks manual adjustments to leave balances
export const leaveAdjustments = pgTable('leave_adjustments', {
  id: serial('id').primaryKey(),
  entitlementId: integer('entitlement_id')
    .references(() => leaveEntitlements.id, { onDelete: 'cascade' })
    .notNull(),
  adjustmentDays: doublePrecision('adjustment_days').notNull(), // Can be positive or negative
  reason: text('reason').notNull(),
  performedBy: integer('performed_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Holiday Calendar table - tracks company holidays
export const holidays = pgTable('holidays', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  date: date('date').notNull(),
  description: text('description'),
  country: text('country').notNull().default('Global'), // For country-specific holidays
  organization_id: integer('organization_id').references(() => organizations.id),
  isRecurringYearly: boolean('is_recurring_yearly').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
});

// Leave Calendar Subscription table - for external calendar integration
export const leaveCalendarSubscriptions = pgTable(
  'leave_calendar_subscriptions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    token: text('token').notNull().unique(), // Unique token for feed access
    isEnabled: boolean('is_enabled').default(true),
    lastAccessedAt: timestamp('last_accessed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  }
);

// Leave Notifications table - tracks notifications sent regarding leaves
export const leaveNotifications = pgTable('leave_notifications', {
  id: serial('id').primaryKey(),
  leaveRequestId: integer('leave_request_id').references(
    () => leaveRequests.id,
    { onDelete: 'cascade' }
  ),
  recipientId: integer('recipient_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // request_submitted, request_approved, request_rejected, reminder
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Leave Policy table - for organization-specific leave policies
export const leavePolicies = pgTable('leave_policies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  organization_id: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  settings: jsonb('settings'), // JSON of policy settings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
  isActive: boolean('is_active').default(true),
});

// Employee Status Icons - configurable status types with icons
export const employeeStatusTypes = pgTable('employee_status_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  iconName: text('icon_name').notNull(), // Name of the icon from the library
  description: text('description'),
  color: text('color').default('#6366F1'), // Default color for the status icon
  durationDays: integer('duration_days'), // How many days the status should last (null = indefinite)
  isSystem: boolean('is_system').default(false), // Is this a system-defined status
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
  organization_id: integer('organization_id').references(() => organizations.id),
});

// Employee Statuses - assigns status to specific employees
export const employeeStatuses = pgTable('employee_statuses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  statusTypeId: integer('status_type_id')
    .references(() => employeeStatusTypes.id)
    .notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'), // If null, status is active until manually removed
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  createdBy: integer('created_by').references(() => users.id),
});

// Define leave management relationships
export const leaveTypesRelations = relations(leaveTypes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [leaveTypes.organization_id],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [leaveTypes.createdBy],
    references: [users.id],
    relationName: 'leaveTypeCreator',
  }),
  entitlements: many(leaveEntitlements),
  leaveRequests: many(leaveRequests),
}));

export const leaveEntitlementsRelations = relations(
  leaveEntitlements,
  ({ one, many }) => ({
    user: one(users, {
      fields: [leaveEntitlements.userId],
      references: [users.id],
    }),
    leaveType: one(leaveTypes, {
      fields: [leaveEntitlements.leaveTypeId],
      references: [leaveTypes.id],
    }),
    creator: one(users, {
      fields: [leaveEntitlements.createdBy],
      references: [users.id],
    }),
    adjustments: many(leaveAdjustments),
  })
);

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, { fields: [leaveRequests.userId], references: [users.id] }),
  leaveType: one(leaveTypes, {
    fields: [leaveRequests.leaveTypeId],
    references: [leaveTypes.id],
  }),
  approver: one(users, {
    fields: [leaveRequests.approverId],
    references: [users.id],
    relationName: 'approver',
  }),
}));

export const leaveAdjustmentsRelations = relations(
  leaveAdjustments,
  ({ one }) => ({
    entitlement: one(leaveEntitlements, {
      fields: [leaveAdjustments.entitlementId],
      references: [leaveEntitlements.id],
    }),
    performer: one(users, {
      fields: [leaveAdjustments.performedBy],
      references: [users.id],
      relationName: 'performer',
    }),
  })
);

export const holidaysRelations = relations(holidays, ({ one }) => ({
  organization: one(organizations, {
    fields: [holidays.organization_id],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [holidays.createdBy],
    references: [users.id],
    relationName: 'holidayCreator',
  }),
}));

export const leaveCalendarSubscriptionsRelations = relations(
  leaveCalendarSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [leaveCalendarSubscriptions.userId],
      references: [users.id],
    }),
  })
);

export const leaveNotificationsRelations = relations(
  leaveNotifications,
  ({ one }) => ({
    leaveRequest: one(leaveRequests, {
      fields: [leaveNotifications.leaveRequestId],
      references: [leaveRequests.id],
    }),
    recipient: one(users, {
      fields: [leaveNotifications.recipientId],
      references: [users.id],
      relationName: 'recipient',
    }),
  })
);

export const leavePoliciesRelations = relations(leavePolicies, ({ one }) => ({
  organization: one(organizations, {
    fields: [leavePolicies.organization_id],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [leavePolicies.createdBy],
    references: [users.id],
    relationName: 'leavePolicyCreator',
  }),
}));

// Define relationships
export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    parent: one(organizations, {
      fields: [organizations.parent_org_id],
      references: [organizations.id],
    }),
    children: many(organizations, { relationName: 'childOrganizations' }),
    features: many(organization_features),
    users: many(users),
    sellers: many(sellers),
    leaveTypes: many(leaveTypes),
    holidays: many(holidays),
    leavePolicies: many(leavePolicies),
    orders: many(orders),
    brandingSettings: many(brandingSettings),
    subscriptions: many(subscriptions),
    currentSubscription: one(subscriptions, {
      fields: [organizations.current_subscription_id],
      references: [subscriptions.id],
    }),
  })
);

// Subscription relations
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organization_id],
    references: [organizations.id],
  }),
}));

export const organizationFeaturesRelations = relations(
  organization_features,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organization_features.organization_id],
      references: [organizations.id],
    }),
    enabledByUser: one(users, {
      fields: [organization_features.enabled_by],
      references: [users.id],
    }),
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organization_id],
    references: [organizations.id],
  }),
  creator: one(users, { fields: [users.created_by], references: [users.id] }),
  transactions: many(transactions, { relationName: 'userTransactions' }),
  products: many(products),
  posts: many(posts),
  comments: many(comments),
  reactions: many(reactions),
  pollVotes: many(pollVotes),
  recognitionsGiven: many(recognitions, { relationName: 'recognizer' }),
  recognitionsReceived: many(recognitions, { relationName: 'recipient' }),
  sentMessages: many(messages, { relationName: 'sender' }),
  conversationParticipants: many(conversationParticipants),
  surveys: many(surveys, { relationName: 'createdSurveys' }),
  surveyResponses: many(surveyResponses),
  supportTickets: many(supportTickets, { relationName: 'userTickets' }),
  assignedTickets: many(supportTickets, { relationName: 'assignedTickets' }),
  ticketMessages: many(ticketMessages),
  productReviews: many(productReviews),
  orders: many(orders),
  approvedSellers: many(sellers, { relationName: 'approvedSellers' }),
  reviewedProducts: many(products, { relationName: 'reviewedProducts' }),
  // Leave management relationships
  leaveRequests: many(leaveRequests),
  leaveEntitlements: many(leaveEntitlements),
  leaveApprovals: many(leaveRequests, { relationName: 'approver' }),
  leaveNotifications: many(leaveNotifications, { relationName: 'recipient' }),
  leaveCalendarSubscriptions: many(leaveCalendarSubscriptions),
  leaveAdjustmentsPerformed: many(leaveAdjustments, {
    relationName: 'performer',
  }),
  createdLeaveTypes: many(leaveTypes, { relationName: 'leaveTypeCreator' }),
  createdHolidays: many(holidays, { relationName: 'holidayCreator' }),
  createdLeavePolicies: many(leavePolicies, {
    relationName: 'leavePolicyCreator',
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  fromAccount: one(accounts, {
    fields: [transactions.from_account_id],
    references: [accounts.id],
  }),
  toAccount: one(accounts, {
    fields: [transactions.to_account_id],
    references: [accounts.id],
  }),
  creator: one(users, {
    fields: [transactions.created_by],
    references: [users.id],
    relationName: 'userTransactions',
  }),
  recognition: one(recognitions, {
    fields: [transactions.recognition_id],
    references: [recognitions.id],
  }),
}));

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [sellers.organization_id],
    references: [organizations.id],
  }),
  approvedBy: one(users, {
    fields: [sellers.approvedBy],
    references: [users.id],
    relationName: 'approvedSellers',
  }),
  products: many(products),
  orders: many(orders),
  supportTickets: many(supportTickets),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one, many }) => ({
    parent: one(productCategories, {
      fields: [productCategories.parentId],
      references: [productCategories.id],
    }),
    subCategories: many(productCategories, { relationName: 'subCategories' }),
    products: many(products),
    createdBy: one(users, {
      fields: [productCategories.createdBy],
      references: [users.id],
    }),
  })
);

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
    relationName: 'reviewedProducts',
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
    fields: [orders.organization_id],
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

export const supportTicketsRelations = relations(
  supportTickets,
  ({ one, many }) => ({
    user: one(users, {
      fields: [supportTickets.userId],
      references: [users.id],
      relationName: 'userTickets',
    }),
    assignedTo: one(users, {
      fields: [supportTickets.assignedTo],
      references: [users.id],
      relationName: 'assignedTickets',
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
  })
);

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
  recognitions: many(recognitions, { relationName: 'postRecognition' }),
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
    relationName: 'recognizer',
  }),
  recipient: one(users, {
    fields: [recognitions.recipientId],
    references: [users.id],
    relationName: 'recipient',
  }),
  post: one(posts, {
    fields: [recognitions.postId],
    references: [posts.id],
    relationName: 'postRecognition',
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
    relationName: 'sender',
  }),
}));

export const conversationParticipantsRelations = relations(
  conversationParticipants,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationParticipants.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationParticipants.userId],
      references: [users.id],
    }),
  })
);

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}));

// Branding settings relations
export const brandingSettingsRelations = relations(
  brandingSettings,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [brandingSettings.organization_id],
      references: [organizations.id],
    }),
    updatedBy: one(users, {
      fields: [brandingSettings.updatedById],
      references: [users.id],
    }),
  })
);

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
    relationName: 'createdSurveys',
  }),
  questions: many(surveyQuestions),
  responses: many(surveyResponses),
}));

export const surveyQuestionsRelations = relations(
  surveyQuestions,
  ({ one, many }) => ({
    survey: one(surveys, {
      fields: [surveyQuestions.surveyId],
      references: [surveys.id],
    }),
    answers: many(surveyAnswers),
  })
);

export const surveyResponsesRelations = relations(
  surveyResponses,
  ({ one, many }) => ({
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
  })
);

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
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Add Organization related schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertOrganizationFeatureSchema = createInsertSchema(
  organization_features
).omit({ id: true });
export const insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertProductCategorySchema = createInsertSchema(
  productCategories
).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});
export const insertSupportTicketSchema = createInsertSchema(
  supportTickets
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTicketMessageSchema = createInsertSchema(
  ticketMessages
).omit({ id: true, createdAt: true });
export const insertProductReviewSchema = createInsertSchema(
  productReviews
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertReactionSchema = createInsertSchema(reactions).omit({
  id: true,
  createdAt: true,
});
export const insertPollSchema = createInsertSchema(polls).omit({
  id: true,
  createdAt: true,
});
export const insertPollVoteSchema = createInsertSchema(pollVotes).omit({
  id: true,
  createdAt: true,
});
export const insertRecognitionSchema = createInsertSchema(recognitions).omit({
  id: true,
  createdAt: true,
});
export const insertRecognitionSettingsSchema = createInsertSchema(
  recognitionSettings
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertManagerBudgetSchema = createInsertSchema(
  managerBudgets
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertConversationParticipantSchema = createInsertSchema(
  conversationParticipants
).omit({ id: true, joinedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertBrandingSettingsSchema = createInsertSchema(
  brandingSettings
).omit({ id: true });
export const insertFileTemplateSchema = createInsertSchema(fileTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSurveyQuestionSchema = createInsertSchema(
  surveyQuestions
).omit({ id: true, createdAt: true });
export const insertSurveyResponseSchema = createInsertSchema(
  surveyResponses
).omit({ id: true, startedAt: true });
export const insertSurveyAnswerSchema = createInsertSchema(surveyAnswers).omit({
  id: true,
  createdAt: true,
});
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

// Extended organization schema for form validation
export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  contactName: z.string().min(2, 'Contact name is required'),
  contactEmail: z.string().email('Valid contact email is required'),
  contactPhone: z.string().optional(),
  superuserEmail: z.string().email('Valid superuser email is required'),
  industry: z.string().min(1, 'Industry selection is required'),
  address: z.object({
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State/Province is required'),
    country: z.string().min(2, 'Country is required'),
    zip: z.string().min(3, 'ZIP/Postal code is required'),
  }),
});

export type CreateOrganizationData = z.infer<typeof createOrganizationSchema>;

// Export types
// Organization types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type OrganizationFeature = typeof organization_features.$inferSelect;
export type InsertOrganizationFeature = z.infer<
  typeof insertOrganizationFeatureSchema
>;

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = z.infer<typeof insertSellerSchema>;

// Subscription types
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;

export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;

// User type
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
export type RecognitionSetting = typeof recognitionSettings.$inferSelect;
export type InsertRecognitionSetting = z.infer<
  typeof insertRecognitionSettingsSchema
>;
export type ManagerBudget = typeof managerBudgets.$inferSelect;
export type InsertManagerBudget = z.infer<typeof insertManagerBudgetSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type ConversationParticipant =
  typeof conversationParticipants.$inferSelect;
export type InsertConversationParticipant = z.infer<
  typeof insertConversationParticipantSchema
>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type BrandingSetting = typeof brandingSettings.$inferSelect;
export type InsertBrandingSetting = z.infer<
  typeof insertBrandingSettingsSchema
>;

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

// Leave Management Schema
export type LeaveType = typeof leaveTypes.$inferSelect;
export const insertLeaveTypeSchema = createInsertSchema(leaveTypes);
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;

export type LeaveEntitlement = typeof leaveEntitlements.$inferSelect;
export const insertLeaveEntitlementSchema =
  createInsertSchema(leaveEntitlements);
export type InsertLeaveEntitlement = z.infer<
  typeof insertLeaveEntitlementSchema
>;

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests);
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

export type LeaveAdjustment = typeof leaveAdjustments.$inferSelect;
export const insertLeaveAdjustmentSchema = createInsertSchema(leaveAdjustments);
export type InsertLeaveAdjustment = z.infer<typeof insertLeaveAdjustmentSchema>;

export type Holiday = typeof holidays.$inferSelect;
export const insertHolidaySchema = createInsertSchema(holidays);
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

export type LeaveCalendarSubscription =
  typeof leaveCalendarSubscriptions.$inferSelect;
export const insertLeaveCalendarSubscriptionSchema = createInsertSchema(
  leaveCalendarSubscriptions
);
export type InsertLeaveCalendarSubscription = z.infer<
  typeof insertLeaveCalendarSubscriptionSchema
>;

export type LeaveNotification = typeof leaveNotifications.$inferSelect;
export const insertLeaveNotificationSchema =
  createInsertSchema(leaveNotifications);
export type InsertLeaveNotification = z.infer<
  typeof insertLeaveNotificationSchema
>;

export type LeavePolicy = typeof leavePolicies.$inferSelect;
export const insertLeavePolicySchema = createInsertSchema(leavePolicies);
export type InsertLeavePolicy = z.infer<typeof insertLeavePolicySchema>;

// Interest feature schema
// Visibility enum for employee interests
export const visibilityEnum = pgEnum('visibility', [
  'EVERYONE',
  'TEAM',
  'PRIVATE',
]);

// Interests table
export const interests = pgTable('interests', {
  id: serial('id').primaryKey(),
  label: text('label').notNull().unique(),
  category: text('category').notNull(),
  icon: text('icon'),
});

// Employee Interests junction table
export const employeeInterests = pgTable(
  'employee_interests',
  {
    employeeId: integer('employee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    interestId: integer('interest_id')
      .notNull()
      .references(() => interests.id, { onDelete: 'cascade' }),
    customLabel: text('custom_label'),
    isPrimary: boolean('is_primary').default(false).notNull(),
    visibility: visibilityEnum('visibility').default('EVERYONE').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.employeeId, table.interestId] }),
    };
  }
);

// Relationships
export const interestsRelations = relations(interests, ({ many }) => ({
  employeeInterests: many(employeeInterests),
}));

export const employeeInterestsRelations = relations(
  employeeInterests,
  ({ one }) => ({
    employee: one(users, {
      fields: [employeeInterests.employeeId],
      references: [users.id],
    }),
    interest: one(interests, {
      fields: [employeeInterests.interestId],
      references: [interests.id],
    }),
  })
);

// Update the existing employeesRelations to include interests
// (This will be merged with existing declarations elsewhere)

// Insert Schemas for Interests
export const insertInterestSchema = createInsertSchema(interests).omit({
  id: true,
});
export type Interest = typeof interests.$inferSelect;
export type InsertInterest = z.infer<typeof insertInterestSchema>;

export const insertEmployeeInterestSchema =
  createInsertSchema(employeeInterests);
export type EmployeeInterest = typeof employeeInterests.$inferSelect;
export type InsertEmployeeInterest = z.infer<
  typeof insertEmployeeInterestSchema
>;

// Enhanced Interest Channels - Auto-generated channels based on interests with enterprise features
export const interestChannels = pgTable('interest_channels', {
  id: serial('id').primaryKey(),
  interestId: integer('interest_id').references(() => interests.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(),
  description: text('description'),
  memberCount: integer('member_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  organization_id: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),

  // Enhanced enterprise features
  channelType: text('channel_type').default('interest').notNull(), // 'interest', 'department', 'site', 'project', 'company'
  accessLevel: text('access_level').default('open').notNull(), // 'open', 'department_only', 'site_only', 'invite_only', 'approval_required'
  isAutoCreated: boolean('is_auto_created').default(false), // Auto-created from interests
  autoCreationThreshold: integer('auto_creation_threshold').default(5), // Minimum members for auto-creation

  // Department and site restrictions
  allowedDepartments: text('allowed_departments').array(), // Array of department names
  allowedSites: text('allowed_sites').array(), // Array of site/location names
  allowedRoles: text('allowed_roles').array(), // Array of job titles/roles

  // Channel management
  createdBy: integer('created_by').references(() => users.id),
  moderators: text('moderators').array(), // User IDs who can moderate
  requiresApproval: boolean('requires_approval').default(false),
  isPrivate: boolean('is_private').default(false),
  maxMembers: integer('max_members'), // Optional member limit

  // Metadata
  tags: text('tags').array(), // Searchable tags
  coverImageUrl: text('cover_image_url'),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const interestChannelMembers = pgTable(
  'interest_channel_members',
  {
    id: serial('id').primaryKey(),
    channelId: integer('channel_id')
      .references(() => interestChannels.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').default('member').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    unique: primaryKey({ columns: [table.channelId, table.userId] }),
  })
);

export const interestChannelPosts = pgTable('interest_channel_posts', {
  id: serial('id').primaryKey(),
  channelId: integer('channel_id')
    .references(() => interestChannels.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  type: text('type'),
  tags: text('tags').array(),
  isPinned: boolean('is_pinned').default(false),
  likeCount: integer('like_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const interestChannelPostComments = pgTable(
  'interest_channel_post_comments',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .references(() => interestChannelPosts.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export const interestChannelPostLikes = pgTable(
  'interest_channel_post_likes',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .references(() => interestChannelPosts.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    unique: primaryKey({ columns: [table.postId, table.userId] }),
  })
);

// Channel Join Requests - for approval-required and invite-only channels
export const interestChannelJoinRequests = pgTable(
  'interest_channel_join_requests',
  {
    id: serial('id').primaryKey(),
    channelId: integer('channel_id')
      .references(() => interestChannels.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    status: text('status').default('pending').notNull(), // 'pending', 'approved', 'rejected'
    requestMessage: text('request_message'), // User's message when requesting to join
    reviewedBy: integer('reviewed_by').references(() => users.id), // Admin who reviewed the request
    reviewedAt: timestamp('reviewed_at'),
    reviewMessage: text('review_message'), // Admin's response message
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    unique: primaryKey({ columns: [table.channelId, table.userId] }),
  })
);

// Pinned Posts - for channel admins to pin important posts
export const interestChannelPinnedPosts = pgTable(
  'interest_channel_pinned_posts',
  {
    id: serial('id').primaryKey(),
    channelId: integer('channel_id')
      .references(() => interestChannels.id, { onDelete: 'cascade' })
      .notNull(),
    postId: integer('post_id')
      .references(() => interestChannelPosts.id, { onDelete: 'cascade' })
      .notNull(),
    pinnedBy: integer('pinned_by')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    pinnedAt: timestamp('pinned_at').defaultNow().notNull(),
    order: integer('order').default(0), // Display order for multiple pinned posts
  },
  (table) => ({
    unique: primaryKey({ columns: [table.channelId, table.postId] }),
  })
);

// Featured Posts Configuration - Global settings for Spaces discovery page
export const featuredPostsConfig = pgTable('featured_posts_config', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  displayMode: text('display_mode').default('pinned').notNull(), // 'pinned', 'engagement', 'latest_from_spaces'
  specificSpaces: text('specific_spaces').array(), // Channel IDs to feature posts from
  maxPosts: integer('max_posts').default(4).notNull(), // Maximum posts to display (1-4)
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: integer('updated_by')
    .references(() => users.id)
    .notNull(),
});

// Channels Relations
export const interestChannelsRelations = relations(
  interestChannels,
  ({ one, many }) => ({
    interest: one(interests, {
      fields: [interestChannels.interestId],
      references: [interests.id],
    }),
    organization: one(organizations, {
      fields: [interestChannels.organization_id],
      references: [organizations.id],
    }),
    members: many(interestChannelMembers),
    posts: many(interestChannelPosts),
  })
);

export const interestChannelMembersRelations = relations(
  interestChannelMembers,
  ({ one }) => ({
    channel: one(interestChannels, {
      fields: [interestChannelMembers.channelId],
      references: [interestChannels.id],
    }),
    user: one(users, {
      fields: [interestChannelMembers.userId],
      references: [users.id],
    }),
  })
);

export const interestChannelPostsRelations = relations(
  interestChannelPosts,
  ({ one, many }) => ({
    channel: one(interestChannels, {
      fields: [interestChannelPosts.channelId],
      references: [interestChannels.id],
    }),
    author: one(users, {
      fields: [interestChannelPosts.userId],
      references: [users.id],
    }),
    comments: many(interestChannelPostComments),
    likes: many(interestChannelPostLikes),
  })
);

export const interestChannelPostCommentsRelations = relations(
  interestChannelPostComments,
  ({ one }) => ({
    post: one(interestChannelPosts, {
      fields: [interestChannelPostComments.postId],
      references: [interestChannelPosts.id],
    }),
    author: one(users, {
      fields: [interestChannelPostComments.userId],
      references: [users.id],
    }),
  })
);

export const interestChannelPostLikesRelations = relations(
  interestChannelPostLikes,
  ({ one }) => ({
    post: one(interestChannelPosts, {
      fields: [interestChannelPostLikes.postId],
      references: [interestChannelPosts.id],
    }),
    user: one(users, {
      fields: [interestChannelPostLikes.userId],
      references: [users.id],
    }),
  })
);

export const interestChannelJoinRequestsRelations = relations(
  interestChannelJoinRequests,
  ({ one }) => ({
    channel: one(interestChannels, {
      fields: [interestChannelJoinRequests.channelId],
      references: [interestChannels.id],
    }),
    user: one(users, {
      fields: [interestChannelJoinRequests.userId],
      references: [users.id],
    }),
    reviewer: one(users, {
      fields: [interestChannelJoinRequests.reviewedBy],
      references: [users.id],
    }),
  })
);

export const interestChannelPinnedPostsRelations = relations(
  interestChannelPinnedPosts,
  ({ one }) => ({
    channel: one(interestChannels, {
      fields: [interestChannelPinnedPosts.channelId],
      references: [interestChannels.id],
    }),
    post: one(interestChannelPosts, {
      fields: [interestChannelPinnedPosts.postId],
      references: [interestChannelPosts.id],
    }),
    pinnedBy: one(users, {
      fields: [interestChannelPinnedPosts.pinnedBy],
      references: [users.id],
    }),
  })
);

// Channels TypeScript types
export type InterestChannel = typeof interestChannels.$inferSelect;
export const insertInterestChannelSchema = createInsertSchema(
  interestChannels
).omit({ id: true, memberCount: true, createdAt: true, updatedAt: true });
export type InsertInterestChannel = z.infer<typeof insertInterestChannelSchema>;

export type InterestChannelMember = typeof interestChannelMembers.$inferSelect;
export const insertInterestChannelMemberSchema = createInsertSchema(
  interestChannelMembers
).omit({ id: true, joinedAt: true });
export type InsertInterestChannelMember = z.infer<
  typeof insertInterestChannelMemberSchema
>;

export type InterestChannelPost = typeof interestChannelPosts.$inferSelect;
export const insertInterestChannelPostSchema = createInsertSchema(
  interestChannelPosts
).omit({
  id: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInterestChannelPost = z.infer<
  typeof insertInterestChannelPostSchema
>;

export type FeaturedPostsConfig = typeof featuredPostsConfig.$inferSelect;
export const insertFeaturedPostsConfigSchema = createInsertSchema(
  featuredPostsConfig
).omit({ id: true, updatedAt: true });
export type InsertFeaturedPostsConfig = z.infer<
  typeof insertFeaturedPostsConfigSchema
>;

export type InterestChannelPostComment =
  typeof interestChannelPostComments.$inferSelect;
export const insertInterestChannelPostCommentSchema = createInsertSchema(
  interestChannelPostComments
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInterestChannelPostComment = z.infer<
  typeof insertInterestChannelPostCommentSchema
>;

export type InterestChannelPostLike =
  typeof interestChannelPostLikes.$inferSelect;
export const insertInterestChannelPostLikeSchema = createInsertSchema(
  interestChannelPostLikes
).omit({ id: true, createdAt: true });
export type InsertInterestChannelPostLike = z.infer<
  typeof insertInterestChannelPostLikeSchema
>;

export type InterestChannelJoinRequest =
  typeof interestChannelJoinRequests.$inferSelect;
export const insertInterestChannelJoinRequestSchema = createInsertSchema(
  interestChannelJoinRequests
).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertInterestChannelJoinRequest = z.infer<
  typeof insertInterestChannelJoinRequestSchema
>;

// Export Onboarding Schema
export * from './onboarding';
