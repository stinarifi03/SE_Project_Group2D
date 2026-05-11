import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_db():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    return conn


def init_schema():
    """Best-effort schema bootstrap for newly added features."""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_required BOOLEAN DEFAULT FALSE")

        cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS department TEXT")
        cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS jurisdiction TEXT")
        cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()")
        cur.execute("ALTER TABLE reports ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP")

        cur.execute(
            '''CREATE TABLE IF NOT EXISTS staff_profiles (
                   user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                   department TEXT,
                   jurisdiction TEXT,
                   created_at TIMESTAMP DEFAULT NOW()
               )'''
        )

        cur.execute(
            '''CREATE TABLE IF NOT EXISTS token_blocklist (
                   jti TEXT PRIMARY KEY,
                   token_type TEXT NOT NULL,
                   user_id INTEGER,
                   expires_at TIMESTAMP,
                   created_at TIMESTAMP DEFAULT NOW()
               )'''
        )

        cur.execute(
            '''CREATE TABLE IF NOT EXISTS report_images (
                   id SERIAL PRIMARY KEY,
                   report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                   uploaded_by INTEGER REFERENCES users(id),
                   stage TEXT NOT NULL,
                   image_url TEXT NOT NULL,
                   created_at TIMESTAMP DEFAULT NOW()
               )'''
        )

        cur.execute(
            '''CREATE TABLE IF NOT EXISTS report_activity (
                   id SERIAL PRIMARY KEY,
                   report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                   actor_id INTEGER REFERENCES users(id),
                   actor_role TEXT,
                   action TEXT NOT NULL,
                   detail TEXT,
                   created_at TIMESTAMP DEFAULT NOW()
               )'''
        )

        cur.execute(

'''CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                sent_at TIMESTAMP DEFAULT NOW()
              )'''
        )

        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, sent_at DESC)"
        )

        cur.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS department TEXT")

        cur.execute(
            '''CREATE TABLE IF NOT EXISTS departments (
                   id SERIAL PRIMARY KEY,
                   name TEXT NOT NULL UNIQUE
               )'''
        )
        cur.execute("SELECT COUNT(*) FROM departments")
        if cur.fetchone()[0] == 0:
            for dept in ('Roads', 'Electricity', 'Sanitation', 'Parks', 'Other'):
                cur.execute("INSERT INTO departments (name) VALUES (%s) ON CONFLICT DO NOTHING", (dept,))

        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC)"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_report_activity_report_id ON report_activity(report_id, created_at DESC)"
        )
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_report_images_report_id ON report_images(report_id, created_at DESC)"
        )

        conn.commit()
    finally:
        cur.close()
        conn.close()