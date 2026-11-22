<?php
/**
 * Admin login.  After a correct email + password the server gives the browser a signed token (JWT).
 * The browser sends it back in the  Authorization: Bearer <token>  header on every admin request.
 * The token only proves WHO logged in; role and access are looked up again on every request, so
 * switching an account off takes effect at once.
 */
const SESSION_SECONDS = 43200; // 12 hours

function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec(string $s): string { return (string)base64_decode(strtr($s, '-_', '+/')); }

function auth_secret(): string {
    $s = (string)(cfg()['auth_secret'] ?? '');
    if (strlen($s) < 32 || str_contains($s, 'replace-with')) throw new ApiError(503, 'auth_secret in api/config.php must be a long random text (32+ characters).');
    return $s;
}

function jwt_sign(array $claims): string {
    $head = b64u(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $body = b64u(json_encode($claims));
    return "$head.$body." . b64u(hash_hmac('sha256', "$head.$body", auth_secret(), true));
}
function jwt_verify(string $token): ?array {
    $p = explode('.', $token);
    if (count($p) !== 3) return null;
    $calc = b64u(hash_hmac('sha256', "$p[0].$p[1]", auth_secret(), true));
    if (!hash_equals($calc, $p[2])) return null;
    $claims = json_decode(b64u_dec($p[1]), true);
    if (!is_array($claims) || ($claims['exp'] ?? 0) < time()) return null;
    return $claims;
}

function bearer_token(): string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$h && function_exists('getallheaders')) { foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v; }
    return preg_match('/^Bearer\s+(.+)$/i', $h, $m) ? trim($m[1]) : '';
}

function hash_password(string $pw): string { return password_hash($pw, PASSWORD_DEFAULT); }
function verify_password(string $pw, ?string $stored): bool { return $stored ? password_verify($pw, $stored) : false; }
/** True when the token was issued BEFORE the account's last password change. */
function session_revoked(?int $iat, ?string $pwChangedAt): bool { return $pwChangedAt && ($iat ?? 0) < iso_to_ts($pwChangedAt); }

function env_owner(): ?array {
    $c = cfg();
    return !empty($c['admin_email']) && !empty($c['admin_password']) ? ['email' => $c['admin_email'], 'password' => $c['admin_password']] : null;
}
function is_env_owner(string $email): bool { $o = env_owner(); return $o && strtolower($o['email']) === strtolower(trim($email)); }

function find_admin_by_email(string $email): ?array {
    $e = strtolower(trim($email));
    foreach (db_list('admins') as $a) if (strtolower($a['email']) === $e && !empty($a['active'])) return $a;
    return null;
}
function admin_full_access(array $acc): bool {
    return $acc['role'] === 'owner' ? true : ($acc['role'] === 'accountant' ? false : !empty($acc['fullAccess']));
}

/** Check email + password. Returns the session info, or null. */
function authenticate_admin(string $email, string $password): ?array {
    $o = env_owner();
    if ($o && hash_equals(hash('sha256', strtolower($o['email'])), hash('sha256', strtolower($email))) && hash_equals(hash('sha256', $o['password']), hash('sha256', $password))) {
        return ['email' => strtolower(trim($email)), 'adminRole' => 'owner', 'fullAccess' => true];
    }
    $acc = find_admin_by_email($email);
    if (!$acc || empty($acc['passHash']) || !verify_password($password, $acc['passHash'])) return null;
    return ['email' => $acc['email'], 'adminRole' => $acc['role'], 'fullAccess' => admin_full_access($acc)];
}

function create_session_token(array $s): string {
    $now = time();
    return jwt_sign(['sub' => $s['email'], 'role' => 'admin', 'adminRole' => $s['adminRole'], 'fullAccess' => $s['fullAccess'], 'iat' => $now, 'exp' => $now + SESSION_SECONDS]);
}

/** The signed-in admin (or null). Role and access are re-read from the database on every call. */
function get_admin(): ?array {
    static $cache = false;
    if ($cache !== false) return $cache;
    $cache = null;
    $token = bearer_token();
    if ($token === '') return null;
    $claims = jwt_verify($token);
    if (!$claims || ($claims['role'] ?? '') !== 'admin' || empty($claims['sub'])) return null;
    $email = (string)$claims['sub'];
    if (is_env_owner($email)) return $cache = ['email' => $email, 'adminRole' => 'owner', 'fullAccess' => true];
    $acc = find_admin_by_email($email);
    if (!$acc || session_revoked($claims['iat'] ?? 0, $acc['pwChangedAt'] ?? null)) return null;
    return $cache = ['email' => $acc['email'], 'adminRole' => $acc['role'], 'fullAccess' => admin_full_access($acc)];
}
/** Admin with FULL panel access, or null. */
function get_full_admin(): ?array { $a = get_admin(); return $a && $a['fullAccess'] ? $a : null; }

function require_session(): array { $a = get_admin(); if (!$a) throw new ApiError(401, 'Please sign in as admin'); return $a; }
function require_admin(): array {
    $a = require_session();
    if (!$a['fullAccess']) throw new ApiError(403, 'Your account does not have Admin Panel access. Ask the Owner to grant it.');
    return $a;
}
function require_finance(): array {
    $a = require_session();
    if (!$a['fullAccess'] && $a['adminRole'] !== 'accountant') throw new ApiError(403, 'Your account does not have Finance access.');
    return $a;
}
function require_owner(): array {
    $a = require_session();
    if ($a['adminRole'] !== 'owner') throw new ApiError(403, 'Only the Owner can perform this action');
    return $a;
}

/** Append-only record of important actions. Never throws. */
function log_audit(array $i): void {
    try {
        db_put('audit_logs', [
            'id' => new_id(), 'at' => now_iso(), 'actor' => substr((string)$i['actor'], 0, 120), 'actorRole' => substr((string)$i['actorRole'], 0, 40),
            'action' => substr((string)$i['action'], 0, 80), 'target' => isset($i['target']) ? substr((string)$i['target'], 0, 120) : null,
            'detail' => isset($i['detail']) ? substr((string)$i['detail'], 0, 400) : null, 'ip' => isset($i['ip']) ? substr((string)$i['ip'], 0, 64) : null,
        ]);
    } catch (Throwable $e) { error_log('[audit] ' . $e->getMessage()); }
}
