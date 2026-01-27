# Contributing to FoundLab Suite

We welcome contributions to the FoundLab Suite! As a tool built for high-stakes compliance and trust, we maintain high standards for code quality, security, and documentation.

## Development Workflow

1.  **Fork and Clone**: Fork the repo and clone it locally.
2.  **Branching**: Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  **Standards**:
    *   **Frontend**: Use functional React components, TypeScript, and Tailwind CSS. Ensure `types.ts` is updated.
    *   **Backend**: Follow PEP 8 for Python code. Ensure type hinting is used.
    *   **Veritas Protocol**: Any change to data handling MUST be reflected in the audit log logic. **Never bypass the VeritasObserver.**
4.  **Testing**: Run unit tests before pushing.
5.  **Commit Messages**: Use semantic commit messages (e.g., `feat: add sanctions list`, `fix: ocr parsing error`).

## Security Guidelines

*   **Zero-Persistence**: Do not add code that persists PII (Personally Identifiable Information) to disk without encryption and a retention policy.
*   **Secrets**: Never commit API keys or credentials. Use `.env` files.
*   **Dependencies**: Audit npm and pip packages for vulnerabilities.

## Pull Request Process

1.  Update the `README.md` with details of changes to the interface or architecture.
2.  Increase the version numbers in any examples files and the README to the new version that this Pull Request would represent.
3.  You may merge the Pull Request in once you have the sign-off of two other developers.

## Code of Conduct

We are committed to making participation in this project a harassment-free experience for everyone.
