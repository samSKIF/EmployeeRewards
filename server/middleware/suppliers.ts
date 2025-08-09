import { TilloResponse, CarltonResponse } from '@platform/sdk/types';

// Check if we're in dry run mode (default) or live mode
const MODE = process.env.MODE || 'DRY_RUN';

// Mock Tillo supplier for gift cards
export const tilloSupplier = async (
  productName: string,
  user_id: number
): Promise<TilloResponse> => {
  // Simulate external API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // In dry run mode, return mock data
  if (MODE === 'DRY_RUN') {
    console.log(
      `[DRY_RUN] Tillo supplier fulfilling ${productName} for user ${user_id}`
    );

    // Simulate a success response
    return {
      success: true,
      giftCardLink: `https://mock-giftcard.tillo.io/${Math.random().toString(36).substring(2, 15)}`,
    };
  }

  // In LIVE mode, would integrate with actual Tillo API
  // This would be implemented when moving to production
  throw new Error('LIVE mode not implemented for Tillo supplier');
};

// Mock Carlton supplier for physical products
export const carltonSupplier = async (
  productName: string,
  user_id: number,
  shippingDetails?: any
): Promise<CarltonResponse> => {
  // Simulate external API call delay
  await new Promise((resolve) => setTimeout(resolve, 700));

  // In dry run mode, return mock data
  if (MODE === 'DRY_RUN') {
    console.log(
      `[DRY_RUN] Carlton supplier fulfilling ${productName} for user ${user_id}`
    );

    // Generate a mock order ID
    const orderId = `CARL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Simulate a success response
    return {
      success: true,
      orderId,
    };
  }

  // In LIVE mode, would integrate with actual Carlton API
  // This would be implemented when moving to production
  throw new Error('LIVE mode not implemented for Carlton supplier');
};
