const fs = require('fs');
const path = 'js/properties.js';

const content = fs.readFileSync(path, 'utf-8');
const fn = new Function(content + '; return {PROPERTIES, INSTITUTIONS};');
const {PROPERTIES, INSTITUTIONS} = fn();

for (const prop of PROPERTIES) {
  if (prop.id === 'lansikatu-18') {
    prop.area = 'Near Campus';
  }
}

const newPropsJS = `const PROPERTIES = ${JSON.stringify(PROPERTIES, null, 2)};\n\nconst INSTITUTIONS = ${JSON.stringify(INSTITUTIONS, null, 2)};\n`;
fs.writeFileSync(path, newPropsJS);
console.log('Lansikatu 18 area updated!');
