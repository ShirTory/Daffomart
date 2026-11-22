-- DaffoMart database (MySQL 5.7+ / MariaDB 10.3+).  Import this in phpMyAdmin, or let the API create it on the first request.
-- Every kind of record (products, orders, settings ...) is one row in `docs`: `col` says what it is, `data` holds the details as JSON.
-- k1..k3 are copies of fields we search by (for example an order's phone number), so searches stay fast.
CREATE TABLE IF NOT EXISTS docs (
  col        VARCHAR(40)  NOT NULL,
  id         VARCHAR(100) NOT NULL,
  data       LONGTEXT     NOT NULL,
  k1         VARCHAR(100) NULL,
  k2         VARCHAR(100) NULL,
  k3         VARCHAR(100) NULL,
  created_at DATETIME     NOT NULL,
  updated_at DATETIME     NOT NULL,
  PRIMARY KEY (col, id),
  KEY idx_k1 (col, k1),
  KEY idx_k2 (col, k2),
  KEY idx_k3 (col, k3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- counts requests per visitor to slow down abuse (login guessing, order spam)
CREATE TABLE IF NOT EXISTS rate_limits (
  k        VARCHAR(160) NOT NULL PRIMARY KEY,
  n        INT          NOT NULL,
  reset_at INT          NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
