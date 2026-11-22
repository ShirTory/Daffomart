<?php
declare(strict_types=1);
/** Starts everything: settings file, error handling, CORS, and loads the other files. */

foreach (['util', 'http', 'db', 'variants', 'auth', 'validate', 'settings', 'payments', 'customers', 'services', 'resources', 'seed', 'upload'] as $f) {
    require __DIR__ . '/' . $f . '.php';
}

/** The values from config.php (loaded once). */
function cfg(): array {
    static $c = null;
    if ($c !== null) return $c;
    $file = __DIR__ . '/../config.php';
    if (!is_file($file)) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => 'config.php is missing. Copy config.sample.php to config.php and fill it in.']);
        exit;
    }
    $c = require $file;
    return $c;
}

date_default_timezone_set(cfg()['timezone'] ?? 'Asia/Dhaka');

// never print PHP warnings into the JSON answer; write them to the error log instead
ini_set('display_errors', '0');
error_reporting(E_ALL);
set_error_handler(function ($no, $str, $file, $line) { error_log("[php] $str in $file:$line"); return true; });

/** CORS: only the websites listed in config.php may call this API from a browser. */
function send_cors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = cfg()['allowed_origins'] ?? [];
    if ($origin !== '' && in_array(rtrim($origin, '/'), array_map(fn($o) => rtrim($o, '/'), $allowed), true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Max-Age: 600');
    }
}
