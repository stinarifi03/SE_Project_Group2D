import csv
from datetime import datetime
from io import BytesIO, StringIO
import secrets

from flask import Blueprint, request, jsonify, Response
import bcrypt

from models.db import get_db
from utils.authz import roles_required


admin_bp = Blueprint('admin', __name__)


def _simple_pdf(lines):
    escaped = [line.replace('(', '\\(').replace(')', '\\)') for line in lines]
    content_lines = []
    y = 800
    for line in escaped:
        content_lines.append(f"BT /F1 11 Tf 40 {y} Td ({line}) Tj ET")
        y -= 16
        if y < 60:
            break
    content = '\n'.join(content_lines)

    objects = []
    objects.append('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj')
    objects.append('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj')
    objects.append('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj')
    objects.append(f'4 0 obj << /Length {len(content)} >> stream\n{content}\nendstream endobj')
    objects.append('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj')

    body = ''
    offsets = [0]
    for obj in objects:
        offsets.append(len(body) + len('%PDF-1.4\n'))
        body += obj + '\n'

    xref_start = len('%PDF-1.4\n' + body)
    xref_entries = ['0000000000 65535 f ']
    for off in offsets[1:]:
        xref_entries.append(f'{off:010d} 00000 n ')

    xref = 'xref\n0 6\n' + '\n'.join(xref_entries) + '\n'
    trailer = 'trailer << /Size 6 /Root 1 0 R >>\nstartxref\n' + str(xref_start) + '\n%%EOF'

    pdf = '%PDF-1.4\n' + body + xref + trailer
    return pdf.encode('latin-1', errors='ignore')


@admin_bp.route('/staff', methods=['POST'])
@roles_required('admin')
def create_staff():
    data = request.get_json() or {}
    if not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'name, email and password are required'}), 400

    hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''INSERT INTO users (name, email, password, role, is_active)
               VALUES (%s, %s, %s, %s, TRUE)
               RETURNING id''',
            (data['name'], data['email'], hashed, 'staff')
        )
        user_id = cur.fetchone()[0]
        cur.execute(
            '''INSERT INTO staff_profiles (user_id, department, jurisdiction)
               VALUES (%s, %s, %s)
               ON CONFLICT (user_id) DO UPDATE
               SET department = EXCLUDED.department,
                   jurisdiction = EXCLUDED.jurisdiction''',
            (user_id, data.get('department'), data.get('jurisdiction'))
        )
        conn.commit()
        return jsonify({'message': 'Staff created', 'id': user_id}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/staff', methods=['GET'])
@roles_required('admin')
def get_all_staff():
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''SELECT u.id, u.name, u.email, u.role, u.created_at,
                      COALESCE(u.is_active, TRUE), sp.department, sp.jurisdiction
               FROM users u
               LEFT JOIN staff_profiles sp ON sp.user_id = u.id
               WHERE u.role = 'staff'
               ORDER BY u.created_at DESC'''
        )
        rows = cur.fetchall()
        staff = [
            {
                'id': r[0],
                'name': r[1],
                'email': r[2],
                'role': r[3],
                'created_at': r[4].isoformat() if r[4] else None,
                'is_active': r[5],
                'department': r[6],
                'jurisdiction': r[7],
            }
            for r in rows
        ]
        return jsonify(staff), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/users', methods=['GET'])
