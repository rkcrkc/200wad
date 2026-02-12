#!/bin/bash

# SWF to PNG Conversion Script
# Converts SWF vocabulary illustrations to 4x resolution PNG files
# Uses swftools (swfcombine + swfrender)

set -e

# Configuration
SOURCE_BASE="/Volumes/Italian 1&2 SuperBundle"
OUTPUT_DIR="/private/tmp/word-images"
SCALE_FACTOR=400  # 4x = 400%

# Source folders containing SWF files
FOLDERS=(
    "0Pictures"
    "1Pictures"
    "41Pictures"
    "42Pictures"
    "81Pictures"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if source volume is mounted
if [ ! -d "$SOURCE_BASE" ]; then
    echo -e "${RED}Error: Source volume not mounted at $SOURCE_BASE${NC}"
    echo "Please mount the 'Italian 1&2 SuperBundle' drive first."
    exit 1
fi

# Check for required tools
if ! command -v swfcombine &> /dev/null; then
    echo -e "${RED}Error: swfcombine not found. Install swftools: brew install swftools${NC}"
    exit 1
fi

if ! command -v swfrender &> /dev/null; then
    echo -e "${RED}Error: swfrender not found. Install swftools: brew install swftools${NC}"
    exit 1
fi

# Statistics
total_files=0
converted=0
skipped=0
failed=0

echo "=========================================="
echo "SWF to PNG Conversion Script"
echo "=========================================="
echo "Source: $SOURCE_BASE"
echo "Output: $OUTPUT_DIR"
echo "Scale: ${SCALE_FACTOR}% (4x)"
echo ""

# Count total files first
echo "Counting SWF files..."
for folder in "${FOLDERS[@]}"; do
    folder_path="$SOURCE_BASE/$folder"
    if [ -d "$folder_path" ]; then
        count=$(find "$folder_path" -name "*.swf" -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "  $folder: $count files"
        total_files=$((total_files + count))
    fi
done
echo "Total: $total_files SWF files"
echo ""

# Process each folder
for folder in "${FOLDERS[@]}"; do
    folder_path="$SOURCE_BASE/$folder"

    if [ ! -d "$folder_path" ]; then
        echo -e "${YELLOW}Warning: Folder not found: $folder_path${NC}"
        continue
    fi

    echo "Processing: $folder"

    # Find all SWF files in the folder
    while IFS= read -r swf_file; do
        # Get the base filename without extension
        filename=$(basename "$swf_file")
        base_name="${filename%.swf}"

        # Create output filename (sanitize for filesystem)
        # Replace problematic characters
        safe_name=$(echo "$base_name" | sed 's/[\/:]/-/g')
        output_file="$OUTPUT_DIR/${safe_name}.png"

        # Skip if already converted
        if [ -f "$output_file" ]; then
            skipped=$((skipped + 1))
            continue
        fi

        # Create temporary scaled SWF
        temp_swf=$(mktemp /tmp/scaled_XXXXXX.swf)

        # Convert: scale with --dummy (no master) and render
        if swfcombine --dummy -s "$SCALE_FACTOR" "$swf_file" -o "$temp_swf" 2>/dev/null && \
           swfrender "$temp_swf" -o "$output_file" 2>/dev/null; then
            converted=$((converted + 1))

            # Progress indicator every 100 files
            if [ $((converted % 100)) -eq 0 ]; then
                echo -e "  ${GREEN}Converted: $converted${NC} (skipped: $skipped, failed: $failed)"
            fi
        else
            failed=$((failed + 1))
            echo -e "  ${RED}Failed: $filename${NC}"
        fi

        # Clean up temp file
        rm -f "$temp_swf"

    done < <(find "$folder_path" -name "*.swf" -type f 2>/dev/null)

done

echo ""
echo "=========================================="
echo "Conversion Complete"
echo "=========================================="
echo -e "${GREEN}Converted: $converted${NC}"
echo -e "${YELLOW}Skipped (already exist): $skipped${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo "Output directory: $OUTPUT_DIR"
echo ""

# List output stats
if [ -d "$OUTPUT_DIR" ]; then
    png_count=$(find "$OUTPUT_DIR" -name "*.png" -type f | wc -l | tr -d ' ')
    total_size=$(du -sh "$OUTPUT_DIR" 2>/dev/null | cut -f1)
    echo "Total PNG files: $png_count"
    echo "Total size: $total_size"
fi
