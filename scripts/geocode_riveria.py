import urllib.request, json, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
url = 'https://nominatim.openstreetmap.org/search?q=Peltolankatu+4,+Joensuu,+Finland&format=json&limit=1&countrycodes=fi'
r = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Elli/1.0'})).read())
print(f"Riveria Peltolankatu: lat={r[0]['lat']}, lng={r[0]['lon']}")
time.sleep(1.2)
url2 = 'https://nominatim.openstreetmap.org/search?q=Jukolankatu+18,+Joensuu,+Finland&format=json&limit=1&countrycodes=fi'
r2 = json.loads(urllib.request.urlopen(urllib.request.Request(url2, headers={'User-Agent':'Elli/1.0'})).read())
print(f"Riveria Jukolankatu: lat={r2[0]['lat']}, lng={r2[0]['lon']}")
