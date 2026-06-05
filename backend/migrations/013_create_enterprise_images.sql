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

