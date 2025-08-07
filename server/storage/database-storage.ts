// Main database storage implementation for ThrivioHR platform
// Gold standard compliance: Consolidated modular architecture

import { UserStorage } from './user-storage';
import { PointsStorage } from './points-storage';
import { ShopStorage } from './shop-storage';
import { SocialStorage } from './social-storage';
import { RecognitionStorage } from './recognition-storage';
import { SurveyStorage } from './survey-storage';
import { ChatStorage } from './chat-storage';
import { OrganizationStorage } from './organization-storage';
import type { IStorage } from './interfaces';

// Consolidated database storage implementing all storage interfaces
export class DatabaseStorage implements IStorage {
  private userStorage: UserStorage;
  private pointsStorage: PointsStorage;
  private shopStorage: ShopStorage;
  private socialStorage: SocialStorage;
  private recognitionStorage: RecognitionStorage;
  private surveyStorage: SurveyStorage;
  private chatStorage: ChatStorage;
  private organizationStorage: OrganizationStorage;

  constructor() {
    this.userStorage = new UserStorage();
    this.pointsStorage = new PointsStorage();
    this.shopStorage = new ShopStorage();
    this.socialStorage = new SocialStorage();
    this.recognitionStorage = new RecognitionStorage();
    this.surveyStorage = new SurveyStorage();
    this.chatStorage = new ChatStorage();
    this.organizationStorage = new OrganizationStorage();
  }

  // User methods
  async getUser(id: number) {
    return this.userStorage.getUser(id);
  }

  async getUserById(id: number) {
    return this.userStorage.getUser(id);
  }

  async getUserByEmail(email: string) {
    return this.userStorage.getUserByEmail(email);
  }

  async getUserByName(name: string, surname: string) {
    return this.userStorage.getUserByName(name, surname);
  }

  async checkDuplicateUser(email: string, name?: string, surname?: string) {
    return this.userStorage.checkDuplicateUser(email, name, surname);
  }

  async createUser(user: any) {
    return this.userStorage.createUser(user);
  }

  async updateUser(id: number, userData: any) {
    return this.userStorage.updateUser(id, userData);
  }

  async deleteUser(id: number) {
    return this.userStorage.deleteUser(id);
  }

  async getUserWithBalance(id: number) {
    return this.userStorage.getUserWithBalance(id);
  }

  async getAllUsersWithBalance() {
    return this.userStorage.getAllUsersWithBalance();
  }

  async verifyPassword(plainPassword: string, hashedPassword: string) {
    return this.userStorage.verifyPassword(plainPassword, hashedPassword);
  }

  // Points methods
  async getAccountByUserId(userId: number) {
    return this.pointsStorage.getAccountByUserId(userId);
  }

  async getSystemAccount() {
    return this.pointsStorage.getSystemAccount();
  }

  async getUserBalance(userId: number) {
    return this.pointsStorage.getUserBalance(userId);
  }

  async earnPoints(userId: number, amount: number, reason: string, description: string, adminId?: number) {
    return this.pointsStorage.earnPoints(userId, amount, reason, description, adminId);
  }

  async redeemPoints(userId: number, amount: number, reason: string, description: string, adminId?: number) {
    return this.pointsStorage.redeemPoints(userId, amount, reason, description, adminId);
  }

  async transferPoints(fromUserId: number, toUserId: number, amount: number, reason: string, description: string, adminId?: number) {
    return this.pointsStorage.transferPoints(fromUserId, toUserId, amount, reason, description, adminId);
  }

  async getUserTransactions(userId: number) {
    return this.pointsStorage.getUserTransactions(userId);
  }

  async getAllTransactions() {
    return this.pointsStorage.getAllTransactions();
  }

  async getTransactionById(id: number) {
    return this.pointsStorage.getTransactionById(id);
  }

  async getTransactionStats() {
    return this.pointsStorage.getTransactionStats();
  }

  // Shop methods
  async getProducts() {
    return this.shopStorage.getProducts();
  }

