# my_flutter_app

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## CI & Running Tests Locally

This repository includes Firebase Cloud Functions and test scenarios that run against the Firebase Emulators.

Prerequisites (local):
- Node.js 16+ and npm
- Firebase CLI

Local test run (functions):

1. Open a PowerShell or terminal and install dependencies:

```powershell
cd C:\Users\fwfw9\devlopment\my_flutter_app\functions
npm install
```

2. Start Firebase emulators (Functions + Firestore):

```powershell
npm run start
# or: npx firebase emulators:start --only functions,firestore
```

3. In a second terminal run the booking scenario tests:

```powershell
cd C:\Users\fwfw9\devlopment\my_flutter_app\functions
npm run test:booking:scenarios
```

Notes:
- The CI workflow (`.github/workflows/ci.yml`) runs the same scenarios on GitHub Actions and uploads the test log as an artifact.
- For local webhook/payment tests we use fake Stripe identifiers; do NOT use real secret keys in this test environment.
- To run the emulators with Stripe secrets locally, set Firebase functions config or environment variables as needed.

If you want, I can add a `CONTRIBUTING.md` with more developer conventions and how to open a PR.

## Repository labels & templates

This repo includes PR/Issue templates and helper scripts/workflows to manage labels.

Create or update labels (two options):

- Run locally using GitHub CLI (recommended for one-off runs):

```powershell
gh auth login
cd C:\Users\fwfw9\devlopment\my_flutter_app
.\scripts\create_labels.ps1
```

```bash
gh auth login
cd /path/to/my_flutter_app
bash scripts/create_labels.sh
```

- Run the GitHub Actions workflow once (from the Actions tab):

1. Go to the repository Actions → `Create Repository Labels` workflow.
2. Click "Run workflow" to create/update labels from `.github/labels/labels.json`.

PR templates are available under `.github/PULL_REQUEST_TEMPLATE/` and Issue templates under `.github/ISSUE_TEMPLATE/`.

If you'd like, I can add this section to `CONTRIBUTING.md` as well.
