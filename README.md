
![image](https://github.com/SuppliedOrange/VALORANT-Instalocker/assets/70258998/000c238b-c72e-4682-abc6-90fca7d2cbda)

# VALORANT Instalocker
A VALORANT Instalocker with a clean GUI

<br>

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/SuppliedOrange/VALORANT-Instalocker/total?style=flat-square&label=Total%20Downloads&color=brown)
![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/SuppliedOrange/VALORANT-Instalocker/latest/total?style=flat-square&label=People%20using%20the%20latest%20release&color=brown)

## 🎡 Features

- Select an agent, hop into a game and it instalocks before you even know it!
- Works separately from the game through the VALORANT API using [valclient](https://github.com/colinhartigan/valclient.py)
- Allows you to stop the application from waiting for pre-game whenever
- Allows you to switch between characters while instalocking
- Stops instalocking and sending API requests as soon as an error is found
- Clean and straightforward UI
- Fixed 3 second refresh limit to better prevent API abuse
- Agent banners, agent previews and other stuff i put in because memes

<br>

## 📩 Installation
[Link]: https://github.com/SuppliedOrange/VALORANT-Instalocker/releases/latest 'Latest Release'
[Button Icon]: https://img.shields.io/badge/Releases-EF2D5E?style=for-the-badge&logoColor=white&logo=DocuSign
[![Button Icon]][Link]


<br>

## ❔ How to use

- Start VALORANT and this app.
- Select any agent from the left-hand-side.
- Instalocking should begin automatically, that's it!
- Optionally, it's recommended to have [Google Chrome](https://www.google.com/intl/en_in/chrome/) installed. The .exe will simply open in your default browser otherwise, but it will still work.

<br>

## ❌ Windows protected your PC
The application might refuse to run because Windows will assume this is malicious.
<br>
The fix is pretty simple, click on `More Info` and click on `Run Anyway`
<br>
Is that safe? Yes, it is. Windows protects your PC because this is an unsigned executable from an external source. If you're feeling a little paranoid, you can build it yourself with the instructions below!

<br>

## ❓ Can I get banned?

Not likely unless you go around telling everyone you have an instalocker.
<br>
Even if Riot happens to somehow detect this, you will only recieve a 7 day ban for API abuse. That's still unlikely to occur and hasn't happened yet.
> [@deadly](https://github.com/deadly): With all programs like this, there is no guarantee that it's safe because using the VALORANT API in this manner is against Riot's Terms of Service. However, this program does not use an autoclicker to select the agent, read the game's memory, or change the game's files; therefore, the anticheat shouldn't be triggered. No suspensions have been reported so far from using this method of exploit.

<br>

## 🛠 Building 

- For your convinience, simply use `install.bat` and then `build.bat` after downloading the repository for a smooth, automated process! After that, you're done. If you insist otherwise, follow ahead.

- ~~Use a python version lower than 3.12 or you'll end up with [this error](https://stackoverflow.com/questions/77232001/python-eel-module-unable-to-use-import-bottle-ext-websocket-as-wbs-modulenotfoun). You also cannot use python 3.10.0 because there is a [pyinstaller issue](https://github.com/pyinstaller/pyinstaller/issues/6301) with it. I used 3.10.10.~~ This issue is probably fixed now. You should be able to run it with latest versions of python without the bottle.py fix. It will still exist just in case.

- Run `python -m pip install -r requirements.txt`

- Building a distributable:
    <br>
    - ~~Run the `replace_bottle.py` code in install_and_build. This step counters an issue with pyinstaller. You can also do this manually by going to your python's directory / Libs / site-packages and then replacing bottle.py with the latest variant. [(See this issue)](https://github.com/SuppliedOrange/VALORANT-Instalocker/issues/3)~~ Likely unnecessary.
    - Run `python -m eel main.py web --onefile --noconsole --icon=./web/favicon.ico --name="VALORANT Instalocker"`
    - A distributable should appear in ./dist

- Running with python: 
    <br>
    - Run `python main.py`

<br>

## Adding agents

- Add the agent name and their UUID in `./main.py` and `./web/json/agents.json` respectively. Note that the agent hierarchy depends on `agents.json`.

- Add an agent banner in `./web/assets/images/agent-banners`, The file name must be the agent's name in *lower case* and the file should be a *.png* <br>
  The css that crops the banner is as follows. Crop the banner image and adjust it accordingly:
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

- Add an agent preview in `./web/assets/images/agent-previews`. The file name must be the agent's name in *lower case* and the file should be a *.gif*

<br>

## 🤷‍♀️ Support / Feedback:

- You can hit me up on Discord [@lternatively](https://discord.com/users/735322421862727760)

- If your issue is "cannot initialize a valclient", follow this method to report it https://github.com/SuppliedOrange/VALORANT-Instalocker/issues/12

- For other issues, use the `--debug` parameter to log everything that happens when you try to instalock then make an issue:
  [Method 1](https://i.imgur.com/InEbwdz.mp4) [Method 2](https://i.imgur.com/R5ElrrP.png) <br>
  
- Sometimes the instalocker waits for a few seconds after the loading screen to instalock, this is because it scans for the pre-game screen every 3 seconds. You can change the loop delay in the code for yourself.

#### Notes
+ I do not plan on developing this further, but I will maintain the code and update agents- this will continue to work.
+ I am also not responsible for **misuse** of this application, I do not condone using this and this only exists as an educational resource.
+ I plan to release a new version re-written in typescript as an electron app. I am sick of Eel, and I don't like the fact you can't choose individual agents for each map.

<br>

## 📰 Credits

- Heavily inspired by [valorant-agent-yoinker](https://github.com/deadly/valorant-agent-yoinker) that uses [valclient](https://github.com/colinhartigan/valclient.py)
- All agent banners with the black background art style were made by [ExCharny](https://www.deviantart.com/excharny)
- Clove Banner by [slynxoxo](https://twitter.com/slynxoxo/) from [this post](https://twitter.com/slynxoxo/status/1771862541850861971)
- Most Agent previews (sprays and official stickers) are from the official [VALORANT giphy page](https://giphy.com/playvalorant)
- [munibug](https://www.twitch.tv/munibug) gif by [@walfieee](https://twitter.com/walfieee)
- Application Icon and Favicon by [u/Odeuo](https://www.reddit.com/user/Odeuo/)
- Some of the agent previews and banners come from unknown sources, let me know if you find their sources!
