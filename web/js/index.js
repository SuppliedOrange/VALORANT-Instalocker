const FAVORITES_KEY = "valorant-instalocker-favorites";
const MAX_FAVORITES = 3;

let agentOrder = [];
let favorites = [];
let menuAgent = null;

addEventListener("load", () => {
    fillAgentList();
    initiateSkewScroll();
    initializeSearch();
    initializeFavoritesMenu();
    initializeTerms();
    initializeBridge();
    initializeRankYoinker();

    if (typeof eel !== "undefined") {
        eel.expose(alertUser);
        eel.expose(askUserToChooseAgent);
        eel.expose(changeStatus);
        eel.expose(hideStopButton);
    }

    function initializeRankYoinker() {
        const instalockerView = document.getElementById("instalocker-view");
        const rankView = document.getElementById("rank-yoinker-view");
        const viewerPage = document.getElementById("rank-viewer-page");
        const statsPage = document.getElementById("rank-stats-page");
        const instalockerTab = document.getElementById("instalocker-tab");
        const rankTab = document.getElementById("rank-yoinker-tab");
        const viewerTab = document.getElementById("rank-viewer-tab");
        const statsTab = document.getElementById("rank-stats-tab");
        const outputToggle = document.getElementById("rank-output-toggle");
        const consolePanel = document.getElementById("rank-console");
        const frame = document.getElementById("rank-viewer-frame");
        const output = document.getElementById("rank-console-output");
        const statsState = document.getElementById("rank-stats-state");
        const api = bridge();
        let statsSocket = null;
        let statsPort = 1100;

        function setViewer(info) {
            if (!info || !info.viewerPort || !info.websocketPort) return;
            frame.src = `http://127.0.0.1:${info.viewerPort}/matchLoadouts.html?port=${info.websocketPort}`;
        }

        function appendOutput(line) {
            const row = document.createElement("div");
            row.className = "rank-output-line";
            row.textContent = line;
            output.appendChild(row);
            output.scrollTop = output.scrollHeight;
        }

        function showRankPage(page) {
            const stats = page === "stats";
            viewerPage.classList.toggle("hidden", stats);
            statsPage.classList.toggle("hidden", !stats);
            viewerTab.classList.toggle("active", !stats);
            statsTab.classList.toggle("active", stats);
        }

        function renderStats(payload) {
            if (!payload || typeof payload !== "object") return;
            const players = payload.players || payload.Players;
            const list = Array.isArray(players)
                ? players
                : players && typeof players === "object"
                    ? Object.values(players)
                    : [];
            const selfId = payload.puuid;
            const grid = document.getElementById("rank-player-grid");
            const rankNames = [
                "Unranked", "Unranked", "Unranked",
                "Iron 1", "Iron 2", "Iron 3",
                "Bronze 1", "Bronze 2", "Bronze 3",
                "Silver 1", "Silver 2", "Silver 3",
                "Gold 1", "Gold 2", "Gold 3",
                "Platinum 1", "Platinum 2", "Platinum 3",
                "Diamond 1", "Diamond 2", "Diamond 3",
                "Ascendant 1", "Ascendant 2", "Ascendant 3",
                "Immortal 1", "Immortal 2", "Immortal 3",
                "Radiant",
            ];
            const rankLabel = (rank) => {
                const numericRank = Number(rank);
                if (!Number.isInteger(numericRank) || !rankNames[numericRank]) return rank;
                if (numericRank < 3) return "UnR";
                if (numericRank === 27) return "RAD";
                const tierNames = ["I", "B", "S", "G", "P", "D", "A", "I"];
                const tier = Math.floor((numericRank - 3) / 3);
                const division = ((numericRank - 3) % 3) + 1;
                return `${tierNames[tier]}${division}`;
            };
            document.getElementById("rank-stats-state").innerText = payload.state || "UNKNOWN";
            document.getElementById("rank-match-summary").innerText =
                `${payload.mode || payload.queueId || "Unknown mode"} · ${list.length} players`;
            grid.replaceChildren();
            if (!list.length) {
                grid.innerHTML = '<div class="rank-empty-state">No players are available yet.</div>';
                return;
            }
            for (const player of list) {
                const card = document.createElement("article");
                card.className = `rank-player-card${player.puuid === selfId ? " current-player" : ""}`;
                const value = (key, fallback = "N/A") => player[key] === null || player[key] === undefined || player[key] === "" ? fallback : player[key];
                card.innerHTML = `
                    <div class="rank-player-heading">
                        <strong>${escapeHtml(value("name", "Unknown player"))}</strong>
                        <span>${player.puuid === selfId ? "YOU" : escapeHtml(value("relation", "player"))}</span>
                    </div>
                    <div class="rank-player-agent">${escapeHtml(value("agent", "Unknown agent"))}</div>
                    <div class="rank-player-metrics">
                        <div><small>Rank</small><b>${escapeHtml(rankLabel(value("rank")))}</b></div>
                        <div><small>RR</small><b>${escapeHtml(value("rr"))}</b></div>
                        <div><small>Peak</small><b>${escapeHtml(rankLabel(value("peakRank")))}</b></div>
                        <div><small>Level</small><b>${escapeHtml(value("level"))}</b></div>
                        <div><small>K/D</small><b>${escapeHtml(value("kd"))}</b></div>
                        <div><small>HS%</small><b>${escapeHtml(value("headshotPercentage"))}</b></div>
                        <div><small>Win rate</small><b>${escapeHtml(value("winPercentage"))}</b></div>
                        <div><small>Last active</small><b>${escapeHtml(value("lastActive"))}</b></div>
                    </div>`;
                grid.appendChild(card);
            }
        }

        function escapeHtml(value) {
            return String(value).replace(/[&<>"']/g, (character) => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
            }[character]));
        }

        function connectStats(port) {
            if (statsSocket) statsSocket.close();
            statsPort = port || 1100;
            statsSocket = new WebSocket(`ws://127.0.0.1:${statsPort}/`);
            statsSocket.addEventListener("message", (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === "heartbeat") renderStats(message.data || message);
                } catch {
                    // The embedded viewer remains responsible for its own payload handling.
                }
            });
        }

        const show = (rank) => {
            instalockerView.classList.toggle("hidden", rank);
            rankView.classList.toggle("hidden", !rank);
            instalockerTab.classList.toggle("active", !rank);
            rankTab.classList.toggle("active", rank);
        };

        instalockerTab.addEventListener("click", () => show(false));
        rankTab.addEventListener("click", () => show(true));
        viewerTab.addEventListener("click", () => showRankPage("viewer"));
        statsTab.addEventListener("click", () => showRankPage("stats"));
        statsState.addEventListener("click", () => showRankPage("viewer"));
        outputToggle.addEventListener("click", () => {
            const visible = consolePanel.classList.toggle("hidden");
            outputToggle.innerText = visible ? "Show output" : "Hide output";
            outputToggle.setAttribute("aria-expanded", String(!visible));
        });
        frame.addEventListener("load", () => {
            document.getElementById("rank-connection-status").innerText = "CONNECTED";
        });

        if (!api) return;
        api.onRankServerReady((viewerPort, websocketPort) => {
            setViewer({ viewerPort, websocketPort });
            appendOutput("Rank Checker viewer is ready.");
            connectStats(websocketPort);
        });
        api.onRankOutput((line) => {
            appendOutput(line);
        });
        api.onRankExit((code, signal) => {
            document.getElementById("rank-connection-status").innerText = "STOPPED";
            appendOutput(`Rank Checker stopped (${signal || `code ${code}`}).`);
        });
        setViewer({ viewerPort: 1101, websocketPort: 1100 });
        connectStats(1100);
        api.rankServerInfo().then((info) => {
            if (info) {
                setViewer(info);
                connectStats(info.websocketPort);
            }
        });
    }
});

