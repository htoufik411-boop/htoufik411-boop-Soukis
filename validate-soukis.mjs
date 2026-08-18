import fs from 'node:fs';

const required = [
  'index.html','app-config.js','i18n.js','products-ui.js','cart-ui.js','cart-bridge.js',
  'orders-service.js','order-checkout.js','my-orders.js','user-orders-panel.js',
  'admin-service.js','admin-panel.js','auth-admin-ui.js'
];

const missing = required.filter(file => !fs.existsSync(file));
if (missing.length) {
  console.error(`Missing required files: ${missing.join(', ')}`);
  process.exit(1);
}

const html = fs.readFileSync('index.html', 'utf8');
for (const file of ['app-config.js', 'i18n.js', 'cart-bridge.js', 'products-ui.js']) {
  if (!html.includes(file)) {
    console.error(`Required module is not referenced by index.html: ${file}`);
    process.exit(1);
  }
}

for (const file of fs.readdirSync('.').filter(f => f.endsWith('.js'))) {
  const source = fs.readFileSync(file, 'utf8');
  if (/<<<<<<<|=======|>>>>>>>/.test(source)) {
    console.error(`Merge conflict marker found in ${file}`);
    process.exit(1);
  }
}

console.log('Soukis static validation passed.');
