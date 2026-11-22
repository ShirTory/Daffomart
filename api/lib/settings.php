<?php
/** Store settings: the default values, and the rules for saving changes from the admin panel. */

function default_settings(): array {
    $sec = fn($id) => ['id' => $id, 'visible' => true];
    return [
        'storeName' => 'DaffoMart', 'tagline' => 'Everyday Essentials, Delivered with Care.',
        'phone' => '', 'whatsapp' => '', 'email' => '', 'address' => 'Dhaka, Bangladesh', 'facebook' => '',
        'announcement' => 'Everyday essentials, delivered with care · Cash on delivery available',
        'deliveryInside' => 60, 'deliveryOutside' => 120, 'freeDeliveryOver' => 0, 'serviceCharge' => 0,
        'hours' => 'Every day, 8:00 AM – 10:00 PM', 'mapUrl' => '', 'minOrder' => 0, 'logo' => '', 'footerText' => '',
        'heroTitle' => "Groceries & medicine,\ndelivered to your door.",
        'heroSubtitle' => 'Fresh food, daily needs and trusted medicine — order online, pay on delivery.', 'heroCta' => 'Shop now',
        'features' => [
            ['icon' => 'truck', 'title' => 'Fast delivery', 'text' => 'Same-day in Dhaka'],
            ['icon' => 'leaf', 'title' => 'Always fresh', 'text' => 'Quality checked'],
            ['icon' => 'cash', 'title' => 'Cash on delivery', 'text' => 'Pay when you receive'],
            ['icon' => 'tag', 'title' => 'Best prices', 'text' => 'Daily offers'],
        ],
        'positions' => [
            ['id' => 'rider', 'title' => 'Delivery Rider', 'kind' => 'rider', 'description' => 'Deliver orders in your area. Own bike or bicycle preferred.', 'active' => true],
            ['id' => 'support', 'title' => 'Customer Support', 'kind' => 'staff', 'description' => 'Help customers by phone, WhatsApp and Facebook.', 'active' => true],
            ['id' => 'warehouse', 'title' => 'Warehouse / Packer', 'kind' => 'staff', 'description' => 'Pack and prepare orders for delivery.', 'active' => true],
            ['id' => 'operations', 'title' => 'Operations', 'kind' => 'staff', 'description' => 'Manage orders, stock and daily operations.', 'active' => true],
            ['id' => 'marketing', 'title' => 'Marketing', 'kind' => 'staff', 'description' => 'Social media, offers and promotions.', 'active' => true],
        ],
        'joinTitle' => 'Join our team', 'joinIntro' => 'Choose the position you want to apply for. Our team will review your application and contact you.',
        'payCod' => true, 'payBkash' => false, 'bkashNumber' => '', 'payNagad' => false, 'nagadNumber' => '', 'payOnline' => true,
        'payInstructions' => 'Send the total amount using “Send Money”, then enter the Transaction ID (TrxID) at checkout. We confirm your order after verifying the payment.',
        'showMedicine' => true, 'medicineTitle' => 'Medicine & Healthcare', 'medicineSubtitle' => 'Trusted medicines and health products, delivered fast.',
        'homeSections' => array_map($sec, ['hero', 'features', 'categories', 'best', 'daily', 'fresh', 'household', 'offers', 'sale', 'medicine', 'new', 'buyAgain']),
        'homeDailyTitle' => 'Daily Essentials', 'homeFreshTitle' => 'Fresh Food & Grocery', 'homeHouseholdTitle' => 'Household Essentials', 'homeBestTitle' => 'Best Sellers',
        'labelRules' => ['showBestSeller' => true, 'bestSellerMinSold' => 5, 'showNewArrival' => true, 'newArrivalDays' => 14, 'showOffer' => true, 'showOutOfStock' => true],
        'customerNidEnabled' => false,
        'emptyStateTitle' => 'No products found', 'emptyStateText' => 'Try a different search or category. Fresh stock arrives daily.', 'emptyStateIcon' => '🔍',
        'returnPolicy' => 'Unopened items can be returned within 24 hours of delivery with proof of purchase. Perishable goods may not be eligible. Contact support for assistance.',
        'exchangePolicy' => 'Damaged or wrong items can be exchanged within 24 hours. Please keep the original packaging and invoice.',
        'primaryColor' => '#1E3A8A', 'accentColor' => '#F7941D', 'secondaryColor' => '', 'buttonRadius' => 'lg', 'buttonSize' => 'md',
        'supportCallLabel' => 'Call Now', 'supportWaLabel' => 'WhatsApp', 'showSupportCall' => true, 'showSupportWa' => true, 'metaPixelId' => '',
        'invoiceFooter' => 'Thank you for shopping with DaffoMart.',
        'courierOutsideNote' => 'Outside Dhaka: delivery via courier partners. Timing may vary by location.',
        'medicineNotice' => 'Prescription (Rx) medicines are delivered only after our pharmacist confirms your prescription by phone.',
        'appPromptEnabled' => true, 'appPromptTitle' => 'Install DaffoMart App',
        'appPromptText' => 'Add DaffoMart to your home screen for faster shopping, order tracking and exclusive offers.',
        'appPromptBtnLabel' => 'Add to Home Screen', 'appPromptDismissLabel' => 'Not now', 'appPromptDelayMs' => 2500, 'appPromptHideDays' => 7,
    ];
}

