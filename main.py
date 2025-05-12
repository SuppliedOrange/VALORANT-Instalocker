"""
IMPORTS
"""
import eel
from screeninfo import get_monitors
from valclient.client import Client
import webbrowser
import os
import psutil
from sys import argv
import logging
import time

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
LOOP_DELAY = 3 # Do not set this to less than 3 unless you know what you're doing.
LOCK_DELAY = 0
HOVER_DELAY = 0

# Used by the iterating runtime code
AGENT = None
SEEN_MATCHES = []
RUNNING = False

# All the codes right here so we don't need to fetch anything. This is also in web/json/agents.json so make changes in both places.
# The reason this is here at all is because I failed to fetch from localhost:port/json/agents.json from within this file.
AGENT_CODES = {
    "Reyna": "a3bfb853-43b2-7238-a4f1-ad90e9e46bcc",
    "Clove": "1dbf2edd-4729-0984-3115-daa5eed44993",
    "Jett": "add6443a-41bd-e414-f6ad-e58d267f4e95",
    "Omen": "8e253930-4c05-31dd-1b6c-968525494517",
    "Sage": "569fdd95-4d10-43ab-ca70-79becc718b46",
    "Sova": "320b2a48-4d9b-a075-30f1-1f93a9b638fa",
    "Gekko": "e370fa57-4757-3604-3648-499e1f642d3f",
    "Neon": "bb2a4828-46eb-8cd1-e765-15848195d751",
    "Raze": "f94c3b30-42be-e959-889c-5aa313dba261",
    "Tejo": "b444168c-4e35-8076-db47-ef9bf368f384",
    "Cypher": "117ed9e3-49f3-6512-3ccf-0cada7e3823b",
    "Chamber": "22697a3d-45bf-8dd7-4fec-84a9e28c69d7",
    "Killjoy": "1e58de9c-4950-5125-93e9-a0aee9f98746",
    "Phoenix": "eb93336a-449b-9c1b-0a54-a891f7921d69",
    "Skye": "6f2a04ca-43e0-be17-7f36-b3908627744d",
    "Brimstone": "9f0d8ba9-4140-b941-57d3-a7ad57c6b417",
    "Breach": "5f8d3a7f-467b-97f3-062c-13acf203c006",
    "Fade": "dade69b4-4f5a-8528-247b-219e5a1facd6",
    "Yoru": "7f94d92c-4234-0a36-9646-3a87eb8b5c89",
    "Kayo": "601dbbe7-43ce-be57-2a40-4abd24953621",
    "Astra": "41fb69c1-4189-7b37-f117-bcaf1e96f1bf",
    "Viper": "707eab51-4836-f488-046a-cda6bf494859",
    "Harbor": "95b78ed7-4637-86d9-7e41-71ba8c293152",
    "Deadlock": "cc8b64c8-4b25-4ff9-6e7f-37b4da43d235",
    "Iso": "0e38b510-41a8-5780-5e8f-568b2a4f2d6c",
    "Vyse": "efba5359-4016-a1e5-7626-b1ae76895940",
    "Waylay": "df1cb487-4902-002e-5c17-d28e83e78588"
}

VALORANT_PROCESS_NAMES = [
    "VALORANT.exe",
    "VALORANT-Win64-Shipping.exe",
    "VALORANT-Win32-Shipping.exe"
]

# Enable or disable debugging through an arg.
DEBUG = any( ['--debug' in arg.lower() for arg in argv] )
logger = logging.getLogger("VALORANT_INSTALOCKER" + __name__)

# Initialize debugger
if DEBUG:
    logger_filename = "valorant_instalocker.log"
    logging.basicConfig( filename=logger_filename, encoding='utf-8', level=logging.DEBUG )
    with open(logger_filename, "w"): pass # erase all content
    logger.debug(f"""\nPreferences:\nloop delay: {LOOP_DELAY}\nlock delay: {LOCK_DELAY}\nhover delay: {HOVER_DELAY}""")

"""
FUNCTIONS
"""
    
def get_region():
    """
    Get the region code of the current game.
    """
    region = None

    with open( os.path.join(os.getenv("LOCALAPPDATA"), R"VALORANT\Saved\Logs\ShooterGame.log"), "rb",) as f:
        lines = f.readlines()
    
    logger.debug(f"Lines from ShooterGame.log: {len(lines)}")

    # Region finder Test 1
    if not region:
        for line in lines:
            if b"regions/" in line:
                logger.debug(f"Testing {line}")
                region = line.split(b"regions/")[1].split(b"]")[0]
                region = region.decode()
                break
                
    # Region finder Test 2
    if not region:
        for line in lines:
            if b"config/" in line:
                logger.debug(f"Testing {line}")
                region = line.split(b"config/")[1].split(b"]")[0]
                region = region.decode()
                break
    
    logger.debug(f"Region: {region}")
    
    return region
        

def errorAlert(line1, line2, time):
    """
    Change the status text and the chosen agent text into an error.
    Sleep for some time before changing it back
    """
    logger.error(f"Error alert raised: {line1} {line2}")
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
    logger.debug("Stopping agent locking")


