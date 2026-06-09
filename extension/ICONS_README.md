# Extension Icons - TODO

## Status
⚠️ **Icons are currently missing.** The extension will work but display default browser icons.

## Required Files
The `manifest.json` references these icon files that need to be created:

- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

## Design Specifications

### Design Concept
PriceHunt Indonesia logo/icon should represent:
- Price comparison / shopping intelligence
- Indonesian market focus
- Trust and reliability
- Modern, clean aesthetic

### Recommended Design Elements
1. **Primary Symbol:** Price tag with "PH" or "₱" symbol
2. **Color Scheme:** 
   - Primary: #3b82f6 (blue - trust, technology)
   - Accent: #10b981 (green - savings, deals)
   - Background: White or gradient
3. **Style:** Flat design, high contrast for small sizes

### Icon Sizes

**16x16 (icon16.png)**
- Used in browser toolbar
- Must be simple and recognizable at tiny size
- Minimal details, bold shapes
- High contrast

**48x48 (icon48.png)**
- Used in extension management page
- Can include more detail
- Clear icon + optional text

**128x128 (icon128.png)**
- Used in Chrome Web Store
- Full detail version
- Can include branding elements
- Should look polished and professional

## Quick Design Options

### Option 1: Simple Price Tag
```
Blue rounded square background
White price tag icon in center
"PH" text or rupiah symbol
```

### Option 2: Shopping Lens
```
Magnifying glass icon
With "Rp" or price tag inside lens
Blue and green color scheme
```

### Option 3: Smart Badge
```
Shield or badge shape
"PH" monogram
Small "Indonesia" text below
```

## How to Create Icons

### Using Figma/Sketch/Illustrator
1. Create artboard at 128x128
2. Design the icon following specs above
3. Export at 128x128, 48x48, 16x16
4. Save as PNG with transparency

### Using Online Tools
- [Canva](https://canva.com) - Free design tool
- [Figma](https://figma.com) - Professional design
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Generate all sizes

### Using AI Tools
Prompt example for AI image generators:
```
"A modern, flat design app icon for PriceHunt, a price comparison app. 
Blue and green colors. Features a price tag or magnifying glass symbol. 
Minimalist style. High contrast. Professional look. Square format."
```

## Placeholder Solution (Temporary)

For MVP testing, you can use solid color squares:

### Using ImageMagick (if installed):
```bash
cd extension/
convert -size 16x16 xc:#3b82f6 icon16.png
convert -size 48x48 xc:#3b82f6 icon48.png
convert -size 128x128 xc:#3b82f6 icon128.png
```

### Using Python PIL:
```python
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    img = Image.new('RGB', (size, size), color='#3b82f6')
    draw = ImageDraw.Draw(img)
    
    # Add "PH" text
    font_size = size // 2
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    text = "PH"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill='white', font=font)
    img.save(filename)

create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')
```

## Impact of Missing Icons

**Extension Functionality:** ✅ Not affected
**User Experience:** ⚠️ Slightly diminished
- Extension shows default browser puzzle piece icon
- Still recognizable in toolbar once installed
- Professional appearance reduced

**Priority:** Low - cosmetic only
**Blocking:** No - extension works without icons

## Next Steps

1. Hire designer or use AI tool to create branded icons
2. Follow design specs above
3. Export as PNG at required sizes
4. Place in `extension/` folder
5. Reload extension to see new icons

---

**Current Status:** Extension is fully functional with all features, just needs branded icons for polish.
