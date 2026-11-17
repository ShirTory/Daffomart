<?php
/*
 * config.php  -  all settings of the website are here.
 *
 * HOW TO CHANGE SETTINGS SAFELY:
 *   Copy includes/config.local.example.php to includes/config.local.php and put your real
 *   database password etc. there. config.local.php is NOT uploaded to GitHub (see .gitignore),
 *   and its values win over the defaults below.
 */
if (is_file(__DIR__ . '/config.local.php')) {
    require __DIR__ . '/config.local.php';
}

// define a constant only if config.local.php did not already define it
function setting(string $name, $value): void
{
    if (!defined($name)) {
        define($name, $value);
    }
}

// ---------- Database ----------
setting('DB_HOST', 'localhost');
setting('DB_NAME', 'daffomart');
setting('DB_USER', 'root');   // XAMPP default
setting('DB_PASS', '');       // XAMPP default (empty)

// ---------- Store info ----------
setting('STORE_NAME',    'DaffoMart');
setting('STORE_TAGLINE', 'Everyday Essentials, Delivered with Care.');
setting('STORE_PHONE',   '01XXXXXXXXX');
setting('STORE_EMAIL',   'support@daffomart.example');
setting('STORE_ADDRESS', 'Dhaka, Bangladesh');
setting('STORE_HOURS',   'Every day, 8:00 AM - 10:00 PM');

// ---------- Delivery (Taka) ----------
setting('DELIVERY_INSIDE',  60);    // inside Dhaka
setting('DELIVERY_OUTSIDE', 120);   // outside Dhaka
setting('FREE_DELIVERY_OVER', 0);   // 0 = free delivery is turned off, e.g. 1500 = free above 1500 Taka

// ---------- Other ----------
setting('PRODUCTS_PER_PAGE', 12);
setting('MAX_UPLOAD_BYTES', 2 * 1024 * 1024); // 2 MB product image

// Show PHP errors only on your own computer. On a live host errors stay hidden.
$serverName = $_SERVER['SERVER_NAME'] ?? 'localhost';
setting('DEBUG', in_array($serverName, ['localhost', '127.0.0.1', '::1'], true));
ini_set('display_errors', DEBUG ? '1' : '0');
error_reporting(E_ALL);

// BASE_URL = folder of the site in the browser (auto-detected).
// If links break on your host, set BASE_URL in config.local.php, e.g. '/daffomart-php' or ''.
$docRoot = rtrim(str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
$appDir  = str_replace('\\', '/', dirname(__DIR__));
setting('BASE_URL', ($docRoot !== '' && stripos($appDir, $docRoot) === 0) ? substr($appDir, strlen($docRoot)) : '');
