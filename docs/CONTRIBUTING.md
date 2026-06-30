# 🤝 Contributing Guidelines

We appreciate your interest in contributing to BakaTracker! Follow this guide to submit bug reports, suggest features, and commit code changes.

---

## 🌿 Branching Strategy

* **`main` Branch:** Protected. Represents production-ready code. Direct commits are blocked.
* **Feature Branches:** Create branches off `main` using descriptive name tags:
  * Features: `feature/your-feature-name`
  * Bugfixes: `bugfix/issue-description`
  * Refactoring: `refactor/target-component`
  * Docs: `docs/manual-updates`

---

## ✍️ Semantic Commit Messages

We enforce **Conventional Commits** to keep the project history clear and automate changelog updates. Commit format:
```
<type>(<scope>): <short description>
```

### Types
* `feat`: A new feature (e.g. `feat(habits): add habit archiving toggle`).
* `fix`: A bug fix (e.g. `fix(mcp): await async tool listing during boot`).
* `docs`: Documentation changes (e.g. `docs(deploy): add Cloud Run guides`).
* `style`: Styling adjustments (e.g. `style(ui): fix mobile z-index overlap`).
* `refactor`: Code changes that neither fix a bug nor add a feature.
* `test`: Adding or correcting tests.
* `chore`: Maintenance modifications (e.g. updating package locks).

---

## 🛠️ Pull Request (PR) Process

1. **Fork the Repository:** Create a personal fork and clone it.
2. **Develop locally:** Create a feature branch and implement changes following the coding standards in [DEVELOPMENT.md](DEVELOPMENT.md).
3. **Verify locally:** Confirm frontend `npm run lint` and `npm run build` pass, and verify backend startup checks boot cleanly.
4. **Create a Pull Request:** Open a PR against BakaTracker's `main` branch.
5. **Describe Changes:** Use the PR template explaining:
   * **Problem:** What issue is this fixing/resolving?
   * **Solution:** Technical implementation summary.
   * **Testing:** How did you verify the changes? (Attach screenshots if UI changed).
6. **Code Review:** A maintainer must approve the PR. Resolve all review feedback.
7. **Squash and Merge:** Once approved and CI/CD checks pass, the PR will be squashed and merged.

---

## 📜 Code of Conduct
* Be respectful and inclusive of all contributors.
* Provide constructive, polite, and technical feedback in code reviews.
* Focus on creating clear, maintainable, and low-friction productivity workflows.