/** field => [type, ...options]. Types: s (text, max), b (true/false), n (number, min, max), url, color, enum, tree (nested data). */
function settings_spec(): array {
    $s = fn(int $max = 255) => ['s', $max];
    $b = ['b']; $url = ['url']; $col = ['color'];
    return [
        'storeName' => ['s', 60, 1], 'tagline' => $s(160), 'phone' => $s(30), 'whatsapp' => $s(30), 'email' => $s(120), 'address' => $s(240), 'facebook' => $s(240),
        'hours' => $s(160), 'mapUrl' => $s(600), 'announcement' => $s(200),
        'minOrder' => ['n', 0, null], 'serviceCharge' => ['n', 0, 100000], 'deliveryInside' => ['n', 0, null], 'deliveryOutside' => ['n', 0, null], 'freeDeliveryOver' => ['n', 0, null],
        'logo' => $url, 'footerText' => $s(300), 'heroTitle' => $s(120), 'heroSubtitle' => $s(240), 'heroCta' => $s(40),
        'features' => ['tree'], 'positions' => ['tree'], 'joinTitle' => $s(80), 'joinIntro' => $s(300),
        'payCod' => $b, 'payBkash' => $b, 'bkashNumber' => $s(30), 'payNagad' => $b, 'nagadNumber' => $s(30), 'payOnline' => $b, 'payInstructions' => $s(400),
        'showMedicine' => $b, 'medicineTitle' => $s(80), 'medicineSubtitle' => $s(200), 'medicineNotice' => $s(300),
        'emptyStateTitle' => $s(80), 'emptyStateText' => $s(240), 'emptyStateIcon' => $s(8), 'returnPolicy' => $s(2000), 'exchangePolicy' => $s(2000),
        'primaryColor' => $col, 'accentColor' => $col, 'secondaryColor' => $col, 'buttonColor' => $col, 'buttonTextColor' => $col,
        'buttonStyle' => ['enum', ['solid', 'outline', 'soft']], 'buttonRadius' => ['enum', ['none', 'sm', 'md', 'lg', 'full']], 'buttonSize' => ['enum', ['sm', 'md', 'lg']],
        'showBuyNow' => $b, 'showWishlist' => $b, 'showCardWhatsapp' => $b, 'showCardDelivery' => $b,
        'supportCallColor' => $col, 'supportWaColor' => $col, 'supportPosition' => ['enum', ['right', 'left']], 'supportWaMessage' => $s(200),
        'supportCallLabel' => $s(40), 'supportWaLabel' => $s(40), 'showSupportCall' => $b, 'showSupportWa' => $b,
        'navAllImage' => $url, 'navMedicineImage' => $url, 'navOffersImage' => $url, 'showCatSection' => $b,
        'catIconSize' => ['enum', ['sm', 'md', 'lg']], 'catIconShape' => ['enum', ['rounded', 'circle', 'square']], 'catIconBg' => $col, 'catIconFit' => ['enum', ['cover', 'contain']],
        'catShowLabels' => $b, 'catGap' => ['enum', ['sm', 'md', 'lg']], 'catLabelColor' => $col,
        'emptyStateImage' => $url, 'emptyStateBg' => $col, 'emptyStateColor' => $col, 'emptyStateAlign' => ['enum', ['center', 'left']],
        'footerPromoShow' => $b, 'footerPromoHeight' => ['enum', ['sm', 'md', 'lg']], 'footerPromoBg' => $col, 'footerPromoAlt' => $s(120),
        'footerPromoFit' => ['enum', ['cover', 'contain']], 'footerShowPayments' => $b, 'footerShowCategories' => $b,
        'footerPromoImage' => $url, 'footerPromoLink' => $s(400),
        'texts' => ['tree'], 'payDisplay' => ['tree'],
        'appPromptEnabled' => $b, 'appPromptTitle' => $s(80), 'appPromptText' => $s(240), 'appPromptImage' => $url, 'appPromptBtnLabel' => $s(40),
        'appPromptDismissLabel' => $s(40), 'appPromptDelayMs' => ['n', 0, 60000], 'appPromptHideDays' => ['n', 0, 365],
        'seoTitle' => $s(70), 'seoDescription' => $s(200), 'ogImage' => $url, 'favicon' => $url, 'invoice' => ['tree'], 'invoiceFooter' => $s(300),
        'metaPixelId' => $s(40), 'courierOutsideNote' => $s(300),
        'labelRules' => ['tree'], 'fx' => ['tree'], 'dealBadges' => ['tree'], 'heroBanner' => ['tree'], 'customerNidEnabled' => $b, 'storeTheme' => ['tree'],
        'homeSections' => ['tree'], 'homeDailyCatIds' => ['tree'], 'homeFreshCatIds' => ['tree'], 'homeHouseholdCatIds' => ['tree'],
        'homeDailyTitle' => $s(80), 'homeFreshTitle' => $s(80), 'homeHouseholdTitle' => $s(80), 'homeBestTitle' => $s(80),
    ];
}

