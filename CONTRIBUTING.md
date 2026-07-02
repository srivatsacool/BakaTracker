# Contributing to BakaTracker

Thank you for your interest in contributing to BakaTracker! We welcome contributions from developers of all skill levels to help make BakaTracker a better ADHD-friendly life operating system and RPG planner.

---

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and welcoming to all contributors.
- Collaborate constructively and avoid personal attacks.
- Focus on what is best for the community and project.

---

## How Can I Contribute?

### 1. Reporting Bugs
If you find a bug, please open an issue on GitHub and include:
- A clear, descriptive title.
- Steps to reproduce the issue.
- Your environment details (OS, Node version, Python version).
- Expected vs. actual behavior.

### 2. Suggesting Features
Have an idea for BakaTracker? We'd love to hear it! Open an issue describing:
- What problem this feature solves.
- How you imagine it working.
- Any mockups or references.

### 3. Submitting Pull Requests
1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Write clean, documented code.
3. Verify your changes locally.
   - For backend, format code with `ruff` or `black` and run tests if applicable.
   - For frontend, run `npm run lint` and verify build with `npm run build`.
4. Commit your changes with descriptive messages:
   ```bash
   git commit -m "feat: add user quest streaks capability"
   ```
5. Push to your fork and submit a Pull Request to the `main` branch.

---

## Local Development Setup

Refer to the main [README.md](README.md) for full instructions on setting up:
- The React + Vite frontend environment.
- The FastAPI + FastMCP backend environment.
- The Google Sheets and Apps Script database layer.
