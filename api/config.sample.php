<?php
/**
 * DaffoMart API settings.
 * 1) Copy this file to  config.php  (same folder) and fill in your own values.
 * 2) NEVER upload config.php to GitHub (it is already listed in .gitignore).
 */
return [
    // ---- MySQL database (create it in your hosting control panel, then copy the details here) ----
    'db_host' => 'localhost',
    'db_name' => 'daffomart',
    'db_user' => 'root',
    'db_pass' => '',

    // ---- Admin (Owner) login ----
    'admin_email'    => 'admin@yourdomain.com',
    'admin_password' => 'change-me-strong-password',

    // Long random text (at least 32 characters). It signs the login tokens. Keep it secret.
    'auth_secret' => 'replace-with-a-long-random-string-at-least-32-characters',

    // ---- Which websites may call this API (your Netlify address, no trailing slash) ----
    'allowed_origins' => [
        'https://your-site.netlify.app',
        // 'http://localhost:8000',   // uncomment while testing on your own computer
    ],

    // Public address of this API folder, e.g. https://yourname.infinityfreeapp.com/api  (used for image links)
    'api_url' => 'https://example.com/api',

    // Put true ONLY on a brand-new database if you want a few demo products (never for a real store)
    'seed_demo' => false,

    // Time zone used for "today" in reports
    'timezone' => 'Asia/Dhaka',
];
