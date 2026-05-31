const fs = require('fs');
const path = 'js/properties.js';

const content = fs.readFileSync(path, 'utf-8');
const fn = new Function(content + '; return {PROPERTIES, INSTITUTIONS};');
const {PROPERTIES, INSTITUTIONS} = fn();

const updates = {
  "mantylantie-3": { lat: 62.5926655, lng: 29.7677782, area: "Penttilä" },
  "noljakankaari-16": { lat: 62.6243241, lng: 29.6904050 },
  "kiulutie-2": { lat: 62.6180947, lng: 29.7165785 }
};

for (const prop of PROPERTIES) {
  if (updates[prop.id]) {
    Object.assign(prop, updates[prop.id]);
  }
}

const newPropsJS = `const PROPERTIES = ${JSON.stringify(PROPERTIES, null, 2)};\n\nconst INSTITUTIONS = ${JSON.stringify(INSTITUTIONS, null, 2)};\n`;
fs.writeFileSync(path, newPropsJS);
console.log('Coordinates updated!');
