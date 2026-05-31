const fs = require('fs');

const PROPERTIES_PATH = 'js/properties.js';
const content = fs.readFileSync(PROPERTIES_PATH, 'utf-8');
const fn = new Function(content + '; return {PROPERTIES, INSTITUTIONS}');
const {PROPERTIES, INSTITUTIONS} = fn();

const AMENITIES = [
  { id: 'center', name: 'City Center', type: 'center', lat: 62.60118, lng: 29.76316 },
  { id: 'prisma', name: 'Prisma Joensuu', type: 'supermarket', lat: 62.6164, lng: 29.7783 },
  { id: 'citymarket-pilkko', name: 'K-Citymarket Pilkko', type: 'supermarket', lat: 62.6136, lng: 29.7289 },
  { id: 'citymarket-keskusta', name: 'K-Citymarket Keskusta', type: 'supermarket', lat: 62.6006, lng: 29.7648 },
  { id: 'smarket-rantakyla', name: 'S-Market Rantakylä', type: 'supermarket', lat: 62.6206, lng: 29.8091 },
  { id: 'smarket-noljakka', name: 'S-Market Noljakka', type: 'supermarket', lat: 62.6161, lng: 29.7029 },
  { id: 'smarket-niinivaara', name: 'S-Market Niinivaara', type: 'supermarket', lat: 62.5932, lng: 29.7821 },
  { id: 'kmarket-penttila', name: 'K-Market Penttilä', type: 'supermarket', lat: 62.5919, lng: 29.7645 },
  { id: 'kmarket-kanervala', name: 'K-Market Kanervala', type: 'supermarket', lat: 62.6105, lng: 29.7570 },
  { id: 'mehtimaki', name: 'Mehtimäki Sports Park', type: 'sports', lat: 62.6074, lng: 29.7432 },
  { id: 'areena', name: 'Joensuu Areena', type: 'sports', lat: 62.6053, lng: 29.7424 },
  { id: 'keskuskentta', name: 'Keskuskenttä', type: 'sports', lat: 62.6051, lng: 29.7525 }
];

async function calculateDistances() {
  const modes = ['foot', 'bike'];
  
  // Straight line distance helper
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  for (const prop of PROPERTIES) {
    prop.amenities = {};
    
    // Find nearest of each type using straight line to avoid 1000s of OSRM calls
    const types = [...new Set(AMENITIES.map(a => a.type))];
    
    for (const type of types) {
      const typeAmenities = AMENITIES.filter(a => a.type === type);
      let nearest = null;
      let minDist = Infinity;
      
      for (const amenity of typeAmenities) {
        const d = getDistance(prop.lat, prop.lng, amenity.lat, amenity.lng);
        if (d < minDist) {
          minDist = d;
          nearest = amenity;
        }
      }
      
      // Store straight line distance
      prop.amenities[type] = {
        id: nearest.id,
        name: nearest.name,
        distance: Math.round(minDist)
      };
    }
  }

  // Update properties.js file
  const newPropsJS = `const PROPERTIES = ${JSON.stringify(PROPERTIES, null, 2)};\n\nconst INSTITUTIONS = ${JSON.stringify(INSTITUTIONS, null, 2)};\n`;
  fs.writeFileSync(PROPERTIES_PATH, newPropsJS);
  console.log('Updated properties.js with nearest amenities!');
}

calculateDistances();