function bridge() {
    return window.instalock || null;
}

function initializeBridge() {
    const api = bridge();
    if (!api) return;

    api.onAlert((line1, line2) => alertUser(line1, line2));
    api.onAskChoose(() => askUserToChooseAgent());
    api.onStatus((status) => changeStatus(status));
    api.onHideStop(() => hideStopButton());
    api.onUpdateStarted(() => changeStatus("DOWNLOADING UPDATE"));
    api.onUpdateProgress((percent) => changeStatus(`UPDATE ${Math.round(percent)}%`));
    api.onUpdateFinished(() => changeStatus("UPDATE READY"));
}

async function loadFavorites() {
    const api = bridge();
    let saved = [];
    if (api) {
        saved = await api.getFavorites();
    } else {
        try {
            saved = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
        } catch {
            saved = [];
        }
    }
    favorites = saved.filter((name) => agentOrder.includes(name)).slice(0, MAX_FAVORITES);
}

async function saveFavorites() {
    favorites = favorites.filter((name) => agentOrder.includes(name)).slice(0, MAX_FAVORITES);
    const api = bridge();
    if (api) {
        favorites = await api.setFavorites(favorites);
    } else {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
}

function fillAgentList() {
    fetch("./json/agents.json")
        .then((response) => response.json())
        .then(async (agentJSON) => {
            agentOrder = Object.keys(agentJSON);
            await loadFavorites();
            renderAgents();
        });
}

function createAgentRow(agent, isFavorite) {
    const agentDiv = document.createElement("div");
    agentDiv.className = isFavorite ? "agent favorite" : "agent";
    agentDiv.dataset.agent = agent;

    const thumbnail = document.createElement("img");
    thumbnail.className = "agent-thumb";
    thumbnail.src = `./assets/images/agent-banners/${agent.toLowerCase()}.png`;

    const name = document.createElement("p");
    if (isFavorite) {
        const star = document.createElement("span");
        star.className = "favorite-star";
        star.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2 9.8 5.1l4.2.5-3.1 2.9.8 4.2L8 10.6 4.3 12.7l.8-4.2L2 5.6l4.2-.5z"/></svg>';
        name.appendChild(star);
    }
    name.appendChild(document.createTextNode(agent));

    agentDiv.appendChild(thumbnail);
    agentDiv.appendChild(name);
    agentDiv.addEventListener("click", () => pickAgent(agent));
    agentDiv.addEventListener("contextmenu", (event) => openAgentMenu(event, agent));
    return agentDiv;
}

function renderAgents() {
    const root = document.getElementById("agents");
    root.replaceChildren();

    const favoriteNames = favorites.filter((name) => agentOrder.includes(name));
    const rest = agentOrder.filter((name) => !favoriteNames.includes(name));

    for (const agent of favoriteNames) {
        root.appendChild(createAgentRow(agent, true));
    }

    if (favoriteNames.length) {
        const split = document.createElement("div");
        split.className = "favorites-split";
        root.appendChild(split);
    }

    for (const agent of rest) {
        root.appendChild(createAgentRow(agent, false));
    }

    const search = document.getElementById("agent-search");
    if (search && search.value.trim()) {
        search.dispatchEvent(new Event("input"));
    }
}

function initializeFavoritesMenu() {
    const menu = document.getElementById("agent-menu");
    const action = document.getElementById("agent-menu-action");

    action.addEventListener("click", async (event) => {
        event.stopPropagation();
        if (!menuAgent) return;

        if (favorites.includes(menuAgent)) {
            favorites = favorites.filter((name) => name !== menuAgent);
        } else if (favorites.length >= MAX_FAVORITES) {
            changeStatus("3 FAVORITES MAX");
            closeAgentMenu();
            return;
        } else {
            favorites.push(menuAgent);
        }

        await saveFavorites();
        closeAgentMenu();
        renderAgents();
        document.getElementById("agents").scrollTop = 0;
    });

    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target)) closeAgentMenu();
    });
    document.addEventListener("scroll", closeAgentMenu, true);
}