  async getProductsWithAvailability(userId: number) {
    const allProducts = await this.shopStorage.getProducts();
    const userBalance = await this.pointsStorage.getUserBalance(userId);
    
    return allProducts.map((product) => ({
      ...product,
      supplier: product.supplier || '',
      isAvailable: userBalance >= product.points,
    }));
  }

  async getProductById(id: number) {
    return this.shopStorage.getProductById(id);
  }

  async createProduct(productData: any) {
    return this.shopStorage.createProduct(productData);
  }

  async deleteAllProducts() {
    return this.shopStorage.deleteAllProducts();
  }

  async getOrdersByUserId(userId: number) {
    return this.shopStorage.getOrdersByUserId(userId);
  }

  async getAllOrders() {
    return this.shopStorage.getAllOrders();
  }

  async getOrderById(id: number) {
    return this.shopStorage.getOrderById(id);
  }

  async createOrder(orderData: any) {
    return this.shopStorage.createOrder(orderData);
  }

  // Social methods
  async createPost(postData: any) {
    return this.socialStorage.createPost(postData);
  }

  async createBirthdayPost(userId: number) {
    return this.socialStorage.createBirthdayPost(userId);
  }

  async createWorkAnniversaryPost(userId: number) {
    return this.socialStorage.createWorkAnniversaryPost(userId);
  }

  async getPosts(currentUserId?: number) {
    return this.socialStorage.getPosts(currentUserId);
  }

  async getPostById(id: number) {
    return this.socialStorage.getPostById(id);
  }

  async deletePost(id: number) {
    return this.socialStorage.deletePost(id);
  }

  async createComment(commentData: any) {
    return this.socialStorage.createComment(commentData);
  }

  async getCommentsByPostId(postId: number, currentUserId?: number) {
    return this.socialStorage.getCommentsByPostId(postId, currentUserId);
  }

  async deleteComment(id: number) {
    return this.socialStorage.deleteComment(id);
  }

  async addReaction(userId: number, reactionData: any) {
    return this.socialStorage.addReaction(userId, reactionData);
  }

  async removeReaction(userId: number, postId: number) {
    return this.socialStorage.removeReaction(userId, postId);
  }

  async getUserReaction(userId: number, postId: number) {
    return this.socialStorage.getUserReaction(userId, postId);
  }

  async createPoll(pollData: any) {
    return this.socialStorage.createPoll(pollData);
  }

  async getPollById(id: number) {
    return this.socialStorage.getPollById(id);
  }

  async submitPollVote(voteData: any) {
    return this.socialStorage.submitPollVote(voteData);
  }

  async getSocialStats() {
    return this.socialStorage.getSocialStats();
  }

  // Recognition methods
  async createRecognition(recognitionData: any) {
    return this.recognitionStorage.createRecognition(recognitionData);
  }

  async getRecognitionById(id: number) {
    return this.recognitionStorage.getRecognitionById(id);
  }

  async getRecognitions() {
    return this.recognitionStorage.getRecognitions();
  }

  async updateRecognitionStatus(id: number, status: string, transactionId?: number) {
    return this.recognitionStorage.updateRecognitionStatus(id, status, transactionId);
  }

  // Survey methods
  async createSurvey(surveyData: any) {
    return this.surveyStorage.createSurvey(surveyData);
  }

  async getSurveys() {
    return this.surveyStorage.getSurveys();
  }

  async getSurveyById(id: number) {
    return this.surveyStorage.getSurveyById(id);
  }

  async createSurveyQuestion(questionData: any) {
    return this.surveyStorage.createSurveyQuestion(questionData);
  }

  async getSurveyQuestions(surveyId: number) {
    return this.surveyStorage.getSurveyQuestions(surveyId);
  }

  async createSurveyResponse(responseData: any) {
    return this.surveyStorage.createSurveyResponse(responseData);
  }

  async getSurveyResponses(surveyId: number) {
    return this.surveyStorage.getSurveyResponses(surveyId);
  }

