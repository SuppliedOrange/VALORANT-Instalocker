const WEAPON_COLUMNS = [
    {
        className: "weapon-column-sidearms",
        groups: [
            {
                title: "Sidearms",
                slug: "sidearms",
                weapons: [
                    "Classic",
                    "Shorty",
                    "Frenzy",
                    "Ghost",
                    "Bandit",
                    "Sheriff",
                ],
            },
        ],
    },
    {
        className: "weapon-column-smgs",
        groups: [
            {
                title: "SMGs",
                slug: "smgs",
                weapons: [
                    "Stinger",
                    "Spectre",
                ],
            },
            {
                title: "Shotguns",
                slug: "shotguns",
                weapons: [
                    "Bucky",
                    "Judge",
                ],
            },
        ],
    },
    {
        className: "weapon-column-rifles",
        groups: [
            {
                title: "Rifles",
                slug: "rifles",
                weapons: [
                    "Bulldog",
                    "Guardian",
                    "Warden",
                    "Phantom",
                    "Vandal",
                ],
            },
            {
                title: "Melee",
                slug: "melee",
                weapons: [
                    "Melee",
                ],
            },
        ],
    },
    {
        className: "weapon-column-heavy",
        groups: [
            {
                title: "Sniper Rifles",
                slug: "sniper-rifles",
                weapons: [
                    "Marshal",
                    "Outlaw",
                    "Operator",
                ],
            },
            {
                title: "Machine Guns",
                slug: "machine-guns",
                weapons: [
                    "Ares",
                    "Odin",
                ],
            },
        ],
    },
];


const CACHE_KEY = "vry.matchLoadouts.cache";
const SETTINGS_KEY = "vry.matchLoadouts.settings";

const DEFAULT_PORT = "1100";


const DEFAULT_SETTINGS = {
    showEnemies: true,
    teamLayout: "separate",
    showPreviews: true,
    showTeam: true,

    previewWeapons: [
        "Vandal",
        "Phantom",
        "Sheriff",
    ],

    showExpressions: true,
    showPlayerCard: true,
    showBuddies: true,
};


const ALL_WEAPONS = WEAPON_COLUMNS.flatMap(
    (column) =>
        column.groups.flatMap(
            (group) => group.weapons
        )
);


const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


const state = {
    socket: null,
    payload: null,
    players: [],
    myTeam: null,
    selectedSubject: null,

    gameState: null,

    settings: loadSettings(),
};


const els = {
    blueGrid:
        document.getElementById("blueGrid"),

    redGrid:
        document.getElementById("redGrid"),

    blueTeamHeader:
        document.getElementById("blueTeamHeader"),

    redTeamHeader:
        document.getElementById("redTeamHeader"),

    detailsPanel:
        document.getElementById("detailsPanel"),

    emptyState:
        document.getElementById("emptyState"),

    selectedAgent:
        document.getElementById("selectedAgent"),

    selectedTeam:
        document.getElementById("selectedTeam"),

    selectedName:
        document.getElementById("selectedName"),

    selectedCardTitle:
        document.getElementById("selectedCardTitle"),

    selectedModalName:
        document.getElementById("selectedModalName"),

    selectedLevel:
        document.getElementById("selectedLevel"),

    playerCardPreview:
        document.getElementById("playerCardPreview"),

    expressionGrid:
        document.getElementById("expressionGrid"),

    weaponGroups:
        document.getElementById("weaponGroups"),

    closeDetailsButton:
        document.getElementById("closeDetailsButton"),

    openSettingsButton:
        document.getElementById("openSettingsButton"),

    closeSettingsButton:
        document.getElementById("closeSettingsButton"),

    settingsPanel:
        document.getElementById("settingsPanel"),

    resetSettingsButton:
        document.getElementById("resetSettingsButton"),

    showEnemiesSetting:
        document.getElementById("showEnemiesSetting"),

    teamLayoutSetting:
        document.getElementById("teamLayoutSetting"),

    showPreviewsSetting:
        document.getElementById("showPreviewsSetting"),

    showTeamSetting:
        document.getElementById("showTeamSetting"),

    previewWeaponsSetting:
        document.getElementById("previewWeaponsSetting"),

    showExpressionsSetting:
        document.getElementById("showExpressionsSetting"),

    showPlayerCardSetting:
        document.getElementById("showPlayerCardSetting"),

    showBuddiesSetting:
        document.getElementById("showBuddiesSetting"),
};


