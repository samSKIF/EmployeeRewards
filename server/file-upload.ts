import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// Create uploads directory in the root of the project
const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
console.log('Using uploads directory:', uploadsDir);

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory at:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set storage engine
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    const fileExt = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExt}`;
    cb(null, uniqueFilename);
  }
});

// Initialize upload for images
export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (_req, file, cb) {
    // Allow only image files
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Images Only!'));
    }
  }
});

// Initialize upload for CSV and Excel files
export const documentUpload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (_req, file, cb) {
    // Log file information for debugging
    console.log("Document upload attempted - file information:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase()
    });
    
    // Allow CSV and Excel files
    const filetypes = /csv|xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /text\/csv|application\/vnd.ms-excel|application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application\/octet-stream/.test(file.mimetype);

    console.log("File validation results:", {
      extname_valid: extname,
      mimetype_valid: mimetype
    });

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only CSV and Excel files are allowed!'));
    }
  }
});

// Initialize memory storage upload for CSV and Excel files (for processing in memory)
export const csvMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (_req, file, cb) {
    console.log("CSV memory upload attempted - file information:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase()
    });
    
    // Allow CSV and Excel files
    const filetypes = /csv|xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /text\/csv|application\/vnd.ms-excel|application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application\/octet-stream/.test(file.mimetype);

    console.log("File validation results:", {
      extname_valid: extname,
      mimetype_valid: mimetype
    });

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only CSV and Excel files are allowed!'));
    }
  }
});

// Get public URL for file
export function getPublicUrl(filename: string) {
  // This would be replaced with a cloud storage URL in production
  return `/uploads/${filename}`;
}

// Serve static files
export function setupStaticFileServing(app: any) {
  // Serve static files from the uploads directory
  app.use('/uploads', (req: any, res: any, next: any) => {
    // This middleware adds proper headers for serving images
    res.setHeader('Content-Type', 'image/jpeg'); // Adjust as needed
    next();
  }, (req: any, res: any, next: any) => {
    const filename = req.path.substring(1); // Remove leading slash
    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });
}