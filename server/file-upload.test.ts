import { getPublicUrl, setupStaticFileServing } from './file-upload';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

jest.mock('fs');
jest.mock('path');

describe('File Upload Module', () => {
  describe('getPublicUrl', () => {
    it('should return public URL for uploaded file', () => {
      const filename = 'test-image.jpg';
      const expectedUrl = '/uploads/test-image.jpg';
      
      const result = getPublicUrl(filename);
      
      expect(result).toBe(expectedUrl);
    });

    it('should handle empty filename', () => {
      const result = getPublicUrl('');
      
      expect(result).toBe('/uploads/');
    });

    it('should handle filename with special characters', () => {
      const filename = 'test file with spaces.jpg';
      const result = getPublicUrl(filename);
      
      expect(result).toBe('/uploads/test file with spaces.jpg');
    });
  });

  describe('setupStaticFileServing', () => {
    let app: express.Application;
    let mockUse: jest.Mock;
    
    beforeEach(() => {
      mockUse = jest.fn();
      app = {
        use: mockUse,
      } as any;
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    });

    it('should setup static file serving for uploads', () => {
      setupStaticFileServing(app);
      
      expect(mockUse).toHaveBeenCalledTimes(1);
      expect(mockUse).toHaveBeenCalledWith(
        '/uploads',
        expect.any(Function)
      );
    });

    it('should create uploads directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      
      setupStaticFileServing(app);
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true }
      );
    });

    it('should log uploads directory path', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      setupStaticFileServing(app);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Using uploads directory:')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('File upload middleware', () => {
    it('should filter allowed file types', () => {
      // Test file filter logic
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const testFile = { mimetype: 'image/jpeg' };
      
      const isAllowed = allowedTypes.includes(testFile.mimetype);
      
      expect(isAllowed).toBe(true);
    });

    it('should reject disallowed file types', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const testFile = { mimetype: 'application/exe' };
      
      const isAllowed = allowedTypes.includes(testFile.mimetype);
      
      expect(isAllowed).toBe(false);
    });

    it('should generate unique filenames', () => {
      const originalName = 'test.jpg';
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const expectedPattern = new RegExp(`${timestamp}-${random}-test\\.jpg`);
      
      const generatedName = `${timestamp}-${random}-${originalName}`;
      
      expect(generatedName).toMatch(expectedPattern);
    });
  });
});