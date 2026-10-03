CREATE DATABASE IF NOT EXISTS guardian_core
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE guardian_core;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin','Store Officer','Unit Commander','Viewer') NOT NULL DEFAULT 'Viewer',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  category VARCHAR(100) NOT NULL,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_stock INT NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  unit VARCHAR(40) NOT NULL DEFAULT 'units',
  condition_status ENUM('Available','Damaged','Under Maintenance') NOT NULL DEFAULT 'Available',
  location_label VARCHAR(120) NOT NULL DEFAULT 'Demo Store A',
  expiry_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  contact VARCHAR(100) DEFAULT '',
  email VARCHAR(190) DEFAULT '',
  address VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  user_id INT NULL,
  transaction_type ENUM('Received','Issued','Adjustment') NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  note VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  unit_label VARCHAR(120) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  allocation_date DATE NOT NULL,
  status ENUM('Allocated','Returned') NOT NULL DEFAULT 'Allocated',
  note VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS maintenance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  maintenance_type VARCHAR(120) NOT NULL,
  due_date DATE NULL,
  status ENUM('Scheduled','In Progress','Completed') NOT NULL DEFAULT 'Scheduled',
  note VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INT NULL,
  details VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- User account is created by server/seed-admin.js after npm install.

INSERT INTO inventory (name, category, quantity, min_stock, unit, condition_status, location_label)
SELECT 'First Aid Kits', 'Medical Supplies', 40, 10, 'kits', 'Available', 'Demo Store A'
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE name='First Aid Kits');
INSERT INTO inventory (name, category, quantity, min_stock, unit, condition_status, location_label)
SELECT 'Protective Helmets', 'Safety Equipment', 25, 8, 'units', 'Available', 'Demo Store A'
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE name='Protective Helmets');
INSERT INTO inventory (name, category, quantity, min_stock, unit, condition_status, location_label)
SELECT 'Field Uniform Sets', 'Clothing', 60, 15, 'sets', 'Available', 'Demo Store B'
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE name='Field Uniform Sets');
INSERT INTO inventory (name, category, quantity, min_stock, unit, condition_status, location_label)
SELECT 'Batteries', 'Electrical Supplies', 12, 10, 'units', 'Available', 'Demo Store A'
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE name='Batteries');
