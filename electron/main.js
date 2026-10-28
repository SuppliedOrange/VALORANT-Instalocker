const { app, BrowserWindow, ipcMain, shell, dialog, screen } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("fs");
const path = require("path");
const { valorantRunning, readRegion, createClient } = require("./valorant");
const { startRankYoinker, stopRankYoinker } = require("./rankYoinker");

const WINDOW_WIDTH = 857;
const WINDOW_HEIGHT = 442;
const LOOP_DELAY_MS = 3000;
const MAX_FAVORITES = 3;
const ALLOWED_HOSTS = new Set(["github.com", "www.instagram.com", "discord.com", "www.google.com"]);

let win;
let running = false;
let agentCode = null;
let seenMatches = [];
let loopToken = 0;
let rankServerInfo = null;

function appFile(...parts) {
    return path.join(app.getAppPath(), ...parts);
}

function configPath() {
    return path.join(app.getPath("userData"), "config.json");
}

function favoritesPath() {
    return path.join(app.getPath("userData"), "favorites.json");
}

function readConfig() {
    try {
        return JSON.parse(fs.readFileSync(configPath(), "utf8"));
    } catch {
        return {};
    }
}

function writeConfig(config) {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

function agentCatalog() {
    return JSON.parse(fs.readFileSync(appFile("web", "json", "agents.json"), "utf8"));
}

function readFavorites() {
    const catalog = agentCatalog();
    try {
        const saved = JSON.parse(fs.readFileSync(favoritesPath(), "utf8"));
        if (!Array.isArray(saved)) return [];
        return saved.filter((name) => Object.prototype.hasOwnProperty.call(catalog, name)).slice(0, MAX_FAVORITES);
    } catch {
        return [];
    }
}

function writeFavorites(favorites) {
    const catalog = agentCatalog();
    const clean = [];
    for (const name of favorites) {
        if (typeof name !== "string" || !Object.prototype.hasOwnProperty.call(catalog, name)) continue;
        if (clean.includes(name) || clean.length >= MAX_FAVORITES) continue;
        clean.push(name);
    }
    fs.mkdirSync(path.dirname(favoritesPath()), { recursive: true });
    fs.writeFileSync(favoritesPath(), JSON.stringify(clean, null, 2));
    return clean;
}

function send(channel, ...args) {
    if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopLock() {
    running = false;
    agentCode = null;
    loopToken += 1;
    send("hide-stop");
}

async function alertUser(line1, line2, waitMs) {
    send("alert-user", line1, line2);
    await sleep(waitMs);
    send("ask-choose");
}

async function tryLock(agentName) {
    const catalog = agentCatalog();
    if (!Object.prototype.hasOwnProperty.call(catalog, agentName)) {
        await alertUser("UNKNOWN AGENT", agentName, 3000);
        return;
    }

    if (!(await valorantRunning())) {
        if (running) stopLock();
        await alertUser("TURN VALORANT ON", "YOU CLOWN", 3000);
        return;
    }

    let region;
    try {
        region = readRegion();
    } catch {
        region = null;
    }
    if (!region) {
        if (running) stopLock();
        await alertUser("COULD NOT FIND REGION", "TRY LOGGING IN AGAIN", 5000);
        return;
    }

    if (running) {
        agentCode = catalog[agentName];
        return;
    }

    let client;
    try {
        client = await createClient(region);
    } catch (error) {
        await alertUser("COULD NOT INITIALIZE", "A VALCLIENT", 5000);
        return;
    }

    running = true;
    agentCode = catalog[agentName];
    const token = ++loopToken;

    while (running && token === loopToken) {
        await sleep(LOOP_DELAY_MS);
        if (!running || token !== loopToken) return;

        try {
            const presence = await client.fetchPresence();
            const sessionState = presence && presence.matchPresenceData && presence.matchPresenceData.sessionLoopState;
            const match = await client.pregameMatch();
            const matchId = match && match.ID;

            if (sessionState === "PREGAME" && matchId && !seenMatches.includes(matchId)) {
                seenMatches.push(matchId);
                send("change-status", "LOCKING");
                await client.select(agentCode);
                await client.lock(agentCode);
                stopLock();
                send("change-status", "LOCKED");
                return;
            }
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            if (message.includes("not in a pre-game")) continue;
            await alertUser("ERROR", message, 5000);
            stopLock();
            return;
        }
    }
}

function setupAutoUpdater() {
    if (!app.isPackaged) return;

    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();

    autoUpdater.on("update-available", (info) => {
        dialog.showMessageBox(win, {
            type: "info",
            title: "Update available",
            message: `VALORANT Utils ${info.version} is available. Download it now?`,
            buttons: ["Update", "Later"],
            defaultId: 0,
            cancelId: 1,
        }).then((result) => {
            if (result.response === 0) {
                send("update-download-started");
                autoUpdater.downloadUpdate();
            }
        });
    });

    autoUpdater.on("download-progress", (progress) => {
        send("update-download-progress", progress.percent);
        if (win) win.setProgressBar(progress.percent / 100);
    });

    autoUpdater.on("update-downloaded", () => {
        if (win) win.setProgressBar(-1);
        send("update-download-finished");
        dialog.showMessageBox(win, {
            type: "question",
            title: "Install update",
            message: "The update is ready. The app will restart to finish installing it.",
            buttons: ["Restart and install"],
        }).then(() => {
            setImmediate(() => autoUpdater.quitAndInstall());
        });
    });

    autoUpdater.on("error", (error) => {
        if (win) win.setProgressBar(-1);
        dialog.showErrorBox("Update failed", error == null ? "Unknown error" : (error.stack || error).toString());
    });
}

function createWindow() {
    const scale = screen.getPrimaryDisplay().scaleFactor || 1;
    win = new BrowserWindow({
        width: Math.round(WINDOW_WIDTH / scale),
        height: Math.round(WINDOW_HEIGHT / scale),
        minWidth: Math.round(720 / scale),
        minHeight: Math.round(420 / scale),
        backgroundColor: "#0f0e11",
        autoHideMenuBar: true,
        icon: appFile("web", "favicon.ico"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    win.loadFile(appFile("web", "index.html"));
}

app.whenReady().then(() => {
    createWindow();
    setupAutoUpdater();
    startRankYoinker((event, ...args) => {
        if (event === "server-ready") {
            rankServerInfo = { viewerPort: args[0], websocketPort: args[1] };
        }
        send(`rank-${event}`, ...args);
    });

    ipcMain.on("try-lock", (_event, agentName) => {
        tryLock(agentName);
    });
    ipcMain.on("stop-lock", () => stopLock());
    ipcMain.on("open-external", (_event, url) => {
        try {
            const target = new URL(url);
            if (target.protocol === "https:" && ALLOWED_HOSTS.has(target.hostname)) {
                shell.openExternal(target.href);
            }
        } catch {
            // Ignore malformed addresses from the page.
        }
    });
    ipcMain.handle("get-favorites", () => readFavorites());
    ipcMain.handle("set-favorites", (_event, favorites) => writeFavorites(favorites));
    ipcMain.handle("tos-status", () => Boolean(readConfig().tosAccepted));
    ipcMain.handle("accept-tos", () => {
        const config = readConfig();
        config.tosAccepted = true;
        config.tosAcceptedAt = new Date().toISOString();
        writeConfig(config);
        return true;
    });
    ipcMain.handle("get-terms", () => fs.readFileSync(appFile("TERMS.txt"), "utf8"));
    ipcMain.handle("rank-server-info", () => rankServerInfo);
});

app.on("window-all-closed", () => {
    stopRankYoinker();
    app.quit();
});
