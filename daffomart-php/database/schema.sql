-- DaffoMart database  (MySQL / MariaDB)
-- How to use: open phpMyAdmin -> Import -> choose this file.
-- It creates the database "daffomart", the tables and some sample data.

CREATE DATABASE IF NOT EXISTS daffomart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE daffomart;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS rider_applications;

-- 1) users: customers and admin
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2) categories (kind = grocery or medicine)
CREATE TABLE categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  emoji      VARCHAR(16)  NOT NULL DEFAULT '',
  kind       ENUM('grocery','medicine') NOT NULL DEFAULT 'grocery',
  sort_order INT NOT NULL DEFAULT 0,
  active     TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- 3) products
CREATE TABLE products (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id  INT UNSIGNED NOT NULL,
  name         VARCHAR(150) NOT NULL,
  slug         VARCHAR(160) NOT NULL UNIQUE,
  description  TEXT,
  generic_name VARCHAR(150) NOT NULL DEFAULT '',
  price        DECIMAL(10,2) NOT NULL,
  old_price    DECIMAL(10,2) NULL,
  unit         VARCHAR(50)  NOT NULL DEFAULT '',
  emoji        VARCHAR(16)  NOT NULL DEFAULT '',
  image        VARCHAR(100) NULL,
  stock        INT NOT NULL DEFAULT 0,
  featured     TINYINT(1) NOT NULL DEFAULT 0,
  is_rx        TINYINT(1) NOT NULL DEFAULT 0,
  active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

-- 4) orders
CREATE TABLE orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no        VARCHAR(30) NOT NULL UNIQUE,
  user_id         INT UNSIGNED NULL,
  customer_name   VARCHAR(100) NOT NULL,
  phone           VARCHAR(20)  NOT NULL,
  address         TEXT NOT NULL,
  area            ENUM('inside','outside') NOT NULL DEFAULT 'inside',
  note            TEXT,
  subtotal        DECIMAL(10,2) NOT NULL,
  coupon_code     VARCHAR(30) NULL,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_charge DECIMAL(10,2) NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'cod',
  status          ENUM('pending','confirmed','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5) order_items (one row per product in an order; name and price are copied so old orders never change)
CREATE TABLE order_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     INT UNSIGNED NOT NULL,
  product_id   INT UNSIGNED NULL,
  product_name VARCHAR(150) NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  qty          INT NOT NULL,
  line_total   DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6) coupons (promo codes: percent or fixed amount)
CREATE TABLE coupons (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(30) NOT NULL UNIQUE,
  type        ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  value       DECIMAL(10,2) NOT NULL,
  min_order   DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses    INT NULL,                 -- NULL = unlimited
  used_count  INT NOT NULL DEFAULT 0,
  expires_on  DATE NULL,                -- NULL = never expires
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7) rider_applications (people who want to work as delivery riders)
CREATE TABLE rider_applications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20)  NOT NULL,
  area       VARCHAR(100) NOT NULL,
  vehicle    ENUM('bike','cycle','walk') NOT NULL DEFAULT 'bike',
  message    TEXT,
  status     ENUM('new','approved','rejected') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------- sample data ----------------
-- Admin login:  admin@daffomart.test  /  admin123   (CHANGE THIS PASSWORD before going live!)

INSERT INTO users (name, email, phone, password_hash, role) VALUES ('Admin', 'admin@daffomart.test', '', '$2b$12$ITlNw3S9OXFUj650w//xW.WGWwK5iTM3MpJvKE.89taStc1YbMmJu', 'admin');


INSERT INTO categories (name, slug, emoji, kind, sort_order) VALUES
  ('Vegetables','veg','🥦','grocery',1),
  ('Fruits','fruit','🍎','grocery',2),
  ('Fish & Meat','meat','🐟','grocery',3),
  ('Dairy & Eggs','dairy','🥛','grocery',4),
  ('Groceries','grocery','🍚','grocery',5),
  ('Snacks','snacks','🍪','grocery',6),
  ('Medicine (OTC)','med-otc','💊','medicine',50),
  ('Healthcare','med-health','🩺','medicine',51);

