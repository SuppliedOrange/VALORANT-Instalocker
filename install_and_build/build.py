import importlib.resources
import os
from pathlib import Path

import PyInstaller.__main__

ROOT = Path(__file__).resolve().parent.parent
EEL_JS = importlib.resources.files("eel").joinpath("eel.js")
WEB = ROOT / "web"

PyInstaller.__main__.run(
    [
        str(ROOT / "main.py"),
        "--onefile",
        "--noconsole",
        f"--icon={WEB / 'favicon.ico'}",
        "--name=VALORANT.Instalocker",
        "--hidden-import",
        "bottle_websocket",
        "--add-data",
        f"{EEL_JS}{os.pathsep}eel",
        "--add-data",
        f"{WEB}{os.pathsep}web",
        "--distpath",
        str(ROOT / "dist"),
        "--workpath",
        str(ROOT / "build"),
        "--specpath",
        str(ROOT / "build"),
        "--noconfirm",
    ]
)

print("Finished build process")
