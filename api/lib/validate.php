<?php
/**
 * Checking what the browser sends.  One small class + one function per kind of form.
 * The server NEVER trusts the browser: every value is trimmed, converted to the right type and length-checked here.
 */
class Validator {
    public array $errors = [];
    public function __construct(private array $in) {}

    private function err(string $k, string $msg): void { $this->errors[$k] ??= $msg; }
    public function has(string $k): bool { return array_key_exists($k, $this->in) && $this->in[$k] !== null; }
    public function raw(string $k) { return $this->in[$k] ?? null; }

    /** text, trimmed. Empty text is allowed when $min is 0. */
    public function str(string $k, int $min = 0, int $max = 255, string $default = '', ?string $msg = null): string {
        $v = $this->has($k) ? $this->in[$k] : $default;
        if (is_array($v) || is_object($v)) { $this->err($k, $msg ?? 'Invalid value'); return $default; }
        $v = trim((string)$v);
        if (mb_strlen($v) < $min) $this->err($k, $msg ?? "Must be at least $min characters");
        if (mb_strlen($v) > $max) $this->err($k, "Must be at most $max characters");
        return $v;
    }
    /** optional text: null when empty. */
    public function optStr(string $k, int $max = 255): ?string {
        if (!$this->has($k)) return null;
        $v = $this->str($k, 0, $max);
        return $v === '' ? null : $v;
    }
    public function num(string $k, float $min = 0, ?float $max = null, ?float $default = 0, ?string $msg = null): float {
        $v = $this->has($k) && $this->in[$k] !== '' ? $this->in[$k] : $default;
        if (!is_numeric($v)) { $this->err($k, $msg ?? 'Must be a number'); return (float)$default; }
        $v = (float)$v;
        if ($v < $min) $this->err($k, $msg ?? "Must be $min or more");
        if ($max !== null && $v > $max) $this->err($k, "Must be $max or less");
        return $v;
    }
    /** number that stays null when missing/empty/0. */
    public function optNum(string $k, float $min = 0): ?float {
        if (!$this->has($k) || $this->in[$k] === '' || !is_numeric($this->in[$k])) return null;
        $v = (float)$this->in[$k];
        if ($v < $min) { $this->err($k, "Must be $min or more"); return null; }
        return $v > 0 ? $v : null;
    }
    public function int(string $k, int $min = PHP_INT_MIN, int $max = PHP_INT_MAX, int $default = 0, ?string $msg = null): int {
        $v = $this->has($k) && $this->in[$k] !== '' ? $this->in[$k] : $default;
        if (!is_numeric($v) || (float)$v != floor((float)$v)) { $this->err($k, $msg ?? 'Must be a whole number'); return $default; }
        $v = (int)$v;
        if ($v < $min) $this->err($k, $msg ?? "Must be $min or more");
        if ($v > $max) $this->err($k, "Must be $max or less");
        return $v;
    }
    public function bool(string $k, bool $default = false): bool {
        if (!$this->has($k)) return $default;
        $v = $this->in[$k];
        if (is_bool($v)) return $v;
        $this->err($k, 'Must be true or false');
        return $default;
    }
    public function enum(string $k, array $allowed, ?string $default = null): ?string {
        if (!$this->has($k)) return $default;
        $v = (string)$this->in[$k];
        if (!in_array($v, $allowed, true)) { $this->err($k, 'Invalid choice'); return $default; }
        return $v;
    }
    /** a link or a path: "" , "/x" or "http(s)://...". */
    public function url(string $k, bool $required = false, ?string $msg = null): string {
        $v = $this->str($k, 0, 1000);
        $okUrl = $v === '' || (str_starts_with($v, '/') && !str_starts_with($v, '//') && !str_starts_with($v, '/\\')) || preg_match('#^https?://#i', $v);
        if (!$okUrl) $this->err($k, 'Must be a valid URL or path');
        if ($required && $v === '') $this->err($k, $msg ?? 'Required');
        return $v;
    }
    public function optUrl(string $k): ?string { if (!$this->has($k)) return null; $v = $this->url($k); return $v === '' ? null : $v; }
    /** "#1E3A8A" or "#fff" or "". */
    public function color(string $k): ?string {
        if (!$this->has($k)) return null;
        $v = $this->str($k, 0, 9);
        if (!preg_match('/^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})?$/', $v)) $this->err($k, 'Use a colour like #1E3A8A');
        return $v;
    }
    public function date(string $k): ?string {
        if (!$this->has($k)) return null;
        $v = $this->str($k, 0, 10);
        if ($v !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) $this->err($k, 'Use a date like 2026-11-30');
        return $v === '' ? null : $v;
    }
    public function add(string $k, string $msg): void { $this->err($k, $msg); }

