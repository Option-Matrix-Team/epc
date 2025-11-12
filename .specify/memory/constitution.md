<!--
===============================================================================
SYNC IMPACT REPORT - Constitution Update
===============================================================================
Version Change: N/A → 1.0.0 (Initial Constitution)
Ratification Date: 2025-11-12
Last Amended: 2025-11-12

PRINCIPLES ESTABLISHED:
+ I. Security & Privacy First (HIPAA/GDPR)
+ II. Data Integrity & Audit Trail
+ III. User-Centric Design for Healthcare
+ IV. Modularity & Maintainability
+ V. Performance & Reliability
+ VI. Testing & Quality Assurance
+ VII. Compliance & Documentation

SECTIONS ADDED:
+ Core Principles (7 principles)
+ Healthcare Security & Compliance Requirements
+ Development Workflow & Quality Gates
+ Governance

TEMPLATES STATUS:
✅ plan-template.md - Reviewed, aligns with constitution principles
✅ spec-template.md - Reviewed, supports user story methodology
✅ tasks-template.md - Reviewed, supports phased implementation
⚠ Command files - No command templates found in .specify/templates/commands/
   (Command prompts exist in .github/prompts/ - no updates needed there)

FOLLOW-UP ITEMS:
- None - All placeholders filled
- Constitution ready for immediate use

COMMIT MESSAGE SUGGESTION:
docs: establish constitution v1.0.0 for EMR healthcare system

Ratify initial governance document defining core principles for electronic
medical records and patient care management system. Establishes security,
privacy, data integrity, and compliance requirements for hospital/clinic
internal tool development.
===============================================================================
-->


# EPC Constitution (Simplified)

## 1. Security & Privacy
- All patient and user data must be protected using Supabase Auth and RBAC.
- Sensitive data access must be logged and auditable.

## 2. Data Integrity
- Use audit logs and soft deletes for all records.

## 3. User Experience
- UI must be simple and fast for hospital staff.
- Use shadcn/ui and Tailwind CSS for all components.

## 4. Architecture
- Use Next.js App Router for modular code structure.
- Supabase for backend, Next.js + shadcn/ui + Tailwind for frontend.

## 5. Performance
- Main pages must load in under 2 seconds.
- Handle errors gracefully with user feedback.

## 6. Testing
- Automated testing is NOT required.
- Manual test cases must be documented for all features.

## 7. Compliance
- All data handling must comply with HIPAA and GDPR.

## Healthcare Security & Compliance Requirements

This section provides additional constraints specific to healthcare application development.

**Technology Stack Standards**:
- **Frontend**: Next.js 15+ with React 19+, TypeScript 5+, Tailwind CSS 4+
- **UI Components**: shadcn/ui for consistent, accessible components
- **Backend**: Node.js 20+ with Express or Next.js API routes
- **Database**: PostgreSQL 15+ with row-level security (RLS) enabled
- **Authentication**: NextAuth.js or similar with MFA support
- **State Management**: React Context/Zustand for local state, TanStack Query for server state
- **Form Validation**: Zod for schema validation
- **Testing**: Vitest/Jest for unit tests, Playwright for E2E tests

**Data Classification**:
- **Level 1 - PHI**: Patient identifiable health information (requires encryption, audit, access control)
- **Level 2 - Operational**: Non-PHI sensitive data (user credentials, billing info)
- **Level 3 - Public**: Non-sensitive data (appointment availability, general information)

**Deployment & Infrastructure**:
- Use HTTPS everywhere (no mixed content)
- Environment variables for secrets (never commit credentials)
- Database connection pooling and prepared statements (SQL injection prevention)
- Content Security Policy (CSP) headers configured
- Regular security patches and dependency updates
- Disaster recovery plan with RPO ≤ 1 hour, RTO ≤ 4 hours

