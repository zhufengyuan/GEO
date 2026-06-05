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
