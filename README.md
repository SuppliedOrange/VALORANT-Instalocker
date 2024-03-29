
![image](https://github.com/SuppliedOrange/VALORANT-Instalocker/assets/70258998/000c238b-c72e-4682-abc6-90fca7d2cbda)

# VALORANT Instalocker
 ✨A VALORANT Instalocker with a clean GUI

<br>

## 🎡 Features

- Select an agent, hop into a game and it instalocks before you even know it!
- Allows you to stop the application from waiting for pre-game whenever
- Allows you to switch between characters while instalocking
- Stops instalocking and sending API requests as soon as an error is found
- Clean and straightforward UI.
- Fixed 3 second refresh limit to better prevent API abuse.
- Agent banners, agent previews and other stuff i put in because memes

<br>

## 📩 Installation
[Link]: https://github.com/SuppliedOrange/VALORANT-Instalocker/releases/latest 'Latest Release'
[Button Icon]: https://img.shields.io/badge/Releases-EF2D5E?style=for-the-badge&logoColor=white&logo=DocuSign
[![Button Icon]][Link]


<br>

## ❔ How to use

- Start VALORANT
- Select any agent from the left-hand-side list
- Instalocking should begin automatically

- If an error occurs try:
    1) Selecting another agent and selecting the previous one again
    2) Stopping and restarting the instalock
    3) Reopening the application
    4) Logging into VALORANT again

    `Highly recommended you have chrome installed! The .exe will simply open in your default browser otherwise.`

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

- Use a python version lower than 3.12 or you'll end up with [this error](https://stackoverflow.com/questions/77232001/python-eel-module-unable-to-use-import-bottle-ext-websocket-as-wbs-modulenotfoun). You also cannot use python 3.10.0 because there is a [pyinstaller issue](https://github.com/pyinstaller/pyinstaller/issues/6301) with it. I used 3.10.10.

- Run `python -m pip install -r requirements.txt`

- Building a distributable:
    <br>
    - Run the `replace_bottle.py` code in install_and_build. This step counters an issue with pyinstaller. You can also do this manually by going to your python's directory / Libs / site-packages and then replacing bottle.py with the latest variant. [(See this issue)](https://github.com/SuppliedOrange/VALORANT-Instalocker/issues/3)
    - Run `python -m eel main.py web --onefile --noconsole --icon=./web/favicon.ico --name="VALORANT Instalocker" --paths ./venv/Lib/site-packages`
    - A distributable should appear in ./dist

- Running with python: 
    <br>
    - Run `python main.py`

<br>

## 🤷‍♀️ Support / Feedback:

You can also make an issue on this repository and I'll check it out. Or you can hit me up on Discord `@lternatively` <br>
The scrollbar isn't broken and doesn't make the application glitch. You just have skill issues.

#### Notes
+ I do not plan on developing this further, but I will maintain the code and update agents- this will continue to work.
+ I am also not responsible for **misuse** of this product, I do not condone using this and this only exists as an educational resource.

<br>

## 📰 Credits

- Heavily inspired by [valorant-agent-yoinker](https://github.com/deadly/valorant-agent-yoinker)
- Other than Gekko, all agent banners were made by [ExCharny](https://www.deviantart.com/excharny)
- Most Agent previews (sprays and official stickers) are from the official [VALORANT giphy page](https://giphy.com/playvalorant)
- [munibug](https://www.twitch.tv/munibug) gif by [@walfieee](https://twitter.com/walfieee)
- Application Icon and Favicon by [u/Odeuo](https://www.reddit.com/user/Odeuo/)
- Some of the agent previews come from unknown sources, let me know if you find their sources!