**Prohibited Practices**:
- ❌ Storing PHI in browser localStorage without encryption
- ❌ Logging PHI to console, files, or external services
- ❌ Using deprecated or unsupported dependencies
- ❌ Implementing custom cryptography (use established libraries)
- ❌ Disabling security features "temporarily" without documented exception
- ❌ Sharing credentials between environments or users

## Development Workflow & Quality Gates

This section defines the development process and quality checkpoints that must be passed.

**Feature Development Flow**:
1. **Specification**: Create detailed spec in `/specs/[###-feature-name]/spec.md` with user stories
2. **Planning**: Generate implementation plan via `/speckit.plan` command
3. **Security Review**: Assess security implications before development
4. **Design**: Create data models, API contracts, UI mockups
5. **Test Design**: Write test cases based on acceptance criteria
6. **Implementation**: Develop feature following constitution principles
7. **Code Review**: Minimum 2 reviewers, constitution compliance check
8. **Testing**: Execute all test levels (unit, integration, E2E)
9. **Security Testing**: Vulnerability scan, penetration testing for auth/data features
10. **Staging Deployment**: Deploy to staging, perform UAT
11. **Production Deployment**: Deploy during maintenance window with rollback plan
12. **Monitoring**: Observe metrics, logs, and user feedback post-deployment

**Quality Gates (Must Pass)**:
- ✅ All tests passing (no skipped critical tests)
- ✅ Code coverage meets minimum thresholds (80% for business logic)
- ✅ No high/critical security vulnerabilities (npm audit, Snyk)
- ✅ ESLint/TypeScript checks passing with no errors
- ✅ Accessibility audit passing (Lighthouse, axe)
- ✅ Performance benchmarks met (Lighthouse score ≥ 90)
- ✅ Code review approved by 2+ reviewers
- ✅ Documentation updated (API docs, user guides, ADRs)
- ✅ Security review completed (for features touching PHI/auth)
- ✅ Constitution compliance verified

**Branch Strategy**:
- `main`: Production-ready code, protected branch
- `develop`: Integration branch for features
- `feature/###-feature-name`: Feature development branches
- `hotfix/###-description`: Emergency production fixes

**Commit Standards**:
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Reference issue/feature number in commits
- Commits should be atomic and descriptive

## Governance

This constitution is the foundational governance document for the EPC project. It supersedes all other development practices, guidelines, and conventions.

**Amendment Process**:
1. Proposed amendments MUST be documented with rationale
2. Impact analysis MUST be performed (what changes in codebase, templates, workflows)
3. Team consensus required (majority approval from core team)
4. Version number MUST be incremented according to semantic versioning:
   - **MAJOR**: Principle removed/redefined, backward-incompatible governance changes
   - **MINOR**: New principle added, significant section expansion
   - **PATCH**: Clarifications, typo fixes, non-semantic improvements
5. All dependent artifacts MUST be updated (templates, plans, documentation)
6. Migration plan MUST be provided for existing features affected by changes

**Compliance & Enforcement**:
- All pull requests MUST include a constitution compliance checklist
- Code reviews MUST verify adherence to constitutional principles
- Violations MUST be documented and justified in writing (see Complexity Tracking)
- Automated checks MUST enforce rules where possible (linting, security scans, test coverage)
- Quarterly constitution reviews to ensure relevance and effectiveness

**Complexity & Exception Handling**:
- Any feature requiring exception to constitutional principles MUST document:
  - Which principle is violated
  - Why the exception is necessary
  - What simpler alternative was considered and why it was rejected
  - Mitigation plan to minimize risk
  - Timeline to remove exception if temporary
- Exceptions require approval from tech lead and security officer

**References**:
- Runtime development guidance: `.github/prompts/*.prompt.md`
- Template files: `.specify/templates/*.md`
- Feature specifications: `/specs/[###-feature-name]/`

**Version**: 1.0.0 | **Ratified**: 2025-11-12 | **Last Amended**: 2025-11-12
