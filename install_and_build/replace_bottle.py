import sys
import os
import requests
from datetime import datetime

# Get the current python's path. If you have multiple pythons, modify this to get the correct one. This will not work if you have a venv!
PYTHON_PATH = os.path.dirname(sys.executable)

# Navigate to bottle.py in site packages
BOTTLE_PATH = PYTHON_PATH + r'\Lib\site-packages\bottle.py'

# URL for the latest bottle.py
BOTTLE_URL = 'https://raw.githubusercontent.com/bottlepy/bottle/master/bottle.py'

try:
    # Fetch bottle.py from GitHub

    print(f"Fetching bottle.py from {BOTTLE_URL}")

    response = requests.get(BOTTLE_URL)
    response.raise_for_status() 

    content = response.text
    lines = content.split('\n')

    # Creates a backup of the current bottle.py
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{BOTTLE_PATH}.{timestamp}.backup"
    
    # Check if original exists first
    if os.path.exists(BOTTLE_PATH):

        print("Found bottle.py, creating backup.")

        with open(BOTTLE_PATH, 'r', encoding='utf-8') as src:

            with open(backup_path, 'w', encoding='utf-8') as dst:
                dst.write(src.read())

        print(f"Created backup at {backup_path}")
    
    # Find the shebang lines, we'll be inserting a comment after that
    insert_pos = 0
    for i, line in enumerate(lines[:3]):
        if line.startswith('#!') or line.startswith('# -*-'):
            insert_pos = i + 1
    
    # Custom comments
    custom_comments = [
        "# This was put here by SuppliedOrange/VALORANT-Instalocker to counter a common bug with pyinstaller.",
        "# https://stackoverflow.com/questions/75192206/why-my-packaged-eel-app-failed-to-execute-attributeerror-nonetype-object-ha",
        f"# This content was sourced from {BOTTLE_URL}",
        f"# You may revert your bottle.py installation by finding the backup file in {backup_path} or the other files located in that directory (they have a timestamp in their name).",
    ]
    
    for comment in reversed(custom_comments):
        lines.insert(insert_pos, comment)
    
    modified_content = '\n'.join(lines)

    print("Modified bottle.py with custom comments")

    # Write modified content to bottle.py
    with open(BOTTLE_PATH, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    print(f"Successfully updated {BOTTLE_PATH} with custom comments")
    
except requests.RequestException as e:
    print(f"Failed to fetch bottle.py: {e}")
except IOError as e:
    print(f"Failed to write bottle.py: {e}")