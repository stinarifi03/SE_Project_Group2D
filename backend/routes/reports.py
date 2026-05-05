from datetime import datetime
import os
import secrets

from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from models.db import get_db
from utils.authz import get_current_user, roles_required, staff_can_manage_report
from utils.reporting import compute_sla, parse_pagination


reports_bp = Blueprint('reports', __name__)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _status_allowed(status):
    return status in {'submitted', 'under review', 'in progress', 'resolved', 'cancelled'}


def _serialize_report(row):
    report = {
        'id': row[0],
        'title': row[1],
        'description': row[2],
        'status': row[3],
        'category': row[4],
        'latitude': str(row[5]),
        'longitude': str(row[6]),
        'department': row[7],
        'jurisdiction': row[8],
        'created_at': row[9].isoformat() if row[9] else None,
        'citizen_id': row[10],
        'updated_at': row[11].isoformat() if row[11] else None,
        'cancelled_at': row[12].isoformat() if row[12] else None,
    }
    if row[9]:
        report.update(compute_sla(row[9], row[4], row[3]))
    else:
        report.update({'sla_hours': None, 'sla_due_at': None, 'is_overdue': False})
    return report


def _log_activity(cur, report_id, actor, action, detail=None):
    cur.execute(
        '''INSERT INTO report_activity (report_id, actor_id, actor_role, action, detail)
           VALUES (%s, %s, %s, %s, %s)''',
        (report_id, actor['id'] if actor else None, actor['role'] if actor else None, action, detail)
    )


def _report_images(cur, report_id):
    cur.execute(
        '''SELECT id, image_url, stage, created_at
           FROM report_images
           WHERE report_id = %s
           ORDER BY created_at DESC''',
        (report_id,)
    )
    rows = cur.fetchall()
    return [
        {
            'id': r[0],
            'image_url': r[1],
            'stage': r[2],
            'created_at': r[3].isoformat() if r[3] else None,
        }
        for r in rows
    ]


def _report_activity(cur, report_id):
    cur.execute(
        '''SELECT id, actor_id, actor_role, action, detail, created_at
           FROM report_activity
           WHERE report_id = %s
           ORDER BY created_at DESC''',
        (report_id,)
    )
    rows = cur.fetchall()
    return [
        {
            'id': r[0],
            'actor_id': r[1],
            'actor_role': r[2],
            'action': r[3],
            'detail': r[4],
            'created_at': r[5].isoformat() if r[5] else None,
        }
        for r in rows
    ]


