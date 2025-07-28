import { describe, it, expect } from 'vitest';

// Test the location matching logic in isolation
describe('Location Matching Logic', () => {
  const mockLocations = ['New York', 'Tokyo', 'Dubai', 'San Francisco', 'London'];

  const matchLocation = (employeeLocation: string, availableLocations: string[]): string => {
    const trimmedLocation = (employeeLocation || '').trim();
    let matchedLocation = trimmedLocation;
    
    if (availableLocations && availableLocations.length > 0 && trimmedLocation) {
      // Try exact match first
      const exactMatch = availableLocations.find(loc => loc === trimmedLocation);
      if (exactMatch) {
        matchedLocation = exactMatch;
      } else {
        // Try case-insensitive match
        const caseInsensitiveMatch = availableLocations.find(loc => 
          loc.toLowerCase().trim() === trimmedLocation.toLowerCase().trim()
        );
        if (caseInsensitiveMatch) {
          matchedLocation = caseInsensitiveMatch;
        }
      }
    }
    
    return matchedLocation;
  };

  it('should match exact case location correctly', () => {
    const result = matchLocation('New York', mockLocations);
    expect(result).toBe('New York');
  });

  it('should match lowercase location to proper case', () => {
    const result = matchLocation('new york', mockLocations);
    expect(result).toBe('New York');
  });

  it('should match uppercase location to proper case', () => {
    const result = matchLocation('TOKYO', mockLocations);
    expect(result).toBe('Tokyo');
  });

  it('should match mixed case location to proper case', () => {
    const result = matchLocation('sAn FrAnCiScO', mockLocations);
    expect(result).toBe('San Francisco');
  });

  it('should handle locations with extra whitespace', () => {
    const result = matchLocation('  London  ', mockLocations);
    expect(result).toBe('London');
  });

  it('should return original value if no match found', () => {
    const result = matchLocation('Unknown City', mockLocations);
    expect(result).toBe('Unknown City');
  });

  it('should handle empty location gracefully', () => {
    const result = matchLocation('', mockLocations);
    expect(result).toBe('');
  });

  it('should handle null/undefined location gracefully', () => {
    const result1 = matchLocation(null as any, mockLocations);
    expect(result1).toBe('');
    
    const result2 = matchLocation(undefined as any, mockLocations);
    expect(result2).toBe('');
  });

  it('should handle empty locations array', () => {
    const result = matchLocation('New York', []);
    expect(result).toBe('New York');
  });

  it('should handle null/undefined locations array', () => {
    const result1 = matchLocation('New York', null as any);
    expect(result1).toBe('New York');
    
    const result2 = matchLocation('New York', undefined as any);
    expect(result2).toBe('New York');
  });

  it('should be case insensitive for complex location names', () => {
    const complexLocations = ['São Paulo', 'México City', 'New Delhi'];
    
    const result1 = matchLocation('são paulo', complexLocations);
    expect(result1).toBe('São Paulo');
    
    const result2 = matchLocation('MÉXICO CITY', complexLocations);
    expect(result2).toBe('México City');
    
    const result3 = matchLocation('new delhi', complexLocations);
    expect(result3).toBe('New Delhi');
  });

  it('should prioritize exact match over case-insensitive match', () => {
    const locations = ['paris', 'Paris', 'PARIS'];
    
    const result1 = matchLocation('Paris', locations);
    expect(result1).toBe('Paris'); // Exact match
    
    const result2 = matchLocation('paris', locations);
    expect(result2).toBe('paris'); // Exact match
    
    const result3 = matchLocation('PARIS', locations);
    expect(result3).toBe('PARIS'); // Exact match
  });

  it('should handle special characters and numbers', () => {
    const locations = ['São Paulo', 'New York-1', 'Dubai_Main'];
    
    const result1 = matchLocation('são paulo', locations);
    expect(result1).toBe('São Paulo');
    
    const result2 = matchLocation('new york-1', locations);
    expect(result2).toBe('New York-1');
    
    const result3 = matchLocation('DUBAI_MAIN', locations);
    expect(result3).toBe('Dubai_Main');
  });
});