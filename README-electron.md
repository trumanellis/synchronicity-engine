# Electron Integration

This project now includes a basic Electron desktop application that provides a GUI interface for running and viewing test results.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Launch the Electron app
npm run electron
```

## Features

- **Test Runner Interface**: Clean, modern UI for running all tests
- **Real-time Results**: View test output and results in a formatted display
- **Status Indicators**: Visual feedback for test success/failure
- **Monospace Output**: Terminal-style display for test output

## Available Scripts

- `npm run electron` - Launch the Electron app in development mode
- `npm run electron:pack` - Package the app for distribution (without publishing)
- `npm run electron:build` - Build the app for distribution

## File Structure

```
electron/
├── main.js           # Main Electron process (ES modules, window management, IPC)
├── preload.cjs       # Preload script (CommonJS - required by Electron)
├── renderer.html     # Main UI interface
└── renderer.js       # Frontend logic and test execution
```

## How It Works

1. **Main Process** (`main.js`): Creates the application window and handles IPC communication using ES modules
2. **Preload Script** (`preload.cjs`): Securely exposes IPC methods to the renderer (must be CommonJS)
3. **Renderer Process** (`renderer.html` + `renderer.js`): The UI that users interact with

## Test Execution

When you click "Run All Tests":

1. The renderer sends an IPC message to the main process
2. Main process spawns `npm test` as a child process
3. Test output is captured and sent back to the renderer
4. Results are parsed and displayed in a formatted interface

## Security

The app follows Electron security best practices:
- Context isolation enabled
- Node integration disabled in renderer
- Secure IPC communication via preload script

## ES Modules Support

This Electron setup uses ES modules in the main process, allowing you to:
- Use modern `import`/`export` syntax
- Share code between Node.js backend and Electron main process
- Maintain consistency with the rest of the project's module system

**Note**: Preload scripts must still use CommonJS because Electron doesn't support ES modules in the preload context yet.

## Next Steps

This ES module-compatible test runner interface provides a foundation for building more sophisticated Electron features, such as:
- File browser for exploring the codebase
- Configuration management UI
- Real-time OrbitDB/IPFS monitoring
- Interactive intention/blessing management
- Import and use Synchronicity Engine functions directly in the main process