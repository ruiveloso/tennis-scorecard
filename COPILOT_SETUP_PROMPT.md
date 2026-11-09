# First prompt for your GitHub Copilot session

Open this folder in your editor or Copilot session, then paste everything below the line.

---

You are setting up and maintaining this project: a tennis scoring web app (React, Vite, TypeScript). Read `.github/copilot-instructions.md` and `docs/FEATURES.md` first.

Do these in order, and tell me the result of each step. Do not claim something works unless you ran it.

1. Run `npm install`, `npm run typecheck`, `npm run build`. Fix anything that fails with the smallest change.
2. Run `npm run dev`, open the app and check: start a match, score a few points, undo, open History and Coach, and Settings → Save backup.
3. Initialise git if needed, make the first commit on `main`, and create a GitHub repository named `tennis-scorecard` under my account. Ask me before choosing public or private. (GitHub Pages on a free account needs a public repository.) Push `main`.
4. Turn on GitHub Pages with the source set to **GitHub Actions** (Settings → Pages), or with `gh api`. The workflow in `.github/workflows/pages.yml` builds and deploys on every push to `main`.
5. Wait for the workflow to finish, then give me the live address (https://<user>.github.io/tennis-scorecard/). Check it loads and that `manifest.webmanifest` and `sw.js` are served.
6. Tell me how to install it on my phone (iPhone: Safari, Share, Add to Home Screen; Android: Chrome, Install app).

Rules: never ask me to paste a password or token into the chat. If a step needs me to sign in or approve something, tell me exactly what to click. Do not add tracking or a required sign-in.

After setup, I will ask for changes. The backlog is at the end of `.github/copilot-instructions.md`. Start with item 1 (CSV and Excel export) when I say so.
