const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

let worker = null;

function workerRoot() {
    const packagedRoot = path.join(process.resourcesPath || "", "rank-yoinker");
    if (fs.existsSync(path.join(packagedRoot, "main.py"))) return packagedRoot;
    return path.join(__dirname, "..", "integrations", "rank-yoinker");
}

function startRankYoinker(send) {
    if (worker) return;

    const root = workerRoot();
    const python = process.env.RANK_YOINKER_PYTHON || "python";
    worker = spawn(python, [path.join(root, "main.py"), "--electron"], {
        cwd: root,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
    });

    let stdoutBuffer = "";
    const processOutput = (text) => {
        stdoutBuffer += text;
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() || "";
        for (const line of lines) {
            const cleanLine = line.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").trim();
            if (!cleanLine) continue;
            try {
                const message = JSON.parse(cleanLine);
                if (message.type === "server-ready") {
                    send("server-ready", message.viewerPort, message.websocketPort);
                    continue;
                }
            } catch {
                // Rank Checker writes human-readable Rich output as well as JSON.
            }
            send("output", cleanLine);
        }
    };

    worker.stdout.on("data", (chunk) => processOutput(chunk.toString("utf8")));
    worker.stderr.on("data", (chunk) => send("output", chunk.toString("utf8")));
    worker.on("error", (error) => {
        send("output", `Rank Checker could not start: ${error.message}`);
    });
    worker.on("exit", (code, signal) => {
        if (stdoutBuffer.trim()) send("output", stdoutBuffer);
        send("exit", code, signal);
        worker = null;
    });
}

function stopRankYoinker() {
    if (!worker) return;
    worker.kill();
    worker = null;
}

module.exports = {
    startRankYoinker,
    stopRankYoinker,
};
