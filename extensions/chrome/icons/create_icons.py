#!/usr/bin/env python3
"""Generate simple PNG icons for BijakBeli Chrome Extension"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """Create a simple colored icon with 'B' letter"""
    # Create image with green gradient background
    img = Image.new('RGB', (size, size), '#22c55e')
    draw = ImageDraw.Draw(img)
    
    # Draw white 'B' letter or box emoji
    try:
        # Try to use a font
        font_size = int(size * 0.6)
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
        text = 'B'
    except:
        # Fallback to default
        font = ImageFont.load_default()
        text = 'B'
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center text
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]
    
    # Draw white text
    draw.text((x, y), text, fill='white', font=font)
    
    # Save
    img.save(filename, 'PNG')
    print(f'✅ Created {filename} ({size}x{size})')

# Create icons
create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')

print('\n🎉 All icons created!')
