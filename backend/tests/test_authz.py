from utils.authz import staff_can_manage_report


def test_staff_can_manage_when_department_matches():
    user = {
        'role': 'staff',
        'department': 'Roads',
        'jurisdiction': 'Zone A, Zone B',
    }
    assert staff_can_manage_report(user, 'Roads', 'Zone B') is True


def test_staff_blocked_when_department_mismatch():
    user = {
        'role': 'staff',
        'department': 'Roads',
        'jurisdiction': 'Zone A',
    }
    assert staff_can_manage_report(user, 'Electricity', 'Zone A') is False


def test_admin_always_can_manage():
    user = {
        'role': 'admin',
        'department': None,
        'jurisdiction': None,
    }
    assert staff_can_manage_report(user, 'Anything', 'Anywhere') is True
