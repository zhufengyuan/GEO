SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS publish_records;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS geo_ui_saves;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS enterprise_image_categories;
DROP TABLE IF EXISTS enterprise_docs;
DROP TABLE IF EXISTS article_links;
DROP TABLE IF EXISTS question_words;
DROP TABLE IF EXISTS lexicons;
DROP TABLE IF EXISTS knowledge_base_sections;
DROP TABLE IF EXISTS enterprise_images;
DROP TABLE IF EXISTS enterprise_base_info;
DROP TABLE IF EXISTS monitor_tasks;
DROP TABLE IF EXISTS consumption_details;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS user_tenant;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS user_enterprise;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(100),
  is_real_name_verified TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_enterprise (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  enterprise_id BIGINT,
  role VARCHAR(20) DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE subscriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  plan_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  price DECIMAL(10,2),
  quota_articles INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO plans (id, name, price, quota_articles) VALUES
('basic', '基础版', 199.00, 50),
('pro', '专业版', 599.00, 200),
('enterprise', '企业版', 1999.00, 9999);

CREATE TABLE lexicons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(200),
  company VARCHAR(200),
  industry_keyword VARCHAR(200),
  decision_stage VARCHAR(50),
  words JSON,
  expand_words TEXT,
  question_keyword VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE question_words (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  lexicon_id BIGINT NOT NULL,
  enterprise_id BIGINT NULL,
  seq_no INT DEFAULT 1,
  question_text VARCHAR(255) NOT NULL,
  gen_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lexicon (lexicon_id),
  INDEX idx_enterprise (enterprise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE monitor_tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  enterprise_id BIGINT,
  keyword VARCHAR(300) NOT NULL,
  platforms JSON,
  status VARCHAR(20) DEFAULT 'active',
  last_run_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tenants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  industry VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_tenant (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  tenant_id BIGINT NOT NULL,
  role VARCHAR(20) DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE enterprise_base_info (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_full_name VARCHAR(255) NULL,
  enterprise_short_name VARCHAR(255) NULL,
  enterprise_address VARCHAR(512) NULL,
  enterprise_contact VARCHAR(512) NULL,
  main_products VARCHAR(512) NULL,
  target_customers VARCHAR(512) NULL,
  enterprise_website VARCHAR(512) NULL,
  founded_time VARCHAR(128) NULL,
  industry VARCHAR(255) NULL,
  industry_position VARCHAR(255) NULL,
  sales_region VARCHAR(512) NULL,
  sales_channel VARCHAR(512) NULL,
  service_response_time VARCHAR(128) NULL,
  delivery_time VARCHAR(128) NULL,
  repurchase_rate VARCHAR(128) NULL,
  positive_rate VARCHAR(128) NULL,
  total_revenue VARCHAR(128) NULL,
  employee_count VARCHAR(128) NULL,
  site_area VARCHAR(128) NULL,
  enterprise_advantage VARCHAR(512) NULL,
  product_advantage VARCHAR(512) NULL,
  tech_advantage VARCHAR(512) NULL,
  management_advantage VARCHAR(512) NULL,
  vision VARCHAR(255) NULL,
  purpose VARCHAR(255) NULL,
  mission VARCHAR(255) NULL,
  product_service_advantages LONGTEXT NULL,
  certificates_honors LONGTEXT NULL,
  key_clients LONGTEXT NULL,
  payload_json LONGTEXT NULL,
  development_history LONGTEXT NULL,
  honors LONGTEXT NULL,
  major_events LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE knowledge_base_sections (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  section VARCHAR(50) NOT NULL,
  content LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_section (user_id, section),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE articles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NULL,
  article_type VARCHAR(50) NULL,
  creation_type VARCHAR(50) NULL,
  style VARCHAR(50) NULL,
  tone VARCHAR(50) NULL,
  brand_embed TINYINT(1) DEFAULT 0,
  review_status TINYINT(1) DEFAULT 0,
  reviewed_at DATETIME NULL,
  enterprise_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE geo_ui_saves (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  page VARCHAR(128) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id BIGINT NULL,
  product_name VARCHAR(200) NOT NULL,
  core_function TEXT NULL,
  advantages TEXT NULL,
  specs TEXT NULL,
  material VARCHAR(200) NULL,
  craft VARCHAR(200) NULL,
  origin VARCHAR(100) NULL,
  use_scene TEXT NULL,
  target_group VARCHAR(200) NULL,
  delivery VARCHAR(100) NULL,
  others TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE product_images (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  image_url VARCHAR(1024) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_sort (product_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE enterprise_image_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id BIGINT NULL,
  category VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE enterprise_docs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id BIGINT NULL,
  doc_name VARCHAR(300) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE article_links (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id BIGINT NULL,
  url VARCHAR(500) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE publish_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  article_id BIGINT NOT NULL,
  platform_code VARCHAR(50) NOT NULL,
  link_url VARCHAR(1024) NULL,
  publish_count INT DEFAULT 0,
  last_publish_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_article_platform (article_id, platform_code),
  INDEX idx_article (article_id),
  INDEX idx_last_publish (last_publish_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE consumption_details (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_type VARCHAR(50) NOT NULL,
  page VARCHAR(128) NULL,
  action VARCHAR(128) NULL,
  units INT NULL,
  amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'CNY',
  meta_json LONGTEXT NULL,
  INDEX idx_event (event_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE enterprise_images (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id BIGINT NULL,
  category VARCHAR(100) DEFAULT 'default',
  image_url VARCHAR(512) NOT NULL,
  file_name VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_enterprise (enterprise_id),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (id, phone, password_hash, real_name, is_real_name_verified)
SELECT 1, 'dev', '', 'dev', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1);

SET FOREIGN_KEY_CHECKS=1;
