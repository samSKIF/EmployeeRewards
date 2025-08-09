
#!/usr/bin/env node

const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

async function convertToPDF(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    markdownpdf({
      cssPath: null,
      paperFormat: 'A4',
      paperOrientation: 'portrait',
      paperBorder: '2cm',
      renderDelay: 1000,
      loadTimeout: 10000
    })
    .from(inputFile)
    .to(outputFile, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ Successfully converted ${inputFile} to ${outputFile}`);
        resolve();
      }
    });
  });
}

async function main() {
  try {
    console.log('🔄 Converting markdown files to PDF...\n');
    
    // Convert SYSTEM_ARCHITECTURE.md
    if (fs.existsSync('SYSTEM_ARCHITECTURE.md')) {
      await convertToPDF('SYSTEM_ARCHITECTURE.md', 'SYSTEM_ARCHITECTURE.pdf');
    } else {
      console.log('❌ SYSTEM_ARCHITECTURE.md not found');
    }
    
    // Convert replit.md
    if (fs.existsSync('replit.md')) {
      await convertToPDF('replit.md', 'replit.pdf');
    } else {
      console.log('❌ replit.md not found');
    }
    
    console.log('\n✅ PDF conversion completed!');
    console.log('📄 Files created:');
    console.log('   - SYSTEM_ARCHITECTURE.pdf');
    console.log('   - replit.pdf');
    
  } catch (error) {
    console.error('❌ Error during conversion:', error.message);
    process.exit(1);
  }
}

main();
