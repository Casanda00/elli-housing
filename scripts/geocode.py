#!/usr/bin/env python3
"""
Geocode Joensuun Elli student housing addresses using Nominatim API
and generate a properties.js file for the distance finder app.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "ElliDistanceFinder/1.0"
DELAY = 1.1  # seconds between requests

# All addresses to geocode
ADDRESSES = [
    "Apajakuja 1",
    "Eteläkatu 14",
    "Huvilakatu 26",
    "Itäranta 18",
    "Kaislakatu 10",
    "Kalastajankatu 32",
    "Kalevankatu 26b",
    "Kalevankatu 29",
    "Karjamäentie 4",
    "Karjamäentie 10",
    "Karjamäentie 12",
    "Kimpikuja 3",
    "Kiulutie 2",
    "Koulukatu 30b",
    "Latolankatu 9",
    "Leinikkitie 4",
    "Louhelankatu 10",
    "Länsikatu 18",
    "Mäntyläntie 3",
    "Merimiehenkatu 30",
    "Niskakatu 15",
    "Niskakatu 16",
    "Niskakatu 25",
    "Noljakankaari 6",
    "Noljakankaari 16",
    "Noljakankaari 38",
    "Noljakantie 86",
    "Noljakantie 91",
    "Nuottaniementie 16",
    "Opiskelijankatu 7",
    "Peltolankatu 11",
    "Penttilänkulma 2",
    "Pursitie 7",
    "Ruoritie 2",
    "Sairaalakatu 8",
    "Suvikuja 8",
    "Tikkamäentie 6",
    "Sepänkatu 15",
    "Sepänkatu 39b",
    "Suvikatu 17",
    "Suvikatu 19",
]

UEF_ADDRESS = "Yliopistokatu 2"

# Neighborhood/area assignments based on street name
AREA_MAP = {
    "Eteläkatu": "Center",
    "Huvilakatu": "Center",
    "Kalevankatu": "Center",
    "Koulukatu": "Center",
    "Länsikatu": "Center",
    "Merimiehenkatu": "Center",
    "Niskakatu": "Center",
    "Sairaalakatu": "Center",
    "Sepänkatu": "Center",
    "Noljakankaari": "Noljakka",
    "Noljakantie": "Noljakka",
    "Kimpikuja": "Noljakka",
    "Kiulutie": "Noljakka",
    "Karjamäentie": "Kanervala",
    "Latolankatu": "Kanervala",
    "Louhelankatu": "Kanervala",
    "Mäntyläntie": "Kanervala",
    "Peltolankatu": "Kanervala",
    "Itäranta": "Penttilä",
    "Penttilänkulma": "Penttilä",
    "Pursitie": "Penttilä",
    "Ruoritie": "Penttilä",
    "Suvikuja": "Rantakylä",
    "Suvikatu": "Rantakylä",
    "Kaislakatu": "Hukanhauta",
    "Kalastajankatu": "Hukanhauta",
    "Nuottaniementie": "Hukanhauta",
    "Opiskelijankatu": "Near Campus",
    "Leinikkitie": "Near Campus",
    "Apajakuja": "Near Campus",
    "Tikkamäentie": "Near Campus",
}


def get_street_name(address: str) -> str:
    """Extract street name (without house number) from an address."""
    parts = address.split()
    # The last part is the house number (possibly with letter suffix)
    return " ".join(parts[:-1])


def get_area(address: str) -> str:
    """Look up the area/neighborhood for a given address."""
    street = get_street_name(address)
    return AREA_MAP.get(street, "Unknown")


def make_id(address: str) -> str:
    """Create a kebab-case ID from an address."""
    return address.lower().replace(" ", "-").replace("ä", "a").replace("ö", "o")


def geocode(address: str, city: str = "Joensuu", country: str = "Finland") -> dict | None:
    """
    Geocode an address using Nominatim.
    Returns dict with 'lat' and 'lon' keys, or None on failure.
    """
    full_query = f"{address}, {city}, {country}"
    params = urllib.parse.urlencode({
        "q": full_query,
        "format": "json",
        "limit": 1,
        "countrycodes": "fi",
    })
    url = f"{NOMINATIM_URL}?{params}"

    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data:
                return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
    except Exception as e:
        print(f"  [ERROR] Request failed for '{full_query}': {e}")

    # Fallback: try with just street name + city
    street = get_street_name(address)
    fallback_query = f"{street}, {city}"
    print(f"  [FALLBACK] Trying '{fallback_query}'...")
    params = urllib.parse.urlencode({
        "q": fallback_query,
        "format": "json",
        "limit": 1,
        "countrycodes": "fi",
    })
    url = f"{NOMINATIM_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data:
                return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
    except Exception as e:
        print(f"  [ERROR] Fallback also failed for '{fallback_query}': {e}")

    return None


def generate_properties_js(properties: list, uef_coords: dict, output_path: str):
    """Write the properties.js file."""
    lines = ["const PROPERTIES = ["]
    for i, prop in enumerate(properties):
        comma = "," if i < len(properties) - 1 else ""
        lines.append("  {")
        lines.append(f'    id: "{prop["id"]}",')
        lines.append(f'    name: "{prop["name"]}",')
        lines.append(f'    address: "{prop["address"]}",')
        lines.append(f'    lat: {prop["lat"]},')
        lines.append(f'    lng: {prop["lng"]},')
        lines.append(f'    area: "{prop["area"]}"')
        lines.append(f"  }}{comma}")
    lines.append("];")
    lines.append("")
    lines.append("const INSTITUTIONS = [")
    lines.append("  {")
    lines.append('    id: "uef",')
    lines.append('    name: "UEF Joensuu Campus",')
    lines.append('    address: "Yliopistokatu 2, 80100 Joensuu",')
    lines.append(f'    lat: {uef_coords["lat"]},')
    lines.append(f'    lng: {uef_coords["lon"]}')
    lines.append("  }")
    lines.append("];")
    lines.append("")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"\n[SUCCESS] properties.js written to: {output_path}")


def main():
    output_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "js",
        "properties.js",
    )

    print("=" * 60)
    print("  Joensuun Elli - Address Geocoder")
    print("=" * 60)
    print(f"  Addresses to geocode: {len(ADDRESSES) + 1}")
    print(f"  Output: {output_path}")
    print(f"  Delay between requests: {DELAY}s")
    print("=" * 60)

    # Geocode all property addresses
    properties = []
    failed = []
    for i, addr in enumerate(ADDRESSES, 1):
        print(f"\n[{i}/{len(ADDRESSES)}] Geocoding: {addr}")
        coords = geocode(addr)
        if coords:
            prop = {
                "id": make_id(addr),
                "name": addr,
                "address": f"{addr}, Joensuu",
                "lat": round(coords["lat"], 6),
                "lng": round(coords["lon"], 6),
                "area": get_area(addr),
            }
            properties.append(prop)
            print(f"  [OK] lat={prop['lat']}, lng={prop['lng']} [{prop['area']}]")
        else:
            failed.append(addr)
            print(f"  [FAIL] FAILED to geocode")
        time.sleep(DELAY)

    # Geocode UEF campus
    print(f"\n[UEF] Geocoding: {UEF_ADDRESS}, Joensuu")
    uef_coords = geocode(UEF_ADDRESS)
    if uef_coords:
        print(f"  [OK] lat={round(uef_coords['lat'], 6)}, lng={round(uef_coords['lon'], 6)}")
    else:
        print("  [FAIL] FAILED to geocode UEF campus!")
        # Use known coordinates as ultimate fallback
        uef_coords = {"lat": 62.6012, "lon": 29.7635}
        print(f"  Using fallback coordinates: {uef_coords}")

    # Report failures
    if failed:
        print(f"\n[WARNING] Failed to geocode {len(failed)} addresses:")
        for addr in failed:
            print(f"  - {addr}")
    else:
        print(f"\n[SUCCESS] All {len(ADDRESSES)} addresses geocoded successfully!")

    # Generate the JS file
    generate_properties_js(properties, uef_coords, output_path)
    print(f"\nTotal properties in output: {len(properties)}")
    print("Done!")


if __name__ == "__main__":
    main()
