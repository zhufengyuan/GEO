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

