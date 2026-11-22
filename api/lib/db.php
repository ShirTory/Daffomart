<?php
/**
 * The database layer.  Every kind of record is one row of the table `docs`:
 *    col = what it is ("products", "orders" ...)   id = its id   data = all its fields as JSON
 * The functions below (list / get / put / remove / find / mutate / create / placeOrder) are the ONLY place that talks to MySQL.
 * Everything else in the project calls these functions.
 */
class StockError extends Exception {
    public string $kind; public int $available;
    public function __construct(string $kind, string $message, int $available = 0) { parent::__construct($message); $this->kind = $kind; $this->available = $available; }
}

class Db {
    private static ?PDO $pdo = null;

    /** Fields copied into the indexed columns k1,k2,k3 so we can search by them quickly. */
    private const INDEX = [
        'orders'    => ['phone', 'orderNo', 'paymentRef'],
        'customers' => ['status'],
        'riders'    => ['phone'],
        'employees' => ['phone'],
    ];

    public static function pdo(): PDO {
        if (self::$pdo) return self::$pdo;
        $c = cfg();
        try {
            self::$pdo = new PDO(
                'mysql:host=' . $c['db_host'] . ';dbname=' . $c['db_name'] . ';charset=utf8mb4',
                $c['db_user'], $c['db_pass'],
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]
            );
        } catch (PDOException $e) {
            error_log('[db] connect failed: ' . $e->getMessage());
            throw new ApiError(503, 'The database is not reachable. Check db_host, db_name, db_user and db_pass in api/config.php.');
        }
        self::$pdo->exec("SET time_zone = '+00:00'");
        self::ensureTables();
        return self::$pdo;
    }

    /** Creates the two tables the first time (so you do not even have to import schema.sql). */
    private static function ensureTables(): void {
        static $done = false; if ($done) return; $done = true;
        $sql = file_get_contents(__DIR__ . '/../schema.sql');
        if ($sql === false) return;
        foreach (array_filter(array_map('trim', explode(';', preg_replace('/^--.*$/m', '', $sql)))) as $stmt) {
            if ($stmt !== '') self::$pdo->exec($stmt);
        }
    }

    private static function keys(string $col, array $doc): array {
        $f = self::INDEX[$col] ?? [];
        $k = [];
        for ($i = 0; $i < 3; $i++) {
            $v = isset($f[$i]) ? ($doc[$f[$i]] ?? null) : null;
            $k[$i] = ($v === null || $v === '' || is_array($v)) ? null : substr((string)$v, 0, 100);
        }
        return $k;
    }

    private static function decode(array $row): array {
        $d = json_decode($row['data'], true) ?: [];
        $d['id'] = $row['id'];
        return $d;
    }
    private static function encode(array $doc): string {
        return json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
    private static function write(string $col, string $id, array $doc, bool $insertOnly = false): void {
        $doc['id'] = $id;
        [$k1, $k2, $k3] = self::keys($col, $doc);
        $now = gmdate('Y-m-d H:i:s');
        $sql = $insertOnly
            ? 'INSERT INTO docs (col,id,data,k1,k2,k3,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)'
            : 'INSERT INTO docs (col,id,data,k1,k2,k3,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE data=VALUES(data), k1=VALUES(k1), k2=VALUES(k2), k3=VALUES(k3), updated_at=VALUES(updated_at)';
        self::pdo()->prepare($sql)->execute([$col, $id, self::encode($doc), $k1, $k2, $k3, $now, $now]);
    }

    /* ---------- the simple operations ---------- */

    public static function list(string $col): array {
        $st = self::pdo()->prepare('SELECT id, data FROM docs WHERE col = ?');
        $st->execute([$col]);
        return array_map([self::class, 'decode'], $st->fetchAll());
    }
    public static function get(string $col, string $id): ?array {
        $st = self::pdo()->prepare('SELECT id, data FROM docs WHERE col = ? AND id = ?');
        $st->execute([$col, $id]);
        $row = $st->fetch();
        return $row ? self::decode($row) : null;
    }
    public static function put(string $col, string $id, array $doc): array {
        self::write($col, $id, $doc);
        $doc['id'] = $id;
        return $doc;
    }
    public static function remove(string $col, string $id): void {
        self::pdo()->prepare('DELETE FROM docs WHERE col = ? AND id = ?')->execute([$col, $id]);
    }
    /** All records of `col` whose `field` equals `value`. Uses the fast index when the field is indexed. */
    public static function find(string $col, string $field, $value): array {
        $idx = array_search($field, self::INDEX[$col] ?? [], true);
        if ($idx !== false) {
            $st = self::pdo()->prepare('SELECT id, data FROM docs WHERE col = ? AND k' . ($idx + 1) . ' = ?');
            $st->execute([$col, (string)$value]);
            return array_map([self::class, 'decode'], $st->fetchAll());
        }
        return array_values(array_filter(self::list($col), fn($d) => array_key_exists($field, $d) && $d[$field] === $value));
    }

    /**
     * Safe change of ONE record: it is locked, $fn receives the current record (or null) and returns the new one.
     * Returning null writes nothing. Two visitors changing the same record at the same moment can never overwrite each other.
     */
    public static function mutate(string $col, string $id, callable $fn): ?array {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $st = $pdo->prepare('SELECT id, data FROM docs WHERE col = ? AND id = ? FOR UPDATE');
            $st->execute([$col, $id]);
            $row = $st->fetch();
            $next = $fn($row ? self::decode($row) : null);
            if ($next === null) { $pdo->commit(); return null; }
            $next['id'] = $id;
            self::write($col, $id, $next);
            $pdo->commit();
            return $next;
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    }

    /** Create a record only if it does not exist yet. Returns false when it already existed. */
    public static function create(string $col, string $id, array $doc): bool {
        try { self::write($col, $id, $doc, true); return true; }
        catch (PDOException $e) { if (($e->errorInfo[1] ?? 0) === 1062) return false; throw $e; }
    }

    /**
     * Placing an order = ONE all-or-nothing step: check stock, reduce stock, save the order.
     * If two customers want the last item, the database lock makes the second one wait and then fail politely.
     * Returns ['order' => ..., 'duplicate' => bool]. Throws StockError.
     */
    public static function placeOrder(array $order, array $lines): array {
        $pdo = self::pdo();
        $pdo->beginTransaction();
        try {
            $st = $pdo->prepare("SELECT id, data FROM docs WHERE col='orders' AND id = ? FOR UPDATE");
            $st->execute([$order['id']]);
            if ($row = $st->fetch()) { $pdo->commit(); return ['order' => self::decode($row), 'duplicate' => true]; }

            $ids = array_values(array_unique(array_map(fn($l) => $l['id'], $lines)));
            sort($ids);                                       // always lock in the same order: no deadlocks
            $products = [];
            foreach ($ids as $pid) {
                $ps = $pdo->prepare("SELECT id, data FROM docs WHERE col='products' AND id = ? FOR UPDATE");
                $ps->execute([$pid]);
                $products[$pid] = ($r = $ps->fetch()) ? self::decode($r) : null;
            }
            foreach (plan_stock($products, $lines, now_iso()) as $u) {
                self::write('products', $u['id'], array_merge($products[$u['id']], $u['patch']));
            }
            self::write('orders', $order['id'], $order, true);
            $pdo->commit();
            $order['id'] = $order['id'];
            return ['order' => $order, 'duplicate' => false];
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    }
}

/** Thin wrappers with the names used in the rest of the code. */
function db_list(string $c): array { return Db::list($c); }
function db_get(string $c, string $id): ?array { return Db::get($c, $id); }
function db_put(string $c, array $doc): array { return Db::put($c, $doc['id'], $doc); }
function db_remove(string $c, string $id): void { Db::remove($c, $id); }
function db_find(string $c, string $f, $v): array { return Db::find($c, $f, $v); }
function db_update(string $c, string $id, array $patch): ?array { return Db::mutate($c, $id, fn($cur) => $cur ? array_merge($cur, $patch) : null); }
function db_mutate(string $c, string $id, callable $fn): ?array { return Db::mutate($c, $id, $fn); }
function db_create(string $c, array $doc): bool { return Db::create($c, $doc['id'], $doc); }