    /** Throws the FIRST problem (with every problem in `details`). */
    public function done(): void {
        if ($this->errors) throw new ApiError(400, (string)reset($this->errors), $this->errors);
    }
}

/* ======================= one function per form ======================= */

function schema_login(array $in): array {
    $v = new Validator($in);
    $email = strtolower($v->str('email', 1, 200, '', 'Enter a valid email'));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $v->add('email', 'Enter a valid email');
    $pw = (string)($in['password'] ?? '');
    if ($pw === '') $v->add('password', 'Enter your password');
    $v->done();
    return ['email' => $email, 'password' => $pw];
}

function schema_product(array $in): array {
    $v = new Validator($in);
    $sku = strtoupper($v->str('sku', 0, 64));
    if ($sku !== '' && !preg_match('/^[A-Z0-9_-]+$/', $sku)) $v->add('sku', 'SKU: letters, numbers, - and _ only');
    $images = [];
    if (isset($in['images'])) {
        if (!is_array($in['images']) || count($in['images']) > 8) $v->add('images', 'At most 8 images');
        else foreach ($in['images'] as $i => $u) { $vv = new Validator(['u' => $u]); $images[] = $vv->url('u'); if ($vv->errors) $v->add("images.$i", 'Must be a valid URL or path'); }
    }
    $variants = [];
    if (isset($in['variants'])) {
        if (!is_array($in['variants']) || count($in['variants']) > 40) $v->add('variants', 'A product can have at most 40 variants');
        else foreach ($in['variants'] as $i => $raw) {
            $vv = new Validator(is_array($raw) ? $raw : []);
            $row = [
                'id' => $vv->optStr('id', 40),
                'size' => $vv->optStr('size', 30), 'weight' => $vv->optStr('weight', 30), 'color' => $vv->optStr('color', 30),
                'colorHex' => $vv->color('colorHex') ?: null,
                'price' => $vv->num('price', 0, null, 0, 'Variant price must be 0 or more'),
                'oldPrice' => $vv->optNum('oldPrice'),
                'stock' => $vv->int('stock', 0, 1000000, 0, 'Variant stock must be 0 or more'),
                'sku' => ($s = strtoupper($vv->str('sku', 0, 64))) !== '' ? $s : null,
            ];
            if ($row['sku'] && !preg_match('/^[A-Z0-9_-]+$/', $row['sku'])) $vv->add('sku', 'Variant SKU: letters, numbers, - and _ only');
            if (!$row['size'] && !$row['weight'] && !$row['color']) $vv->add('size', 'Fill at least one of Size, Weight or Colour');
            if ($vv->errors) $v->add("variants.$i." . array_key_first($vv->errors), (string)reset($vv->errors));
            $variants[] = clean_nulls($row);
        }
    }
    $d = [
        'name' => $v->str('name', 2, 120, '', 'Name is required'),
        'slug' => $v->str('slug', 0, 140),
        'sku' => $sku !== '' ? $sku : null,
        'description' => $v->str('description', 0, 5000),
        'price' => $v->num('price', 0, null, 0, 'Price must be 0 or more'),
        'oldPrice' => $v->optNum('oldPrice'),
        'unit' => $v->str('unit', 0, 40, '1 pc'),
        'emoji' => $v->str('emoji', 0, 8, '🛒'),
        'image' => $v->optUrl('image'),
        'images' => $images,
        'genericName' => $v->optStr('genericName', 160),
        'manufacturer' => $v->optStr('manufacturer', 120),
        'prescriptionRequired' => $v->bool('prescriptionRequired', false),
        'categoryId' => $v->str('categoryId', 1, 60, '', 'Choose a category'),
        'stock' => $v->int('stock', 0, PHP_INT_MAX, 0),
        'rating' => $v->num('rating', 0, 5, 0),
        'featured' => $v->bool('featured', false),
        'active' => $v->bool('active', true),
        'offerStartsAt' => $v->date('offerStartsAt'),
        'offerEndsAt' => $v->date('offerEndsAt'),
        'variants' => $variants,
    ];
    if (($dup = duplicate_variant($variants)) !== '') $v->add('variants', "Variant $dup");
    if ($d['offerStartsAt'] && $d['offerEndsAt'] && $d['offerEndsAt'] < $d['offerStartsAt']) $v->add('offerEndsAt', 'Offer end date is before the start date');
    if ($d['active'] && !$d['sku']) $v->add('sku', 'SKU is required for published products');
    $v->done();
    return $d;
}

