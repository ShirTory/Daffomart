/* =====================================================================
   DaffoMart  -  sample-data.js
   Sample categories, products and coupons (same as the sample data of the PHP version).
   Loaded only when needed: demo mode, or the admin presses "Load sample data".
   ===================================================================== */
window.DM_SAMPLE = {
  categories: [
    { id: 'veg',        name: 'Vegetables',     emoji: '🥦', kind: 'grocery',  sortOrder: 1 },
    { id: 'fruit',      name: 'Fruits',         emoji: '🍎', kind: 'grocery',  sortOrder: 2 },
    { id: 'meat',       name: 'Fish & Meat',    emoji: '🐟', kind: 'grocery',  sortOrder: 3 },
    { id: 'dairy',      name: 'Dairy & Eggs',   emoji: '🥛', kind: 'grocery',  sortOrder: 4 },
    { id: 'grocery',    name: 'Groceries',      emoji: '🍚', kind: 'grocery',  sortOrder: 5 },
    { id: 'snacks',     name: 'Snacks',         emoji: '🍪', kind: 'grocery',  sortOrder: 6 },
    { id: 'med-otc',    name: 'Medicine (OTC)', emoji: '💊', kind: 'medicine', sortOrder: 50 },
    { id: 'med-health', name: 'Healthcare',     emoji: '🩺', kind: 'medicine', sortOrder: 51 }
  ],

  // [category, name, slug, generic name, price, old price, unit, emoji, stock, featured, rx]
  products: [
    ['veg',        'Fresh Tomato',        'fresh-tomato',        '',                      80,  100,  '1 kg',        '🍅', 50,  1, 0],
    ['veg',        'Potato',              'potato',              '',                      45,  null, '1 kg',        '🥔', 120, 0, 0],
    ['fruit',      'Apple',               'apple',               '',                      280, 320,  '1 kg',        '🍎', 30,  1, 0],
    ['fruit',      'Banana',              'banana',              '',                      70,  null, '1 dozen',     '🍌', 60,  0, 0],
    ['meat',       'Rohu Fish',           'rohu-fish',           '',                      420, null, '1 kg',        '🐟', 15,  1, 0],
    ['dairy',      'Fresh Liquid Milk',   'fresh-milk',          '',                      90,  null, '1 L',         '🥛', 80,  1, 0],
    ['dairy',      'Farm Eggs',           'eggs',                '',                      150, 165,  '12 pcs',      '🥚', 0,   0, 0],
    ['grocery',    'Miniket Rice',        'miniket-rice',        '',                      78,  null, '1 kg',        '🍚', 200, 1, 0],
    ['snacks',     'Family Biscuit Pack', 'biscuit-pack',        '',                      60,  null, '1 pack',      '🍪', 90,  0, 0],
    ['med-otc',    'Napa 500mg',          'napa-500mg',          'Paracetamol',           12,  null, '10 tablets',  '💊', 200, 0, 0],
    ['med-otc',    'Saline Oral (ORS)',   'saline-ors',          'Oral rehydration salt', 5,   null, '1 sachet',    '🧂', 300, 0, 0],
    ['med-health', 'Antiseptic Liquid',   'antiseptic-liquid',   'Antiseptic',            120, null, '100 ml',      '🧴', 60,  0, 0],
    ['med-health', 'Vitamin C 500mg',     'vitamin-c-500',       'Ascorbic acid',         150, null, '30 tablets',  '🍊', 80,  0, 0],
    ['med-health', 'Digital Thermometer', 'digital-thermometer', '',                      250, null, '1 pc',        '🌡️', 40,  0, 0],
    ['med-otc',    'Amoxicillin 500mg',   'amoxicillin-500',     'Amoxicillin',           90,  null, '10 capsules', '💊', 100, 0, 1]
  ],

  // WELCOME10 = 10% off (min 300 Taka), FLAT50 = 50 Taka off (min 500 Taka, 100 uses)
  coupons: [
    { code: 'WELCOME10', type: 'percent', value: 10, minOrder: 300, maxUses: null },
    { code: 'FLAT50',    type: 'fixed',   value: 50, minOrder: 500, maxUses: 100 }
  ]
};