/** Nested settings (lists and groups): strings are trimmed/capped, image links are checked, depth is limited. */
function sanitize_tree($v, string $key = '', int $depth = 0) {
    if ($depth > 6) throw new ApiError(400, 'Settings data is nested too deeply');
    if (is_array($v)) {
        if (count($v) > 400) throw new ApiError(400, 'Too many entries in one settings group');
        $out = [];
        foreach ($v as $k => $x) $out[$k] = sanitize_tree($x, is_string($k) ? $k : $key, $depth + 1);
        return $out;
    }
    if (is_string($v)) {
        $v = mb_substr(trim($v), 0, 1000);
        if ($v !== '' && preg_match('/(image|logo|favicon)$/i', $key)) {
            $ok = (str_starts_with($v, '/') && !str_starts_with($v, '//') && !str_starts_with($v, '/\\')) || preg_match('#^https?://#i', $v);
            if (!$ok) throw new ApiError(400, "$key must be a valid URL or path");
        }
        return $v;
    }
    if (is_bool($v) || is_int($v) || is_float($v) || $v === null) return $v;
    throw new ApiError(400, 'Invalid value in settings');
}

/** Validates the fields present in a settings update and returns only those (the rest stay as they are). */
function schema_settings_patch(array $in): array {
    $spec = settings_spec();
    $v = new Validator($in);
    $out = [];
    foreach ($in as $k => $_) {
        if (!isset($spec[$k])) continue;                      // unknown fields are ignored
        [$type] = $spec[$k];
        switch ($type) {
            case 's':    $out[$k] = $v->str($k, $spec[$k][2] ?? 0, $spec[$k][1], '', 'This field is required'); break;
            case 'b':    $out[$k] = $v->bool($k); break;
            case 'n':    $out[$k] = $v->num($k, (float)$spec[$k][1], $spec[$k][2]); break;
            case 'url':  $out[$k] = $v->url($k); break;
            case 'color': $out[$k] = $v->color($k) ?? ''; break;
            case 'enum': $out[$k] = $v->enum($k, $spec[$k][1]); break;
            case 'tree': $out[$k] = sanitize_tree($in[$k], (string)$k); break;
        }
    }
    if (isset($out['homeSections'])) {
        $ids = ['hero','features','categories','best','daily','fresh','household','offers','offerProducts','sale','medicine','new','buyAgain'];
        foreach ($out['homeSections'] as $row) if (!is_array($row) || !in_array($row['id'] ?? '', $ids, true)) $v->add('homeSections', 'Unknown home section');
    }
    $v->done();
    return $out;
}

/** Settings merged over the defaults (so a half-empty database still gives a complete answer). */
function get_settings(): array {
    $d = default_settings();
    $s = array_merge($d, db_get('settings', 'store') ?? []);
    if (empty($s['features']) || !is_array($s['features'])) $s['features'] = $d['features'];
    if (empty($s['homeSections']) || !is_array($s['homeSections'])) $s['homeSections'] = $d['homeSections'];
    if (empty($s['labelRules'])) $s['labelRules'] = $d['labelRules'];
    // very old installs stored colours that were never used: treat them as "not set"
    foreach (['primaryColor', 'accentColor', 'secondaryColor'] as $k) {
        if (in_array(strtolower((string)($s[$k] ?? '')), ['#e11d48', '#f59e0b', '#0f172a'], true)) $s[$k] = $k === 'primaryColor' ? '#1E3A8A' : ($k === 'accentColor' ? '#F7941D' : '');
    }
    foreach (['texts', 'payDisplay'] as $k) if (isset($s[$k]) && $s[$k] === []) $s[$k] = new stdClass();   // an empty map must stay {} in JSON
    unset($s['zonesSeeded'], $s['medicineSeeded']);
    return $s;
}
