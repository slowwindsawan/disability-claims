import os
import sys
import pathlib
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('apply_migration')

try:
    import psycopg2
    from psycopg2 import sql
except Exception as e:
    logger.error('psycopg2 not installed. Please run: pip install -r ../requirements.txt')
    raise


def load_sql_file(path: str) -> str:
    p = pathlib.Path(path)
    if not p.exists():
        raise FileNotFoundError(f"SQL file not found: {path}")
    return p.read_text(encoding='utf-8')


def apply_sql(database_url: str, sql_text: str):
    logger.info('Connecting to database...')
    # psycopg2 can fail if DATABASE_URL contains surrounding quotes
    db_url = database_url.strip()
    if (db_url.startswith('"') and db_url.endswith('"')) or (db_url.startswith("'") and db_url.endswith("'")):
        db_url = db_url[1:-1]

    # If connecting to Supabase, ensure SSL is required
    try:
        from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
        parsed = urlparse(db_url)
        q = dict(parse_qsl(parsed.query))
        if 'sslmode' not in q and parsed.hostname and parsed.hostname.endswith('supabase.co'):
            q['sslmode'] = 'require'
            new_query = urlencode(q)
            parsed = parsed._replace(query=new_query)
            db_url = urlunparse(parsed)
    except Exception:
        # If parsing fails, fall back to original db_url
        logger.debug('Could not parse DATABASE_URL for sslmode injection; using raw value')

    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    try:
        logger.info('Applying migration SQL...')
        cur.execute(sql_text)
        logger.info('Migration applied successfully.')
    finally:
        cur.close()
        conn.close()


def main():
    # Default path to migration file
    base = pathlib.Path(__file__).parent.parent
    
    # Allow overriding migration file via command-line argument
    migration_file = sys.argv[1] if len(sys.argv) > 1 else '001_create_user_tables.sql'
    if not migration_file.endswith('.sql'):
        migration_file = migration_file + '.sql'
    
    mig_path = base / 'db' / 'migrations' / migration_file

    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.error('Environment variable DATABASE_URL is not set. Ensure your .env is present in the backend directory and contains DATABASE_URL.')
        logger.error('You can also export DATABASE_URL in your shell before running this script.')
        sys.exit(2)

    try:
        sql_text = load_sql_file(str(mig_path))
    except Exception as e:
        logger.exception('Failed to read migration file')
        sys.exit(3)

    try:
        apply_sql(database_url, sql_text)
    except Exception:
        logger.exception('Failed to apply migration')
        sys.exit(4)


if __name__ == '__main__':
    main()
