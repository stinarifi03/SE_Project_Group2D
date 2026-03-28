from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from models.db import get_db
import bcrypt
import secrets

from utils.authz import build_token_claims, revoke_token, roles_required

auth_bp = Blueprint('auth', __name__)


def _fetch_user_for_identity(user_id):
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

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response, 200

    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400

    name = name.strip()
    email = email.strip().lower()
    password = password.strip()

    if '@' not in email or '.' not in email.split('@')[-1]:
        return jsonify({'error': 'Invalid email format'}), 400

    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    if len(name) < 2:
        return jsonify({'error': 'Name must be at least 2 characters'}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s) RETURNING id, name, email, role',
            (name, email, hashed, 'citizen')
        )
        user = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        user_payload = {
            'id': user[0],
            'name': user[1],
            'email': user[2],
            'role': user[3],
            'department': None,
            'jurisdiction': None,
        }
        access_token = create_access_token(
            identity=str(user[0]),
            additional_claims=build_token_claims(user_payload)
        )
        refresh_token = create_refresh_token(identity=str(user[0]))
        return jsonify({
            'token': access_token,
            'refresh_token': refresh_token,
            'role': user[3],
            'name': user[1],
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        if 'UniqueViolation' in type(e).__name__ or 'unique' in str(e).lower():
            return jsonify({'error': 'Email already exists'}), 409
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response, 200

    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    # Validate fields are present
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            '''SELECT u.id, u.name, u.email, u.password, u.role,
                      COALESCE(u.is_active, TRUE),
                      sp.department, sp.jurisdiction
               FROM users u
               LEFT JOIN staff_profiles sp ON sp.user_id = u.id
               WHERE u.email = %s''',
            (email,)
        )
        user = cur.fetchone()
        cur.close()
        conn.close()

        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401

        if not user[5]:
            return jsonify({'error': 'Account disabled. Contact an administrator.'}), 403

        if not bcrypt.checkpw(password.encode('utf-8'), user[3].encode('utf-8')):
            return jsonify({'error': 'Invalid credentials'}), 401

        user_payload = {
            'id': user[0],
            'name': user[1],
            'email': user[2],
            'role': user[4],
            'department': user[6],
            'jurisdiction': user[7],
        }
        access_token = create_access_token(
            identity=str(user[0]),
            additional_claims=build_token_claims(user_payload)
        )
        refresh_token = create_refresh_token(identity=str(user[0]))
        return jsonify({
            'token': access_token,
            'refresh_token': refresh_token,
            'role': user[4],
            'name': user[1],
            'department': user[6],
            'jurisdiction': user[7],
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_access_token():
    identity = get_jwt_identity()
    try:
        user = _fetch_user_for_identity(int(identity))
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if not user.get('is_active', True):
            return jsonify({'error': 'Account disabled'}), 403

        access_token = create_access_token(
            identity=str(user['id']),
            additional_claims=build_token_claims(user)
        )
        return jsonify({'token': access_token}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required(verify_type=False)
def logout():
    claims = get_jwt()
    identity = get_jwt_identity()
    jti = claims.get('jti')
    token_type = claims.get('type', 'access')
    exp = claims.get('exp')
    try:
        revoke_token(jti, token_type, int(identity), exp)
        return jsonify({'message': 'Logged out'}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/admin/reset-password/<int:user_id>', methods=['POST'])
@roles_required('admin')
def reset_password(user_id):
    """Temporary helper endpoint for password reset during staged rollout."""
    data = request.get_json() or {}
    new_password = data.get('new_password') or secrets.token_urlsafe(10)
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            'UPDATE users SET password = %s, reset_required = TRUE WHERE id = %s',
            (hashed, user_id)
        )
        conn.commit()
        return jsonify({'message': 'Password reset', 'temporary_password': new_password}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()