import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
import os
import math
import datetime
from pathlib import Path
from backend.config import settings

_DEFAULT_XLSX = (Path(__file__).resolve().parents[2] / 'data' / '数据统计_测试数据.xlsx').as_posix()
XLSX_PATH = str(getattr(settings, 'DATA_STATS_EXCEL', '') or _DEFAULT_XLSX)


def _to_scalar(v):
    if v is None:
        return ''
    if isinstance(v, float) and math.isnan(v):
        return ''
    if isinstance(v, (datetime.datetime, datetime.date)):
        return str(v)
    if isinstance(v, pd.Timestamp):
        try:
            return str(v.to_pydatetime())
        except Exception:
            return str(v)
    if isinstance(v, np.integer):
        return str(int(v))
    if isinstance(v, np.floating):
        if math.isnan(v):
            return ''
        return str(float(v))
    if isinstance(v, np.bool_):
        return str(bool(v))
    return str(v)


def _clean_header(x):
    if x is None:
        return ''
    s = str(x).strip()
    if s.lower() == 'nan':
        return ''
    s = s.replace('\r', ' ').replace('\n', ' ').replace('\t', ' ')
    s = ' '.join(s.split())
    return s


def _read_sheet_header2(path, sheet):
    try:
        df0 = pd.read_excel(path, sheet_name=sheet, header=None)
    except Exception:
        return None
    if df0 is None or len(df0) < 2:
        return None
    header = [_clean_header(x) for x in df0.iloc[1].values]
    keep = [i for i, h in enumerate(header) if h]
    if not keep:
        return None
    df = df0.iloc[2:, keep].copy()
    df.columns = [header[i] for i in keep]
    seen = {}
    new_cols = []
    for c in df.columns:
        if c in seen:
            seen[c] += 1
            new_cols.append(c + '_' + str(seen[c]))
        else:
            seen[c] = 0
            new_cols.append(c)
    df.columns = new_cols
    mask = df.apply(lambda row: any(str(v).strip() != '' and not (isinstance(v, float) and math.isnan(v)) for v in row), axis=1)
    df = df[mask].reset_index(drop=True)
    return df


def _to_row_list(df, n=200):
    if df is None or len(df) == 0:
        return []
    df2 = df.head(n)
    out = []
    for _, row in df2.iterrows():
        r = {}
        for col in df2.columns:
            r[col] = _to_scalar(row[col])
        out.append(r)
    return out


def _find_col(cols, patterns):
    for p in patterns:
        for c in cols:
            if p.lower() in c.lower():
                return c
    return None


def read_data_stats_excel(xlsx_path=None):
    path = xlsx_path or XLSX_PATH
    empty = {'ts': 0, 'file': '', 'sheets': [], 'summary': [], 'column_stats': [], 'kpi': {'articles': 0, 'links': 0, 'indexed': 0, 'cited': 0}, 'trend': []}
    if not os.path.exists(path):
        return empty
    try:
        xls = pd.ExcelFile(path)
    except Exception as e:
        print('[DataStats] Failed:', e)
        return empty

    sheet_out = []
    summary_rows = []
    colstat_rows = []
    trend_rows = []
    trend_found = False
    kpi_articles = 0
    kpi_indexed = 0

    for sheet_name in xls.sheet_names:
        df = _read_sheet_header2(path, sheet_name)
        if df is None:
            continue
        rn = len(df)
        cn = len(df.columns)
        cols = list(df.columns)
        summary_rows.append({'sheet': str(sheet_name), 'rows': rn, 'cols': cn})
        for col in cols:
            v = df[col]
            vs = [_to_scalar(x) for x in v]
            non_empty = sum(1 for s in vs if s.strip())
            unique_vals = set(s for s in vs if s.strip())
            uniq = len(unique_vals)
            ex = ''
            if non_empty > 0:
                for s in vs:
                    if s.strip():
                        ex = s
                        break
            colstat_rows.append({'sheet': str(sheet_name), 'column': str(col), 'non_empty': non_empty, 'unique': uniq, 'example': ex})
        sheet_out.append({'name': str(sheet_name), 'rows': rn, 'cols': cols, 'preview': _to_row_list(df, 200)})
        if not trend_found and cn > 0:
            date_col = _find_col(cols, ['日期', '时间', 'date'])
            art_col = _find_col(cols, ['文章', '发文', '生成'])
            idx_col = _find_col(cols, ['收录', '索引', 'indexed'])
            if date_col and art_col and idx_col:
                try:
                    d0 = df[date_col]
                    d = pd.to_datetime(d0, errors='coerce')
                    a = pd.to_numeric(df[art_col], errors='coerce').fillna(0)
                    i = pd.to_numeric(df[idx_col], errors='coerce').fillna(0)
                    mask = d.notna()
                    if mask.any():
                        valid = pd.DataFrame({'date': d[mask].dt.strftime('%Y-%m-%d'), 'articles': a[mask], 'indexed': i[mask]})
                        agg = valid.groupby('date', sort=True).agg({'articles': 'sum', 'indexed': 'sum'}).reset_index()
                        for _, row in agg.iterrows():
                            trend_rows.append({'date': str(row['date']), 'articles': float(row['articles']), 'indexed': float(row['indexed'])})
                        kpi_articles = float(agg['articles'].sum())
                        kpi_indexed = float(agg['indexed'].sum())
                        trend_found = True
                except Exception:
                    pass

    import time
    return {'ts': time.time() * 1000, 'file': '数据统计_测试数据.xlsx', 'sheets': sheet_out, 'summary': summary_rows, 'column_stats': colstat_rows, 'kpi': {'articles': kpi_articles, 'links': len(sheet_out), 'indexed': kpi_indexed, 'cited': 0}, 'trend': trend_rows}


def get_data_stats_summary(xlsx_path=None):
    path = xlsx_path or XLSX_PATH
    if not os.path.exists(path):
        return {'sheets': 0, 'total_rows': 0, 'sheet_names': []}
    try:
        xls = pd.ExcelFile(path)
        total = 0
        for s in xls.sheet_names:
            df = _read_sheet_header2(path, s)
            total += len(df) if df is not None else 0
        return {'sheets': len(xls.sheet_names), 'total_rows': total, 'sheet_names': list(xls.sheet_names)}
    except Exception as e:
        print('[DataStats] Summary error:', e)
        return {'sheets': 0, 'total_rows': 0, 'sheet_names': []}
