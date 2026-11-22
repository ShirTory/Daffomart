<?php
/**
 * Generic "list / add / edit / delete" for products, categories, banners, offers, delivery areas, couriers and payment methods.
 * Each kind has a small config: how to validate, how to build the saved record, and what the public may see.
 */

function crud_out(array $cfg, ?array $admin): callable {
    return function (array $x) use ($cfg, $admin) {
        if (isset($cfg['present'])) $x = $cfg['present']($x);
        if (!$admin && isset($cfg['publicPresent'])) $x = $cfg['publicPresent']($x);
        return $x;
    };
}

function crud_list(array $cfg): void {
    $admin = get_full_admin();
    $items = db_list($cfg['col']);
    if (!$admin && isset($cfg['visible'])) $items = array_values(array_filter($items, $cfg['visible']));
    if (isset($cfg['sort'])) usort($items, $cfg['sort']);
    ok(array_map(crud_out($cfg, $admin), $items));
}
function crud_create(array $cfg): void {
    $admin = require_admin();
    $data = $cfg['schema'](read_json());
    $id = new_id();
    $rec = array_merge(($cfg['prepare'])($data, null, $id), ['id' => $id]);
    ok(crud_out($cfg, $admin)(db_put($cfg['col'], $rec)), 201);
}
function crud_find(array $cfg, string $id): array {
    $item = db_get($cfg['col'], $id);
    if (!$item) throw new ApiError(404, 'Not found');
    return $item;
}
function crud_get(array $cfg, string $id): void {
    $item = crud_find($cfg, $id); $admin = get_full_admin();
    if (!$admin && isset($cfg['visible']) && !$cfg['visible']($item)) throw new ApiError(404, 'Not found');
    ok(crud_out($cfg, $admin)($item));
}
function crud_update(array $cfg, string $id): void {
    $admin = require_admin();
    $prev = crud_find($cfg, $id);
    $data = $cfg['schema'](read_json());
    $rec = array_merge(($cfg['prepare'])($data, $prev, $prev['id']), ['id' => $prev['id']]);
    ok(crud_out($cfg, $admin)(db_put($cfg['col'], $rec)));
}
function crud_delete(array $cfg, string $id): void {
    require_admin();
    $prev = crud_find($cfg, $id);
    if (isset($cfg['beforeDelete'])) $cfg['beforeDelete']($prev['id']);
    db_remove($cfg['col'], $prev['id']);
    ok(['id' => $prev['id']]);
}

/* ---------- products ---------- */

function unique_product_slug(string $base, ?string $selfId): string {
    $taken = [];
    foreach (db_list('products') as $p) if ($p['id'] !== $selfId) $taken[$p['slug']] = true;
    $s = slugify($base); $n = 2;
    while (isset($taken[$s])) $s = slugify($base) . '-' . $n++;
    return $s;
}

/** SKU reservation: one SKU, one product. Two simultaneous saves of the same SKU cannot both succeed. */
const SKU_HOLD_SECONDS = 120;
function claim_sku(string $sku, string $owner): void {
    $mine = ['id' => $sku, 'owner' => $owner, 'at' => now_iso()];
    if (db_create('sku_index', $mine)) return;
    $cur = db_get('sku_index', $sku);
    if (!$cur) { if (db_create('sku_index', $mine)) return; throw new ApiError(409, "SKU \"$sku\" was just taken. Please try again."); }
    if ($cur['owner'] === $owner) return;
    $holder = db_get('products', $cur['owner']);
    $holderUsesIt = $holder && strtoupper((string)($holder['sku'] ?? '')) === $sku;
    $inProgress = !$holder && !empty($cur['at']) && time() - iso_to_ts($cur['at']) < SKU_HOLD_SECONDS;
    if ($holderUsesIt || $inProgress) throw new ApiError(409, "SKU \"$sku\" is already used by another product");
    db_put('sku_index', $mine);   // stale reservation: take it over
}
function release_sku(?string $sku, string $owner): void {
    if (!$sku) return;
    $cur = db_get('sku_index', strtoupper($sku));
    if ($cur && $cur['owner'] === $owner) db_remove('sku_index', strtoupper($sku));
}
/** Purchase cost is a business secret: only full-access admins may see it. */
function strip_cost(array $p): array { unset($p['cost']); return $p; }

function product_cfg(): array {
    return [
        'col' => 'products', 'schema' => 'schema_product',
        'publicPresent' => 'strip_cost',
        'visible' => fn($p) => !empty($p['active']),
        'beforeDelete' => function ($id) { $p = db_get('products', $id); if ($p) release_sku($p['sku'] ?? null, $id); },
        'prepare' => function (array $d, ?array $prev, ?string $id) {
            $sku = $d['sku'];
            $owner = $prev['id'] ?? $id;
            if ($sku) {
                foreach (db_list('products') as $p) if (!empty($p['sku']) && strtoupper($p['sku']) === $sku && $p['id'] !== $owner) throw new ApiError(409, "SKU \"$sku\" is already used by another product");
                if ($owner) claim_sku($sku, $owner);
            }
            if ($owner && !empty($prev['sku']) && strtoupper($prev['sku']) !== $sku) release_sku($prev['sku'], $owner);
            // variants: each has its own price and stock; the product's own price ("From"), old price and total stock are derived from them
            $variants = normalise_variants($d['variants'] ?? []);
            $derived = $variants ? rollup($variants) : null;
            $rec = array_merge($d, $derived ? ['price' => $derived['price'], 'oldPrice' => $derived['oldPrice'] ?? null, 'stock' => $derived['stock']] : []);
            $rec['variants'] = $variants ?: null;
            $rec['sku'] = $sku;
            $rec['cost'] = $prev['cost'] ?? null;                    // kept up to date by purchases; an ordinary edit must not wipe it
            $rec['slug'] = unique_product_slug($d['slug'] !== '' ? $d['slug'] : $d['name'], $prev['id'] ?? null);
            $rec['images'] = array_values(array_filter($d['images'] ?? []));
            $rec['sold'] = $prev['sold'] ?? 0;
            $rec['createdAt'] = $prev['createdAt'] ?? now_iso();
            $rec['updatedAt'] = now_iso();
            return clean_nulls($rec);
        },
    ];
}

