#!/bin/bash

# Script to generate app icons for electron-builder
# Usage: ./scripts/generate-icons.sh path/to/source-icon.png

if [ -z "$1" ]; then
  echo "Usage: ./scripts/generate-icons.sh path/to/source-icon.png"
  echo "The source icon should be at least 1024x1024 pixels"
  exit 1
fi

SOURCE_ICON="$1"

if [ ! -f "$SOURCE_ICON" ]; then
  echo "Error: Source icon file not found: $SOURCE_ICON"
  exit 1
fi

# Create directories
mkdir -p assets/generated/icons/mac
mkdir -p assets/generated/icons/win
mkdir -p assets/generated/icons/png

echo "Generating macOS .icns icon with proper padding..."

# Create iconset directory
ICONSET_DIR="youtube-music.iconset"
mkdir -p "$ICONSET_DIR"

# Function to create a padded icon while preserving transparency
create_padded_icon() {
  local size=$1
  local output=$2
  local inner_size=$(echo "$size * 0.85" | bc | cut -d. -f1)
  
  # Create a transparent canvas using Python (built into macOS)
  python3 -c "
from PIL import Image
import sys

# Create transparent canvas
canvas = Image.new('RGBA', ($size, $size), (0, 0, 0, 0))

# Open and resize the source image
img = Image.open('$SOURCE_ICON').convert('RGBA')
img = img.resize(($inner_size, $inner_size), Image.Resampling.LANCZOS)

# Calculate position to center the image
pos = (($size - $inner_size) // 2, ($size - $inner_size) // 2)

# Paste the image onto the canvas
canvas.paste(img, pos, img)

# Save the result
canvas.save('$output', 'PNG')
" 2>/dev/null
  
  # Fallback to sips if Python/PIL is not available
  if [ ! -f "$output" ]; then
    # Just resize without padding as fallback
    sips -z "$size" "$size" "$SOURCE_ICON" --out "$output" > /dev/null 2>&1
  fi
}

# Check if Python PIL is available
if ! python3 -c "from PIL import Image" 2>/dev/null; then
  echo "Note: Pillow (PIL) not found. Installing for better icon quality..."
  echo "You can install it with: pip3 install Pillow"
  echo "Using fallback method (no padding)..."
  
  # Fallback: just resize without padding
  sips -z 16 16     "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null 2>&1
  sips -z 32 32     "$SOURCE_ICON" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null 2>&1
  sips -z 32 32     "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null 2>&1
  sips -z 64 64     "$SOURCE_ICON" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null 2>&1
  sips -z 128 128   "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null 2>&1
  sips -z 256 256   "$SOURCE_ICON" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null 2>&1
  sips -z 256 256   "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null 2>&1
  sips -z 512 512   "$SOURCE_ICON" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null 2>&1
  sips -z 512 512   "$SOURCE_ICON" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null 2>&1
  sips -z 1024 1024 "$SOURCE_ICON" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null 2>&1
else
  # Use Python PIL for proper transparency handling
  echo "Creating icon sizes with transparent padding..."
  create_padded_icon 16 "$ICONSET_DIR/icon_16x16.png"
  create_padded_icon 32 "$ICONSET_DIR/icon_16x16@2x.png"
  create_padded_icon 32 "$ICONSET_DIR/icon_32x32.png"
  create_padded_icon 64 "$ICONSET_DIR/icon_32x32@2x.png"
  create_padded_icon 128 "$ICONSET_DIR/icon_128x128.png"
  create_padded_icon 256 "$ICONSET_DIR/icon_128x128@2x.png"
  create_padded_icon 256 "$ICONSET_DIR/icon_256x256.png"
  create_padded_icon 512 "$ICONSET_DIR/icon_256x256@2x.png"
  create_padded_icon 512 "$ICONSET_DIR/icon_512x512.png"
  create_padded_icon 1024 "$ICONSET_DIR/icon_512x512@2x.png"
fi

# Convert to .icns
iconutil -c icns "$ICONSET_DIR" -o assets/generated/icons/mac/icon.icns

# Clean up
rm -rf "$ICONSET_DIR"

echo "✓ Generated assets/generated/icons/mac/icon.icns"

# Generate PNG icons for Linux
echo "Generating Linux PNG icons..."
sips -z 512 512 "$SOURCE_ICON" --out assets/generated/icons/png/512x512.png > /dev/null 2>&1
sips -z 256 256 "$SOURCE_ICON" --out assets/generated/icons/png/256x256.png > /dev/null 2>&1
sips -z 128 128 "$SOURCE_ICON" --out assets/generated/icons/png/128x128.png > /dev/null 2>&1
sips -z 64 64   "$SOURCE_ICON" --out assets/generated/icons/png/64x64.png > /dev/null 2>&1
sips -z 48 48   "$SOURCE_ICON" --out assets/generated/icons/png/48x48.png > /dev/null 2>&1
sips -z 32 32   "$SOURCE_ICON" --out assets/generated/icons/png/32x32.png > /dev/null 2>&1
sips -z 16 16   "$SOURCE_ICON" --out assets/generated/icons/png/16x16.png > /dev/null 2>&1

echo "✓ Generated Linux PNG icons"

# For Windows .ico, you'll need a different tool since macOS doesn't have built-in .ico support
echo ""
echo "Note: For Windows .ico generation, you can use an online converter or install"
echo "a tool like 'png2ico'. For now, you can use the PNG as a temporary solution"
echo "or generate the .ico file using: https://icoconvert.com/"

echo ""
echo "✓ Icon generation complete!"
echo "Now rebuild your app with: pnpm dist:mac:arm64"
