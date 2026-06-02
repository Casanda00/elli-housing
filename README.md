# Elli Distance Finder 🏠

An interactive, map-based web application designed to help university students in Joensuu, Finland find the perfect student housing. Built specifically for properties managed by **Joensuun Elli**, this tool calculates travel times, visualizes locations, and filters properties based on student-centric criteria.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-yellow.svg)
![Leaflet](https://img.shields.io/badge/Map-Leaflet-green.svg)

## ✨ Features

- **Interactive Map**: Built with Leaflet.js and OpenStreetMap, featuring a beautiful dark-mode aesthetic with custom Phosphor icons.
- **Dynamic Routing & Distance**: 
  - Uses the **OSRM (Open Source Routing Machine) API** to instantly calculate walking, cycling, and driving travel times.
  - Uses the **Digitransit GraphQL API** to fetch real-time bus schedules, providing step-by-step public transit itineraries from any property directly to campus.
- **Multi-Factor Filtering**:
  - **Travel Time Radius**: Filter out properties that are too far away (e.g., only show properties within a 15-minute bike ride).
  - **Rent Budget**: Filter properties based on the cheapest available apartment unit (e.g., < 400 €/month).
  - **Apartment Type**: Toggle between Shared (Solu), Studio (Yksiö), and Family (Perhe) apartments.
- **Local Amenities**: Calculates and displays straight-line distances to the nearest Supermarkets, Sports facilities, and the City Center.
- **Bilingual Support**: Instant toggling between English (EN) and Finnish (FI) interfaces.
- **Offline-Ready Data**: Property details, coordinates, and baseline distances are pre-processed and stored locally to minimize API calls and ensure blazing-fast UI performance.

## 🚀 Tech Stack

- **Frontend**: HTML5, Vanilla CSS (CSS Variables, Flexbox/Grid), Vanilla JavaScript (ES6+).
- **Mapping & Routing**: 
  - **Leaflet.js** for map rendering.
  - **OSRM API** for walking/cycling/driving routes.
  - **Digitransit GraphQL API** for real-time bus schedules.
  - **Nominatim** for geocoding.
- **Icons**: Phosphor Icons (CDN).
- **Data Processing Scripts**: Node.js & Python (for scraping, geocoding, and amenity distance calculations).

## 📁 Architecture & Data Flow

1. **Scraping & Geocoding (`scripts/`)**:
   - Python scripts scrape property names, rents, types, and amenities directly from the Joensuun Elli website.
   - Addresses are geocoded into precise Lat/Lng coordinates using Nominatim.
   - Node.js scripts calculate Haversine distances from every property to major local amenities.
2. **State Management (`js/app.js`)**:
   - A centralized state controls the selected campus, transportation mode, language, and active filters.
   - When state changes, `matchesFilters()` is called to evaluate which properties stay visible on the map and the list.
3. **UI Rendering**:
   - The UI is entirely dynamic. Property cards and map markers are generated on the fly.
   - CSS handles visibility toggles (`.filtered-out`) to avoid expensive DOM re-insertions.

## 🛠️ Local Development

Since the app uses vanilla web technologies, you don't need a complex build pipeline!

1. Clone the repository:
   ```bash
   git clone https://github.com/Casanda00/elli-housing.git
   cd elli-housing
   ```
2. Serve the directory using any local web server. For example, with Python:
   ```bash
   python -m http.server 8080
   ```
3. Open `http://localhost:8080` in your browser.

## 📝 Scripts Overview

The `scripts/` folder contains the tools used to build the static dataset (`js/properties.js`). You only need to run these if Joensuun Elli builds new properties or changes their data:

- `geocode.py` / `test_geocode.py`: Fetches coordinates for addresses.
- `scrape_details.py` / `merge_details.py`: Extracts rental data from the Elli website.
- `calc_amenities.js`: Maps out supermarkets, sports fields, and city center coordinates, and computes the distance to each property.

## 🤝 Contributing

Feedback and contributions are welcome! If you notice an incorrect address, a missing amenity, or a bug in the routing, please open an issue or submit a pull request.
