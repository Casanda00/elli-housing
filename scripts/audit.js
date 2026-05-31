const fs = require('fs');
const content = fs.readFileSync('js/properties.js', 'utf-8');
const fn = new Function(content + '; return {PROPERTIES}');
const {PROPERTIES} = fn();

console.log('=== Properties with NO apartment data ===');
PROPERTIES.filter(p => !p.apartments || p.apartments.length === 0).forEach(p => {
  console.log(`  ${p.id}: types=${JSON.stringify(p.types)}, year=${p.yearBuilt}`);
});

console.log('\n=== Apartment type names used ===');
const types = new Set();
PROPERTIES.forEach(p => (p.apartments||[]).forEach(a => types.add(a.type)));
console.log([...types].join(', '));

console.log('\n=== Elli URL check (IDs with special chars) ===');
PROPERTIES.forEach(p => {
  if (p.id.includes('ae') || p.id.includes('oe') || p.id !== p.id.toLowerCase()) {
    console.log(`  ${p.id} -> /kohde/${p.id}/`);
  }
});