function init() {

    if (els.closeDetailsButton) {

        els.closeDetailsButton.addEventListener(
            "click",
            () => {
                state.selectedSubject = null;
                render();
            }
        );

    }


    if (els.detailsPanel) {

        els.detailsPanel.addEventListener(
            "click",
            (event) => {

                if (
                    event.target === els.detailsPanel
                ) {

                    state.selectedSubject = null;

                    render();

                }

            }
        );

    }


    window.addEventListener(
        "keydown",
        (event) => {

            if (event.key !== "Escape") {
                return;
            }


            if (
                els.settingsPanel &&
                !els.settingsPanel.hidden
            ) {

                els.settingsPanel.hidden = true;

                return;

            }


            if (state.selectedSubject) {

                state.selectedSubject = null;

                render();

            }

        }
    );


    const cached =
        localStorage.getItem(CACHE_KEY);


    if (cached) {

        try {

            setPayload(
                JSON.parse(cached),
                false
            );

        } catch {

            localStorage.removeItem(CACHE_KEY);

        }

    }


    bindSettings();

    syncSettingsUI();

    connect();

}


function connect() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const port =
        sanitizePort(
            params.get("port") ||
            DEFAULT_PORT
        );


    const host =
        window.location.hostname ||
        "localhost";


    if (state.socket) {

        state.socket.close();

    }


    const socket =
        new WebSocket(
            `ws://${host}:${port}/`
        );


    state.socket = socket;


    socket.addEventListener(
        "message",
        (event) => {

            try {

                const payload =
                    JSON.parse(event.data);


                const data =
                    unwrapPayload(payload);


                if (
                    data &&
                    (
                        data.Players ||
                        data.players ||
                        data.state ||
                        data.State
                    )
                ) {

                    setPayload(
                        data,
                        true
                    );

                }

            } catch (error) {

                console.warn(
                    "Invalid websocket payload",
                    error
                );

            }

        }
    );


    socket.addEventListener(
        "close",
        () => {

            if (
                state.socket === socket
            ) {

                setTimeout(
                    connect,
                    2000
                );

            }

        }
    );

}


function unwrapPayload(payload) {

    if (
        !payload ||
        typeof payload !== "object"
    ) {

        return null;

    }


    if (
        (
            payload.type === "heartbeat" ||
            payload.type === "matchLoadout"
        ) &&
        payload.data
    ) {

        return payload.data;

    }


    return payload;

}


function sanitizePort(value) {

    const parsed =
        Number(
            String(value || "")
                .replace(/\D/g, "")
        );


    if (
        parsed >= 1 &&
        parsed <= 65535
    ) {

        return String(parsed);

    }


    return DEFAULT_PORT;

}


function setPayload(
    payload,
    shouldCache
) {

    state.payload = payload;


    state.gameState =
        payload.state ??
        payload.State ??
        payload.gameState ??
        payload.GameState ??
        null;


    /*
        Explicit MENUS state.

        Do not attempt to render
        players or loadouts when
        the user is simply in the
        VALORANT main menu.
    */
    if (
        String(state.gameState)
            .toUpperCase() === "MENUS"
    ) {

        state.players = [];

        state.myTeam = null;

        state.selectedSubject = null;


        if (shouldCache) {

            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify(payload)
            );

        }


        render();

        return;

    }


    state.myTeam =
        payload.myTeam ??
        payload.MyTeam ??
        null;


    state.players =
        normalizePlayers(payload)
            .map(
                (player) => ({
                    ...player,

                    Relation:
                        getRelation(
                            player
                        ),
                })
            );


    if (!state.myTeam) {

        const self =
            state.players.find(
                (player) =>
                    player.Subject ===
                    payload.puuid
            );


        if (self) {

            state.myTeam =
                self.Team;

        }

    }


    if (
        !state.players.some(
            (player) =>
                player.Subject ===
                state.selectedSubject
        )
    ) {

        state.selectedSubject = null;

    }


    if (shouldCache) {

        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify(payload)
        );

    }


    render();

}


