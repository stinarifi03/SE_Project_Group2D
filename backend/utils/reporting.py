from datetime import timedelta
from datetime import datetime


DEFAULT_SLA_HOURS = 72
SLA_BY_CATEGORY = {
    'pothole': 48,
    'streetlight': 24,
    'garbage': 24,
    'water': 12,
}


def get_sla_hours(category):
    if not category:
        return DEFAULT_SLA_HOURS
    return SLA_BY_CATEGORY.get(str(category).lower(), DEFAULT_SLA_HOURS)


def compute_sla(created_at, category, status):
    sla_hours = get_sla_hours(category)
    due_at = created_at + timedelta(hours=sla_hours)
    is_closed = str(status).lower() in {'resolved', 'cancelled'}
    is_overdue = (not is_closed) and (due_at < datetime.now())
    return {
        'sla_hours': sla_hours,
        'sla_due_at': due_at.isoformat(),
        'is_overdue': is_overdue,
    }


def parse_pagination(args, default_page_size=20, max_page_size=100):
    try:
        page = max(int(args.get('page', 1)), 1)
    except ValueError:
        page = 1
    try:
        page_size = int(args.get('page_size', default_page_size))
    except ValueError:
        page_size = default_page_size

    page_size = max(1, min(page_size, max_page_size))
    offset = (page - 1) * page_size
    return page, page_size, offset
