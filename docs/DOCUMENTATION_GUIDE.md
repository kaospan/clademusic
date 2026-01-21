# Documentation Structure

This document outlines the organization of CladeAI's documentation.

## 📁 Documentation Files

### Root Level
- [README.md](../README.md) — Project overview, quick start, features summary
- [CHANGELOG.md](../CHANGELOG.md) — Version history, recent changes, bug fixes
- [TASKS.md](../TASKS.md) — Current progress, in-progress work, backlog

### /docs Directory

#### User Guides
- [index.md](index.md) — Documentation homepage with navigation
- [features.md](features.md) — **Complete feature list** with detailed descriptions
- [usage.md](usage.md) — How to use the app (user perspective)
- [getting-started.md](getting-started.md) — Installation and setup
- [faq.md](faq.md) — Frequently asked questions

#### Developer Guides
- [development.md](development.md) — Local development workflow
- [tech-stack.md](tech-stack.md) — Technologies used
- [testing.md](testing.md) — Testing with Vitest and Cypress
- [build.md](build.md) — Production builds
- [deployment.md](deployment.md) — Deployment to GitHub Pages and hosting
- [contributing.md](contributing.md) — Contribution guidelines

#### Architecture Documents
- [HARMONIC_ANALYSIS_ARCHITECTURE.md](HARMONIC_ANALYSIS_ARCHITECTURE.md) — **Core system design** (35KB, comprehensive)
  - Relative theory data model
  - Hybrid analysis pipeline
  - Similarity engine algorithm
  - Database schema
  - Performance targets
  - Code organization
  
- [ARCHITECTURE_SUMMARY.md](ARCHITECTURE_SUMMARY.md) — Quick reference (12KB)
  - Implementation status
  - Technical decisions
  - Version history

#### Feature-Specific Docs
- [SONG_SECTIONS.md](SONG_SECTIONS.md) — Section navigation and timestamp jumping
- [EDGE_FUNCTION_SETUP_2FA.md](EDGE_FUNCTION_SETUP_2FA.md) — 2FA setup edge function
- [EDGE_FUNCTION_VERIFY_2FA.md](EDGE_FUNCTION_VERIFY_2FA.md) — 2FA verification edge function
- [SECURITY_FIXES_SUMMARY.md](SECURITY_FIXES_SUMMARY.md) — Security improvements log

#### Legal
- [license.md](license.md) — MIT License

## 📋 When to Update Documentation

### Always Update

| Change Type | Files to Update | Example |
|-------------|-----------------|---------|
| **New Feature** | README.md, features.md, TASKS.md, CHANGELOG.md | Added harmonic analysis → Update all 4 |
| **Bug Fix** | CHANGELOG.md, TASKS.md (if tracked) | Fixed z-index issue → Log in changelog |
| **Architecture Change** | HARMONIC_ANALYSIS_ARCHITECTURE.md, ARCHITECTURE_SUMMARY.md | Changed pipeline → Update both |
| **Breaking Change** | CHANGELOG.md, README.md, migration guide | API change → Document thoroughly |

### Recommended Updates

| Change Type | Files to Update |
|-------------|-----------------|
| **UI Improvement** | features.md, CHANGELOG.md |
| **Performance Optimization** | ARCHITECTURE_SUMMARY.md, CHANGELOG.md |
| **Dependency Update** | tech-stack.md, CHANGELOG.md |
| **Configuration Change** | getting-started.md, development.md |

### Optional Updates

| Change Type | Files to Update |
|-------------|-----------------|
| **Code Refactoring** | CHANGELOG.md (if significant) |
| **Test Addition** | testing.md (if new approach) |
| **Documentation Fix** | Document itself only |

## 🔄 Documentation Workflow

### 1. Feature Development
```bash
# While coding
- Update TASKS.md: Move task to "In Progress"
- Document technical decisions in code comments

# After completion
- Update TASKS.md: Move task to "Completed"
- Add entry to CHANGELOG.md (Unreleased section)
- Update features.md with user-facing description
- Update README.md if it's a major feature
- Update architecture docs if system design changed
```

### 2. Bug Fix
```bash
# After fix
- Add entry to CHANGELOG.md (Fixed section)
- Update TASKS.md if it was tracked
- Update relevant docs if behavior changed
```

### 3. Architecture Change
```bash
# During design
- Document decision in ARCHITECTURE_SUMMARY.md
- Update HARMONIC_ANALYSIS_ARCHITECTURE.md if relevant

# After implementation
- Update code comments with references to docs
- Add migration notes if breaking changes
```

### 4. Release
```bash
# Before release
- Update CHANGELOG.md: Move Unreleased to new version
- Update version numbers in package.json
- Update README.md badges if needed
- Review all docs for accuracy

# After release
- Create Git tag
- Update GitHub release notes
- Announce changes
```

## 📝 Documentation Standards

### File Naming
- Use kebab-case for multi-word files: `harmonic-analysis.md`
- Use SCREAMING_SNAKE_CASE for root docs: `CHANGELOG.md`, `TASKS.md`
- Use descriptive names: `HARMONIC_ANALYSIS_ARCHITECTURE.md` not `arch.md`

### Content Structure
```markdown
# Title

Brief overview paragraph

## Section 1
Content with examples

## Section 2
More content

---

**Last Updated**: YYYY-MM-DD  
**Version**: X.Y.Z
```

### Code Examples
- Always include TypeScript types
- Show both success and error cases
- Include comments explaining key concepts
- Use real examples from the codebase

### Links
- Use relative links: `[features](features.md)`
- Link to code: `[src/types/harmony.ts](../src/types/harmony.ts)`
- Link to GitHub issues: `[#123](https://github.com/repoisrael/cladeai/issues/123)`

## 🎯 Documentation Goals

### For Users
- **Quick Start** in under 5 minutes (README.md)
- **Feature Discovery** with screenshots (features.md)
- **Troubleshooting** common issues (faq.md)

### For Contributors
- **Architecture Understanding** (HARMONIC_ANALYSIS_ARCHITECTURE.md)
- **Development Setup** (getting-started.md, development.md)
- **Testing Guidelines** (testing.md)
- **Contribution Process** (contributing.md)

### For Maintainers
- **Version History** (CHANGELOG.md)
- **Technical Decisions** (ARCHITECTURE_SUMMARY.md)
- **Roadmap** (TASKS.md)

## 📊 Documentation Metrics

### Current Stats (Jan 2026)
- Total documentation files: 20+
- Architecture docs: 2 comprehensive files (47KB combined)
- User guides: 6 files
- Developer guides: 5 files
- Feature coverage: 95%+ documented

### Quality Checklist
- [ ] All new features documented within 24 hours
- [ ] Changelog updated with every commit
- [ ] Architecture docs reflect current implementation
- [ ] Code examples compile without errors
- [ ] Links verified (no 404s)
- [ ] Dates accurate (Last Updated footer)

---

**Maintained by**: CladeAI Engineering Team  
**Last Updated**: January 21, 2026