function openAgentMenu(event, agent) {
    event.preventDefault();
    event.stopPropagation();
    menuAgent = agent;

    const menu = document.getElementById("agent-menu");
    const action = document.getElementById("agent-menu-action");
    action.innerText = favorites.includes(agent) ? "Unfavorite" : "Favorite";
    menu.classList.remove("hidden");

    const margin = 8;
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const left = Math.min(event.clientX, window.innerWidth - width - margin);
    const top = Math.min(event.clientY, window.innerHeight - height - margin);
    menu.style.left = `${Math.max(margin, left)}px`;
    menu.style.top = `${Math.max(margin, top)}px`;
}

function closeAgentMenu() {
    menuAgent = null;
    document.getElementById("agent-menu").classList.add("hidden");
}

async function initializeTerms() {
    const gate = document.getElementById("tos-gate");
    document.getElementById("tos-accept").addEventListener("click", async () => {
        const api = bridge();
        if (api) await api.acceptTos();
        gate.classList.add("hidden");
    });

    const api = bridge();
    if (!api) return;
    const accepted = await api.tosStatus();
    if (!accepted) gate.classList.remove("hidden");
}

function showTerms() {
    document.getElementById("tos-gate").classList.remove("hidden");
}

function alertUser(statusText = "", chosenAgentText = "") {
    gtag("event", `app_state_change_${statusText.split(" ").join("-")}_${chosenAgentText.split(" ").join("-")}`, {});

    document.getElementById("agent-preview").src = "./assets/images/slurp.gif";
    document.getElementById("status").innerText = statusText;
    document.getElementById("chosen-agent").innerText = chosenAgentText;
}