/* ---------- categories ---------- */
function category_cfg(): array {
    return [
        'col' => 'categories', 'schema' => 'schema_category',
        'visible' => fn($c) => !empty($c['active']),
        'sort' => fn($a, $b) => (($a['sortOrder'] ?? 0) <=> ($b['sortOrder'] ?? 0)) ?: strcmp($a['name'], $b['name']),
        'prepare' => fn($d) => array_merge($d, ['slug' => slugify(($d['slug'] ?? '') !== '' ? $d['slug'] : $d['name'])]),
        'beforeDelete' => function ($id) {
            $used = count(array_filter(db_list('products'), fn($p) => $p['categoryId'] === $id));
            if ($used) throw new ApiError(409, "This category has $used product(s). Move or delete them first.");
        },
    ];
}

function banner_cfg(): array {
    return [
        'col' => 'banners', 'schema' => 'schema_banner',
        'visible' => fn($b) => !empty($b['active']),
        'sort' => fn($a, $b) => (($a['sortOrder'] ?? 0) <=> ($b['sortOrder'] ?? 0)) ?: strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''),
        'prepare' => fn($d, $prev) => array_merge($d, ['createdAt' => $prev['createdAt'] ?? now_iso()]),
    ];
}

function offer_cfg(): array {
    return [
        'col' => 'offers', 'schema' => 'schema_offer',
        'visible' => fn($o) => offer_is_live($o),
        'sort' => fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? ''),
        'prepare' => function ($d, $prev) {
            if (!empty($d['code'])) foreach (db_list('offers') as $o) if (($o['code'] ?? null) === $d['code'] && $o['id'] !== ($prev['id'] ?? null)) throw new ApiError(409, 'This coupon code is already used by another offer');
            return array_merge($d, ['createdAt' => $prev['createdAt'] ?? now_iso()]);
        },
    ];
}

function zone_cfg(): array {
    return [
        'col' => 'zones', 'schema' => 'schema_zone',
        'visible' => fn($z) => !empty($z['active']),
        'sort' => fn($a, $b) => (($a['sortOrder'] ?? 0) <=> ($b['sortOrder'] ?? 0)) ?: strcmp($a['name'], $b['name']),
        'prepare' => fn($d) => $d,
        'beforeDelete' => function ($id) {
            $others = array_filter(db_list('zones'), fn($z) => !empty($z['active']) && $z['id'] !== $id);
            if (!$others) throw new ApiError(409, 'Keep at least one active delivery area so customers can check out.');
        },
    ];
}

/** Courier companies for deliveries outside Dhaka. Admin only. */
function courier_cfg(): array {
    return [
        'col' => 'couriers', 'schema' => 'schema_courier',
        'visible' => fn() => false,
        'sort' => fn($a, $b) => (($a['sortOrder'] ?? 0) <=> ($b['sortOrder'] ?? 0)) ?: strcmp($a['name'], $b['name']),
        'prepare' => fn($d, $prev) => array_merge($d, ['createdAt' => $prev['createdAt'] ?? now_iso()]),
        'beforeDelete' => function ($id) {
            $used = count(array_filter(db_list('orders'), fn($o) => ($o['courierId'] ?? null) === $id && !in_array($o['status'], ['delivered', 'cancelled', 'returned'], true)));
            if ($used) throw new ApiError(409, "$used open order(s) are with this courier. Deactivate it instead of deleting.");
        },
    ];
}

/** Extra payment options (Rocket, Upay, bank transfer ...). Only active ones are public. */
function payment_method_cfg(): array {
    return [
        'col' => 'payment_methods', 'schema' => 'schema_payment_method',
        'visible' => fn($m) => !empty($m['active']),
        'sort' => fn($a, $b) => (($a['sortOrder'] ?? 0) <=> ($b['sortOrder'] ?? 0)) ?: strcmp($a['label'], $b['label']),
        'prepare' => fn($d, $prev) => clean_nulls(array_merge($d, ['hint' => $d['hint'] ?? '', 'createdAt' => $prev['createdAt'] ?? now_iso()])),
    ];
}

function resource_cfg(string $name): array {
    return match ($name) {
        'products' => product_cfg(), 'categories' => category_cfg(), 'banners' => banner_cfg(), 'offers' => offer_cfg(),
        'zones' => zone_cfg(), 'couriers' => courier_cfg(), 'payment-methods' => payment_method_cfg(),
        default => throw new ApiError(404, 'Not found'),
    };
}
