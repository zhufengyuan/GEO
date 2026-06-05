"""
数据库连接池（PyMySQL + dbutils）
对应 R 代码中的 DBI::dbConnect(RMySQL::MySQL(), ...)
"""
import pymysql
from pymysql.cursors import DictCursor
from backend.config import settings
from pathlib import Path

try:
    from dbutils.pooled_db import PooledDB  # type: ignore
except Exception:
    PooledDB = None

_pool = None

def get_db_config():
    return {
        "host": settings.DB_HOST,
        "user": settings.DB_USER,
        "password": settings.DB_PASSWORD,
        "database": settings.DB_NAME,
        "port": settings.DB_PORT,
        "charset": settings.DB_CHARSET,
        "autocommit": True,
    }

def init_pool():
    global _pool
    if _pool is not None:
        return _pool
    if PooledDB is None:
        _pool = None
        return None
    cfg = get_db_config()
    _pool = PooledDB(
        creator=pymysql,
        maxconnections=20,
        mincached=2,
        maxcached=5,
        **cfg
    )
    return _pool

def get_conn():
    """获取一个数据库连接（从连接池）"""
    pool = init_pool()
    if pool is None:
        return pymysql.connect(**get_db_config())
    return pool.connection()

def query(sql: str, params: list = None, conn=None):
    """执行 SELECT，返回 list[dict]"""
    should_close = conn is None
    conn = conn or get_conn()
    try:
        with conn.cursor(DictCursor) as cur:
            cur.execute(sql, params or [])
            return cur.fetchall()
    finally:
        if should_close:
            conn.close()

def query_row(sql: str, params: list = None, conn=None):
    """执行 SELECT，返回单个 dict 或 None"""
    rows = query(sql, params, conn)
    return rows[0] if rows else None

def execute(sql: str, params: list = None, conn=None):
    """执行 INSERT/UPDATE/DELETE，返回受影响的行数"""
    should_close = conn is None
    conn = conn or get_conn()
    try:
        with conn.cursor() as cur:
            return cur.execute(sql, params or [])
    finally:
        if should_close:
            conn.close()

def insert(sql: str, params: list = None, conn=None):
    """执行 INSERT，返回 lastrowid"""
    should_close = conn is None
    conn = conn or get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            return cur.lastrowid
    finally:
        if should_close:
            conn.close()

def insert_many(sql: str, params_list: list, conn=None):
    """批量 INSERT，返回成功插入的行数"""
    should_close = conn is None
    conn = conn or get_conn()
    try:
        with conn.cursor() as cur:
            return cur.executemany(sql, params_list or [])
    finally:
        if should_close:
            conn.close()


def apply_migrations():
    migrations_dir = Path(__file__).parent / "migrations"
    if not migrations_dir.exists():
        return
    files = sorted([p for p in migrations_dir.glob("*.sql")])
    if not files:
        return
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            for fp in files:
                sql = fp.read_text(encoding="utf-8")
                lines = []
                for line in sql.splitlines():
                    s = line.strip()
                    if not s or s.startswith("--"):
                        continue
                    lines.append(line)
                cleaned = "\n".join(lines)
                for stmt in cleaned.split(";"):
                    st = stmt.strip()
                    if not st:
                        continue
                    cur.execute(st)
    finally:
        conn.close()