function normalizePlayers(payload) {

    const rawPlayers =
        payload.Players ??
        payload.players ??
        {};


    const entries =
        Array.isArray(rawPlayers)

            ? rawPlayers.map(
                (player, index) => [

                    player.Subject ??
                    player.subject ??
                    player.puuid ??
                    String(index),

                    player,

                ]
            )

            : Object.entries(rawPlayers);


    return entries

        .map(
            ([subject, player]) => ({

                ...player,


                Subject:

                    player.Subject ??
                    player.subject ??
                    player.puuid ??
                    subject,


                Name:

                    player.Name ??
                    player.name ??
                    "",


                RiotName:

                    player.RiotName ??
                    player.riotName ??
                    player.GameName ??
                    player.gameName ??
                    player.Name ??
                    player.name ??
                    "",


                GameName:

                    player.GameName ??
                    player.gameName ??
                    "",


                Agent:

                    player.Agent ??
                    player.agentImgLink ??
                    player.agentImage ??
                    "",


                AgentArtworkName:

                    player.AgentArtworkName ??
                    player.AgentName ??
                    player.agent ??
                    "",


                Team:

                    player.Team ??
                    player.team ??
                    player.TeamID ??
                    player.teamID ??
                    "",


                Level:

                    player.Level ??
                    player.level ??
                    "",


                Title:

                    player.Title ??
                    player.title ??
                    "",


                PlayerCard:

                    player.PlayerCard ??
                    player.playerCard ??
                    "",


                Weapons:

                    player.Weapons ??
                    player.weapons ??
                    {},


                Sprays:

                    player.Sprays ??
                    player.sprays ??
                    {},


                Expressions:

                    player.Expressions ??
                    player.expressions ??
                    [],


                Relation:

                    player.Relation ??
                    player.relation ??
                    "",

            })
        )

        .filter(
            (player) =>
                player.RiotName ||
                player.Name ||
                player.Agent ||
                Object.keys(
                    player.Weapons || {}
                ).length
        )

        .sort(
            (a, b) =>
                teamRank(a.Team) -
                teamRank(b.Team)

                ||

                getName(a)
                    .localeCompare(
                        getName(b)
                    )
        );

}


function getRelation(player) {

    if (
        player.Relation === "ally" ||
        player.Relation === "enemy"
    ) {

        return player.Relation;

    }


    if (
        state.myTeam &&
        player.Team
    ) {

        return (
            player.Team === state.myTeam
        )

            ? "ally"

            : "enemy";

    }


    return "unknown";

}


function teamRank(team) {

    if (
        team === state.myTeam
    ) {

        return 0;

    }


    if (
        team === "Blue"
    ) {

        return 1;

    }


    if (
        team === "Red"
    ) {

        return 2;

    }


    return 3;

}


function render() {

    const isMenuState =
        String(state.gameState)
            .toUpperCase() === "MENUS";


    document.body.classList.toggle(
        "is-menu-state",
        isMenuState
    );


    if (isMenuState) {

        renderMenuState();

        return;

    }


    renderTeamHeaders();

    renderPlayers();

    renderDetails();

}


function renderMenuState() {

    if (els.blueGrid) {
        els.blueGrid.replaceChildren();
    }


    if (els.redGrid) {
        els.redGrid.replaceChildren();
    }


    if (els.detailsPanel) {
        els.detailsPanel.hidden = true;
    }


    if (els.emptyState) {

        els.emptyState.hidden = false;


        els.emptyState.innerHTML = `
            <div class="menu-state-content">
                <div
                    class="menu-state-icon"
                    aria-hidden="true"
                >
                    ⌛
                </div>

                <h2>
                    Waiting for a match
                </h2>

                <p>
                    You're currently in the VALORANT menu.
                    Player and loadout information will appear
                    automatically when you enter agent select
                    or join a match.
                </p>
            </div>
        `;

    }


    if (els.blueTeamHeader) {

        els.blueTeamHeader.textContent = "";

    }


    if (els.redTeamHeader) {

        els.redTeamHeader.textContent = "";

    }

}


function renderTeamHeaders() {

    if (
        els.blueTeamHeader
    ) {

        els.blueTeamHeader.textContent =
            state.myTeam === "Blue"

                ? "Your Team"

                : state.myTeam
                    ? "Enemy Team"
                    : "Blue Team";

    }


    if (
        els.redTeamHeader
    ) {

        els.redTeamHeader.textContent =
            state.myTeam === "Red"

                ? "Your Team"

                : state.myTeam
                    ? "Enemy Team"
                    : "Red Team";

    }

}


