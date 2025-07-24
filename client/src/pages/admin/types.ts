// Dashboard types
export interface DashboardStats {
  userCount?: number;
  subscribedUsers?: number;
  pointsBalance?: number;
  pointsEarned?: number;
  pointsSpent?: number;
  orderCount?: number;
  posts?: number;
  comments?: number;
  reactions?: number;
  recognitions?: number;
  recentRecognitions?: Recognition[];
  topPerformers?: TopPerformer[];
}

export interface Recognition {
  id: number;
  fromUser: {
    id: number;
    name?: string;
  };
  toUser: {
    id: number;
    name?: string;
  };
  message: string;
  points: number;
  badgeId?: number;
  createdAt: string;
}

export interface TopPerformer {
  id: number;
  name?: string;
  department?: string;
  points: number;
}

// Branding types
export interface BrandingConfig {
  organizationName?: string;
  colorScheme?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
}

// Shop configuration types
export interface ShopConfig {
  shopEnabled?: boolean;
  allowCustomPricing?: boolean;
  defaultCurrency?: string;
  pointToCurrencyRatio?: number;
  processingTimeInDays?: number;
  shippingTimeInDays?: number;
  categoryOrder?: string[];
  productVerification?: boolean;
  customCSS?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  products: Product[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  categoryName?: string;
  isActive: boolean;
  inStock: boolean;
  brandedProduct: boolean;
}
