#!/usr/bin/env python3
"""
Generate BijakBeli Extension Icons
Run: python generate_icons.py

Requirements: pip install pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow not installed")
    print("Install with: pip install pillow")
    exit(1)

def create_icon(size, filename):
    """Create a simple BijakBeli icon"""
    # Create image with gradient-like background
    img = Image.new('RGB', (size, size), color='#2563eb')
    draw = ImageDraw.Draw(img)
    
    # Add simple "PH" text
    font_size = size // 2
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    text = "PH"
    # Use textbbox instead of deprecated textsize
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]
    
    draw.text((x, y), text, fill='white', font=font)
    
    # Save
    img.save(filename, 'PNG')
    print(f"✓ Created {filename} ({size}x{size})")

def main():
    print("Generating BijakBeli extension icons...")
    print()
    
    # Generate required sizes
    create_icon(16, "icon16.png")
    create_icon(48, "icon48.png")
    create_icon(128, "icon128.png")
    
    print()
    print("✅ All icons generated!")
    print()
    print("Next steps:")
    print("1. Review the generated icons")
    print("2. (Optional) Edit in design tool for better quality")
    print("3. Update manifest.json to reference the icons")
    print()
    print("Suggested manifest.json icons section:")
    print('''
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  },
    ''')

if __name__ == "__main__":
    main()
