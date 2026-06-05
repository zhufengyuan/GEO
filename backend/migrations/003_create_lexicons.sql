-- 003_create_lexicons.sql
-- 新的 lexicons 主表（替代 geo_ui_saves 中 page='question-bank' 的记录）
CREATE TABLE IF NOT EXISTS lexicons (
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
