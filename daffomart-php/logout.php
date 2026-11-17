<?php
/*
 * logout.php  -  ends the customer session.
 */
require_once __DIR__ . '/includes/functions.php';

logout_user();
session_start();                      // new empty session so we can show a message
flash('success', 'You have been logged out.');
redirect('index.php');
