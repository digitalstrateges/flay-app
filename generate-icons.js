/**
 * Flay v4.0 - PWA Icon Generator
 * Genere les icons PWA a partir du SVG
 * Run: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const svgTemplate = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.1875)}" fill="url(#bg)"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" 
        font-family="Inter, -apple-system, sans-serif" font-weight="900" 
        font-size="${Math.round(size * 0.45)}" fill="white" opacity="0.95">F</text>
</svg>`;

sizes.forEach(size => {
    const svg = svgTemplate(size);
    const filePath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    fs.writeFileSync(filePath, svg);
    console.log(`Generated: icon-${size}x${size}.svg`);
});

console.log('\nSVG icons generated in public/icons/');
console.log('Pour convertir en PNG, installe: npm install sharp');
console.log('Puis run: node convert-icons.js');
