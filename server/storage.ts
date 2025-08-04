// Modern modular storage implementation for ThrivioHR platform
// Gold standard compliance: Clean architecture with enterprise-grade error handling

import { DatabaseStorage } from './storage/database-storage';
import type { IStorage } from './storage/interfaces';

// Create the storage instance with new modular architecture
export const storage: IStorage = new DatabaseStorage();

// Export types for backward compatibility
export type { IStorage } from './storage/interfaces';