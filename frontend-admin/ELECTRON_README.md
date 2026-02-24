# Optima HR - Desktop App (Electron)

This folder contains the configuration and source code for the Optima HR Desktop Application (macOS & Windows).

## Prerequisites

- **Node.js**: v16+
- **Yarn** or **npm**
- **GH_TOKEN**: Required for publishing releases to GitHub (auto-update).

## Installation

```bash
cd frontend
npm install
```

## Running in Development

Starts the React app (Vite) and Electron main process concurrently.

```bash
npm run electron:dev
```

## Building for Production

Builds the React app and packages it into an executable (`.dmg` for Mac, `.exe` for Windows).

### Build Both (Mac & Windows)
```bash
npm run electron:build
```

### Build Specific Platform
```bash
# Mac (DMG + Zip)
npm run electron:build -- --mac

# Windows (NSIS Installer)
npm run electron:build -- --win
```

**Output:** The installers will be in the `release` folder (e.g., `frontend/release/Optima HR-1.0.0.dmg`).

## Auto-Update Configuration

The app is configured to check for updates from the GitHub repository releases.

1.  **Generate Token**: Create a GitHub Personal Access Token (classic) with `repo` scope.
2.  **Set Environment**: Export `GH_TOKEN` in your terminal before building/publishing.
    ```bash
    export GH_TOKEN="your_github_token"
    ```
3.  **Publish**:
    ```bash
    npm run electron:publish
    ```
    This will build the app and upload the artifacts to a draft release on GitHub.

## Folder Structure

-   `electron/`: Main process code (`main.js`, `preload.js`).
-   `public/`: Static assets (icons).
-   `src/hooks/useElectron.js`: React hook for Electron API.
-   `src/components/layout/ElectronTitleBar.js`: Custom drag region for Mac.

## Notes

-   **macOS**: The app uses `hiddenInset` title bar style. Traffic lights are overlayed on the top-left sidebar.
-   **Windows**: Uses standard frame for now, but configured for NSIS installer.
-   **Icons**: Ensure `public/icon.icns` (Mac) and `public/icon.ico` (Windows) are present for high-quality icons. Currently using `logo3.png` as fallback.
