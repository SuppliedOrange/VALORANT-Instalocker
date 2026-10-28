const fs = require("fs");
const https = require("https");
const path = require("path");
const { execFile } = require("child_process");

const REGION_SHARD = { latam: "na", br: "na" };
const SHARD_REGION = { pbe: "na" };
const VALID_REGIONS = ["na", "eu", "latam", "br", "ap", "kr", "pbe"];
const CLIENT_PLATFORM = "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";
const PROCESS_NAMES = ["VALORANT.exe", "VALORANT-Win64-Shipping.exe", "VALORANT-Win32-Shipping.exe"];

function request(method, url, headers, body) {
    return new Promise((resolve, reject) => {
        const target = new URL(url);
        const req = https.request({
            method,
            hostname: target.hostname,
            port: target.port,
            path: `${target.pathname}${target.search}`,
            headers,
            rejectUnauthorized: false,
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                resolve({
                    status: res.statusCode,
                    text: Buffer.concat(chunks).toString("utf8"),
                });
            });
        });
        req.on("error", reject);
        if (body) req.write(body);
        req.end();
    });
}

function readJson(text) {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function valorantRunning() {
    return new Promise((resolve) => {
        execFile("tasklist", ["/FO", "CSV", "/NH"], { windowsHide: true }, (error, stdout) => {
            if (error) {
                resolve(false);
                return;
            }
            const listing = String(stdout).toLowerCase();
            resolve(PROCESS_NAMES.some((name) => listing.includes(name.toLowerCase())));
        });
    });
}

function readRegion() {
    const logPath = path.join(process.env.LOCALAPPDATA || "", "VALORANT", "Saved", "Logs", "ShooterGame.log");
    const content = fs.readFileSync(logPath);
    const text = content.toString("latin1");
    const regionMatch = text.match(/regions\/([^\]]+)/);
    if (regionMatch) return regionMatch[1];
    const configMatch = text.match(/config\/([^\]]+)/);
    if (configMatch) return configMatch[1];
    return null;
}

function readLockfile() {
    const lockPath = path.join(process.env.LOCALAPPDATA || "", "Riot Games", "Riot Client", "Config", "lockfile");
    const parts = fs.readFileSync(lockPath, "utf8").trim().split(":");
    const keys = ["name", "pid", "port", "password", "protocol"];
    return Object.fromEntries(keys.map((key, index) => [key, parts[index]]));
}

async function clientVersion() {
    const response = await request("GET", "https://valorant-api.com/v1/version", {});
    const data = readJson(response.text);
    if (!data || !data.data) throw new Error("Could not read the Valorant client version");
    const info = data.data;
    return `${info.branch}-shipping-${info.buildVersion}-${info.version.split(".")[3]}`;
}

async function createClient(regionName) {
    let region = String(regionName || "").toLowerCase();
    if (!VALID_REGIONS.includes(region)) throw new Error("Invalid region");
    let shard = REGION_SHARD[region] || region;
    if (SHARD_REGION[shard]) region = SHARD_REGION[shard];

    const lockfile = readLockfile();
    const version = await clientVersion();
    const localHeaders = {
        Authorization: `Basic ${Buffer.from(`riot:${lockfile.password}`).toString("base64")}`,
    };
    const tokenResponse = await request(
        "GET",
        `https://127.0.0.1:${lockfile.port}/entitlements/v1/token`,
        localHeaders
    );
    const entitlements = readJson(tokenResponse.text);
    if (!entitlements || !entitlements.accessToken) throw new Error("Could not read Riot entitlements");

    const headers = {
        Authorization: `Bearer ${entitlements.accessToken}`,
        "X-Riot-Entitlements-JWT": entitlements.token,
        "X-Riot-ClientPlatform": CLIENT_PLATFORM,
        "X-Riot-ClientVersion": version,
    };
    const glz = `https://glz-${region}-1.${shard}.a.pvp.net`;

    async function localGet(endpoint) {
        const response = await request("GET", `https://127.0.0.1:${lockfile.port}${endpoint}`, localHeaders);
        const data = readJson(response.text);
        if (data == null) throw new Error(`Local request failed (${response.status})`);
        return data;
    }

    async function glzGet(endpoint) {
        const response = await request("GET", `${glz}${endpoint}`, headers);
        if (response.status === 404) throw new Error("You are not in a pre-game");
        const data = readJson(response.text);
        if (data == null) throw new Error(`Pregame request failed (${response.status})`);
        return data;
    }

    async function glzPost(endpoint) {
        const response = await request("POST", `${glz}${endpoint}`, { ...headers, "Content-Type": "application/json" }, "{}");
        if (response.status === 404) throw new Error("You are not in a pre-game");
        return readJson(response.text);
    }

    return {
        puuid: entitlements.subject,
        async fetchPresence() {
            const data = await localGet("/chat/v4/presences");
            const mine = (data.presences || []).find((presence) => presence.puuid === entitlements.subject);
            if (!mine || !mine.private) return null;
            return JSON.parse(Buffer.from(mine.private, "base64").toString("utf8"));
        },
        async pregamePlayer() {
            return glzGet(`/pregame/v1/players/${entitlements.subject}`);
        },
        async pregameMatch() {
            const player = await glzGet(`/pregame/v1/players/${entitlements.subject}`);
            return glzGet(`/pregame/v1/matches/${player.MatchID}`);
        },
        select(agentId) {
            return this.pregamePlayer().then((player) => glzPost(`/pregame/v1/matches/${player.MatchID}/select/${agentId}`));
        },
        lock(agentId) {
            return this.pregamePlayer().then((player) => glzPost(`/pregame/v1/matches/${player.MatchID}/lock/${agentId}`));
        },
    };
}

module.exports = {
    valorantRunning,
    readRegion,
    createClient,
};
