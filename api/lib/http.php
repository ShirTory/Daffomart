<?php
/** JSON answers, errors, reading the request body, and a simple "too many requests" limiter. */

/** Throw this to answer with a friendly error: throw new ApiError(400, "Enter your name"); */
class ApiError extends Exception {
    public int $status;
    public $details;
    public function __construct(int $status, string $message, $details = null) {
        parent::__construct($message);
        $this->status = $status;
        $this->details = $details;
    }
}

function send_json(array $payload, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}
function ok($data, int $status = 200): void { send_json(['ok' => true, 'data' => $data], $status); }

/** The JSON the browser sent. */
function read_json(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new ApiError(400, 'Request body must be valid JSON');
    return $data;
}

function client_ip(): string {
    // Only REMOTE_ADDR cannot be faked by the visitor. (Behind a proxy/CDN set 'trusted_proxy_header' in config.php.)
    $cfg = cfg();
    $hdr = $cfg['trusted_proxy_header'] ?? '';
    if ($hdr && !empty($_SERVER[$hdr])) return trim(explode(',', $_SERVER[$hdr])[0]);
    return $_SERVER['REMOTE_ADDR'] ?? 'local';
}

/** Allow at most $max calls of $key within $windowSec seconds, otherwise answer 429. */
function rate_limit(string $key, int $max, int $windowSec): void {
    $pdo = Db::pdo();
    $k = substr(hash('sha256', $key), 0, 40);
    $now = time();
    $pdo->beginTransaction();
    try {
        $st = $pdo->prepare('SELECT n, reset_at FROM rate_limits WHERE k = ? FOR UPDATE');
        $st->execute([$k]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row || (int)$row['reset_at'] < $now) {
            $pdo->prepare('REPLACE INTO rate_limits (k, n, reset_at) VALUES (?, 1, ?)')->execute([$k, $now + $windowSec]);
            $pdo->commit();
            if (random_int(1, 50) === 1) $pdo->prepare('DELETE FROM rate_limits WHERE reset_at < ?')->execute([$now]);
            return;
        }
        $n = (int)$row['n'] + 1;
        $pdo->prepare('UPDATE rate_limits SET n = ? WHERE k = ?')->execute([$n, $k]);
        $pdo->commit();
        if ($n > $max) throw new ApiError(429, 'Too many requests. Please try again in a few minutes.');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

/** Run something after the customer already got the answer (used for notifications: they can never slow down checkout). */
function after_response(callable $fn): void { $GLOBALS['__after'][] = $fn; }
