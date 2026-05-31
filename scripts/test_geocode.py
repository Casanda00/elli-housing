import requests
import time

addresses = [
    "Peltolankatu 5, 80220 Joensuu",
    "Noljakankaari 16, Joensuu",
    "Kiulutie 2, Joensuu"
]

for address in addresses:
    print(f"--- {address} ---")
    url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=3"
    headers = {"User-Agent": "ElliDistanceFinder/1.1"}
    resp = requests.get(url, headers=headers)
    data = resp.json()
    for d in data:
        print(f"Lat: {d['lat']}, Lng: {d['lon']}, Type: {d.get('type')}, Name: {d.get('display_name')}")
    time.sleep(1)
