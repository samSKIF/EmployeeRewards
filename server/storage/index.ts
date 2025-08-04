// Core storage interface for the ThrivioHR platform
// Modular architecture for better maintainability and type safety

export { UserStorage } from './user-storage';
export { SocialStorage } from './social-storage';
export { PointsStorage } from './points-storage';
export { ShopStorage } from './shop-storage';
export { RecognitionStorage } from './recognition-storage';
export { SurveyStorage } from './survey-storage';
export { ChatStorage } from './chat-storage';
export { OrganizationStorage } from './organization-storage';

// Re-export the consolidated storage interface
export { DatabaseStorage } from './database-storage';
export type { IStorage } from './interfaces';