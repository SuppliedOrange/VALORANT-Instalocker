"""
IMPORTS
"""
import eel
from screeninfo import get_monitors
from valclient.client import Client
import webbrowser
import os
import psutil
import json

"""
CONSTANTS
"""

# Find the screen dimensions, reduce size x1.7 times. Scale window to that height.
SCREEN_DIMENSIONS = (
    list(get_monitors())[0].width // 1.7,
    list(get_monitors())[0].height // 1.7,
)

# Socials, don't touch! >:(
INSTAGRAM = "https://www.instagram.com/kronsuki/"
GITHUB = "https://github.com/SuppliedOrange/"

# Customize this to your preference
LOOP_DELAY = 4
LOCK_DELAY = 0
HOVER_DELAY = 0

# Used by the iterating runtime code
AGENT = None
SEEN_MATCHES = []
RUNNING = False

# Fetch the agent names and codes.

with open('./web/json/agents.json') as agents:
    AGENT_CODES = json.load(agents)

"""
FUNCTIONS
"""


def get_region():
    """
    Get the region code of the current game.
    """
    with open(
        os.path.join(os.getenv("LOCALAPPDATA"), R"VALORANT\Saved\Logs\ShooterGame.log"),
        "rb",
    ) as f:
        lines = f.readlines()
    for line in lines:
        if b"regions" in line:
            region = line.split(b"regions/")[1].split(b"]")[0]
            return region.decode()


def errorAlert(line1, line2, time):
    """
    Change the status text and the chosen agent text into an error.
    Sleep for some time before changing it back
    """
    eel.alertUser(line1, line2)
    eel.sleep(time)
    eel.askUserToChooseAgent()


@eel.expose
def stop_lock():
    """
    Change state from running to disabled to stop the locking process
    """
    global RUNNING
    global AGENT
    RUNNING = False
    AGENT = None
    eel.hideStopButton()


@eel.expose
def try_lock(agent):
    """
    START TO ATTEMPT LOCKING AN AGENT
    """
    global RUNNING
    global AGENT
    global SEEN_MATCHES

    # if valorant isnt on, mock the user
    if not "VALORANT.exe" in (p.name() for p in psutil.process_iter()):
        if RUNNING:
            stop_lock()
        return errorAlert("TURN VALORANT ON", "YOU CLOWN", 3)

    try:  # try and get the region code automatically
        region_code = get_region()
    except:
        if RUNNING:
            stop_lock()
        return errorAlert("COULD NOT FIND REGION", "TRY LOGGING IN AGAIN", 5)

    if (
        RUNNING
    ):  # if we're already attempting to select an agent, simply change what agent we're trying to select
        # print(f'Agent changed to {agent} ') # DEBUG
        AGENT = AGENT_CODES[agent]
        return

    # print(f"Starting to lock {agent}") # DEBUG

    try:
        client = Client(region=region_code)  # Activate 1 instance
    except ValueError:
        return errorAlert("COULD NOT FIND REGION", "TRY LOGGING IN AGAIN", 5)

    client.activate()
    # print("Activated 1 instance") # DEBUG

    RUNNING = True  # Mark as actively trying to lock an agent

    while RUNNING:
        eel.sleep(LOOP_DELAY)

        if not RUNNING:
            return  # Probably terminated

        # print("Rechecking...") # DEBUG

        try:
            sessionState = client.fetch_presence(client.puuid)["sessionLoopState"]
            matchID = client.pregame_fetch_match()["ID"]

            if sessionState == "PREGAME" and matchID not in SEEN_MATCHES:
                SEEN_MATCHES.append(
                    matchID
                )  # If we've seen this match before, leave it be.

                eel.changeStatus("LOCKING")

                if not AGENT:
                    AGENT = AGENT_CODES[agent]

                eel.sleep(HOVER_DELAY)
                client.pregame_select_character(AGENT)

                eel.sleep(LOCK_DELAY)
                client.pregame_lock_character(AGENT)

                stop_lock()

                eel.changeStatus("LOCKED")

                return True

        except Exception as e:
            if "pre-game" not in str(e):
                errorAlert("ERROR", e, 12)
                stop_lock()
                return


@eel.expose
def open_instagram():
    webbrowser.open("https://www.instagram.com/kronsuki/")


@eel.expose
def open_github():
    webbrowser.open("https://github.com/SuppliedOrange/")


"""
INITIALIZING THE EEL APPLICATION
"""
eel.init("web")

# Try launching with chrome, otherwise launch it in their default browser.
try:
    eel.start("index.html", size=(SCREEN_DIMENSIONS), port=0,)
except OSError:
    eel.start("index.html", size=(SCREEN_DIMENSIONS), port=0, mode="default")
