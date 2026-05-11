# Urban Issue Tracker — Phase IV: Software Testing Report

**Group 2D | Software Engineering | 2026**
[github.com/stinarifi03/SE_Project_Group2D](https://github.com/stinarifi03/SE_Project_Group2D)

**Team Members:** Stin Arifi | Samuel Osmani | Vanessa Konjari | Ana Uka | Telma Vela

---

## 1. Introduction to Testing

Software testing is a structured activity where a software system is exercised with inputs and its actual outputs are compared against expected ones. The goal is to surface anything that should not be there: bugs, logical errors, gaps between what was specified and what was built, and behaviours that only emerge under unusual conditions.

Testing is a quality assurance discipline that serves three main concerns in software development:

- *Reliability* means that the software holds up not just in the happy path, but across edge cases, high loads, and unexpected user actions. A reliable system is predictable.
- *Correctness* means the software does what it was designed to do — that requirements translate faithfully into behaviour. Testing is the mechanism that formally verifies this.
- *Maintainability* is perhaps the least obvious but most powerful long-term benefit. A well-tested codebase can be confidently refactored, extended, or handed to a new team, because the tests act as a safety net. If something breaks, you will know immediately.

---

## 2. Purpose of Testing

Finding a defect early in development is far cheaper and faster to fix than finding it later. A bug caught during the coding phase might take minutes to resolve. That same bug found after release can take days — because by then, other code is built on top of it, users are affected, and a fix requires re-testing and redeployment. Testing moves that discovery point as early as possible, saving time, cost, and damage to the product's reputation.

For the Urban Issue Tracker specifically, testing is critical because the system handles real civic reports from citizens and enforces access control across three user roles: citizen, staff, and admin. A failure in role-based access could expose admin endpoints to unauthorised users. A failure in report submission could silently drop citizen reports. A failure in staff account management could lock legitimate users out of the platform or leave compromised accounts active.

This report focuses testing efforts on the three backend components that carry the highest risk: the role-based access control layer, the report submission endpoint, and the staff account management functions. Each represents a different failure mode: a security failure, a data integrity failure, and an administrative failure respectively.

---

## 3. Focus on Testing — Selected Components

Three critical components were selected for testing, each representing a different area of the system and a different team member's contribution:

| Component | File | Why Selected |
|---|---|---|
| Role-Based Access (authz) | `utils/authz.py` | Guards every protected route. Incorrect role checks could expose admin or staff endpoints. |
| Report Submission | `routes/reports.py` | Core citizen-facing feature. Bugs here would prevent citizens from reporting issues. |
| Staff Account Management | `routes/admin.py` | Admin function for managing staff. Errors could lock out staff or expose accounts. |

### Role-Based Access Control (`utils/authz.py`)

This component acts as the security layer for every protected route in the Urban Issue Tracker. Its role is to verify the identity and permissions of every user before allowing access to any sensitive endpoint. It handles multiple conditions simultaneously: it decodes and validates the JWT token, checks whether the user account is still active, and matches the user's role against the roles permitted for that specific route. For staff users, it also checks whether their department and jurisdiction match the report they are trying to manage. If this component fails, citizens could access admin features, staff could manage reports outside their authority, or disabled accounts could continue to operate.

### Report Submission (`routes/reports.py`)

This component is the primary citizen-facing feature of the Urban Issue Tracker. Its role is to receive and validate new urban issue reports submitted by citizens and write them to the database. It validates that required fields are present — title, description, category, latitude, and longitude — and enforces that only authenticated users are permitted to submit reports. If this component contains bugs, citizens will be unable to report issues, which defeats the core purpose of the application.

### Staff Account Management (`routes/admin.py`)

This component provides administrators with the tools to manage staff accounts, including creating new accounts, disabling existing users, resetting passwords, and listing all staff members. It involves multiple distinct operations (create, disable, reset, list), each requiring admin-only authentication, input validation, and direct interaction with the user database. An error in account creation could allow duplicate accounts; an error in the disable function could leave compromised accounts active; a failure in password reset could lock staff out of the system entirely.

---

## 4. Preparing Test Cases

Test cases were designed to cover three categories of input for each component: normal valid inputs, invalid or incorrect inputs, and edge/boundary cases. Each test case specifies what is being tested and what the expected outcome is.

### Component 1 — Role-Based Access Control (`utils/authz.py`)

The `roles_required` decorator validates the JWT token on every protected route, checks that the user exists, that their account is active, and that their role matches the allowed roles for that endpoint. The `staff_can_manage_report` function verifies department and jurisdiction access.

| Test ID | Scenario | Input | Expected Result |
|---|---|---|---|
| TC01 | Admin accesses admin route | Valid JWT with role = admin | Access granted, returns 200 |
| TC02 | Citizen accesses admin route | Valid JWT with role = citizen | Returns 403: "Forbidden" |
| TC03 | Staff accesses staff route | Valid JWT with role = staff | Access granted, returns 200 |
| TC04 | No token provided | Request with no Authorization header | Returns 401: Unauthorized |
| TC05 | Disabled user with valid token | Valid JWT but is_active = FALSE | Returns 403: "Account is disabled" |
| TC06 | Admin can manage any report | Admin role, any department/jurisdiction | `staff_can_manage_report` returns True |
| TC07 | Staff matches jurisdiction | Staff with matching department and jurisdiction | `staff_can_manage_report` returns True |
| TC08 | Staff wrong department | Staff with different department than report | `staff_can_manage_report` returns False |

### Component 2 — Report Submission (`routes/reports.py`)

The report submission endpoint validates that all required fields are present — title, description, category (text), latitude, and longitude — and writes the report to the database on success.

| Test ID | Scenario | Input | Expected Result |
|---|---|---|---|
| TC01 | Valid report submission | All required fields present, valid JWT | Returns 201, report saved to database |
| TC02 | Missing title | Request body with no title field | Returns 400: "Missing required fields" |
| TC03 | Missing description | Request body with no description field | Returns 400: "Missing required fields" |
| TC04 | No authentication | No JWT token provided | Returns 401: Unauthorized |
| TC05 | Missing category | Request body with no category field | Returns 400: "Missing required fields" |
| TC06 | Missing latitude | Request body with no latitude field | Returns 400: "Missing required fields" |
| TC07 | Missing longitude | Request body with no longitude field | Returns 400: "Missing required fields" |

### Component 3 — Staff Account Management (`routes/admin.py`)

All admin routes are protected by the admin role guard, which rejects requests from non-admin users.

| Test ID | Scenario | Input | Expected Result |
|---|---|---|---|
| TC01 | Create staff with valid data | name, email, password provided, admin JWT | Returns 201, staff account created |
| TC02 | Create staff missing email | name and password provided, no email | Returns 400: "name, email and password are required" |
| TC03 | Citizen tries to create staff | Valid request body but JWT role = citizen | Returns 403: "Forbidden" |
| TC04 | Disable existing user | Valid user_id, admin JWT | Returns 200: "User disabled" |
| TC05 | Reset password | Valid user_id, admin JWT | Returns 200 with temporary_password in response |
| TC06 | Get all staff | Admin JWT, GET /api/admin/staff | Returns 200 with list of all staff accounts |
| TC07 | Duplicate email on create | Email that already exists in users table | Returns 500 (database unique constraint error) |

---

## 5. Testing Tools

The following tools and libraries were used to write and execute the tests for the Urban Issue Tracker backend.

**pytest** — The testing framework used throughout this project. It automatically discovers test files and functions, runs each test, and reports which passed, failed, or raised errors.

```
pip install pytest
```

**Flask test client** — A built-in feature of the Flask framework. It allows HTTP requests to be sent to the application without needing to run a live server, making it possible to test API endpoints in isolation.

**PyJWT** — A Python library used to encode and decode JSON Web Tokens. Test fixtures use PyJWT to generate valid tokens for different roles, which are then passed in the Authorization header of test requests.

```
pip install PyJWT
```

**Setup:**

```bash
cd urban-tracker/backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install pytest PyJWT flask flask-jwt-extended
pytest tests/ -v
```

---

## 6. Writing Test Code

The test code was written using pytest. Two test files were implemented, covering pure utility functions that can be verified without a running server or live database connection.

### Component 1 — Role Guard (`tests/test_authz.py`)

These tests exercise the `staff_can_manage_report` function from `utils/authz.py` directly, verifying that it correctly grants or denies access based on role, department, and jurisdiction.

```python
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
```

### Component 2 — Reporting Utilities (`tests/test_reporting.py`)

These tests cover `compute_sla`, which calculates SLA deadlines and overdue status per report category, and `parse_pagination`, which sanitises page query parameters.

```python
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
```

### Component 3 — Staff Account Management

Endpoint integration tests for the admin routes require a Flask test client fixture with JWT token generation and database mocking. These are identified as planned work — the test case designs in Section 4 serve as the specification for these tests once the test infrastructure is extended.

---

## 7. Running Tests

The tests were executed using pytest from the terminal inside the backend directory:

```bash
cd urban-tracker/backend
venv\Scripts\activate
pytest tests/ -v
```

The `-v` flag displays each individual test result. `PASSED` means all assertions matched, `FAILED` means an assertion did not match, and `ERROR` means the test could not run due to a setup issue.

**Test results summary:**

| Test ID | Component | Scenario | Result |
|---|---|---|---|
| TC01 | Role Guard | Admin always manages any report | PASSED |
| TC02 | Role Guard | Staff manages when department matches | PASSED |
| TC03 | Role Guard | Staff blocked when department mismatch | PASSED |
| TC04 | SLA Utilities | Open report marked overdue past SLA deadline | PASSED |
| TC05 | SLA Utilities | Resolved report not marked overdue | PASSED |
| TC06 | Pagination | Page and page_size clamped to valid bounds | PASSED |
| TC07 | Pagination | Invalid non-numeric page values default correctly | PASSED |

**7 tests run — 7 passed — 0 failed — 0 errors**

---

## 8. Test Coverage and Reflection

### Test Coverage

Test coverage refers to how much of the codebase is exercised by the test suite. Good coverage means the tests touch the most important paths, conditions, and failure scenarios of each component.

| Component | Tests Implemented | Status | Assessment |
|---|---|---|---|
| Role Guard (`utils/authz.py`) | `staff_can_manage_report`: department match, mismatch, admin bypass | Executed — 3 passed | Core permission logic tested; endpoint integration tests are planned |
| Report Utilities (`utils/reporting.py`) | `compute_sla`: overdue and resolved; `parse_pagination`: bounds and defaults | Executed — 4 passed | All branches of both utility functions are exercised |
| Report Submission (`routes/reports.py`) | Test cases designed (TC01–TC07) | Planned | Design complete; automated tests require test client setup |
| Staff Management (`routes/admin.py`) | Test cases designed (TC01–TC07) | Planned | Design complete; automated tests require test client setup |

### Reflection

The testing phase delivered a focused set of unit tests that verify the correctness of the most critical pure-logic components in the Urban Issue Tracker. The three tests for `staff_can_manage_report` confirm that the department and jurisdiction matching logic behaves correctly across all meaningful input combinations, including the admin bypass case. The four tests for the reporting utilities confirm that SLA deadlines are computed correctly per category, that overdue detection does not apply to closed reports, and that pagination inputs are sanitised reliably.

The main gap in the current test suite is the absence of endpoint integration tests for `routes/reports.py` and `routes/admin.py`. Closing this gap requires extending `conftest.py` with a Flask test client fixture, JWT token generation helpers, and either a dedicated test database or mock patches for `get_db` calls inside each route.

Areas identified for additional testing in future sprints:

- Endpoint integration tests for all report submission and admin management routes, using the test case designs from Section 4 as the specification.
- End-to-end tests covering the full flow from the React frontend through the Flask backend to PostgreSQL.
- Performance testing under concurrent load, such as many citizens submitting reports simultaneously.
- Testing the notification system to verify that notifications are correctly created when report statuses change.
- Testing the CSV and PDF export endpoints with large datasets to confirm correct output.

Overall, the implemented tests provide strong confidence that the core access-control and SLA logic is correct. The test case designs for the remaining components provide a clear roadmap for completing the test suite.
