-- 004_create_monitor_tasks.sql
CREATE TABLE IF NOT EXISTS monitor_tasks (
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
