#!/usr/bin/env python3
# Fast rebranding script using Python

import os
import re
from pathlib import Path

print("🚀 BijakBeli.app Fast Rebranding...")

# Patterns to replace
patterns = [
    ("PriceHunt Indonesia", "BijakBeli.app"),
    ("PriceHunt", "BijakBeli"),
    ("pricehunt-indonesia", "bijakbeli-app"),
    ("pricehunt", "bijakbeli"),
]

# File extensions to process
extensions = {'.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.sql', '.yaml', '.yml', '.txt'}

# Directories to skip
skip_dirs = {'node_modules', '.next', '.git', 'dist', 'build'}

def should_process(path: Path) -> bool:
    if any(skip in path.parts for skip in skip_dirs):
        return False
    return path.suffix in extensions

def replace_in_file(file_path: Path):
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        for old, new in patterns:
            content = content.replace(old, new)
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            return True
    except Exception as e:
        print(f"⚠️  Error in {file_path}: {e}")
    return False

# Process files
root = Path('.')
modified = 0
total = 0

for file_path in root.rglob('*'):
    if file_path.is_file() and should_process(file_path):
        total += 1
        if replace_in_file(file_path):
            modified += 1
            if modified % 10 == 0:
                print(f"📝 Processed {modified} files...")

print(f"\n✅ Complete! Modified {modified}/{total} files")
