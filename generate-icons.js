const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];

// Read the SVG
const svgPath = path.join(__dirname, 'public/icons/icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Try to use sharp if available, otherwise create placeholder PNGs
async function generateIcons() {
  try {
    const sharp = require('sharp');
    
    for (const size of sizes) {
      const outputPath = path.join(__dirname, `public/icons/icon-${size}.png`);
      await sharp(Buffer.from(svgContent))
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated: icon-${size}.png`);
    }
    
    console.log('All icons generated successfully!');
  } catch (err) {
    console.log('Sharp not available, creating placeholder icons...');
    console.log('Run: npm install sharp --save-dev');
    console.log('Then run: node generate-icons.js');
    
    // Create a simple placeholder approach - use the SVG directly where possible
    // For PNG fallback, we'll create a data URL approach in the HTML
    for (const size of sizes) {
      const outputPath = path.join(__dirname, `public/icons/icon-${size}.png`);
      // Create a minimal valid PNG (1x1 transparent pixel as placeholder)
      const minimalPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(outputPath, minimalPng);
    }
    console.log('Placeholder icons created. Install sharp for proper icons.');
  }
}

generateIcons();
