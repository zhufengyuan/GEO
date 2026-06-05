CREATE TABLE IF NOT EXISTS publish_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    article_id BIGINT NOT NULL,
    platform_code VARCHAR(50) NOT NULL,
    publish_count INT DEFAULT 0,
    last_publish_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_article_platform (article_id, platform_code),
    INDEX idx_article (article_id),
    INDEX idx_last_publish (last_publish_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

