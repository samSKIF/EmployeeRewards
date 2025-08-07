// Recognition System Vertical Slice - Main Export
// Provides complete recognition system functionality as a self-contained slice

// API Layer
export { default as recognitionRoutes } from './api/recognition.routes';
export { RecognitionController } from './api/recognition.controller';

// Domain Layer  
export { RecognitionDomain } from './domain/recognition.domain';
export type { 
  CreateRecognitionData, 
  UpdateRecognitionData, 
  RecognitionFilters,
  ManagerBudgetData
} from './domain/recognition.domain';

// Infrastructure Layer
export { RecognitionRepository } from './infrastructure/recognition.repository';

// Event Handlers
export { RecognitionEventHandlers, recognitionEventHandlers } from './events/recognition.event-handlers';

// Re-export key validation schemas for easy integration
export { 
  createRecognitionSchema,
  updateRecognitionSchema,
  recognitionFiltersSchema,
  managerBudgetSchema
} from './domain/recognition.domain';