function schema_category(array $in): array {
    $v = new Validator($in);
    $d = [
        'name' => $v->str('name', 2, 60, '', 'Name is required'), 'slug' => $v->str('slug', 0, 80), 'emoji' => $v->str('emoji', 0, 8, '🛍️'),
        'image' => $v->optUrl('image'), 'coverImage' => $v->optUrl('coverImage'), 'description' => $v->optStr('description', 300),
        'coverOverlay' => $v->enum('coverOverlay', ['dark', 'medium', 'light', 'none']), 'coverHeight' => $v->enum('coverHeight', ['sm', 'md', 'lg']),
        'coverTextColor' => $v->color('coverTextColor'), 'coverBg' => $v->color('coverBg'), 'coverPosition' => $v->enum('coverPosition', ['top', 'center', 'bottom']),
        'coverTitle' => $v->optStr('coverTitle', 80),
        'hideOnHome' => $v->has('hideOnHome') ? $v->bool('hideOnHome') : null, 'iconBg' => $v->color('iconBg'),
        'kind' => $v->enum('kind', ['grocery', 'medicine'], 'grocery'), 'active' => $v->bool('active', true), 'sortOrder' => $v->int('sortOrder', -1000000, 1000000, 0),
    ];
    $v->done();
    return clean_nulls($d);
}

function schema_banner(array $in): array {
    $v = new Validator($in);
    $d = [
        'title' => $v->str('title', 0, 120), 'subtitle' => $v->str('subtitle', 0, 240), 'image' => $v->url('image', true, 'Cover image is required'),
        'mobileImage' => $v->optUrl('mobileImage'), 'ctaLabel' => $v->str('ctaLabel', 0, 40), 'ctaHref' => $v->str('ctaHref', 0, 300, '/products'),
        'active' => $v->bool('active', true), 'sortOrder' => $v->int('sortOrder', -1000000, 1000000, 0),
    ];
    $v->done();
    return clean_nulls($d);
}

function schema_offer(array $in): array {
    $v = new Validator($in);
    $code = strtoupper($v->str('code', 0, 24));
    if ($code !== '' && !preg_match('/^[A-Z0-9_-]+$/', $code)) $v->add('code', 'Letters, numbers, - and _ only');
    $d = [
        'title' => $v->str('title', 2, 120, '', 'Title is required'), 'description' => $v->str('description', 0, 400), 'image' => $v->optUrl('image'),
        'badge' => $v->str('badge', 0, 24), 'code' => $code !== '' ? $code : null,
        'discountType' => $v->enum('discountType', ['percent', 'flat'], 'percent'), 'discountValue' => $v->num('discountValue', 0, null, 0),
        'minOrder' => $v->num('minOrder', 0, null, 0), 'startsAt' => $v->date('startsAt'), 'endsAt' => $v->date('endsAt'), 'active' => $v->bool('active', true),
    ];
    if ($d['discountType'] === 'percent' && $d['discountValue'] > 100) $v->add('discountValue', 'Percent cannot exceed 100');
    $v->done();
    return clean_nulls($d);
}

function schema_zone(array $in): array {
    $v = new Validator($in);
    $d = [
        'name' => $v->str('name', 2, 60, '', 'Area name is required'), 'charge' => $v->num('charge', 0, null, 0, 'Charge must be 0 or more'),
        'freeOver' => $v->num('freeOver', 0, null, 0), 'eta' => $v->str('eta', 0, 60), 'viaCourier' => $v->bool('viaCourier', false),
        'active' => $v->bool('active', true), 'sortOrder' => $v->int('sortOrder', -1000000, 1000000, 0),
    ];
    $v->done();
    return $d;
}

