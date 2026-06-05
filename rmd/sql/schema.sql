CREATE TABLE IF NOT EXISTS geo_ui_saves (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  page VARCHAR(128) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enterprise_base_info (
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

CREATE TABLE IF NOT EXISTS articles (
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

CREATE TABLE IF NOT EXISTS publish_records (
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

CREATE TABLE IF NOT EXISTS products (
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

CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  image_url VARCHAR(1024) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_sort (product_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enterprise_images (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id BIGINT NULL,
  category VARCHAR(100) DEFAULT 'default',
  image_url VARCHAR(512) NOT NULL,
  file_name VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_enterprise (enterprise_id),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enterprise_image_categories (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id BIGINT NULL,
  category VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enterprise_docs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id BIGINT NULL,
  doc_name VARCHAR(300) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS article_links (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  enterprise_id BIGINT NULL,
  url VARCHAR(500) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS question_words (
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

CREATE TABLE IF NOT EXISTS consumption_details (
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
