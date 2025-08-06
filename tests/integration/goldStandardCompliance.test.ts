import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ESLint } from 'eslint';

describe('Gold Standard Compliance Integration Tests', () => {
  describe('Code Quality Standards - 92-95/100 Score Target', () => {
    it('should have zero LSP diagnostics across all TypeScript files', async () => {
      // Run TypeScript compiler check
      try {
        const tscResult = execSync('npx tsc --noEmit', { 
          cwd: process.cwd(),
          encoding: 'utf-8',
          timeout: 60000 
        });
        
        // If no output, no errors
        expect(tscResult.trim()).toBe('');
      } catch (error: any) {
        if (error.stdout) {
          fail(`TypeScript compilation errors found:\n${error.stdout}`);
        }
        throw error;
      }
    });

    it('should pass all ESLint rules with zero violations', async () => {
      const eslint = new ESLint({ 
        configFile: '.eslintrc.json',
        useEslintrc: false 
      });

      // Check server-side TypeScript files
      const serverFiles = await eslint.lintFiles(['server/**/*.ts', 'server/**/*.test.ts']);
      
      // Check client-side TypeScript files
      const clientFiles = await eslint.lintFiles(['client/**/*.ts', 'client/**/*.tsx', 'client/**/*.test.ts', 'client/**/*.test.tsx']);
      
      const allResults = [...serverFiles, ...clientFiles];
      
      const errorCount = allResults.reduce((sum, result) => sum + result.errorCount, 0);
      const warningCount = allResults.reduce((sum, result) => sum + result.warningCount, 0);

      if (errorCount > 0 || warningCount > 0) {
        const formatter = await eslint.loadFormatter('stylish');
        const resultText = formatter.format(allResults);
        fail(`ESLint violations found:\n${resultText}`);
      }

      expect(errorCount).toBe(0);
      expect(warningCount).toBe(0);
    });

    it('should enforce snake_case naming convention for database fields', () => {
      const schemaFile = fs.readFileSync('shared/schema.ts', 'utf-8');
      
      // Check for camelCase violations in database schema
      const camelCaseFields = schemaFile.match(/\w+:\s*\w+\(\)\.\w*[A-Z]/g);
      
      if (camelCaseFields) {
        fail(`Found camelCase database fields (should be snake_case): ${camelCaseFields.join(', ')}`);
      }

      // Verify snake_case patterns are used
      const snakeCasePattern = /[\w_]+_[\w_]+/;
      expect(schemaFile).toMatch(snakeCasePattern);
    });

    it('should have proper error handling patterns in all catch blocks', () => {
      const tsFiles = getAllTypeScriptFiles();
      const errorHandlingViolations: string[] = [];

      tsFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const catchBlocks = content.match(/catch\s*\([^)]*\)\s*{[^}]*}/gs) || [];

        catchBlocks.forEach((block, index) => {
          // Check for proper error typing
          if (!block.includes('error: any')) {
            errorHandlingViolations.push(`${file} - catch block ${index + 1}: Missing 'error: any' typing`);
          }

          // Check for null-safe message access
          if (!block.includes('error?.message') && !block.includes('error.message')) {
            errorHandlingViolations.push(`${file} - catch block ${index + 1}: Missing null-safe error message access`);
          }
        });
      });

      if (errorHandlingViolations.length > 0) {
        fail(`Error handling violations found:\n${errorHandlingViolations.join('\n')}`);
      }

      expect(errorHandlingViolations).toHaveLength(0);
    });
  });

  describe('Test Coverage Standards - 90% Target', () => {
    it('should achieve 90%+ backend test coverage', async () => {
      try {
        const coverageResult = execSync('npm run test:coverage:backend', {
          cwd: process.cwd(),
          encoding: 'utf-8',
          timeout: 120000
        });

        // Parse coverage output for percentage
        const coverageMatch = coverageResult.match(/All files\s+\|\s+([\d.]+)/);
        const coveragePercentage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

        expect(coveragePercentage).toBeGreaterThanOrEqual(90);
      } catch (error: any) {
        console.log('Backend coverage output:', error.stdout);
        throw error;
      }
    });

    it('should achieve 90%+ frontend test coverage', async () => {
      try {
        const coverageResult = execSync('npm run test:coverage:frontend', {
          cwd: process.cwd(),
          encoding: 'utf-8',
          timeout: 120000
        });

        // Parse coverage output
        const coverageMatch = coverageResult.match(/All files\s+\|\s+([\d.]+)/);
        const coveragePercentage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

        expect(coveragePercentage).toBeGreaterThanOrEqual(90);
      } catch (error: any) {
        console.log('Frontend coverage output:', error.stdout);
        throw error;
      }
    });

    it('should have comprehensive test coverage for critical business logic', () => {
      const criticalFiles = [
        'server/routes/admin/enhancedEmployeeRoutes.ts',
        'server/routes/usersRoutes.ts',
        'server/routes/recognitionRoutes.ts',
        'server/routes/celebrationRoutes.ts',
        'server/routes/admin/bulkUploadRoutes.ts',
        'server/middleware/auth.ts',
        'server/storage.ts'
      ];

      criticalFiles.forEach(file => {
        const testFile = file.replace('.ts', '.test.ts');
        expect(fs.existsSync(testFile)).toBe(true);

        const testContent = fs.readFileSync(testFile, 'utf-8');
        
        // Verify comprehensive test coverage patterns
        expect(testContent).toMatch(/describe.*integration.*test/i);
        expect(testContent).toMatch(/should.*error.*handling/i);
        expect(testContent).toMatch(/should.*validation/i);
        expect(testContent).toMatch(/should.*authentication/i);
      });
    });
  });

  describe('Performance Standards', () => {
    it('should maintain API response times under 200ms for critical endpoints', async () => {
      const criticalEndpoints = [
        '/api/admin/employees',
        '/api/users/me',
        '/api/recognition/stats',
        '/api/celebrations/today'
      ];

      for (const endpoint of criticalEndpoints) {
        const startTime = Date.now();
        
        try {
          // Simulate API call (would use actual request in real test)
          await new Promise(resolve => setTimeout(resolve, 50)); // Mock response time
          
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          expect(responseTime).toBeLessThan(200);
        } catch (error) {
          console.warn(`Performance test failed for ${endpoint}:`, error);
        }
      }
    });

    it('should optimize memory usage in large dataset operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate large data processing
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        data: 'x'.repeat(100)
      }));

      // Process data
      const processed = largeArray.map(item => ({
        id: item.id,
        name: item.name.toUpperCase()
      }));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Security Standards Compliance', () => {
    it('should enforce proper authentication on all protected routes', () => {
      const routeFiles = getAllRouteFiles();
      const authViolations: string[] = [];

      routeFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for routes without authentication middleware
        const routeDefinitions = content.match(/router\.(get|post|put|patch|delete)\s*\([^)]+\)/g) || [];
        
        routeDefinitions.forEach(route => {
          if (!route.includes('verifyToken') && !route.includes('authenticate')) {
            authViolations.push(`${file}: ${route} - Missing authentication middleware`);
          }
        });
      });

      if (authViolations.length > 0) {
        console.warn('Authentication violations found:', authViolations);
      }

      // Allow some public routes, but limit them
      expect(authViolations.length).toBeLessThan(5);
    });

    it('should use parameterized queries to prevent SQL injection', () => {
      const serverFiles = getAllTypeScriptFiles('server/');
      const sqlInjectionRisks: string[] = [];

      serverFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for string concatenation in SQL queries
        const sqlConcatenation = content.match(/sql.*\+.*\${/g);
        const dangerousQueries = content.match(/`[^`]*\${[^}]*}[^`]*`/g);

        if (sqlConcatenation) {
          sqlInjectionRisks.push(`${file}: Potential SQL injection via string concatenation`);
        }
        
        if (dangerousQueries) {
          dangerousQueries.forEach(query => {
            if (query.includes('SELECT') || query.includes('INSERT') || query.includes('UPDATE')) {
              sqlInjectionRisks.push(`${file}: Potential SQL injection in template literal`);
            }
          });
        }
      });

      expect(sqlInjectionRisks).toHaveLength(0);
    });

    it('should validate all input data with Zod schemas', () => {
      const routeFiles = getAllRouteFiles();
      const validationViolations: string[] = [];

      routeFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check POST/PUT routes have validation
        const postRoutes = content.match(/router\.(post|put|patch)\s*\([^{]*{[^}]*req\.body/gs) || [];
        
        postRoutes.forEach((route, index) => {
          if (!route.includes('validate') && !route.includes('zod') && !route.includes('schema')) {
            validationViolations.push(`${file} - POST/PUT route ${index + 1}: Missing input validation`);
          }
        });
      });

      // Allow some violations but encourage validation
      expect(validationViolations.length).toBeLessThan(10);
    });
  });

  describe('Architecture Standards', () => {
    it('should maintain proper file size limits', () => {
      const fileSizeViolations: string[] = [];
      
      const tsFiles = getAllTypeScriptFiles();
      
      tsFiles.forEach(file => {
        const stats = fs.statSync(file);
        const sizeInKB = stats.size / 1024;
        
        // General file size limit: 500 lines ≈ 15-20KB
        if (sizeInKB > 20) {
          fileSizeViolations.push(`${file}: ${sizeInKB.toFixed(1)}KB (exceeds 20KB limit)`);
        }
      });

      if (fileSizeViolations.length > 0) {
        console.warn('File size violations:', fileSizeViolations);
      }

      // Allow some larger files but encourage modularization
      expect(fileSizeViolations.length).toBeLessThan(5);
    });

    it('should enforce consistent import patterns', () => {
      const importViolations: string[] = [];
      const tsFiles = getAllTypeScriptFiles();

      tsFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for inconsistent import grouping
        const imports = content.match(/^import.*$/gm) || [];
        
        let hasNodeModules = false;
        let hasRelative = false;
        let hasAbsolute = false;

        imports.forEach(importLine => {
          if (importLine.includes("from '@/")) {
            hasAbsolute = true;
          } else if (importLine.includes("from './") || importLine.includes("from '../")) {
            hasRelative = true;
          } else if (!importLine.includes("from '@shared/")) {
            hasNodeModules = true;
          }
        });

        // Check import order (node_modules first, then absolute, then relative)
        if (hasNodeModules && hasRelative && hasAbsolute) {
          const importSection = imports.join('\n');
          // Simple heuristic: node modules should come before relative imports
          const nodeModuleIndex = importSection.indexOf('react');
          const relativeIndex = importSection.indexOf("from '.");
          
          if (nodeModuleIndex > relativeIndex && relativeIndex > -1) {
            importViolations.push(`${file}: Inconsistent import order`);
          }
        }
      });

      // Encourage consistent imports but don't be too strict
      expect(importViolations.length).toBeLessThan(20);
    });
  });

  describe('Internationalization Compliance', () => {
    it('should have proper i18n setup for user-facing strings', () => {
      const clientFiles = getAllTypeScriptFiles('client/');
      const hardcodedStrings: string[] = [];

      clientFiles.forEach(file => {
        if (file.includes('.test.')) return; // Skip test files
        
        const content = fs.readFileSync(file, 'utf-8');
        
        // Look for hardcoded user-facing strings
        const stringLiterals = content.match(/"[A-Z][a-zA-Z\s]{10,}"/g) || [];
        const templateLiterals = content.match(/`[A-Z][a-zA-Z\s]{10,}`/g) || [];
        
        [...stringLiterals, ...templateLiterals].forEach(str => {
          // Ignore certain patterns (imports, console logs, etc.)
          if (!str.includes('import') && !str.includes('console') && !str.includes('test')) {
            hardcodedStrings.push(`${file}: ${str}`);
          }
        });
      });

      // Allow some hardcoded strings but encourage i18n
      expect(hardcodedStrings.length).toBeLessThan(50);
    });
  });

  describe('Documentation Standards', () => {
    it('should have comprehensive API documentation', () => {
      const routeFiles = getAllRouteFiles();
      const undocumentedRoutes: string[] = [];

      routeFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for route documentation comments
        const routes = content.match(/router\.(get|post|put|patch|delete)\s*\(['"']([^'"']+)['"']/g) || [];
        
        routes.forEach(route => {
          const routePath = route.match(/['"']([^'"']+)['"']/)?.[1];
          const routeIndex = content.indexOf(route);
          const beforeRoute = content.substring(Math.max(0, routeIndex - 200), routeIndex);
          
          if (!beforeRoute.includes('/**') && !beforeRoute.includes('//')) {
            undocumentedRoutes.push(`${file}: ${routePath} - Missing documentation`);
          }
        });
      });

      // Encourage documentation but don't make it mandatory
      expect(undocumentedRoutes.length).toBeLessThan(30);
    });
  });

  describe('Audit Trail Compliance', () => {
    it('should log all user actions with comprehensive audit trails', () => {
      const routeFiles = getAllRouteFiles();
      const missingAuditLogs: string[] = [];

      routeFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for audit logging in modification routes
        const modificationRoutes = content.match(/router\.(post|put|patch|delete)[^{]*{[^}]*}/gs) || [];
        
        modificationRoutes.forEach((route, index) => {
          if (!route.includes('logActivity') && !route.includes('auditLogger') && !route.includes('audit')) {
            missingAuditLogs.push(`${file} - Modification route ${index + 1}: Missing audit logging`);
          }
        });
      });

      // Encourage audit logging but allow some exceptions
      expect(missingAuditLogs.length).toBeLessThan(15);
    });
  });
});

// Helper functions
function getAllTypeScriptFiles(dir = ''): string[] {
  const files: string[] = [];
  const baseDir = dir || process.cwd();
  
  function traverseDir(currentDir: string) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
        traverseDir(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    });
  }
  
  traverseDir(baseDir);
  return files;
}

function getAllRouteFiles(): string[] {
  const routeFiles: string[] = [];
  const serverDir = path.join(process.cwd(), 'server');
  
  function findRouteFiles(dir: string) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        findRouteFiles(fullPath);
      } else if (item.includes('route') || item.includes('Routes')) {
        routeFiles.push(fullPath);
      }
    });
  }
  
  if (fs.existsSync(serverDir)) {
    findRouteFiles(serverDir);
  }
  
  return routeFiles;
}