  async createSurveyAnswer(answerData: any) {
    return this.surveyStorage.createSurveyAnswer(answerData);
  }

  async getSurveyAnswers(responseId: number) {
    return this.surveyStorage.getSurveyAnswers(responseId);
  }

  // Chat methods
  async createConversation(conversationData: any) {
    return this.chatStorage.createConversation(conversationData);
  }

  async getConversationsByUserId(userId: number) {
    return this.chatStorage.getConversationsByUserId(userId);
  }

  async getConversationById(id: number) {
    return this.chatStorage.getConversationById(id);
  }

  async addParticipant(participantData: any) {
    return this.chatStorage.addParticipant(participantData);
  }

  async createMessage(messageData: any) {
    return this.chatStorage.createMessage(messageData);
  }

  async getMessagesByConversationId(conversationId: number) {
    return this.chatStorage.getMessagesByConversationId(conversationId);
  }

  // Organization methods
  async createOrganization(orgData: any) {
    return this.organizationStorage.createOrganization(orgData);
  }

  async getOrganizationById(id: number) {
    return this.organizationStorage.getOrganizationById(id);
  }

  async getOrganizationBySlug(slug: string) {
    return this.organizationStorage.getOrganizationBySlug(slug);
  }

  async updateOrganization(id: number, updates: any) {
    return this.organizationStorage.updateOrganization(id, updates);
  }

  async createDepartment(deptData: any) {
    return this.organizationStorage.createDepartment(deptData);
  }

  async getDepartmentsByOrganization(organizationId: number) {
    return this.organizationStorage.getDepartmentsByOrganization(organizationId);
  }

  async updateDepartment(id: number, updates: any) {
    return this.organizationStorage.updateDepartment(id, updates);
  }

  async createLocation(locationData: any) {
    return this.organizationStorage.createLocation(locationData);
  }

  async getLocationsByOrganization(organizationId: number) {
    return this.organizationStorage.getLocationsByOrganization(organizationId);
  }

  async updateLocation(id: number, updates: any) {
    return this.organizationStorage.updateLocation(id, updates);
  }

  // Additional methods for API compatibility
  async getUserCount(): Promise<number> {
    return this.userStorage.getUserCount();
  }

  async getUsersByOrganization(organizationId: number) {
    return this.userStorage.getUsersByOrganization(organizationId);
  }

  async getEmployeesWithFilters(organizationId: number, filters: any) {
    return this.userStorage.getEmployeesWithFilters(organizationId, filters);
  }

  async searchEmployees(organizationId: number, query: string, filters?: any) {
    return this.userStorage.searchEmployees(organizationId, query, filters);
  }

  async checkUserDependencies(userId: number) {
    return this.userStorage.checkUserDependencies(userId);
  }

  // Organization hierarchy methods
  async getOrganizationHierarchy(organizationId: number) {
    return this.userStorage.getOrganizationHierarchy(organizationId);
  }

  async getUserHierarchy(userId: number) {
    return this.userStorage.getUserHierarchy(userId);
  }

  async getManagerChain(userId: number) {
    return this.userStorage.getManagerChain(userId);
  }

  async getReportingTree(userId: number, maxDepth?: number) {
    return this.userStorage.getReportingTree(userId, maxDepth);
  }

  // Social storage methods for channels and comments
  async getTrendingChannels() {
    return this.socialStorage.getTrendingChannels();
  }

  async getChannelSuggestions() {
    return this.socialStorage.getChannelSuggestions();
  }

  async getUserChannels(userId: number) {
    return this.socialStorage.getUserChannels(userId);
  }

  async getOrganizationFeatures(organizationId: number) {
    return this.organizationStorage.getOrganizationFeatures(organizationId);
  }

  // User management methods
  async getUsers(organizationId?: number, limit?: number, offset?: number) {
    return this.userStorage.getUsers(organizationId, limit, offset);
  }

  async getAllUsersWithBalance() {
    return this.userStorage.getAllUsersWithBalance();
  }
}