function bd_or_blank(Validator $v, string $k): string {
    $s = $v->str($k, 0, 20);
    if (!preg_match('/^(\+?[0-9][0-9\s-]{5,18})?$/', $s)) $v->add($k, 'Enter a valid phone number');
    return $s;
}
function schema_courier(array $in): array {
    $v = new Validator($in);
    $url = $v->str('trackingUrl', 0, 300);
    if ($url !== '' && !preg_match('#^https?://#i', $url)) $v->add('trackingUrl', 'Must start with http:// or https://');
    $d = [
        'name' => $v->str('name', 2, 60, '', 'Courier name is required'), 'phone' => bd_or_blank($v, 'phone'), 'trackingUrl' => $url,
        'note' => $v->str('note', 0, 300), 'charge' => $v->num('charge', 0, 100000, 0), 'active' => $v->bool('active', true),
        'sortOrder' => $v->int('sortOrder', -1000000, 1000000, 0),
    ];
    $v->done();
    return $d;
}

function schema_payment_method(array $in): array {
    $v = new Validator($in);
    $d = [
        'label' => $v->str('label', 2, 60, '', 'Label required'), 'hint' => $v->str('hint', 0, 200), 'number' => $v->optStr('number', 40),
        'icon' => $v->optStr('icon', 8), 'active' => $v->bool('active', true), 'sortOrder' => $v->int('sortOrder', -1000000, 1000000, 0),
        'requireTrx' => $v->bool('requireTrx', true),
    ];
    $v->done();
    return $d;
}

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled', 'returned'];
const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];

function schema_order_create(array $in): array {
    $v = new Validator($in);
    $phone = norm_phone($v->str('phone', 0, 30));
    if (!preg_match('/^01[3-9]\d{8}$/', $phone)) $v->add('phone', 'Enter a valid mobile number (01XXXXXXXXX)');
    $from = $v->has('paymentFrom') ? norm_phone($v->str('paymentFrom', 0, 24)) : null;
    $items = [];
    if (!isset($in['items']) || !is_array($in['items']) || count($in['items']) < 1) $v->add('items', 'Your cart is empty');
    elseif (count($in['items']) > 60) $v->add('items', 'Too many items');
    else foreach ($in['items'] as $i => $it) {
        $iv = new Validator(is_array($it) ? $it : []);
        $row = ['id' => $iv->str('id', 1, 80), 'variantId' => $iv->optStr('variantId', 40), 'qty' => $iv->int('qty', 1, 100, 1)];
        if ($iv->errors) $v->add("items.$i", (string)reset($iv->errors));
        $items[] = $row;
    }
    $lat = isset($in['lat']) && is_numeric($in['lat']) ? (float)$in['lat'] : null;
    $lng = isset($in['lng']) && is_numeric($in['lng']) ? (float)$in['lng'] : null;
    if (($lat !== null && ($lat < -90 || $lat > 90)) || ($lng !== null && ($lng < -180 || $lng > 180))) { $lat = $lng = null; }
    $key = $v->optStr('idempotencyKey', 64);
    if ($key !== null && !preg_match('/^[A-Za-z0-9_-]{16,64}$/', $key)) $v->add('idempotencyKey', 'Invalid request key');
    $d = [
        'name' => $v->str('name', 2, 80, '', 'Enter your full name'), 'phone' => $phone, 'address' => $v->str('address', 8, 300, '', 'Enter your full address'),
        'zone' => $v->str('zone', 1, 60, '', 'Choose a delivery area'), 'payment' => $v->str('payment', 1, 40, 'cod'),
        'paymentRef' => $v->optStr('paymentRef', 40), 'paymentFrom' => $from, 'lat' => $lat, 'lng' => $lng,
        'note' => $v->str('note', 0, 300), 'couponCode' => ($c = strtoupper($v->str('couponCode', 0, 24))) !== '' ? $c : null,
        'idempotencyKey' => $key, 'items' => $items,
    ];
    $v->done();
    return $d;
}

function schema_order_patch(array $in): array {
    $v = new Validator($in);
    $d = [
        'status' => $v->enum('status', ORDER_STATUSES), 'riderId' => $v->has('riderId') ? $v->str('riderId', 0, 60) : null,
        'paymentStatus' => $v->enum('paymentStatus', PAYMENT_STATUSES), 'courierId' => $v->has('courierId') ? $v->str('courierId', 0, 60) : null,
        'trackingNo' => $v->has('trackingNo') ? $v->str('trackingNo', 0, 60) : null,
    ];
    $v->done();
    if (count(array_filter($d, fn($x) => $x !== null)) === 0) throw new ApiError(400, 'Nothing to update');
    return $d;
}
