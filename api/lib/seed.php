<?php
/** First start: create the default settings, delivery areas and medicine categories (and demo products only if config.php says so). */

function seed_if_empty(): void {
    if (db_get('settings', 'store')) return;
    $s = default_settings();
    foreach ([
        ['id' => 'inside', 'name' => 'Inside Dhaka', 'charge' => $s['deliveryInside'], 'freeOver' => $s['freeDeliveryOver'], 'eta' => 'Same day', 'active' => true, 'sortOrder' => 1],
        ['id' => 'outside', 'name' => 'Outside Dhaka', 'charge' => $s['deliveryOutside'], 'freeOver' => 0, 'eta' => '1–3 days', 'active' => true, 'sortOrder' => 2, 'viaCourier' => true],
    ] as $z) db_put('zones', $z);

    $demo = !empty(cfg()['seed_demo']);
    $cats = [['veg', 'Vegetables', '🥦', 'grocery', 0], ['fruit', 'Fruits', '🍎', 'grocery', 1], ['meat', 'Fish & Meat', '🐟', 'grocery', 2], ['dairy', 'Dairy & Eggs', '🥛', 'grocery', 3],
             ['grocery', 'Groceries', '🍚', 'grocery', 4], ['snacks', 'Snacks', '🍪', 'grocery', 5], ['med-otc', 'Medicine (OTC)', '💊', 'medicine', 50], ['med-health', 'Healthcare', '🩺', 'medicine', 51]];
    foreach ($cats as [$id, $name, $emoji, $kind, $order]) db_put('categories', ['id' => $id, 'name' => $name, 'slug' => $id, 'emoji' => $emoji, 'kind' => $kind, 'active' => true, 'sortOrder' => $order]);

    if ($demo) {
        // slug, name, price, oldPrice, unit, emoji, category, stock, rating, sold, featured, generic, maker, rx
        $P = [
            ['fresh-tomato', 'Fresh Tomato', 80, 100, '1 kg', '🍅', 'veg', 50, 4.5, 320, true, '', '', false],
            ['potato', 'Potato', 45, null, '1 kg', '🥔', 'veg', 120, 4.3, 540, false, '', '', false],
            ['apple', 'Apple', 280, 320, '1 kg', '🍎', 'fruit', 30, 4.7, 210, true, '', '', false],
            ['banana', 'Banana', 70, null, '1 dozen', '🍌', 'fruit', 60, 4.4, 400, false, '', '', false],
            ['rohu-fish', 'Rohu Fish', 420, null, '1 kg', '🐟', 'meat', 15, 4.6, 150, true, '', '', false],
            ['fresh-milk', 'Fresh Liquid Milk', 90, null, '1 L', '🥛', 'dairy', 80, 4.8, 610, true, '', '', false],
            ['eggs', 'Farm Eggs', 150, 165, '12 pcs', '🥚', 'dairy', 0, 4.5, 480, false, '', '', false],
            ['miniket-rice', 'Miniket Rice', 78, null, '1 kg', '🍚', 'grocery', 200, 4.6, 900, false, '', '', false],
            ['napa-500mg', 'Napa 500mg', 12, null, '10 tablets', '💊', 'med-otc', 200, 0, 0, false, 'Paracetamol', 'Beximco Pharma', false],
            ['saline-ors', 'Saline Oral (ORS)', 5, null, '1 sachet', '🧂', 'med-otc', 300, 0, 0, false, 'Oral rehydration salt', 'Radiant Pharma', false],
            ['antiseptic-liquid', 'Antiseptic Liquid', 120, null, '100 ml', '🧴', 'med-health', 60, 0, 0, false, 'Antiseptic', 'ACI', false],
            ['vitamin-c-500', 'Vitamin C 500mg', 150, null, '30 tablets', '🍊', 'med-health', 80, 0, 0, false, 'Ascorbic acid', 'Square', false],
            ['digital-thermometer', 'Digital Thermometer', 250, null, '1 pc', '🌡️', 'med-health', 40, 0, 0, false, '', '', false],
            ['amoxicillin-500', 'Amoxicillin 500mg', 90, null, '10 capsules', '💊', 'med-otc', 100, 0, 0, false, 'Amoxicillin', 'Square', true],
        ];
        $now = now_iso(); $n = 0;
        foreach ($P as [$slug, $name, $price, $old, $unit, $emoji, $cat, $stock, $rating, $sold, $feat, $gen, $maker, $rx]) {
            $id = new_id(); $n++;
            db_put('products', clean_nulls([
                'id' => $id, 'slug' => $slug, 'sku' => 'DEMO-' . str_pad((string)$n, 3, '0', STR_PAD_LEFT), 'name' => $name,
                'description' => $gen ? "$name — genuine medicine/health product. Please read the label and use as directed." : "Fresh, quality-checked " . strtolower($name) . " delivered to your door.",
                'price' => $price, 'oldPrice' => $old, 'unit' => $unit, 'emoji' => $emoji, 'images' => [], 'categoryId' => $cat, 'stock' => $stock, 'rating' => $rating, 'sold' => $sold,
                'featured' => $feat, 'active' => true, 'genericName' => $gen ?: null, 'manufacturer' => $maker ?: null, 'prescriptionRequired' => $rx ?: null,
                'createdAt' => $now, 'updatedAt' => $now,
            ]));
        }
    }
    db_put('settings', array_merge($s, ['id' => 'store']));
}
