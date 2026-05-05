from datetime import datetime, timedelta

from utils.reporting import compute_sla, parse_pagination


class DummyArgs(dict):
    def get(self, key, default=None):
        return super().get(key, default)


def test_compute_sla_marks_open_report_overdue_when_past_due():
    created_at = datetime.now() - timedelta(hours=100)
    data = compute_sla(created_at, 'streetlight', 'submitted')

    assert data['sla_hours'] == 24
    assert data['is_overdue'] is True
    assert data['sla_due_at'] is not None


def test_compute_sla_does_not_mark_resolved_overdue():
    created_at = datetime.now() - timedelta(hours=200)
    data = compute_sla(created_at, 'water', 'resolved')

    assert data['sla_hours'] == 12
    assert data['is_overdue'] is False


def test_parse_pagination_bounds_values():
    args = DummyArgs(page='-1', page_size='999')
    page, page_size, offset = parse_pagination(args)

    assert page == 1
    assert page_size == 100
    assert offset == 0


def test_parse_pagination_defaults_when_invalid():
    args = DummyArgs(page='abc', page_size='xyz')
    page, page_size, offset = parse_pagination(args)

    assert page == 1
    assert page_size == 20
    assert offset == 0