function renderPlayers() {

    if (
        !els.blueGrid ||
        !els.redGrid
    ) {

        return;

    }


    els.blueGrid.replaceChildren();

    els.redGrid.replaceChildren();


    if (els.emptyState) {

        els.emptyState.hidden =
            state.players.length > 0;

    }


    const visiblePlayers =
        state.players.filter(
            (player) =>

                state.settings.showEnemies ||

                getRelation(player) !== "enemy"
        );


    const teams =
        new Set(
            visiblePlayers
                .map(
                    (player) =>
                        player.Team
                )
                .filter(Boolean)
        );


    const unified =
        state.settings.teamLayout ===
        "unified"

        ||

        teams.size <= 1;


    const teamsLayout =
        document.querySelector(
            ".teams-layout"
        );


    if (teamsLayout) {

        teamsLayout.classList.toggle(
            "is-unified",
            unified
        );

    }


    visiblePlayers.forEach(
        (player) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type = "button";


            button.className =
                `player-button ${teamClass(
                    player.Team
                )}`;


            button.classList.toggle(
                "is-selected",

                player.Subject ===
                state.selectedSubject
            );


            button.addEventListener(
                "click",

                () => {

                    state.selectedSubject =
                        player.Subject;

                    render();

                }
            );


            const avatar =
                buildAgentAvatar(
                    player.Agent,
                    agentName(player)
                );


            const identity =
                document.createElement(
                    "div"
                );


            identity.className =
                "player-main";


            const name =
                document.createElement(
                    "span"
                );


            name.className =
                "player-name";


            name.textContent =
                getName(player);


            name.title =
                name.textContent;


            const agent =
                document.createElement(
                    "span"
                );


            agent.className =
                "agent-name";


            agent.textContent =
                agentName(player) ||
                "Unknown Agent";


            identity.append(
                name,
                agent
            );


            if (
                state.settings.showTeam
            ) {

                const relation =
                    document.createElement(
                        "span"
                    );


                relation.className =
                    `player-relation ${
                        getRelation(player) ===
                        "enemy"

                            ? "is-enemy"

                            : ""
                    }`;


                relation.textContent =
                    relationLabel(
                        player
                    );


                identity.append(
                    relation
                );

            }


            const action =
                document.createElement(
                    "span"
                );


            action.className =
                "player-action";


            action.textContent =
                "View loadout";


            identity.append(
                action
            );


            button.append(
                avatar,
                identity
            );


            if (
                state.settings.showPreviews
            ) {

                button.append(
                    buildPreviewRow(
                        player
                    )
                );

            }


            const grid =
                unified

                    ? els.blueGrid

                    : player.Team === "Red"

                        ? els.redGrid

                        : els.blueGrid;


            grid.append(button);

        }
    );

}


function relationLabel(player) {

    const relation =
        getRelation(player);


    if (
        relation === "ally"
    ) {

        return "Ally";

    }


    if (
        relation === "enemy"
    ) {

        return "Enemy";

    }


    return (
        player.Team ||
        "Unknown"
    );

}


function buildPreviewRow(player) {

    const row =
        document.createElement(
            "div"
        );


    row.className =
        "preview-row";


    state.settings.previewWeapons.forEach(
        (weaponName) => {

            const weapon =
                getWeapon(
                    player,
                    weaponName
                );


            const slot =
                document.createElement(
                    "span"
                );


            slot.className =
                "preview-slot";


            if (
                weapon &&

                (
                    weapon.skinDisplayIcon ||

                    weapon.displayIcon
                )
            ) {

                const img =
                    document.createElement(
                        "img"
                    );


                img.src =
                    weapon.skinDisplayIcon ||

                    weapon.displayIcon;


                img.alt =
                    weapon.skinDisplayName ||

                    weapon.weapon ||

                    weaponName;


                slot.append(img);

            }


            const copy =
                document.createElement(
                    "span"
                );


            copy.className =
                "preview-copy";


            const label =
                document.createElement(
                    "span"
                );


            label.className =
                "preview-label";


            label.textContent =
                weaponName;


            const skinName =
                document.createElement(
                    "span"
                );


            skinName.className =
                "preview-name";


            skinName.textContent =
                weapon

                    ? (
                        weapon.skinDisplayName ||

                        weapon.weapon ||

                        weaponName
                    )

                    : "Not found";


            copy.append(
                label,
                skinName
            );


            slot.append(
                copy
            );


            row.append(
                slot
            );

        }
    );


    return row;

}


