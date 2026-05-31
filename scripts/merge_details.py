"""
Merge scraped apartment details into properties.js
Reads the existing properties.js and property_details.json, merges them,
and outputs a new properties.js with apartment details embedded.
"""
import json
import re
import sys
import os

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

PROPS_JS = r"C:\Users\gibso\.gemini\antigravity\scratch\elli-distance-finder\js\properties.js"
DETAILS_JSON = r"C:\Users\gibso\.gemini\antigravity\scratch\elli-distance-finder\scripts\property_details.json"

# Read existing properties.js
with open(PROPS_JS, 'r', encoding='utf-8') as f:
    js_content = f.read()

# Read scraped details
with open(DETAILS_JSON, 'r', encoding='utf-8') as f:
    details = json.load(f)

# Parse PROPERTIES array from JS
# Extract each property block
prop_pattern = re.compile(
    r'\{\s*id:\s*"([^"]+)".*?area:\s*"([^"]+)"\s*\}',
    re.DOTALL
)

# Parse INSTITUTIONS block
inst_start = js_content.index('const INSTITUTIONS')
props_text = js_content[:inst_start]
inst_text = js_content[inst_start:]

# Build new properties with details
properties = []
for m in prop_pattern.finditer(props_text):
    prop_id = m.group(1)
    # Extract fields from the match
    block = m.group(0)

    # Parse existing fields
    def extract(field):
        pat = re.search(rf'{field}:\s*"([^"]*)"', block)
        return pat.group(1) if pat else None

    def extract_num(field):
        pat = re.search(rf'{field}:\s*([\d.]+)', block)
        return float(pat.group(1)) if pat else None

    prop = {
        'id': prop_id,
        'name': extract('name'),
        'address': extract('address'),
        'lat': extract_num('lat'),
        'lng': extract_num('lng'),
        'area': extract('area'),
    }

    # Merge scraped details
    d = details.get(prop_id)
    if d:
        prop['yearBuilt'] = d.get('yearBuilt')
        prop['types'] = d.get('types', [])
        prop['elevator'] = d.get('elevator', False)
        prop['sauna'] = d.get('sauna', False)
        prop['ellinet'] = d.get('ellinet')
        prop['parking'] = d.get('parking', False)
        prop['laundry'] = d.get('laundry', False)
        prop['bikeStorage'] = d.get('bikeStorage', False)
        prop['apartments'] = d.get('apartments', [])
    else:
        # No data scraped - minimal defaults
        prop['yearBuilt'] = None
        prop['types'] = []
        prop['elevator'] = False
        prop['sauna'] = True
        prop['ellinet'] = "Yes"
        prop['parking'] = False
        prop['laundry'] = False
        prop['bikeStorage'] = False
        prop['apartments'] = []

    properties.append(prop)
    print(f"  {prop_id}: {len(prop.get('apartments', []))} apt types, year={prop.get('yearBuilt')}")

# Generate new properties.js
lines = ['const PROPERTIES = [']
for i, p in enumerate(properties):
    comma = ',' if i < len(properties) - 1 else ''

    # Format apartments array
    apts_lines = []
    for apt in p.get('apartments', []):
        apts_lines.append(f'      {{ type: "{apt["type"]}", size: "{apt["size"]}", rent: "{apt["rent"]}" }}')

    apts_str = '[]'
    if apts_lines:
        apts_str = '[\n' + ',\n'.join(apts_lines) + '\n    ]'

    types_str = json.dumps(p.get('types', []))
    year_str = str(p['yearBuilt']) if p.get('yearBuilt') else 'null'

    lines.append(f'  {{')
    lines.append(f'    id: "{p["id"]}",')
    lines.append(f'    name: "{p["name"]}",')
    lines.append(f'    address: "{p["address"]}",')
    lines.append(f'    lat: {p["lat"]},')
    lines.append(f'    lng: {p["lng"]},')
    lines.append(f'    area: "{p["area"]}",')
    lines.append(f'    yearBuilt: {year_str},')
    lines.append(f'    types: {types_str},')
    lines.append(f'    elevator: {"true" if p.get("elevator") else "false"},')
    lines.append(f'    sauna: {"true" if p.get("sauna") else "false"},')
    lines.append(f'    ellinet: {json.dumps(p.get("ellinet"))},')
    lines.append(f'    parking: {"true" if p.get("parking") else "false"},')
    lines.append(f'    laundry: {"true" if p.get("laundry") else "false"},')
    lines.append(f'    bikeStorage: {"true" if p.get("bikeStorage") else "false"},')
    lines.append(f'    apartments: {apts_str}')
    lines.append(f'  }}{comma}')

lines.append('];')
lines.append('')

# Append institutions (unchanged)
lines.append(inst_text.strip())
lines.append('')

output = '\n'.join(lines)

with open(PROPS_JS, 'w', encoding='utf-8') as f:
    f.write(output)

print(f"\n[SUCCESS] Updated {PROPS_JS}")
print(f"Total properties: {len(properties)}")
print(f"With apartment data: {sum(1 for p in properties if p.get('apartments'))}")
