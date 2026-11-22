<?php
/** Small helper functions used everywhere. */

/** Random 16-character id, e.g. "a3f9c0d2e1b47856". */
function new_id(): string { return bin2hex(random_bytes(8)); }

/** Current time as ISO text in UTC, e.g. "2026-11-20T08:30:00.000Z" (same format the browser's Date uses). */
function now_iso(): string { return gmdate('Y-m-d\TH:i:s') . '.' . sprintf('%03d', (int)(microtime(true) * 1000) % 1000) . 'Z'; }

function iso_to_ts(?string $iso): int { return $iso ? (int)strtotime($iso) : 0; }

function slugify(string $s): string {
    $s = strtolower(trim($s));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    $s = trim($s, '-');
    return $s !== '' ? $s : 'item';
}

/** "+880 1712-345678" / "8801712345678" -> "01712345678" (leaves anything else untouched). */
function norm_phone(string $v): string {
    $s = preg_replace('/[\s-]/', '', $v) ?? '';
    return preg_replace('/^\+?88(?=01)/', '', $s) ?? $s;
}

/** Same, but returns null when it is not a valid Bangladesh mobile number. Also understands Bangla digits. */
function normalize_bd_phone($v): ?string {
    $s = trim((string)($v ?? ''));
    if ($s === '') return null;
    $s = strtr($s, ['০'=>'0','১'=>'1','২'=>'2','৩'=>'3','৪'=>'4','৫'=>'5','৬'=>'6','৭'=>'7','৮'=>'8','৯'=>'9']);
    $s = preg_replace('/[\s\-().]/', '', $s) ?? '';
    if (str_starts_with($s, '+')) $s = substr($s, 1);
    if (preg_match('/^8801[3-9]\d{8}$/', $s)) $s = substr($s, 2);
    elseif (preg_match('/^1[3-9]\d{8}$/', $s)) $s = '0' . $s;
    return preg_match('/^01[3-9]\d{8}$/', $s) ? $s : null;
}

/** True when an array is a list ([a,b,c]) and not a map (["a"=>1]). */
function is_list(array $a): bool { return array_is_list($a); }

/** Keeps only the keys whose value is not null. */
function clean_nulls(array $a): array { return array_filter($a, fn($v) => $v !== null); }

/** Safe array read: arr_get($a, 'x', 5). */
function arr_get(array $a, string $k, $default = null) { return array_key_exists($k, $a) ? $a[$k] : $default; }

function money_round($n): int { return (int)round((float)$n); }