function renderDetails() {

    if (
        !els.detailsPanel ||
        !els.emptyState
    ) {

        return;

    }


    const selected =
        state.players.find(
            (player) =>
                player.Subject ===
                state.selectedSubject
        );


    const hasSelection =
        Boolean(selected);


    els.detailsPanel.hidden =
        !hasSelection;


    els.emptyState.hidden =
        hasSelection ||

        state.players.length > 0;


    if (!selected) {
        return;
    }


    if (els.selectedAgent) {

        els.selectedAgent.src =
            selected.Agent || "";


        els.selectedAgent.hidden =
            !selected.Agent;


        els.selectedAgent.alt =
            agentName(selected);

    }


    if (els.selectedName) {

        els.selectedName.textContent =
            getName(selected);

    }


    if (els.selectedCardTitle) {

        els.selectedCardTitle.textContent =
            selected.Title || "";


        els.selectedCardTitle.hidden =
            !selected.Title;

    }


    if (els.selectedModalName) {

        els.selectedModalName.textContent =
            agentName(selected) ||
            "Agent";

    }


    if (els.selectedLevel) {

        els.selectedLevel.textContent =
            selected.Level

                ? `Level ${selected.Level}`

                : "Level";

    }


    if (els.selectedTeam) {

        els.selectedTeam.textContent =
            relationLabel(selected);


        els.selectedTeam.className =
            `team-pill ${
                teamClass(selected.Team)
            }`;

    }


    if (els.playerCardPreview) {

        els.playerCardPreview.style.backgroundImage =
            selected.PlayerCard

                ? `url("${selected.PlayerCard}")`

                : "";

    }


    const expressionsSection =
        document.querySelector(
            ".expressions-section"
        );


    if (expressionsSection) {

        expressionsSection.classList.toggle(
            "setting-hidden",

            !state.settings.showExpressions
        );

    }


    const playerCardSection =
        document.querySelector(
            ".player-card-section"
        );


    if (playerCardSection) {

        playerCardSection.classList.toggle(
            "setting-hidden",

            !state.settings.showPlayerCard
        );

    }


    renderExpressions(selected);

    renderWeapons(selected);

}


function renderExpressions(player) {

    if (!els.expressionGrid) {
        return;
    }


    els.expressionGrid.replaceChildren();


    const expressions =
        getExpressions(player)
            .slice(0, 4);


    while (
        expressions.length < 4
    ) {

        expressions.push(null);

    }


    expressions.forEach(
        (expression, index) => {

            const tile =
                document.createElement(
                    "div"
                );


            tile.className =
                `expression-tile expression-slot-${index}`;


            if (
                expression?.type === "flex"
            ) {

                tile.classList.add(
                    "is-flex"
                );

            }


            const art =
                document.createElement(
                    "div"
                );


            art.className =
                "expression-art";


            if (
                expression &&

                (
                    expression.fullTransparentIcon ||

                    expression.displayIcon
                )
            ) {

                const img =
                    document.createElement(
                        "img"
                    );


                img.src =
                    expression.fullTransparentIcon ||

                    expression.displayIcon;


                img.alt =
                    expression.displayName ||
                    "Expression";


                art.append(img);

            }


            const copy =
                document.createElement(
                    "div"
                );


            copy.className =
                "expression-copy";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                expression?.displayName ||

                `Slot ${index + 1}`;


            const type =
                document.createElement(
                    "span"
                );


            type.className =
                "expression-type";


            type.textContent =
                expression?.type ||
                "empty";


            copy.append(
                name,
                type
            );


            tile.append(
                art,
                copy
            );


            els.expressionGrid.append(
                tile
            );

        }
    );

}


function renderWeapons(player) {

    if (!els.weaponGroups) {
        return;
    }


    els.weaponGroups.replaceChildren();


    WEAPON_COLUMNS.forEach(
        (column) => {

            const columnNode =
                document.createElement(
                    "div"
                );


            columnNode.className =
                `weapon-column ${column.className}`;


            column.groups.forEach(
                (group) => {

                    const section =
                        document.createElement(
                            "section"
                        );


                    section.className =
                        `weapon-group weapon-group-${group.slug}`;


                    const heading =
                        document.createElement(
                            "h3"
                        );


                    heading.textContent =
                        group.title;


                    const grid =
                        document.createElement(
                            "div"
                        );


                    grid.className =
                        "weapon-grid";


                    group.weapons.forEach(
                        (weaponName) => {

                            grid.append(
                                buildWeaponTile(
                                    player,
                                    weaponName
                                )
                            );

                        }
                    );


                    section.append(
                        heading,
                        grid
                    );


                    columnNode.append(
                        section
                    );

                }
            );


            els.weaponGroups.append(
                columnNode
            );

        }
    );

}


