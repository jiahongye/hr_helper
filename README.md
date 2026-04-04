<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/69677ad8-6cd2-4a78-879b-0f22018de3d1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment

This project uses an automated GitHub Action to deploy to GitHub Pages.
- Workflow file: `.github/workflows/deploy.yml`
- Upon pushing to the `main` branch, it automatically builds and uploads the `dist` folder to GitHub Pages.

## Git Ignore

A detailed `.gitignore` is configured to prevent uploading unnecessary directories (`node_modules`, `dist`), temporary editor files (`.vscode`, `.DS_Store`), and sensitive environments files (`.env*`).
