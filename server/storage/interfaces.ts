// Storage interfaces for ThrivioHR platform
// Gold standard compliance: Enterprise-grade type safety

import type {
  User,
  InsertUser,
  Account,
  Transaction,
  Product,
  InsertProduct,
  Order,
  InsertOrder,
  Post,
  InsertPost,
  Comment,
  InsertComment,
  Reaction,
  InsertReaction,
  Poll,
  InsertPoll,
  PollVote,
  InsertPollVote,
  Recognition,
  InsertRecognition,
  Conversation,
  InsertConversation,
  ConversationParticipant,
  InsertConversationParticipant,
  Message,
  InsertMessage,
  Survey,
  InsertSurvey,
  SurveyQuestion,
  InsertSurveyQuestion,
  SurveyResponse,
  InsertSurveyResponse,
  SurveyAnswer,
  InsertSurveyAnswer,
} from '@shared/schema';

import type {
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
  SocialStats,
} from '@shared/types';

export interface IUserStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByName(name: string, surname: string): Promise<User | undefined>;
  checkDuplicateUser(
    email: string,
    name?: string,
    surname?: string
  ): Promise<{ emailExists: boolean; nameExists: boolean }>;
  createUser(user: InsertUser): Promise<User>;
  getUserWithBalance(id: number): Promise<UserWithBalance | undefined>;
  getAllUsersWithBalance(): Promise<UserWithBalance[]>;

  // Authentication
  verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
}

export interface IPointsStorage {
  // Account management
  getAccountByUserId(userId: number): Promise<Account | undefined>;
  getSystemAccount(): Promise<Account>;

  // Points and transactions
  getUserBalance(userId: number): Promise<number>;
  earnPoints(
    userId: number,
    amount: number,
    reason: string,
    description: string,
    adminId?: number
  ): Promise<Transaction>;
  redeemPoints(
    userId: number,
    amount: number,
    reason: string,
    description: string,
    adminId?: number
  ): Promise<Transaction>;
  transferPoints(
    fromUserId: number,
    toUserId: number,
    amount: number,
    reason: string,
    description: string,
    adminId?: number
  ): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<TransactionWithDetails[]>;
  getAllTransactions(): Promise<TransactionWithDetails[]>;
  getTransactionById(id: number): Promise<TransactionWithDetails | undefined>;
  
  // Dashboard stats
  getTransactionStats(): Promise<DashboardStats>;
}

export interface IShopStorage {
  // Product management
  getProducts(): Promise<Product[]>;
  getProductsWithAvailability(userId: number): Promise<ProductWithAvailable[]>;
  getProductById(id: number): Promise<Product | undefined>;
  createProduct(productData: InsertProduct): Promise<Product>;
  deleteAllProducts(): Promise<void>;

  // Order management
  getOrdersByUserId(userId: number): Promise<OrderWithDetails[]>;
  getAllOrders(): Promise<OrderWithDetails[]>;
  getOrderById(id: number): Promise<OrderWithDetails | undefined>;
  createOrder(orderData: InsertOrder): Promise<Order>;
}

export interface ISocialStorage {
  // Post management
  createPost(postData: InsertPost): Promise<Post>;
  createBirthdayPost(userId: number): Promise<Post>;
  createWorkAnniversaryPost(userId: number): Promise<Post>;
  getPosts(currentUserId?: number): Promise<PostWithDetails[]>;
  getPostById(id: number): Promise<PostWithDetails | undefined>;
  deletePost(id: number): Promise<boolean>;

  // Comment management
  createComment(commentData: InsertComment): Promise<Comment>;
  getCommentsByPostId(postId: number, currentUserId?: number): Promise<CommentWithUser[]>;
  deleteComment(id: number): Promise<boolean>;

  // Reaction management
  addReaction(userId: number, reactionData: InsertReaction): Promise<Reaction>;
  removeReaction(userId: number, postId: number): Promise<boolean>;
  getUserReaction(userId: number, postId: number): Promise<Reaction | undefined>;

  // Poll management
  createPoll(pollData: InsertPoll): Promise<Poll>;
  getPollById(id: number): Promise<PollWithVotes | undefined>;
  submitPollVote(voteData: InsertPollVote): Promise<PollVote>;

  // Social stats
  getSocialStats(): Promise<SocialStats>;
}

export interface IRecognitionStorage {
  // Recognition management
  createRecognition(recognitionData: InsertRecognition): Promise<Recognition>;
  getRecognitionById(id: number): Promise<RecognitionWithDetails | undefined>;
  getRecognitions(): Promise<RecognitionWithDetails[]>;
  updateRecognitionStatus(
    id: number,
    status: string,
    transactionId?: number
  ): Promise<boolean>;
}

export interface ISurveyStorage {
  // Survey management
  createSurvey(surveyData: InsertSurvey): Promise<Survey>;
  getSurveys(): Promise<Survey[]>;
  getSurveyById(id: number): Promise<Survey | undefined>;
  
  // Survey questions
  createSurveyQuestion(questionData: InsertSurveyQuestion): Promise<SurveyQuestion>;
  getSurveyQuestions(surveyId: number): Promise<SurveyQuestion[]>;
  
  // Survey responses
  createSurveyResponse(responseData: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyResponses(surveyId: number): Promise<SurveyResponse[]>;
  
  // Survey answers
  createSurveyAnswer(answerData: InsertSurveyAnswer): Promise<SurveyAnswer>;
  getSurveyAnswers(responseId: number): Promise<SurveyAnswer[]>;
}

export interface IChatStorage {
  // Conversation management
  createConversation(conversationData: InsertConversation): Promise<Conversation>;
  getConversationsByUserId(userId: number): Promise<ConversationWithDetails[]>;
  getConversationById(id: number): Promise<ConversationWithDetails | undefined>;
  
  // Participant management
  addParticipant(participantData: InsertConversationParticipant): Promise<ConversationParticipant>;
  
  // Message management
  createMessage(messageData: InsertMessage): Promise<Message>;
  getMessagesByConversationId(conversationId: number): Promise<MessageWithSender[]>;
}

// Main storage interface combining all modules
export interface IStorage
  extends IUserStorage,
    IPointsStorage,
    IShopStorage,
    ISocialStorage,
    IRecognitionStorage,
    ISurveyStorage,
    IChatStorage {}