@eel.expose
def try_lock(agent):
    """
    START TO ATTEMPT LOCKING AN AGENT
    """
    global RUNNING
    global AGENT
    global SEEN_MATCHES
    
    logger.debug(f"User requested to lock agent: {agent}. Attempting to lock...")

    # if valorant isnt on, mock the user
    running_process_names = [p.name() for p in psutil.process_iter()]
    if not any(valorant_process in running_process_names for valorant_process in VALORANT_PROCESS_NAMES):

        if RUNNING:

            stop_lock()

            logger.debug("Valorant wasn't detected in process list so stopped locking.\nProcess list:")
            logger.debug(str(running_process_names))
        
        else:
            logger.debug("Valorant wasn't detected in process list when attempted to lock\nProcess list:")
            logger.debug(str(running_process_names))

        return errorAlert("TURN VALORANT ON", "YOU CLOWN", 3)

    try:  # try and get the region code automatically
        logger.debug('Trying to find region...')
        region_code = get_region()

    except:

        if RUNNING:
            logger.debug("Region wasn't found so stopped locking")
            stop_lock()

        return errorAlert("COULD NOT FIND REGION", "TRY LOGGING IN AGAIN", 5)
    
    if ( RUNNING ): # if we're already attempting to select an agent, simply change what agent we're trying to select
        logger.debug(f"Agent changed to {agent}")
        AGENT = AGENT_CODES[agent]
        return

    logger.debug(f"Starting to lock {agent}")

    try:

        logger.debug("Initializing a valclient instance...")
        client = Client(region=region_code)
        logger.debug("Initialized a valclient instance.")

    except ValueError:
        return errorAlert("COULD NOT INITIALIZE", "A VALCLIENT", 5)
    
    except Exception as e:
        logger.error(e)
        raise Exception(e)

    logger.debug("Activating valclient instance...")

    try:
        client.activate()

    except Exception as e:
        logger.error(f"Exception occurred during valclient activation: {str(e)}")
        raise Exception(e)

    logger.debug("Activated valclient instance")

    RUNNING = True  # Mark as actively trying to lock an agent

    while RUNNING:
        eel.sleep(LOOP_DELAY)
        logger.debug(f"Loop delay waiting {LOOP_DELAY} seconds")

        if not RUNNING:
            logger.debug("No longer running, ending locking loop")
            return  # Probably terminated

        logger.debug("Rechecking for pre-game...")

        try:
            sessionState = client.fetch_presence(client.puuid)["sessionLoopState"]
            
            matchID = client.pregame_fetch_match()["ID"]

            logger.debug(f"Session State: {sessionState}\nMatch ID: {matchID}")

            if sessionState == "PREGAME" and matchID not in SEEN_MATCHES:

                logger.debug("Pregame found. Adding match ID to seen matches and proceeding to lock.")

                SEEN_MATCHES.append(
                    matchID
                )  # If we've seen this match before, leave it be.

                logger.debug(f"Seen matches: {SEEN_MATCHES}")

                eel.changeStatus("LOCKING")

                if not AGENT:
                    logger.debug(f"Setting agent code to {agent}")
                    AGENT = AGENT_CODES[agent]

                start_time = time.time()

                eel.sleep(HOVER_DELAY)
                logger.debug(f"Hover delay waiting {HOVER_DELAY} seconds")

                client.pregame_select_character(AGENT)
                logger.debug(f"Selected agent: {agent} with code {AGENT}")

                eel.sleep(LOCK_DELAY)
                logger.debug(f"Lock delay waiting {LOCK_DELAY} seconds")

                client.pregame_lock_character(AGENT)
                logger.debug(f"Locked agent: {agent} with code {AGENT}")

                logger.debug(f"Agent selection process took {time.time() - start_time:.2f} seconds")

                stop_lock()
                logger.debug("Stopped locking loop since we're done.")

                eel.changeStatus("LOCKED")

                return True

        except Exception as e:

            logger.error(f"Exception occurred during agent locking: {str(e)}")
            logger.exception("Stack trace:")

            if "pre-game" not in str(e):
                errorAlert("ERROR", e, 12)
                stop_lock()
                return


@eel.expose
def open_instagram():
    webbrowser.open(INSTAGRAM)


@eel.expose
def open_github():
    webbrowser.open(GITHUB)

def check_chrome_installed():

    logger.debug("Checking for chrome..")

    def get_drives():
        
        logger.debug("Getting all drives")
        import win32api # type: ignore because pywin32 fulfils this.
        
        drives = win32api.GetLogicalDriveStrings()
        logger.debug(f"Drives: {drives}")

        drives = drives.split('\000')[:-1]
        logger.debug(f"Formatted drives: {drives}")

        return drives

    for drive in get_drives():
        CHROME_PATH = drive + r"Program Files\Google\Chrome\Application\chrome.exe"
        if os.path.exists(CHROME_PATH): 
            logger.debug(f"Found chrome at {CHROME_PATH}")
            return True
    
    logger.debug("Could not find chrome. Launching with default browser.")
    return False

"""
INITIALIZING THE EEL APPLICATION
"""
eel.init("web")

# Try launching with chrome, otherwise launch it in their default browser

if check_chrome_installed():
    logger.debug("Starting eel with chrome")
    eel.start("index.html", size=(SCREEN_DIMENSIONS), mode="chrome")
    
else:
    logger.debug("Starting eel with default browser")
    eel.start("index.html", size=(SCREEN_DIMENSIONS), mode="default")
