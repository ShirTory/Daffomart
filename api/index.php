<?php
declare(strict_types=1);
/** Front door of the API: every request comes here. */
require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/routes.php';

send_cors();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'OPTIONS') { http_response_code(204); exit; }

// the address after the folder of index.php, e.g. /products/abc  (or ?r=/products/abc on hosts without URL rewriting)
if (isset($_GET['r'])) $path = '/' . ltrim((string)$_GET['r'], '/');
else {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    if ($base !== '' && str_starts_with($path, $base)) $path = substr($path, strlen($base));
    if (str_starts_with($path, '/index.php')) $path = substr($path, 10);
    $path = '/' . ltrim($path, '/');
}

try {
    Db::pdo();
    seed_if_empty();
    dispatch($method, $path);
} catch (ApiError $e) {
    send_json(array_filter(['ok' => false, 'error' => $e->getMessage(), 'details' => $e->details], fn($x) => $x !== null), $e->status);
} catch (StockError $e) {
    send_json(['ok' => false, 'error' => $e->getMessage(), 'kind' => $e->kind, 'available' => $e->available], 409);
} catch (Throwable $e) {
    error_log('[api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    send_json(['ok' => false, 'error' => 'Something went wrong on the server'], 500);
}
