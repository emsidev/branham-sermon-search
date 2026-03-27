# the table search

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Electron (desktop shell)

## Desktop (WSL)

Use WSL as the primary shell for desktop commands.

```sh
npm run dev:desktop
npm run build:desktop
npm run dist:desktop
```

Notes:

- `dev:desktop` runs Vite + Electron.
- `dist:desktop` builds a Windows NSIS installer into `release/` via Docker (`electronuserland/builder:wine`).
- Optional share-link mapping from desktop URLs to web URLs is controlled by `VITE_PUBLIC_WEB_BASE_URL`.

## Local-first data

The app now supports a local-first data flow through a shared `DataPort` abstraction.

- Desktop uses Electron IPC (`window.desktopData`) backed by SQLite files in `app.getPath('userData')`.
- Web uses a worker-backed SQLite store with local persistence. If local storage initialization fails for a tab, that tab runs without offline sermon data.
- Media (`pdf_source_path`, `audio_url`) remains remote in v1 and requires internet access.

### SQLite data scripts

```sh
npm run build:content-sqlite
```

- `build:content-sqlite` creates `public/data/content.sqlite` and `public/data/content-manifest.json`.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
