# API Specification — Brief Summary

## Overview

- Base URL: `/api/v1`
- Format: JSON for requests and responses
- Protected routes require `Authorization: Bearer <access_token>`
- Responses use `{ success, data, meta }` for success and `{ success, error }` for failures.
- Main error codes: validation (400), unauthorized (401), forbidden (403), not found (404), conflict (409), rate limited (429), and internal error (500).

## Authentication

The API supports login, optional MFA verification, access-token refresh through a secure HTTP-only cookie, logout, account activation, and password reset. Login and recovery endpoints are rate-limited. Password recovery must not reveal whether an email account exists.

## Admin Capabilities

Admins and super-admins can:

- Create, view, update, delete, open, close, and publish assessments.
- Configure access windows, duration, attempts, marks, negative marking, result visibility, and integrity controls such as camera monitoring and tab-switch thresholds.
- Import candidates through an XLSX preview/commit workflow, review errors, add candidates manually, and manage eligibility.
- Create and manage versioned questions and generate immutable paper versions for assessments.
- Review integrity incidents and record decisions in the audit log.
- View results, publish them, export Excel reports, and track export/download events.
- Search audit logs by action, actor, and date range.

Assessment edits are restricted after an assessment becomes open, closed, or published. Deletion is a soft delete and is allowed only for drafts. Status changes must follow the state machine and create audit entries.

## Student Capabilities

Students can view their profile and eligible assessments, start or resume an exam, autosave answers, submit an attempt, send heartbeat signals, report integrity incidents, and view results after publication.

Starting an attempt is atomic and idempotent. Submitting is also idempotent. Exam responses never expose correct answers. The server provides the authoritative exam deadline and time. Results show scores and answer breakdowns only when the assessment’s publication and visibility settings allow them.

## Exam Integrity

The system records tab switches, fullscreen exits, camera-related events, and other incidents. Configured warning, flagging, and auto-submit thresholds determine the response. Students must send heartbeats every 30 seconds, while incident submissions are rate-limited.

## Rate Limits

- Login: 10 requests / 15 minutes / IP
- MFA verification: 5 / 5 minutes / IP
- Password recovery: 3 / hour / email
- Candidate import preview: 5 / hour / admin
- Attempt start: 3 / 5 minutes / student
- Answer autosave: 60 / minute / student
- Incident reporting: 30 / minute / attempt
- Other authenticated routes: 200 / minute / user
- Other unauthenticated routes: 30 / minute / IP

## Core Workflow

1. Admin creates a draft assessment and configures its rules.
2. Admin imports or adds eligible candidates.
3. Admin creates questions and locks a paper version.
4. Assessment is opened during its configured access window.
5. Student starts an eligible attempt, answers questions, and receives integrity monitoring.
6. Student submits, or the system auto-submits on timeout or configured violations.
7. Admin reviews incidents, scores/results, and publishes results.
8. Students view permitted scores and answer breakdowns; administrators can export and audit all activity.
