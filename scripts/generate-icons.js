const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  for (const size of sizes) {
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }
  
  // Also generate shortcut icons
  await sharp(inputSvg)
    .resize(96, 96)
    .png()
    .toFile(path.join(outputDir, 'booking.png'));
  console.log('Generated booking.png');
  
  await sharp(inputSvg)
    .resize(96, 96)
    .png()
    .toFile(path.join(outputDir, 'checkin.png'));
  console.log('Generated checkin.png');
  
  console.log('All icons generated!');
}

generateIcons().catch(console.error);