-- products: category is looked up by slug
INSERT INTO products (category_id, name, slug, description, generic_name, price, old_price, unit, emoji, stock, featured, is_rx) VALUES
  ((SELECT id FROM categories WHERE slug='veg'),'Fresh Tomato','fresh-tomato','Fresh, quality-checked fresh tomato delivered to your door.','',80,100,'1 kg','🍅',50,1,0),
  ((SELECT id FROM categories WHERE slug='veg'),'Potato','potato','Fresh, quality-checked potato delivered to your door.','',45,NULL,'1 kg','🥔',120,0,0),
  ((SELECT id FROM categories WHERE slug='fruit'),'Apple','apple','Fresh, quality-checked apple delivered to your door.','',280,320,'1 kg','🍎',30,1,0),
  ((SELECT id FROM categories WHERE slug='fruit'),'Banana','banana','Fresh, quality-checked banana delivered to your door.','',70,NULL,'1 dozen','🍌',60,0,0),
  ((SELECT id FROM categories WHERE slug='meat'),'Rohu Fish','rohu-fish','Fresh, quality-checked rohu fish delivered to your door.','',420,NULL,'1 kg','🐟',15,1,0),
  ((SELECT id FROM categories WHERE slug='dairy'),'Fresh Liquid Milk','fresh-milk','Fresh, quality-checked fresh liquid milk delivered to your door.','',90,NULL,'1 L','🥛',80,1,0),
  ((SELECT id FROM categories WHERE slug='dairy'),'Farm Eggs','eggs','Fresh, quality-checked farm eggs delivered to your door.','',150,165,'12 pcs','🥚',0,0,0),
  ((SELECT id FROM categories WHERE slug='grocery'),'Miniket Rice','miniket-rice','Fresh, quality-checked miniket rice delivered to your door.','',78,NULL,'1 kg','🍚',200,1,0),
  ((SELECT id FROM categories WHERE slug='snacks'),'Family Biscuit Pack','biscuit-pack','Fresh, quality-checked family biscuit pack delivered to your door.','',60,NULL,'1 pack','🍪',90,0,0),
  ((SELECT id FROM categories WHERE slug='med-otc'),'Napa 500mg','napa-500mg','Napa 500mg - genuine medicine/health product. Please read the label and use as directed.','Paracetamol',12,NULL,'10 tablets','💊',200,0,0),
  ((SELECT id FROM categories WHERE slug='med-otc'),'Saline Oral (ORS)','saline-ors','Saline Oral (ORS) - genuine medicine/health product. Please read the label and use as directed.','Oral rehydration salt',5,NULL,'1 sachet','🧂',300,0,0),
  ((SELECT id FROM categories WHERE slug='med-health'),'Antiseptic Liquid','antiseptic-liquid','Antiseptic Liquid - genuine medicine/health product. Please read the label and use as directed.','Antiseptic',120,NULL,'100 ml','🧴',60,0,0),
  ((SELECT id FROM categories WHERE slug='med-health'),'Vitamin C 500mg','vitamin-c-500','Vitamin C 500mg - genuine medicine/health product. Please read the label and use as directed.','Ascorbic acid',150,NULL,'30 tablets','🍊',80,0,0),
  ((SELECT id FROM categories WHERE slug='med-health'),'Digital Thermometer','digital-thermometer','Digital Thermometer - genuine medicine/health product. Please read the label and use as directed.','',250,NULL,'1 pc','🌡️',40,0,0),
  ((SELECT id FROM categories WHERE slug='med-otc'),'Amoxicillin 500mg','amoxicillin-500','Amoxicillin 500mg - genuine medicine/health product. Please read the label and use as directed.','Amoxicillin',90,NULL,'10 capsules','💊',100,0,1);

-- sample coupons: WELCOME10 = 10% off (min 300 Taka), FLAT50 = 50 Taka off (min 500 Taka)
INSERT INTO coupons (code, type, value, min_order, max_uses) VALUES
  ('WELCOME10','percent',10,300,NULL),
  ('FLAT50','fixed',50,500,100);
