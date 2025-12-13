import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import toIco from 'to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const sourceLogo = path.join(__dirname, '../../_Inbox/black logo chudnite skali.png');
const publicDir = path.join(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateFavicons() {
  try {
    console.log('🎨 Starting favicon generation...');
    console.log(`📁 Source: ${sourceLogo}`);
    
    // Check if source file exists
    if (!fs.existsSync(sourceLogo)) {
      throw new Error(`Source logo not found: ${sourceLogo}`);
    }

    // Read the source image
    const image = sharp(sourceLogo);
    const metadata = await image.metadata();
    console.log(`📐 Source image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    // 1. Generate favicon.svg (create a simple SVG wrapper)
    // For now, we'll create a PNG-based favicon.ico and use PNG for SVG fallback
    // Note: True SVG conversion would require vectorization, which is complex
    // We'll use the PNG as favicon.svg replacement for now, or create an optimized version
    
    // 2. Generate favicon.ico (multi-size: 16x16, 32x32, 48x48)
    console.log('📦 Generating favicon.ico...');
    // Note: sharp doesn't support ICO directly, so we'll create PNG files
    // For ICO, you might need to use an online converter or imagemagick
    // For now, we'll create favicon-16.png, favicon-32.png, favicon-48.png
    
    await image
      .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'favicon-16.png'));
    
    await image
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'favicon-32.png'));
    
    await image
      .resize(48, 48, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'favicon-48.png'));

    // Create a simple SVG favicon (embedding PNG as base64 for now)
    // Better approach: use the original PNG as favicon.svg fallback
    const favicon32BufferForSvg = await image
      .clone()
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    
    const base64Image = favicon32BufferForSvg.toString('base64');
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="32" viewBox="0 0 32 32">
  <image width="32" height="32" xlink:href="data:image/png;base64,${base64Image}"/>
</svg>`;
    
    fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

    // 3. Generate apple-touch-icon.png (180x180)
    console.log('🍎 Generating apple-touch-icon.png (180x180)...');
    await image
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));

    // 4. Generate PWA icons (192x192 and 512x512) with white background
    console.log('📱 Generating PWA icons...');
    
    // Icon 192x192 with white background
    await image
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(iconsDir, 'icon-192x192.png'));
    
    // Icon 512x512 with white background
    await image
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(iconsDir, 'icon-512x512.png'));

    // 5. Generate favicon.ico (multi-size ICO file)
    console.log('📦 Generating favicon.ico (multi-size)...');
    const favicon16Buffer = await sharp(path.join(publicDir, 'favicon-16.png')).toBuffer();
    const favicon32Buffer = await sharp(path.join(publicDir, 'favicon-32.png')).toBuffer();
    const favicon48Buffer = await sharp(path.join(publicDir, 'favicon-48.png')).toBuffer();
    
    const icoBuffer = await toIco([favicon16Buffer, favicon32Buffer, favicon48Buffer]);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

    console.log('✅ All favicons generated successfully!');
    console.log('\n📋 Generated files:');
    console.log('  - favicon.svg (32x32)');
    console.log('  - favicon.ico (16x16, 32x32, 48x48)');
    console.log('  - favicon-16.png (16x16)');
    console.log('  - favicon-32.png (32x32)');
    console.log('  - favicon-48.png (48x48)');
    console.log('  - apple-touch-icon.png (180x180)');
    console.log('  - icons/icon-192x192.png (192x192)');
    console.log('  - icons/icon-512x512.png (512x512)');

  } catch (error) {
    console.error('❌ Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();



