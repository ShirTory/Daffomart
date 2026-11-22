<?php
/**
 * Product variants (size / weight / colour). A variant is one purchasable combination with its OWN price and stock,
 * e.g. ["size"=>"M","color"=>"Red","price"=>450,"stock"=>12].
 * When a product has variants its own price / old price / stock are DERIVED from them, so lists and filters need no special case.
 */
const VARIANT_ATTRS = ['size', 'weight', 'color'];

function variant_label(array $v): string {
    $parts = [];
    foreach (VARIANT_ATTRS as $a) { $x = trim((string)($v[$a] ?? '')); if ($x !== '') $parts[] = $x; }
    return implode(' / ', $parts);
}
function variant_key(array $v): string {
    return implode('|', array_map(fn($a) => strtolower(trim((string)($v[$a] ?? ''))), VARIANT_ATTRS));
}
function has_variants(?array $p): bool { return $p && !empty($p['variants']) && is_array($p['variants']); }
function find_variant(?array $p, ?string $id): ?array {
    if (!$id || !$p || empty($p['variants'])) return null;
    foreach ($p['variants'] as $v) if (($v['id'] ?? null) === $id) return $v;
    return null;
}

/** price = the CHEAPEST variant ("From ৳X"); stock = total of all variants. */
function rollup(array $variants): array {
    $stock = 0; $base = null;
    foreach ($variants as $v) {
        $stock += max(0, (int)floor((float)($v['stock'] ?? 0)));
        if ($base === null || $v['price'] < $base['price']) $base = $v;
    }
    $out = ['price' => $base['price'], 'stock' => $stock];
    if (!empty($base['oldPrice']) && $base['oldPrice'] > $base['price']) $out['oldPrice'] = $base['oldPrice'];
    return $out;
}

/** Give back (+) or take (-) stock of one variant and re-derive the product's total stock. Null if the variant does not exist. */
function with_variant_stock(array $p, string $variantId, int $delta): ?array {
    if (!has_variants($p) || !find_variant($p, $variantId)) return null;
    $variants = array_map(function ($v) use ($variantId, $delta) {
        if ($v['id'] === $variantId) $v['stock'] = max(0, (int)($v['stock'] ?? 0) + $delta);
        return $v;
    }, $p['variants']);
    return ['variants' => $variants, 'stock' => rollup($variants)['stock']];
}

/** Tidy up what the admin typed: trims, drops empty rows, gives each row a stable id. */
function normalise_variants($input): array {
    $out = [];
    foreach (is_array($input) ? $input : [] as $raw) {
        if (!is_array($raw)) continue;
        $price = (float)($raw['price'] ?? 0);
        $v = ['price' => $price, 'stock' => max(0, (int)floor((float)($raw['stock'] ?? 0)))];
        foreach (VARIANT_ATTRS as $a) { $x = trim((string)($raw[$a] ?? '')); if ($x !== '') $v[$a] = $x; }
        if (!empty($raw['colorHex'])) $v['colorHex'] = $raw['colorHex'];
        if (!empty($raw['oldPrice']) && (float)$raw['oldPrice'] > $price) $v['oldPrice'] = (float)$raw['oldPrice'];
        $sku = strtoupper(trim((string)($raw['sku'] ?? ''))); if ($sku !== '') $v['sku'] = $sku;
        if (variant_label($v) !== '') $out[] = array_merge(['id' => !empty($raw['id']) ? (string)$raw['id'] : new_id()], $v);
    }
    return $out;
}

function duplicate_variant(array $variants): string {
    $seen = [];
    foreach ($variants as $v) { $k = variant_key($v); if (isset($seen[$k])) return '"' . variant_label($v) . '" is added twice'; $seen[$k] = true; }
    return '';
}

/** A message when `qty` units of the chosen variant cannot be sold, "" when fine. */
function variant_stock_problem(array $p, ?string $variantId, int $qty): string {
    if (!has_variants($p)) return '';
    $v = find_variant($p, $variantId);
    if (!$variantId) return 'Please choose an option for ' . $p['name'];
    if (!$v) return 'An option in your cart is no longer available. Please review your cart.';
    $label = $p['name'] . ' (' . variant_label($v) . ')';
    if ($v['stock'] <= 0) return "$label is out of stock";
    if ($v['stock'] < $qty) return "Only {$v['stock']} of $label left in stock";
    return '';
}

/**
 * The stock rule used when an order is placed. Given the current products and the order lines,
 * returns ONE stock update per product, or throws StockError. Pure: it does not touch the database.
 */
function plan_stock(array $products, array $lines, string $nowIso): array {
    $ids = array_values(array_unique(array_map(fn($l) => $l['id'], $lines)));
    $plan = [];
    foreach ($ids as $id) {
        $p = $products[$id] ?? null;
        if (!$p || empty($p['active'])) throw new StockError('unavailable', 'A product in your cart is no longer available. Please review your cart.');
        $mine = array_values(array_filter($lines, fn($l) => $l['id'] === $id));
        $qty = array_sum(array_map(fn($l) => $l['qty'], $mine));
        if (has_variants($p)) {
            $cur = ['variants' => $p['variants'], 'stock' => $p['stock'] ?? 0];
            foreach ($mine as $l) {
                $v = find_variant($cur, $l['variantId'] ?? null);
                if (!$v) throw new StockError('unavailable', !empty($l['variantId']) ? 'An option in your cart is no longer available. Please review your cart.' : 'Please choose an option for ' . $p['name']);
                $label = $p['name'] . ' (' . variant_label($v) . ')';
                if ($v['stock'] < $l['qty']) throw new StockError($v['stock'] <= 0 ? 'out_of_stock' : 'insufficient', $v['stock'] <= 0 ? "$label is out of stock" : "Only {$v['stock']} of $label left in stock", max(0, (int)$v['stock']));
                $cur = array_merge($cur, with_variant_stock($cur, $l['variantId'], -$l['qty']));
            }
            $plan[] = ['id' => $id, 'patch' => ['variants' => $cur['variants'], 'stock' => $cur['stock'], 'sold' => (int)($p['sold'] ?? 0) + $qty, 'updatedAt' => $nowIso]];
        } else {
            $stock = (int)($p['stock'] ?? 0);
            if ($stock < $qty) throw new StockError($stock <= 0 ? 'out_of_stock' : 'insufficient', $stock <= 0 ? $p['name'] . ' is out of stock' : "Only $stock of {$p['name']} left in stock", $stock);
            $plan[] = ['id' => $id, 'patch' => ['stock' => $stock - $qty, 'sold' => (int)($p['sold'] ?? 0) + $qty, 'updatedAt' => $nowIso]];
        }
    }
    return $plan;
}
