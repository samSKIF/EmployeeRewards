import { User, Product, Transaction, Order, Post, Comment, Poll, Recognition, Reaction, Message, Conversation } from "./schema";

// Authentication types
export type AuthResponse = {
  user: Omit<User, "password">;
  token: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

// Reward system types
export type BalanceResponse = {
  balance: number;
  userId: number;
};

export type EarnRequest = {
  userId: number;
  amount: number;
  reason: string;
  description: string;
};

export type RedeemRequest = {
  userId: number;
  amount: number;
  productId: number;
  description: string;
};

export type TransactionResponse = {
  transaction: Transaction;
  balance: number;
};

export type ProductWithAvailable = Product & {
  available: boolean;
};

export type UserWithBalance = {
  id: number;
  name: string;
  email: string;
  department?: string;
  birthDate?: Date;
  balance: number;
  avatarUrl?: string;
  jobTitle?: string;
};

export type TransactionWithDetails = Transaction & {
  userName: string;
  creatorName?: string;
  accountType: string;
  isDebit: boolean;
};

export type OrderWithDetails = Order & {
  productName: string;
  userName: string;
  points: number;
};

// Supplier responses
export type TilloResponse = {
  success: boolean;
  giftCardLink?: string;
  error?: string;
};

export type CarltonResponse = {
  success: boolean;
  orderId?: string;
  error?: string;
};

// Stats
export type DashboardStats = {
  totalPoints: number;
  pointsEarned: number;
  pointsUsed: number;
  redemptions: number;
  recognitionsGiven?: number;
  recognitionsReceived?: number;
};

// Social platform types
export type PostWithDetails = Post & {
  user: Omit<User, "password">;
  commentCount: number;
  reactionCounts: {
    [type: string]: number;
  };
  poll?: Poll;
  recognition?: RecognitionWithDetails;
  userReaction?: string; // The logged-in user's reaction type if any
};

export type CommentWithUser = Comment & {
  user: Omit<User, "password">;
};

export type RecognitionWithDetails = Recognition & {
  recognizer: Omit<User, "password">;
  recipient: Omit<User, "password">;
};

export type PollWithVotes = Poll & {
  totalVotes: number;
  voteCounts: number[];
  userVote?: number; // The logged-in user's vote index if any
  votePercentages: number[]; // For each option, percentage of total votes
};

export type MessageWithSender = Message & {
  sender: Omit<User, "password">;
};

export type ConversationWithDetails = Conversation & {
  participants: Omit<User, "password">[];
  lastMessage?: MessageWithSender;
  unreadCount: number; // For the current user
};

export type CreatePostRequest = {
  content: string;
  imageUrl?: string;
  type: "standard" | "recognition" | "poll";
  tags?: string[];
  
  // For recognition posts
  recognitionData?: {
    recipientId: number;
    badgeType: string;
    points: number;
    message: string;
  };
  
  // For poll posts
  pollData?: {
    question: string;
    options: string[];
    expiresAt?: string; // ISO date string
  };
};

export type CreateCommentRequest = {
  postId: number;
  content: string;
};

export type AddReactionRequest = {
  postId: number;
  type: string; // like, celebrate, etc.
};

export type VotePollRequest = {
  pollId: number;
  optionIndex: number;
};

export type CreateConversationRequest = {
  participantIds: number[];
  name?: string;
  isGroup: boolean;
};

export type SendMessageRequest = {
  conversationId: number;
  content: string;
};

export type SocialStats = {
  postsCount: number;
  commentsCount: number;
  recognitionsReceived: number;
  recognitionsGiven: number;
  unreadMessages: number;
  engagementScore: number; // A calculated score based on activity
};