function askUserToChooseAgent() {
    document.getElementById("agent-preview").src = "./assets/images/slurp.gif";
    document.getElementById("status").innerText = "CHOOSE AN AGENT";
    document.getElementById("chosen-agent").innerText = "...";
}

function changeStatus(status) {
    gtag("event", `status_update_${status.split(" ").join("-")}`, {});

    if (status == "LOCKED") {
        gtag("event", `agent_locked_${document.getElementById("chosen-agent").innerText.split(" ").join("-")}`, {});
    }

    document.getElementById("status").innerText = status;
}

function initiateSkewScroll() {
    const section = document.querySelector("#agents");
    let currentPos = section.scrollTop;

    const update = () => {
        const newPos = section.scrollTop;
        let speed = (newPos - currentPos) * 0.3;
        if (speed > 10) speed = 10;
        if (speed < -10) speed = -10;
        section.style.transform = `skewY(${speed}deg)`;
        currentPos = newPos;
        requestAnimationFrame(update);
    };

    update();
}

function pickAgent(agent) {
    document.getElementById("status").innerText = "WAITING FOR PRE-GAME";
    document.getElementById("chosen-agent").innerText = agent.toUpperCase();
    document.getElementById("agent-preview").src = `./assets/images/agent-previews/${agent.toLowerCase()}-preview.gif`;
    showStopButton();

    gtag("event", `agent_selected_${agent.split(" ").join("-")}`, {});

    const api = bridge();
    if (api) api.tryLock(agent);
    else if (typeof eel !== "undefined") eel.try_lock(agent);
}

function initializeSearch() {
    const searchInput = document.getElementById("agent-search");

    function levenshteinDistance(s, t) {
        if (!s.length) return t.length;
        if (!t.length) return s.length;

        return Math.min(
            levenshteinDistance(s.substr(1), t) + 1,
            levenshteinDistance(t.substr(1), s) + 1,
            levenshteinDistance(s.substr(1), t.substr(1)) + (s.charAt(0).toLowerCase() !== t.charAt(0).toLowerCase() ? 1 : 0)
        );
    }

    searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const agents = document.querySelectorAll(".agent");
        let showAgents = [];
        let hideAgents = [];

        agents.forEach((agent) => {
            const agentName = agent.dataset.agent.toLowerCase();
            if (agentName.includes(searchTerm)) showAgents.push({ agent, agentName });
            else hideAgents.push({ agent, agentName });
        });

        if (showAgents.length == 0) {
            for (const agentStatus of hideAgents) {
                if (levenshteinDistance(searchTerm, agentStatus.agentName) < 3) {
                    showAgents.push(agentStatus);
                    hideAgents = hideAgents.filter((agent) => agent !== agentStatus);
                }
            }
        }

        for (const agentStatus of showAgents) agentStatus.agent.classList.remove("hidden");
        for (const agentStatus of hideAgents) agentStatus.agent.classList.add("hidden");

        const split = document.querySelector(".favorites-split");
        if (split) {
            const favoriteVisible = [...document.querySelectorAll(".agent.favorite")].some((agent) => !agent.classList.contains("hidden"));
            split.classList.toggle("hidden", !favoriteVisible);
        }
    });
}

function showStopButton() {
    const button = bootstrap.Collapse.getOrCreateInstance(document.getElementById("stop-button-flex-row"));
    button.show();
}

function hideStopButton() {
    const button = bootstrap.Collapse.getOrCreateInstance(document.getElementById("stop-button-flex-row"));
    button.hide();
}

function stopLocking() {
    const api = bridge();
    if (api) api.stopLock();
    else if (typeof eel !== "undefined") eel.stop_lock();
    askUserToChooseAgent();
}

function openExternal(url) {
    const api = bridge();
    if (api) api.openExternal(url);
    else if (typeof eel !== "undefined") return false;
    return true;
}

function openGithubNanda() {
    gtag("event", "social_clicked_github_nanda", {});
    if (!openExternal("https://github.com/Nanda070/")) eel.open_github_nanda();
}
