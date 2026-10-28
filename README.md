![image](https://i.imgur.com/XurNfoS.png)

# VALORANT Utils
VALORANT utilities in one desktop app: Instalocker and Rank Checker. The agent list is current through Hush (patch 13.09).

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/Nanda070/VALORANT-Utils/total?style=flat-square&label=Total%20Downloads&color=brown)
![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/Nanda070/VALORANT-Utils/latest/total?style=flat-square&label=Latest%20release&color=brown)

## Features

- Select an agent and it locks as soon as the pre-game screen exists
- Talks to the VALORANT API through [valclient](https://github.com/colinhartigan/valclient.py), separate from the game client
- Stop waiting, or switch agents, while a lock is in progress
- Stops sending requests when an error is found
- Refreshes every 3 seconds to limit API use

## Installation

[Link]: https://github.com/Nanda070/VALORANT-Utils/releases/latest 'Latest Release'
[Button Icon]: https://img.shields.io/badge/Releases-EF2D5E?style=for-the-badge&logoColor=white&logo=DocuSign
[![Button Icon]][Link]

Download `VALORANT-Utils-Setup.exe` from the latest release and run it.

Windows may block the unsigned file. Click **More info**, then **Run anyway**.

[Google Chrome](https://www.google.com/chrome/) is recommended. Without it, the app opens in the default browser.

## How to use

- Start VALORANT, then start this app.
- Pick an agent on the left. Locking starts on its own.
- Run with `--debug` to write `valorant_instalocker.log` if something fails.

## Can I get banned?

Using the VALORANT API this way is against Riot's Terms of Service. This app does not click the game window, read game memory, or change game files. That does not make it allowed, and a penalty is still possible.

## Building

The desktop app is Electron. The window opens at 857×442.

- `npm install`
- Run: `npm start`
- Installer: `npm run build` writes `VALORANT-Utils-Setup-<version>.exe` to `./dist`
- Publish that setup to GitHub Releases with `npm run publish`. The installed app checks those releases and asks before downloading an update.

Python still runs the same UI with `python main.py` after `python -m pip install -r requirements.txt`.

The Electron app includes the Rank Checker integration. It starts the Rank Checker
backend without a console window and embeds its local match-loadout viewer, Rank Stats
page, and runtime output in the `Rank Checker` tab. The development build requires Python
and the dependencies in `integrations/rank-yoinker/requirements.txt`; set
`RANK_YOINKER_PYTHON` when Python is not available as `python` on `PATH`.

Right-click an agent and choose Favorite. Up to 3 favorites stay above the other agents, disappear from the main list, and are saved on this PC.

## Adding agents

Add the name and UUID in both `./main.py` and `./web/json/agents.json`. The on-screen order follows `agents.json`.

- Banner: `./web/assets/images/agent-banners/<name>.png` (lowercase)
- Preview: `./web/assets/images/agent-previews/<name>-preview.gif` (lowercase)

The banner is cropped with:

```css
.agent-thumb {
  max-width: 40vw;
  height: 7vw;
  object-fit: cover;
  object-position: 0vw -6vw;
  position: absolute;
  z-index: -1;
  aspect-ratio: 20 / 3;
  transform: skewY(5deg);
  transition: transform 0.2s;
}
```

## Support / Feedback

- Discord: [Nandak070](https://discord.com/users/1219803151180370021)

## History

- **2023** — The original Instalocker project was released, based on [valorant-agent-yoinker](https://github.com/deadly/valorant-agent-yoinker) and [valclient](https://github.com/colinhartigan/valclient.py). Black-background banners by [ExCharny](https://www.deviantart.com/excharny). Clove banner by [slynxoxo](https://twitter.com/slynxoxo/status/1771862541850861971). Previews from the [VALORANT Giphy page](https://giphy.com/playvalorant). munibug gif by [@walfieee](https://twitter.com/walfieee). Icon by [u/Odeuo](https://www.reddit.com/user/Odeuo/).
- **2024–2025** — Iso, Clove, Vyse, Tejo, and Waylay are added as they release.
- **May 2026** — [p0oru](https://github.com/p0oru) moves the app onto a maintained valclient fork. Miks and Veto are added. Some later banners and previews are from unknown sources.
- **October 2026** — [Nanda070](https://github.com/Nanda070) adds Hush, favorite agents, an Electron installer, and update checks against GitHub Releases.
- **October 2026** — VALORANT Utils combines Instalocker with Rank Checker. The Rank Stats foundation was taken from [mdevio/VALORANT-rank-yoinker](https://github.com/mdevio/VALORANT-rank-yoinker).

## Legal

This project is not affiliated with Riot Games.
If you are a Riot representative and want this repository taken down, contact [Nandak070](https://discord.com/users/1219803151180370021) from an official account.
