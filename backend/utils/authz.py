from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from models.db import get_db


def _fetch_user(user_id):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''SELECT u.id, u.name, u.email, u.role,
                      COALESCE(u.is_active, TRUE),
                      sp.department, sp.jurisdiction
               FROM users u
               LEFT JOIN staff_profiles sp ON sp.user_id = u.id
               WHERE u.id = %s''',
            (user_id,)
        )
        row = cur.fetchone()
        if not row:
            return None

        return {
            'id': row[0],
            'name': row[1],
            'email': row[2],
            'role': row[3],
            'is_active': row[4],
            'department': row[5],
            'jurisdiction': row[6],
        }
    finally:
        cur.close()
        conn.close()


def get_current_user():
    identity = get_jwt_identity()
    if identity is None:
        return None
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    return _fetch_user(user_id)


def roles_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = get_current_user()
            if not user:
                return jsonify({'error': 'User not found'}), 401
            if not user.get('is_active', True):
                return jsonify({'error': 'Account is disabled'}), 403
            if user['role'] not in allowed_roles:
                return jsonify({'error': 'Forbidden'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def staff_can_manage_report(user, report_department, report_jurisdiction):
    if user['role'] == 'admin':
        return True
    if user['role'] != 'staff':
        return False

    user_department = (user.get('department') or '').strip().lower()
    report_department = (report_department or '').strip().lower()

    user_jurisdiction_raw = user.get('jurisdiction') or ''
    user_jurisdictions = [j.strip().lower() for j in user_jurisdiction_raw.split(',') if j.strip()]
    report_jurisdiction = (report_jurisdiction or '').strip().lower()

    department_ok = (not user_department) or (not report_department) or (user_department == report_department)
    jurisdiction_ok = (not user_jurisdictions) or (not report_jurisdiction) or (report_jurisdiction in user_jurisdictions)

    return department_ok and jurisdiction_ok


def token_is_revoked(jti):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('SELECT 1 FROM token_blocklist WHERE jti = %s', (jti,))
        return cur.fetchone() is not None
    finally:
        cur.close()
        conn.close()


def revoke_token(jti, token_type, user_id, expires_at):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''INSERT INTO token_blocklist (jti, token_type, user_id, expires_at)
               VALUES (%s, %s, %s, to_timestamp(%s))
               ON CONFLICT (jti) DO NOTHING''',
            (jti, token_type, user_id, expires_at)
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def build_token_claims(user):
    return {
        'role': user['role'],
        'department': user.get('department'),
        'jurisdiction': user.get('jurisdiction'),
    }
