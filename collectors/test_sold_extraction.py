import re

# Read the captured HTML
with open('/tmp/tokopedia_2026_real.html', 'r') as f:
    html = f.read()

# Search for sold/terjual patterns
patterns = [
    r'"totalSold["\']?\s*:\s*(\d+)',
    r'terjual["\']?\s*:\s*["\']?(\d+)',
    r'Terjual\s+(\d+)',
    r'sold["\']?\s*:\s*(\d+)',
]

print("🔍 Searching for sold count patterns:\n")
for pattern in patterns:
    matches = re.findall(pattern, html, re.IGNORECASE)
    if matches:
        print(f"✅ Pattern '{pattern}' found:")
        print(f"   Matches: {matches[:5]}")  # Show first 5
        print()
