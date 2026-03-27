Team Name: Urban Issue Tracker

Team Leader: Stin Arifi, Github username: stinarifi03

Other Team Members:
  *Ana Uka, Github username: anauka05
  *Samuel Osmani, Github username: osmanisamuel36-glitch
  *Telma Vela, Github username: telmavela
  *Vanessa Konjari, Github username: VanessaK1

Problem Statement:

Urban communities face significant challenges in reporting and tracking civic issues such as potholes, broken streetlights, illegal dumping, and other infrastructure problems. Traditional reporting methods (phone calls, in-person visits) are slow, lack transparency, and provide no follow-up mechanism for citizens. Municipal staff and administrators also struggle with managing, prioritizing, and resolving these reports efficiently.

Proposed Solution:

Urban Issue Tracker is a web application that makes it easy for people to report problems in their city, such as broken streetlights, potholes, garbage issues, or water leaks. Instead of using unclear or slow reporting methods, citizens can submit a report online with a short description, location, and photo, then check updates as the issue is being handled. City staff can view incoming reports, sort them, assign them to the right department, and update progress so everyone knows what is happening. Administrators can manage users, organize categories, and review overall report activity to improve daily operations. The goal of this solution is to create a simple, clear, and transparent system that helps cities respond faster while keeping citizens informed from start to finish.

Project Scope:

Aim:
To develop a responsive, secure, and user-friendly web application that streamlines the process of reporting, managing, and resolving urban infrastructure issues.

Objectives:

- Enable citizens to register, log in, and submit urban issue reports with location data.
- Provide staff dashboards for managing, assigning, and updating reported issues.
- Offer admin panels for user management, analytics, and system oversight.
- Implement role-based access control (Citizen, Staff, Admin) with secure JWT authentication.
- Allow public tracking of reported issues for transparency and accountability.
- Deliver data export and analytics capabilities for decision-making.

Application Description:

Users:

Citizen -> Residents who report urban issues, track their submissions, and view public reports. 
Staff -> Municipal employees who manage, triage, assign, and resolve reported issues. 
Admin -> System administrators who oversee users, view analytics, and configure the platform. 

Key Features:

*Authentication & Authorization — Secure registration, login, and role-based access using JWT tokens.
*Issue Reporting — Citizens submit geo-tagged reports with descriptions and categorization.
*Interactive Map — Leaflet-based map view for visualizing reported issues by location.
*Admin & Staff Dashboards — Analytics, issue management, and workflow tools.
*Public Issue Tracking — Transparent status tracking for all reported issues.
*Data Export — Export reports and analytics data for offline analysis.
*Responsive Design — Fully responsive UI built with React and Vite.

Roles and Task Distribution:

Member 1(Samuel Osmani) — Backend Core & Security:

- Backend architecture and API design
- Authentication and authorization logic
- Token lifecycle and security handling
- Database schema evolution and backend integrity
- Backend refactoring and bug resolution

Member 2(Stin Arifi) — Frontend Operations & Integration:

- Staff and Admin frontend modules
- Complex UI state handling and API integration
- Dashboard workflows, analytics UI, and export flows
- Cross-module integration and end-to-end stability

Member 3(Vanessa Konjari) — Citizen Experience Development:

- Citizen-facing pages and flows (login, register, submit, my reports, public tracking)
- Form validation and user interaction improvements
- Citizen-side error handling and UI consistency

Member 4(Ana Uka) — Testing & API Reliability:

- Backend route-level test development
- Integration and authorization scenario testing
- Validation/error-case hardening in API endpoints
- Quality assurance checks and regression prevention

Member 5(Telma Vela) — Shared Frontend Components & Code Quality:

- Reusable component development and refactoring
- Shared hooks/utilities and maintainable frontend architecture
- API client helper improvements and frontend cleanup
- Performance and maintainability optimizations

Shared Responsibilities (All Members):

- Participate in sprint planning, code reviews, and integration testing
- Contribute to bug fixing and release preparation
- Support demo preparation and final presentation

Team Leader:

- Coordinates timelines, resolves blockers, and ensures delivery quality
