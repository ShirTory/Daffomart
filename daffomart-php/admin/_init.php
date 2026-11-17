<?php
/*
 * admin/_init.php  -  FIRST thing every admin page loads:
 * loads the helper functions and sends non-admins to the admin login page.
 * (Pages that handle a form load this at the very top, do their work and redirect,
 *  and only THEN load _top.php, because redirects must happen before any HTML is printed.)
 */
require_once __DIR__ . '/../includes/functions.php';
$admin = require_admin();
