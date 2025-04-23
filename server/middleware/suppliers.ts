import { 
  TilloResponse, 
  CarltonResponse, 
  AmazonGiftCardResponse, 
  DeliverooResponse, 
  WellbeingPartnerResponse 
} from "@shared/types";
import axios from 'axios';

// Check if we're in dry run mode (default) or live mode
const MODE = process.env.MODE || "DRY_RUN";

// API keys - in production these would be in environment variables
const TILLO_API_KEY = process.env.TILLO_API_KEY || "tillo-sandbox-key";
const CARLTON_API_KEY = process.env.CARLTON_API_KEY || "carlton-sandbox-key";
const AMAZON_API_KEY = process.env.AMAZON_API_KEY || "amazon-sandbox-key";
const DELIVEROO_API_KEY = process.env.DELIVEROO_API_KEY || "deliveroo-sandbox-key";
const WELLBEING_API_KEY = process.env.WELLBEING_API_KEY || "wellbeing-sandbox-key";

/**
 * Tillo supplier API integration for gift cards
 */
export const tilloSupplier = async (
  productName: string, 
  userId: number
): Promise<TilloResponse> => {
  try {
    // Real implementation that would be used in LIVE mode
    if (MODE === "LIVE" && TILLO_API_KEY) {
      // Make a request to Tillo API (actual endpoint would be different)
      const response = await axios.post('https://api.tillo.io/v2/giftcards/issue', {
        apiKey: TILLO_API_KEY,
        productName,
        userId: userId.toString(),
        requestTime: new Date().toISOString()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TILLO_API_KEY}`
        }
      });
      
      if (response.status === 200 && response.data) {
        return {
          success: true,
          giftCardLink: response.data.cardLink,
          orderId: response.data.referenceId
        };
      } else {
        throw new Error(`Tillo API error: ${response.statusText}`);
      }
    }
    
    // In dry run mode, return sandbox data
    console.log(`[DRY_RUN] Tillo supplier fulfilling ${productName} for user ${userId}`);
    
    // Simulate a success response
    return {
      success: true,
      giftCardLink: `https://mock-giftcard.tillo.io/${Math.random().toString(36).substring(2, 15)}`,
      orderId: `TILLO-${Date.now()}`
    };
  } catch (error) {
    console.error(`Tillo supplier error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Carlton supplier API integration for physical products
 */
export const carltonSupplier = async (
  productName: string,
  userId: number,
  shippingDetails?: any
): Promise<CarltonResponse> => {
  try {
    // Real implementation that would be used in LIVE mode
    if (MODE === "LIVE" && CARLTON_API_KEY) {
      // Make a request to Carlton API (actual endpoint would be different)
      const response = await axios.post('https://api.carlton-fulfillment.com/orders', {
        apiKey: CARLTON_API_KEY,
        product: productName,
        customerRef: userId.toString(),
        shipping: shippingDetails || { method: 'standard' },
        requestTime: new Date().toISOString()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CARLTON_API_KEY
        }
      });
      
      if (response.status === 200 && response.data) {
        return {
          success: true,
          orderId: response.data.orderId,
          trackingNumber: response.data.trackingNumber
        };
      } else {
        throw new Error(`Carlton API error: ${response.statusText}`);
      }
    }
    
    // In dry run mode, return sandbox data
    console.log(`[DRY_RUN] Carlton supplier fulfilling ${productName} for user ${userId}`);
    
    // Generate a mock order ID
    const orderId = `CARL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Simulate a success response
    return {
      success: true,
      orderId,
      trackingNumber: `TRACK-${orderId.substring(5)}`
    };
  } catch (error) {
    console.error(`Carlton supplier error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Amazon Gift Card API integration
 */
export const amazonGiftCardSupplier = async (
  productName: string,
  userId: number,
  amount: number = 25,
  currency: string = 'USD'
): Promise<AmazonGiftCardResponse> => {
  try {
    // Real implementation that would be used in LIVE mode
    if (MODE === "LIVE" && AMAZON_API_KEY) {
      // Make a request to Amazon Gift Card API (actual endpoint would be different)
      const response = await axios.post('https://api.amazon.com/v2/gift-cards', {
        apiKey: AMAZON_API_KEY,
        amount: amount,
        currency: currency,
        recipientId: userId.toString(),
        notes: `Reward: ${productName}`,
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': AMAZON_API_KEY
        }
      });
      
      if (response.status === 200 && response.data) {
        return {
          success: true,
          giftCardCode: response.data.claimCode,
          giftCardLink: response.data.redemptionUrl,
          amount: response.data.amount,
          currency: response.data.currency,
          expiryDate: response.data.expiryDate
        };
      } else {
        throw new Error(`Amazon API error: ${response.statusText}`);
      }
    }
    
    // In dry run mode, return sandbox data
    console.log(`[DRY_RUN] Amazon supplier fulfilling ${productName} for user ${userId}`);
    
    // Generate a simulated gift card code
    const giftCardCode = `AMZN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    // Calculate an expiry date 1 year from now
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    // Simulate a success response
    return {
      success: true,
      giftCardCode: giftCardCode,
      giftCardLink: `https://www.amazon.com/redeem?code=${giftCardCode}`,
      amount: amount,
      currency: currency,
      expiryDate: expiryDate.toISOString()
    };
  } catch (error) {
    console.error(`Amazon supplier error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Deliveroo food delivery voucher API integration
 */
export const deliverooSupplier = async (
  productName: string,
  userId: number,
  amount: number = 25,
  currency: string = 'GBP'
): Promise<DeliverooResponse> => {
  try {
    // Real implementation that would be used in LIVE mode
    if (MODE === "LIVE" && DELIVEROO_API_KEY) {
      // Make a request to Deliveroo API (actual endpoint would be different)
      const response = await axios.post('https://api.deliveroo.com/vouchers', {
        apiKey: DELIVEROO_API_KEY,
        amount: amount,
        currency: currency,
        customerId: userId.toString(),
        description: `Employee Reward: ${productName}`,
        requestTime: new Date().toISOString()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DELIVEROO_API_KEY}`
        }
      });
      
      if (response.status === 200 && response.data) {
        return {
          success: true,
          voucherId: response.data.voucherId,
          voucherCode: response.data.voucherCode,
          voucherLink: response.data.redemptionUrl,
          amount: response.data.amount,
          currency: response.data.currency,
          expiryDate: response.data.expiryDate
        };
      } else {
        throw new Error(`Deliveroo API error: ${response.statusText}`);
      }
    }
    
    // In dry run mode, return sandbox data
    console.log(`[DRY_RUN] Deliveroo supplier fulfilling ${productName} for user ${userId}`);
    
    // Generate a simulated voucher code
    const voucherCode = `DELIV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const voucherId = `V-${Date.now()}`;
    
    // Calculate an expiry date 6 months from now
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6);
    
    // Simulate a success response
    return {
      success: true,
      voucherId: voucherId,
      voucherCode: voucherCode,
      voucherLink: `https://deliveroo.co.uk/redeem?code=${voucherCode}`,
      amount: amount,
      currency: currency,
      expiryDate: expiryDate.toISOString()
    };
  } catch (error) {
    console.error(`Deliveroo supplier error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Wellbeing partner API integration for wellness experiences
 */
export const wellbeingPartnerSupplier = async (
  productName: string,
  userId: number,
  sessionType: string = 'meditation'
): Promise<WellbeingPartnerResponse> => {
  try {
    // Real implementation that would be used in LIVE mode
    if (MODE === "LIVE" && WELLBEING_API_KEY) {
      // Make a request to Wellbeing Partner API (actual endpoint would be different)
      const response = await axios.post('https://api.wellbeingpartners.com/bookings', {
        apiKey: WELLBEING_API_KEY,
        sessionType: sessionType,
        userId: userId.toString(),
        productRequested: productName,
        requestTime: new Date().toISOString()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WELLBEING_API_KEY
        }
      });
      
      if (response.status === 200 && response.data) {
        return {
          success: true,
          bookingId: response.data.bookingId,
          bookingLink: response.data.bookingLink,
          sessionType: response.data.sessionType,
          partnerName: response.data.partnerName,
          appointmentDate: response.data.appointmentDate
        };
      } else {
        throw new Error(`Wellbeing API error: ${response.statusText}`);
      }
    }
    
    // In dry run mode, return sandbox data
    console.log(`[DRY_RUN] Wellbeing partner fulfilling ${productName} for user ${userId}`);
    
    // Generate a booking ID
    const bookingId = `WB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Get a random date in the next 30 days for the appointment
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 30) + 1);
    
    // Sample partner names
    const partners = ['MindfulMoments', 'ZenLife', 'WellnessWorks', 'BalanceHub', 'VitalityPartners'];
    const partnerName = partners[Math.floor(Math.random() * partners.length)];
    
    // Simulate a success response
    return {
      success: true,
      bookingId: bookingId,
      bookingLink: `https://wellbeingpartners.com/bookings/${bookingId}`,
      sessionType: sessionType,
      partnerName: partnerName,
      appointmentDate: appointmentDate.toISOString()
    };
  } catch (error) {
    console.error(`Wellbeing supplier error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
};
