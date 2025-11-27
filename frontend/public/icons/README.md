# PWA Icons

This directory should contain the following icon files for PWA functionality:

- `icon-192x192.png` - 192x192 pixels PNG icon
- `icon-512x512.png` - 512x512 pixels PNG icon

## Generating Icons

You can generate these icons from the existing `logo-icon.svg` file using:

1. **Online tools**: Use tools like https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. **Image editing software**: Open `logo-icon.svg` in an image editor (GIMP, Photoshop, etc.) and export as PNG at the required sizes
3. **Command line**: Use ImageMagick or similar tools:
   ```bash
   convert logo-icon.svg -resize 192x192 icon-192x192.png
   convert logo-icon.svg -resize 512x512 icon-512x512.png
   ```

The icons should use the brand color (#EA7A24) as the background and maintain the climbing wall/climber design from the logo.

