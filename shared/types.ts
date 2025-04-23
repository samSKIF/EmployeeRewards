// User types
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  department?: string;
  isAdmin?: boolean;
  birthDate?: string;
  avatarUrl?: string;
  jobTitle?: string;
  createdAt: Date;
}

export interface UserWithBalance extends User {
  balance: number;
}

// Account types
export interface Account {
  id: number;
  userId: number;
  accountType: string;
  balance: number;
  createdAt: Date;
}

// Transaction types
export interface Transaction {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  type: string;
  description: string;
  status: string;
  createdBy?: number;
  createdAt: Date;
}

export interface TransactionWithDetails extends Transaction {
  fromAccount: Account;
  toAccount: Account;
  user?: User;
  admin?: User;
}

// Product types
export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  points: number;
  imageUrl?: string;
  supplier: string;
  createdBy?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ProductWithAvailable extends Product {
  isAvailable: boolean;
}

// Order types
export interface Order {
  id: number;
  userId: number;
  productId: number;
  transactionId: number;
  status: string;
  externalRef?: string;
  createdAt: Date;
}

export interface OrderWithDetails extends Order {
  user: User;
  product: Product;
  transaction: Transaction;
}

// Dashboard stats
export interface DashboardStats {
  totalPoints: number;
  pointsEarned: number;
  pointsUsed: number;
  redemptions: number;
}

// Social types - Posts
export interface Post {
  id: number;
  userId: number;
  content: string;
  imageUrl?: string;
  type: 'standard' | 'poll' | 'recognition';
  tags?: string[];
  isPinned?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PostWithDetails extends Post {
  user: User;
  commentCount: number;
  reactionCounts: Record<string, number>;
  userReaction?: string;
  poll?: PollWithVotes;
  recognition?: RecognitionWithDetails;
}

// Social types - Comments
export interface Comment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: Date;
}

export interface CommentWithUser extends Comment {
  user: User;
}

// Social types - Reactions
export interface Reaction {
  id: number;
  postId: number;
  userId: number;
  type: string;
  createdAt: Date;
}

// Social types - Polls
export interface Poll {
  id: number;
  postId: number;
  question: string;
  options: string[];
  expiresAt?: Date;
  createdAt: Date;
}

export interface PollVote {
  id: number;
  pollId: number;
  userId: number;
  optionIndex: number;
  createdAt: Date;
}

export interface PollWithVotes extends Poll {
  totalVotes: number;
  voteCounts: number[];
  votePercentages: number[];
  userVote?: number;
}

// Social types - Recognitions
export interface Recognition {
  id: number;
  recognizerId: number;
  recipientId: number;
  postId?: number;
  badgeType: string;
  message: string;
  points: number;
  transactionId?: number;
  createdAt: Date;
}

export interface RecognitionWithDetails extends Recognition {
  recognizer: User;
  recipient: User;
}

// Social types - Chat
export interface Conversation {
  id: number;
  name?: string;
  isGroup: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  id: number;
  conversationId: number;
  userId: number;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface MessageWithSender extends Message {
  sender: User;
}

export interface ConversationWithDetails extends Conversation {
  participants: User[];
  lastMessage?: MessageWithSender;
  unreadCount: number;
}

// Social stats
export interface SocialStats {
  postsCount: number;
  commentsCount: number;
  recognitionsReceived: number;
  recognitionsGiven: number;
  unreadMessages: number;
  engagementScore: number;
}

// Supplier response types
export interface TilloResponse {
  success: boolean;
  giftCardLink?: string;
  orderId?: string;
  errorMessage?: string;
}

export interface CarltonResponse {
  success: boolean;
  orderId?: string;
  trackingNumber?: string;
  errorMessage?: string;
}

// New supplier response types
export interface AmazonGiftCardResponse {
  success: boolean;
  giftCardCode?: string;
  giftCardLink?: string;
  amount?: number;
  currency?: string;
  expiryDate?: string;
  errorMessage?: string;
}

export interface DeliverooResponse {
  success: boolean;
  voucherId?: string;
  voucherCode?: string;
  voucherLink?: string;
  amount?: number;
  currency?: string;
  expiryDate?: string;
  errorMessage?: string;
}

export interface WellbeingPartnerResponse {
  success: boolean;
  bookingId?: string;
  bookingLink?: string;
  sessionType?: string;
  partnerName?: string;
  appointmentDate?: string;
  errorMessage?: string;
}

// HR Analytics types
export interface PointsDistribution {
  ranges: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  totalUsers: number;
  averagePoints: number;
  medianPoints: number;
}

export interface RedemptionTrend {
  period: string;
  count: number;
  totalPoints: number;
  avgPointsPerRedemption: number;
}

export interface DepartmentEngagement {
  department: string;
  employeeCount: number;
  totalPoints: number;
  avgPointsPerEmployee: number;
  redemptionCount: number;
  participationRate: number;
}

export interface TopPerformer {
  id: number;
  name: string;
  surname: string;
  email: string;
  department: string;
  pointsEarned: number;
  recognitionsReceived: number;
  avatarUrl?: string;
}

export interface PopularReward {
  id: number;
  name: string;
  points: number;
  redeemCount: number;
  totalPointsSpent: number;
  category: string;
  supplier: string;
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  totalPointsAwarded: number;
  totalPointsRedeemed: number;
  totalRedemptions: number;
  topDepartments: Array<{
    name: string;
    pointsEarned: number;
  }>;
  recentTrends: {
    pointsAwardedLastMonth: number;
    pointsRedeemedLastMonth: number;
    newUsersLastMonth: number;
    percentageChange: {
      pointsAwarded: number;
      pointsRedeemed: number;
      newUsers: number;
    }
  };
}