function buildWeaponTile(
    player,
    weaponName
) {

    const weapon =
        getWeapon(
            player,
            weaponName
        );


    const tile =
        document.createElement(
            "div"
        );


    tile.className =
        "weapon-tile";


    tile.classList.toggle(
        "is-empty",
        !weapon
    );


    const art =
        document.createElement(
            "div"
        );


    art.className =
        "weapon-art";


    if (
        weapon &&

        (
            weapon.skinDisplayIcon ||

            weapon.weaponDisplayIcon ||

            weapon.displayIcon
        )
    ) {

        const img =
            document.createElement(
                "img"
            );


        img.src =
            weapon.skinDisplayIcon ||

            weapon.weaponDisplayIcon ||

            weapon.displayIcon;


        img.alt =
            weapon.skinDisplayName ||

            weapon.weapon ||

            weaponName;


        art.append(img);

    }


    const copy =
        document.createElement(
            "div"
        );


    copy.className =
        "weapon-copy";


    const label =
        document.createElement(
            "span"
        );


    label.className =
        "weapon-name";


    label.textContent =
        weaponName;


    const skin =
        document.createElement(
            "strong"
        );


    skin.textContent =
        weapon

            ? (
                weapon.skinDisplayName ||

                weapon.weapon ||

                weaponName
            )

            : "";


    copy.append(
        label,
        skin
    );


    tile.append(
        art,
        copy
    );


    if (
        state.settings.showBuddies &&

        weapon?.buddy_displayIcon
    ) {

        tile.classList.add(
            "has-buddy"
        );


        const buddy =
            document.createElement(
                "img"
            );


        buddy.className =
            "buddy";


        buddy.src =
            weapon.buddy_displayIcon;


        buddy.alt =
            "Buddy";


        tile.append(
            buddy
        );

    }


    return tile;

}


function getWeapon(
    player,
    weaponName
) {

    return Object
        .values(
            player.Weapons || {}
        )
        .find(
            (weapon) =>

                weapon &&

                (
                    weapon.weapon ===
                    weaponName

                    ||

                    weapon.displayName ===
                    weaponName
                )
        );

}


function getExpressions(player) {

    if (
        Array.isArray(
            player.Expressions
        ) &&

        player.Expressions.length
    ) {

        return [
            ...player.Expressions
        ].sort(
            (a, b) =>
                Number(a.index || 0) -
                Number(b.index || 0)
        );

    }


    return Object
        .entries(
            player.Sprays || {}
        )
        .map(
            ([index, expression]) => ({
                index:
                    Number(index),

                type:
                    expression?.type ||
                    "spray",

                ...expression,
            })
        )
        .sort(
            (a, b) =>
                a.index -
                b.index
        );

}


function getName(player) {

    const candidates = [

        player.RiotName,

        player.GameName,

        player.Name,

        player.DisplayName,

    ];


    for (
        const candidate
        of candidates
    ) {

        if (
            typeof candidate !==
            "string"
        ) {

            continue;

        }


        const value =
            candidate.trim();


        if (
            value &&

            !UUID_RE.test(value)
        ) {

            return value;

        }

    }


    return "Unknown Player";

}


function agentName(player) {

    return String(

        player.AgentArtworkName ||

        player.AgentName ||

        player.agent ||

        ""

    ).replace(
        /Artwork$/,
        ""
    );

}


function buildAgentAvatar(
    src,
    alt
) {

    if (!src) {

        return makeAvatarPlaceholder();

    }


    const img =
        document.createElement(
            "img"
        );


    img.className =
        "agent-avatar";


    img.alt =
        alt || "";


    img.src =
        src;


    img.addEventListener(
        "error",

        () => {

            img.replaceWith(
                makeAvatarPlaceholder()
            );

        }
    );


    return img;

}


function makeAvatarPlaceholder() {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "agent-avatar agent-avatar-placeholder";


    element.textContent =
        "?";


    return element;

}


