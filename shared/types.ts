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
  title?: string;
  location?: string;
  responsibilities?: string;
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
  type: 'standard' | 'poll' | 'recognition' | 'celebration';
  tags?: string[];
  isPinned?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PostWithDetails extends Post {
  user?: User;
  userName?: string;
  userProfileImage?: string;
  avatarUrl?: string;
  commentCount?: number;
  reactionCount?: number;
  reactionCounts?: Record<string, number>;
  userReaction?: string;
  poll?: PollWithVotes;
  recognition?: RecognitionWithDetails;
  // MongoDB fields
  authorId?: number;
  authorName?: string;
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