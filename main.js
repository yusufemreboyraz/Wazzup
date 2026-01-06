const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextApp;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
    });

    const startUrl = process.env.ELECTRON_START_URL || 'https://wazzup-seven.vercel.app';

    const loadApp = () => {
        mainWindow.loadURL(startUrl).catch(() => {
            console.log("Waiting for Next.js to start...");
            setTimeout(loadApp, 1000);
        });
    };

    loadApp();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function startNextJs() {
    // In Production (Packaged), we might want to spawn the server.
    // However, bundling 'bun' or 'node' + 'next' is complex.
    // For this assignment, we will assume the server is started separately OR
    // we try to spawn it if we are in dev.

    // Simple approach: Expect localhost:3000 to be running.
    // If not, maybe show a "Start Server" dialog?
    // Let's try to spawn 'bun start' if we can find the executable.

    // For now: Just create window.
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