function teamClass(team) {

    if (
        team === "Blue"
    ) {

        return "is-blue";

    }


    if (
        team === "Red"
    ) {

        return "is-red";

    }


    return "";

}


function loadSettings() {

    try {

        return {

            ...DEFAULT_SETTINGS,

            ...JSON.parse(
                localStorage.getItem(
                    SETTINGS_KEY
                ) || "{}"
            ),

        };

    } catch {

        return {
            ...DEFAULT_SETTINGS,
        };

    }

}


function saveSettings() {

    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(
            state.settings
        )
    );

}


function bindSettings() {

    const controls = [

        [
            els.showEnemiesSetting,
            "showEnemies",
            "checked",
        ],

        [
            els.teamLayoutSetting,
            "teamLayout",
            "value",
        ],

        [
            els.showPreviewsSetting,
            "showPreviews",
            "checked",
        ],

        [
            els.showTeamSetting,
            "showTeam",
            "checked",
        ],

        [
            els.showExpressionsSetting,
            "showExpressions",
            "checked",
        ],

        [
            els.showPlayerCardSetting,
            "showPlayerCard",
            "checked",
        ],

        [
            els.showBuddiesSetting,
            "showBuddies",
            "checked",
        ],

    ];


    controls.forEach(
        ([
            element,
            key,
            property,
        ]) => {

            if (!element) {
                return;
            }


            element.addEventListener(
                "change",

                () => {

                    state.settings[key] =
                        element[property];


                    saveSettings();

                    render();

                }
            );

        }
    );


    if (els.openSettingsButton) {

        els.openSettingsButton.addEventListener(
            "click",

            () => {

                syncSettingsUI();

                els.settingsPanel.hidden =
                    false;

            }
        );

    }


    if (els.closeSettingsButton) {

        els.closeSettingsButton.addEventListener(
            "click",

            () => {

                els.settingsPanel.hidden =
                    true;

            }
        );

    }


    if (els.settingsPanel) {

        els.settingsPanel.addEventListener(
            "click",

            (event) => {

                if (
                    event.target ===
                    els.settingsPanel
                ) {

                    els.settingsPanel.hidden =
                        true;

                }

            }
        );

    }


    if (els.resetSettingsButton) {

        els.resetSettingsButton.addEventListener(
            "click",

            () => {

                state.settings = {
                    ...DEFAULT_SETTINGS,
                };


                saveSettings();

                syncSettingsUI();

                render();

            }
        );

    }

}


function syncSettingsUI() {

    if (els.showEnemiesSetting) {

        els.showEnemiesSetting.checked =
            state.settings.showEnemies;

    }


    if (els.teamLayoutSetting) {

        els.teamLayoutSetting.value =
            state.settings.teamLayout;

    }


    if (els.showPreviewsSetting) {

        els.showPreviewsSetting.checked =
            state.settings.showPreviews;

    }


    if (els.showTeamSetting) {

        els.showTeamSetting.checked =
            state.settings.showTeam;

    }


    if (els.showExpressionsSetting) {

        els.showExpressionsSetting.checked =
            state.settings.showExpressions;

    }


    if (els.showPlayerCardSetting) {

        els.showPlayerCardSetting.checked =
            state.settings.showPlayerCard;

    }


    if (els.showBuddiesSetting) {

        els.showBuddiesSetting.checked =
            state.settings.showBuddies;

    }


    if (!els.previewWeaponsSetting) {
        return;
    }


    els.previewWeaponsSetting.replaceChildren();


    ALL_WEAPONS.forEach(
        (weaponName) => {

            const label =
                document.createElement(
                    "label"
                );


            label.className =
                "weapon-choice";


            const input =
                document.createElement(
                    "input"
                );


            input.type =
                "checkbox";


            input.checked =
                state.settings.previewWeapons
                    .includes(
                        weaponName
                    );


            input.addEventListener(
                "change",

                () => {

                    let selected =
                        state.settings.previewWeapons
                            .filter(
                                (weapon) =>
                                    weapon !==
                                    weaponName
                            );


                    if (
                        input.checked
                    ) {
                        selected.push(
                            weaponName
                        );

                    }


                    state.settings.previewWeapons =
                        selected;


                    saveSettings();

                    render();

                }
            );


            label.append(
                input,

                document.createTextNode(
                    ` ${weaponName}`
                )
            );


            els.previewWeaponsSetting.append(
                label
            );

        }
    );

}


init();