@roles_required('admin')
def get_users():
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''SELECT id, name, email, role, COALESCE(is_active, TRUE), created_at
               FROM users
               ORDER BY created_at DESC'''
        )
        rows = cur.fetchall()
        users = [
            {
                'id': r[0],
                'name': r[1],
                'email': r[2],
                'role': r[3],
                'is_active': r[4],
                'created_at': r[5].isoformat() if r[5] else None,
            }
            for r in rows
        ]
        return jsonify(users), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/users/<int:user_id>/disable', methods=['PATCH'])
@roles_required('admin')
def disable_user(user_id):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('UPDATE users SET is_active = FALSE WHERE id = %s', (user_id,))
        conn.commit()
        return jsonify({'message': 'User disabled'}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@roles_required('admin')
def reset_password(user_id):
    temp_password = secrets.token_urlsafe(10)
    hashed = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            'UPDATE users SET password = %s, reset_required = TRUE WHERE id = %s',
            (hashed, user_id)
        )
        conn.commit()
        return jsonify({'message': 'Password reset', 'temporary_password': temp_password}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/stats', methods=['GET'])
@roles_required('admin')
def get_stats():
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM reports")
        total = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM reports WHERE status = 'submitted'")
        submitted = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM reports WHERE status = 'under review'")
        under_review = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM reports WHERE status = 'in progress'")
        in_progress = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM reports WHERE status = 'resolved'")
        resolved = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'citizen'")
        citizens = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'staff'")
        staff = cur.fetchone()[0]

        return jsonify({
            'total_reports': total,
            'submitted': submitted,
            'under_review': under_review,
            'in_progress': in_progress,
            'resolved': resolved,
            'total_citizens': citizens,
            'total_staff': staff
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/analytics/trends', methods=['GET'])
@roles_required('admin')
def get_trends():
    days = int(request.args.get('days', 30))
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''SELECT DATE(created_at) AS day, category, COALESCE(department, 'unassigned'), COUNT(*)
               FROM reports
               WHERE created_at >= NOW() - (%s || ' days')::interval
               GROUP BY day, category, COALESCE(department, 'unassigned')
               ORDER BY day ASC''',
            (days,)
        )
        rows = cur.fetchall()
        data = [
            {
                'day': str(r[0]),
                'category': r[1],
                'department': r[2],
                'count': r[3],
            }
            for r in rows
        ]
        return jsonify(data), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/export/csv', methods=['GET'])
@roles_required('admin')
def export_csv():
    month = request.args.get('month')
    conn = get_db()
    cur = conn.cursor()
    try:
        if month:
            cur.execute(
                '''SELECT id, title, status, category, department, created_at
                   FROM reports
                   WHERE TO_CHAR(created_at, 'YYYY-MM') = %s
                   ORDER BY created_at DESC''',
                (month,)
            )
        else:
            cur.execute(
                '''SELECT id, title, status, category, department, created_at
                   FROM reports
                   ORDER BY created_at DESC'''
            )

        rows = cur.fetchall()
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(['id', 'title', 'status', 'category', 'department', 'created_at'])
        for r in rows:
            writer.writerow([r[0], r[1], r[2], r[3], r[4], r[5].isoformat() if r[5] else None])

        csv_data = output.getvalue()
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=reports_{month or "all"}.csv'}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/export/pdf', methods=['GET'])
@roles_required('admin')
def export_pdf():
    month = request.args.get('month')
    conn = get_db()
    cur = conn.cursor()
    try:
        if month:
            cur.execute(
                '''SELECT id, title, status, category, department, created_at
                   FROM reports
                   WHERE TO_CHAR(created_at, 'YYYY-MM') = %s
                   ORDER BY created_at DESC''',
                (month,)
            )
        else:
            cur.execute(
                '''SELECT id, title, status, category, department, created_at
                   FROM reports
                   ORDER BY created_at DESC'''
            )

        rows = cur.fetchall()
        lines = [f'Urban Issue Tracker Report Export ({month or "all"})']
        lines.append(f'Generated at: {datetime.utcnow().isoformat()} UTC')
        lines.append('')
        for r in rows[:45]:
            lines.append(
                f"#{r[0]} | {r[2]} | {r[3]} | {r[4] or 'unassigned'} | {r[5].strftime('%Y-%m-%d')} | {r[1][:70]}"
            )

        pdf_bytes = _simple_pdf(lines)
        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={'Content-Disposition': f'attachment; filename=reports_{month or "all"}.pdf'}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/categories', methods=['GET'])
@roles_required('admin', 'staff', 'citizen')
def get_categories():
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name FROM categories ORDER BY id")
        rows = cur.fetchall()
        return jsonify([{'id': r[0], 'name': r[1]} for r in rows]), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/categories', methods=['POST'])
@roles_required('admin')
def add_category():
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Category name is required'}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('INSERT INTO categories (name) VALUES (%s) RETURNING id, name', (name,))
        cat = cur.fetchone()
        conn.commit()
        return jsonify({'id': cat[0], 'name': cat[1]}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@admin_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@roles_required('admin')
def delete_category(category_id):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('DELETE FROM categories WHERE id = %s', (category_id,))
        conn.commit()
        return jsonify({'message': 'Category deleted'}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