@reports_bp.route('/uploads/<path:filename>', methods=['GET'])
def get_uploaded_image(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@reports_bp.route('', methods=['POST'])
@roles_required('citizen', 'staff', 'admin')
def submit_report():
    data = request.get_json() or {}
    user = get_current_user()

    required = ('title', 'description', 'category', 'latitude', 'longitude')
    if any(not data.get(f) for f in required):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''INSERT INTO reports
               (title, description, category, latitude, longitude, citizen_id, department, jurisdiction, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING id''',
            (
                data['title'],
                data['description'],
                data['category'],
                data['latitude'],
                data['longitude'],
                user['id'],
                data.get('department'),
                data.get('jurisdiction'),
                'submitted',
            )
        )
        report_id = cur.fetchone()[0]
        _log_activity(cur, report_id, user, 'report_created', 'Report submitted by citizen')
        conn.commit()
        return jsonify({'message': 'Report submitted', 'id': report_id}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('/my', methods=['GET'])
@roles_required('citizen', 'staff', 'admin')
def get_my_reports():
    user = get_current_user()
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''SELECT id, title, description, status, category, latitude, longitude,
                      department, jurisdiction, created_at, citizen_id, updated_at, cancelled_at
               FROM reports
               WHERE citizen_id = %s
               ORDER BY created_at DESC''',
            (user['id'],)
        )
        rows = cur.fetchall()
        reports = [_serialize_report(r) for r in rows]
        return jsonify(reports), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('', methods=['GET'])
@roles_required('staff', 'admin')
def get_all_reports():
    user = get_current_user()
    page, page_size, offset = parse_pagination(request.args)

    filter_status = request.args.get('status')
    filter_category = request.args.get('category')
    search = request.args.get('search')

    clauses = ['1=1']
    params = []

    if filter_status and filter_status != 'all':
        clauses.append('r.status = %s')
        params.append(filter_status)

    if filter_category and filter_category != 'all':
        clauses.append('LOWER(r.category) = LOWER(%s)')
        params.append(filter_category)

    if search:
        clauses.append('(LOWER(r.title) LIKE LOWER(%s) OR LOWER(r.description) LIKE LOWER(%s))')
        params.extend([f'%{search}%', f'%{search}%'])

    if user['role'] == 'staff':
        if user.get('department'):
            clauses.append('(r.department IS NULL OR LOWER(r.department) = LOWER(%s))')
            params.append(user['department'])
        if user.get('jurisdiction'):
            jurisdictions = [j.strip() for j in user['jurisdiction'].split(',') if j.strip()]
            if jurisdictions:
                placeholders = ','.join(['%s'] * len(jurisdictions))
                clauses.append(f"(r.jurisdiction IS NULL OR LOWER(r.jurisdiction) IN ({placeholders}))")
                params.extend([j.lower() for j in jurisdictions])

    where_sql = ' AND '.join(clauses)

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(f'''SELECT COUNT(*) FROM reports r WHERE {where_sql}''', tuple(params))
        total = cur.fetchone()[0]

        paged_params = params + [page_size, offset]
        cur.execute(
            f'''SELECT r.id, r.title, r.description, r.status, r.category, r.latitude, r.longitude,
                       r.department, r.jurisdiction, r.created_at, r.citizen_id, r.updated_at, r.cancelled_at
                FROM reports r
                WHERE {where_sql}
                ORDER BY r.created_at DESC
                LIMIT %s OFFSET %s''',
            tuple(paged_params)
        )
        rows = cur.fetchall()
        reports = [_serialize_report(r) for r in rows]
        return jsonify({
            'items': reports,
            'meta': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'pages': max((total + page_size - 1) // page_size, 1),
            }
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('/public/<int:report_id>', methods=['GET'])
def public_report_tracking(report_id):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''SELECT id, title, description, status, category, latitude, longitude,
                      department, jurisdiction, created_at, citizen_id, updated_at, cancelled_at
               FROM reports WHERE id = %s''',
            (report_id,)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Report not found'}), 404

        report = _serialize_report(row)
        report['images'] = _report_images(cur, report_id)
        report['activity'] = _report_activity(cur, report_id)
        return jsonify(report), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('/<int:report_id>/activity', methods=['GET'])
@roles_required('citizen', 'staff', 'admin')
def get_report_activity(report_id):
    user = get_current_user()
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('SELECT citizen_id, department, jurisdiction FROM reports WHERE id = %s', (report_id,))
        report = cur.fetchone()
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        if user['role'] == 'citizen' and report[0] != user['id']:
            return jsonify({'error': 'Forbidden'}), 403

        if user['role'] == 'staff' and not staff_can_manage_report(user, report[1], report[2]):
            return jsonify({'error': 'Forbidden for this department/jurisdiction'}), 403

        return jsonify(_report_activity(cur, report_id)), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('/<int:report_id>/images', methods=['POST'])
@roles_required('citizen', 'staff', 'admin')
def upload_report_image(report_id):
    user = get_current_user()
    stage = request.form.get('stage', 'before').lower()
    if stage not in {'before', 'after'}:
        return jsonify({'error': 'Invalid stage'}), 400

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    image = request.files['image']
    if not image.filename or not _allowed_file(image.filename):
        return jsonify({'error': 'Unsupported file type'}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('SELECT citizen_id, department, jurisdiction FROM reports WHERE id = %s', (report_id,))
        report = cur.fetchone()
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        if user['role'] == 'citizen' and report[0] != user['id']:
            return jsonify({'error': 'Forbidden'}), 403

        if user['role'] == 'staff' and not staff_can_manage_report(user, report[1], report[2]):
            return jsonify({'error': 'Forbidden for this department/jurisdiction'}), 403

        safe_name = secure_filename(image.filename)
        ext = safe_name.rsplit('.', 1)[1].lower()
        file_name = f"report_{report_id}_{stage}_{secrets.token_hex(8)}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        image.save(file_path)

        image_url = f"/api/reports/uploads/{file_name}"
        cur.execute(
            '''INSERT INTO report_images (report_id, uploaded_by, stage, image_url)
               VALUES (%s, %s, %s, %s)
               RETURNING id''',
            (report_id, user['id'], stage, image_url)
        )
        image_id = cur.fetchone()[0]
        _log_activity(cur, report_id, user, 'image_uploaded', f'{stage} image uploaded')

        conn.commit()
        return jsonify({'id': image_id, 'image_url': image_url, 'stage': stage}), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('/<int:report_id>/edit', methods=['PATCH'])
@roles_required('citizen')
def edit_report(report_id):
    user = get_current_user()
    data = request.get_json() or {}
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''SELECT citizen_id, status FROM reports WHERE id = %s''',
            (report_id,)
        )
        report = cur.fetchone()
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        if report[0] != user['id']:
            return jsonify({'error': 'Forbidden'}), 403
        if report[1] != 'submitted':
            return jsonify({'error': 'Only submitted reports can be edited'}), 400

        cur.execute(
            '''UPDATE reports
               SET title = COALESCE(%s, title),
                   description = COALESCE(%s, description),
                   category = COALESCE(%s, category),
                   latitude = COALESCE(%s, latitude),
                   longitude = COALESCE(%s, longitude),
                   updated_at = NOW()
               WHERE id = %s''',
            (
                data.get('title'),
                data.get('description'),
                data.get('category'),
                data.get('latitude'),
                data.get('longitude'),
                report_id,
            )
        )
        _log_activity(cur, report_id, user, 'report_edited', 'Citizen updated submitted report')
        conn.commit()
        return jsonify({'message': 'Report updated'}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('/<int:report_id>/cancel', methods=['PATCH'])
@roles_required('citizen')
def cancel_report(report_id):
    user = get_current_user()
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute('SELECT citizen_id, status FROM reports WHERE id = %s', (report_id,))
        report = cur.fetchone()
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        if report[0] != user['id']:
            return jsonify({'error': 'Forbidden'}), 403
        if report[1] != 'submitted':
            return jsonify({'error': 'Only submitted reports can be cancelled'}), 400

        cur.execute(
            '''UPDATE reports
               SET status = %s, cancelled_at = NOW(), updated_at = NOW()
               WHERE id = %s''',
            ('cancelled', report_id)
        )
        _log_activity(cur, report_id, user, 'report_cancelled', 'Citizen cancelled report')
        conn.commit()
        return jsonify({'message': 'Report cancelled'}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('/<int:report_id>', methods=['PATCH'])
@roles_required('staff', 'admin')
def update_status(report_id):
    user = get_current_user()
    data = request.get_json() or {}
    status = data.get('status')

    if not _status_allowed(status):
        return jsonify({'error': 'Invalid status'}), 400

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''SELECT id, citizen_id, department, jurisdiction
               FROM reports
               WHERE id = %s''',
            (report_id,)
        )
        report = cur.fetchone()
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        if user['role'] == 'staff' and not staff_can_manage_report(user, report[2], report[3]):
            return jsonify({'error': 'Forbidden for this department/jurisdiction'}), 403

        cur.execute(
            '''UPDATE reports
               SET status = %s, updated_at = NOW()
               WHERE id = %s''',
            (status, report_id)
        )

        cur.execute(
            '''INSERT INTO notifications (user_id, report_id, message)
               VALUES (%s, %s, %s)''',
            (report[1], report_id, f'Your report status has been updated to: {status}')
        )

        _log_activity(cur, report_id, user, 'status_updated', f'Status changed to {status}')
        conn.commit()
        return jsonify({'message': 'Status updated'}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('/<int:report_id>/department', methods=['PATCH'])
@roles_required('staff', 'admin')
def assign_department(report_id):
    user = get_current_user()
    data = request.get_json() or {}
    department = data.get('department')
    jurisdiction = data.get('jurisdiction')

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            'SELECT department, jurisdiction FROM reports WHERE id = %s',
            (report_id,)
        )
        report = cur.fetchone()
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        if user['role'] == 'staff' and not staff_can_manage_report(user, report[0], report[1]):
            return jsonify({'error': 'Forbidden for this department/jurisdiction'}), 403

        cur.execute(
            '''UPDATE reports
               SET department = COALESCE(%s, department),
                   jurisdiction = COALESCE(%s, jurisdiction),
                   updated_at = NOW()
               WHERE id = %s''',
            (department, jurisdiction, report_id)
        )
        _log_activity(cur, report_id, user, 'department_assigned', f'Department set to {department}')

        conn.commit()
        return jsonify({'message': 'Department assigned'}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()


@reports_bp.route('/notifications', methods=['GET'])
@roles_required('citizen', 'staff', 'admin')
def get_notifications():
    user = get_current_user()
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            '''SELECT id, message, is_read, sent_at
               FROM notifications WHERE user_id = %s
               ORDER BY sent_at DESC''',
            (user['id'],)
        )
        rows = cur.fetchall()
        notifications = [
            {
                'id': r[0],
                'message': r[1],
                'is_read': r[2],
                'sent_at': r[3].isoformat() if r[3] else None,
            }
            for r in rows
        ]
        return jsonify(notifications), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()
        conn.close()
