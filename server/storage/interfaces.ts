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
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByEmails(emails: string[]): Promise<User[]>;
  getUserByName(name: string, surname: string): Promise<User | undefined>;
  checkDuplicateUser(
    email: string,
    name?: string,
    surname?: string
  ): Promise<{ emailExists: boolean; nameExists: boolean }>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUserWithBalance(id: number): Promise<UserWithBalance | undefined>;
  getAllUsersWithBalance(): Promise<UserWithBalance[]>;
  getUsers(organizationId?: number, limit?: number, offset?: number): Promise<User[]>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  getUserCount(): Promise<number>;

  // Enhanced employee management methods
  getEmployeesWithFilters(
    organizationId: number, 
    filters: {
      search?: string;
      department?: string;
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<User[]>;
  
  searchEmployees(
    organizationId: number, 
    query: string, 
    filters?: {
      department?: string;
      status?: string;
      limit?: number;
    }
  ): Promise<User[]>;
  
  checkUserDependencies(userId: number): Promise<{
    hasActivePosts: boolean;
    hasActiveRecognitions: boolean;
    hasActiveOrders: boolean;
  }>;
  
  // Organization hierarchy methods
  getOrganizationHierarchy(organizationId: number): Promise<User[]>;
  getUserHierarchy(userId: number): Promise<{
    user: User;
    manager: User | null;
    skipManager: User | null;
    directReports: User[];
    indirectReports: User[];
    peers: User[];
  }>;
  getManagerChain(userId: number): Promise<User[]>;
  getReportingTree(userId: number, maxDepth?: number): Promise<any>;

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

export interface IDepartmentStorage {
  createDepartment(deptData: any): Promise<any>;
  getDepartmentsByOrganization(organizationId: number): Promise<any[]>;
  getDepartmentById(id: number): Promise<any | undefined>;
  getDepartmentByName(organizationId: number, name: string): Promise<any | undefined>;
  updateDepartment(id: number, updateData: any): Promise<any>;
  deleteDepartment(id: number): Promise<void>;
  getEmployeeCountByDepartment(organizationId: number, departmentName: string): Promise<number>;
}

// Main storage interface combining all modules
export interface IStorage
  extends IUserStorage,
    IPointsStorage,
    IShopStorage,
    ISocialStorage,
    IRecognitionStorage,
    ISurveyStorage,
    IChatStorage,
    IDepartmentStorage {}