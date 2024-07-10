import os
import sys
import shutil

# Get the current python's path. If you have multiple pythons, run this code with the python you wish to use.

PYTHON_PATH = os.path.dirname(sys.executable)

# Navigate to bottle.py in site packages
BOTTLE_PATH = PYTHON_PATH + r'\Lib\site-packages\bottle.py'

# Overwrite the current bottle.py with the bottle.py we have here.

shutil.copy2( os.path.dirname(os.path.realpath(__file__)) + '\\bottle.py', BOTTLE_PATH)
