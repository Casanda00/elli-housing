"""
Scrape apartment details from Elli property pages.
Extracts: types, sizes, rents, amenities (sauna, elevator, Ellinet, parking).
"""
import urllib.request
import json
import re
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

PROPERTY_IDS = [
    "apajakuja-1", "etelakatu-14", "huvilakatu-26", "itaranta-18",
    "kaislakatu-10", "kalastajankatu-32", "kalevankatu-26b", "kalevankatu-29",
    "karjamaentie-4", "karjamaentie-10", "karjamaentie-12", "kimpikuja-3",
    "kiulutie-2", "koulukatu-30b", "latolankatu-9", "leinikkitie-4",
    "louhelankatu-10", "lansikatu-18", "mantylantie-3", "merimiehenkatu-30",
    "niskakatu-15", "niskakatu-16", "niskakatu-25", "noljakankaari-6",
    "noljakankaari-16", "noljakankaari-38", "noljakantie-86", "noljakantie-91",
    "nuottaniementie-16", "opiskelijankatu-7", "peltolankatu-11",
    "penttilankulma-2", "pursitie-7", "ruoritie-2", "sairaalakatu-8",
    "suvikuja-8", "tikkamaentie-6", "sepankatu-15", "sepankatu-39b",
    "suvikatu-17", "suvikatu-19"
]

BASE_URL = "https://www.joensuunelli.fi/kohde/"

def fetch_page(prop_id):
    url = f"{BASE_URL}{prop_id}/"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'ElliDistanceFinder/1.0',
        'Accept-Language': 'fi'
    })
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        return resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        print(f"  [FAIL] HTTP error: {e}")
        return None

def parse_property(html, prop_id):
    info = {
        "yearBuilt": None,
        "types": [],
        "elevator": False,
        "sauna": False,
        "ellinet": None,
        "parking": False,
        "laundry": False,
        "bikeStorage": False,
        "apartments": []
    }

    # Year built
    m = re.search(r'Valmistumisvuosi\s*(\d{4})', html)
    if m:
        info["yearBuilt"] = int(m.group(1))

    # OG description often has summary
    og = re.search(r'og:description["\s]+content="([^"]*)"', html)
    og_text = og.group(1) if og else ""

    # Elevator
    if re.search(r'Hissi.*?Talossa on hissi', html, re.DOTALL | re.IGNORECASE):
        info["elevator"] = True
    elif re.search(r'hissi', html, re.IGNORECASE):
        if not re.search(r'ei ole hissi|ei hissi', html, re.IGNORECASE):
            info["elevator"] = True

    # Sauna
    if re.search(r'Sauna.*?sauna', html, re.DOTALL | re.IGNORECASE):
        info["sauna"] = True

    # Ellinet
    ellinet_match = re.search(r'Ellinet.*?(Ethernet|ADSL|VDSL|valokuitu)', html, re.DOTALL | re.IGNORECASE)
    if ellinet_match:
        info["ellinet"] = ellinet_match.group(1).upper()
    elif re.search(r'ellinet', html, re.IGNORECASE):
        info["ellinet"] = "Yes"

    # Parking
    if re.search(r'(Autopaikka|pysäköi|parkki|lämmityspistorasialla varustet)', html, re.IGNORECASE):
        info["parking"] = True

    # Laundry
    if re.search(r'(pesutupa|pesukone|pyykinpesu|talopesula)', html, re.IGNORECASE):
        info["laundry"] = True

    # Bike storage
    if re.search(r'(pyörävarasto|pyörä|polkupyörä)', html, re.IGNORECASE):
        info["bikeStorage"] = True

    # Apartment types and rents - look for asuntotyyppi blocks
    type_blocks = re.findall(
        r'Asuntotyyppi:\s*(.*?)</span>.*?Pinta-ala:.*?(\d+[\.,]?\d*)\s*m.*?Vuokra.*?(\d+[\.,]+\d+(?:\s*-\s*\d+[\.,]+\d+)?)\s*(?:&euro;|€)',
        html, re.DOTALL | re.IGNORECASE
    )

    for block in type_blocks:
        type_name = block[0].strip()
        size = block[1].replace(',', '.')
        rent = block[2].replace(',', '.').replace(' ', '')

        apt = {"type": type_name, "size": size, "rent": rent}
        info["apartments"].append(apt)

        # Track types
        type_lower = type_name.lower()
        if 'solu' in type_lower and 'Solu' not in info["types"]:
            info["types"].append("Solu")
        if 'yksiö' in type_lower and 'Yksiö' not in info["types"]:
            info["types"].append("Yksiö")
        if 'perhe' in type_lower or 'kaksio' in type_lower or 'kolmio' in type_lower:
            if 'Perhe' not in info["types"]:
                info["types"].append("Perhe")

    return info

def main():
    results = {}
    total = len(PROPERTY_IDS)

    print(f"Scraping {total} Elli property pages...")
    print("=" * 60)

    for i, pid in enumerate(PROPERTY_IDS, 1):
        print(f"[{i}/{total}] {pid}...", end=" ", flush=True)
        html = fetch_page(pid)
        if html:
            info = parse_property(html, pid)
            results[pid] = info
            types_str = ", ".join(info["types"]) if info["types"] else "?"
            apts = len(info["apartments"])
            print(f"[OK] {info['yearBuilt'] or '?'} | {types_str} | {apts} apt types | sauna={info['sauna']} | lift={info['elevator']} | ellinet={info['ellinet']}")
        else:
            results[pid] = None
            print("[FAIL]")
        time.sleep(0.8)

    # Write results
    out_path = r"C:\Users\gibso\.gemini\antigravity\scratch\elli-distance-finder\scripts\property_details.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n[SUCCESS] Saved to {out_path}")
    print(f"Properties scraped: {sum(1 for v in results.values() if v)}/{total}")

if __name__ == '__main__':
    main()
