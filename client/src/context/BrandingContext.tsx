import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrandingSetting } from "@shared/schema";

// Default branding values
const DEFAULT_BRANDING = {
  organizationName: "ThrivioHR",
  colorScheme: "default",
  primaryColor: "#00A389",
  secondaryColor: "#232E3E",
  accentColor: "#FFA500",
  logoUrl: ""
};

// Load branding from localStorage
const getStoredBranding = (): BrandingSetting => {
  try {
    const storedBranding = localStorage.getItem('appBranding');
    if (storedBranding) {
      return JSON.parse(storedBranding) as BrandingSetting;
    }
  } catch (error) {
    console.error("Failed to load branding from localStorage:", error);
  }
  return DEFAULT_BRANDING as BrandingSetting;
};

type BrandingContextType = {
  branding: BrandingSetting;
  isLoading: boolean;
  error: Error | null;
};

const BrandingContext = createContext<BrandingContextType>({
  branding: getStoredBranding(),
  isLoading: false,
  error: null
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [cssApplied, setCssApplied] = useState(false);
  const [localBranding] = useState(getStoredBranding());
  
  // Fetch branding settings - use stored branding as initial data
  const { 
    data: branding = localBranding, 
    isLoading, 
    error 
  } = useQuery<BrandingSetting>({
    queryKey: ["/api/hr/branding"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    initialData: localBranding
  });
  
  // Convert hex color to HSL format for Tailwind
  const hexToHSL = (hex: string) => {
    // Remove the # symbol if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex values
    let r = parseInt(hex.slice(0, 2), 16) / 255;
    let g = parseInt(hex.slice(2, 4), 16) / 255;
    let b = parseInt(hex.slice(4, 6), 16) / 255;
    
    // Find greatest and smallest values
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    
    // Calculate lightness
    let l = (max + min) / 2;
    
    let h, s;
    
    if (max === min) {
      // Achromatic
      h = s = 0;
    } else {
      // Calculate saturation
      s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
      
      // Calculate hue
      switch (max) {
        case r:
          h = (g - b) / (max - min) + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / (max - min) + 2;
          break;
        case b:
          h = (r - g) / (max - min) + 4;
          break;
        default:
          h = 0;
      }
      h /= 6;
    }
    
    // Convert to degrees (0-360), percentage (0-100)
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    
    return `${h} ${s}% ${l}%`;
  };

  // Store branding in localStorage when it changes
  useEffect(() => {
    if (!branding || isLoading) return;
    
    // Store for persistence between sessions
    try {
      localStorage.setItem('appBranding', JSON.stringify(branding));
      console.log("Branding stored in localStorage:", branding);
    } catch (error) {
      console.error("Failed to store branding in localStorage:", error);
    }
  }, [branding, isLoading]);

  // Apply branding to the entire app via CSS variables
  useEffect(() => {
    if (!branding || isLoading) return;
    
    const root = document.documentElement;
    let primaryColor = "#00A389";
    let secondaryColor = "#232E3E";
    let accentColor = "#FFA500";
    
    // Use preset colors if they're set
    if (branding.colorScheme && branding.colorScheme !== "custom") {
      // Find the preset in the COLOR_PRESETS
      const COLOR_PRESETS = [
        { id: "default", primary: "#00A389", secondary: "#232E3E", accent: "#FFA500" },
        { id: "blue", primary: "#1E40AF", secondary: "#1E3A8A", accent: "#60A5FA" },
        { id: "green", primary: "#15803D", secondary: "#166534", accent: "#4ADE80" },
        { id: "purple", primary: "#7E22CE", secondary: "#6B21A8", accent: "#C084FC" },
        { id: "red", primary: "#DC2626", secondary: "#B91C1C", accent: "#FCA5A5" }
      ];
      
      const preset = COLOR_PRESETS.find(p => p.id === branding.colorScheme);
      if (preset) {
        primaryColor = preset.primary;
        secondaryColor = preset.secondary;
        accentColor = preset.accent;
        
        root.style.setProperty('--primary', hexToHSL(primaryColor));
        root.style.setProperty('--secondary', hexToHSL(secondaryColor));
        root.style.setProperty('--accent', hexToHSL(accentColor));
      }
    } 
    // Otherwise use the custom colors
    else {
      // Apply primary colors
      if (branding.primaryColor) {
        primaryColor = branding.primaryColor;
        root.style.setProperty('--primary', hexToHSL(primaryColor));
        root.style.setProperty('--primary-foreground', '0 0% 100%');
      }
      
      // Apply secondary colors
      if (branding.secondaryColor) {
        secondaryColor = branding.secondaryColor;
        root.style.setProperty('--secondary', hexToHSL(secondaryColor));
        root.style.setProperty('--secondary-foreground', '0 0% 100%');
      }
      
      // Apply accent colors
      if (branding.accentColor) {
        accentColor = branding.accentColor;
        root.style.setProperty('--accent', hexToHSL(accentColor));
        root.style.setProperty('--accent-foreground', '0 0% 0%');
      }
    }
    
    // Also set the raw color values as CSS variables for SVGs and other direct usage
    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--secondary-color', secondaryColor);
    root.style.setProperty('--accent-color', accentColor);
    
    document.title = branding.organizationName || "ThrivioHR";
    setCssApplied(true);
    
    console.log("Branding applied:", branding);
  }, [branding, isLoading]);
  
  return (
    <BrandingContext.Provider value={{ branding, isLoading, error }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}