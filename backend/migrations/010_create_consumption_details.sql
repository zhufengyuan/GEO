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

