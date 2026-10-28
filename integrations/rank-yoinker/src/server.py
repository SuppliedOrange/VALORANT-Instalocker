import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import logging
import os
import sys
import threading
from websocket_server import WebsocketServer

from src.constants import version, PROJECT_ROOT

logging.getLogger('websocket_server.websocket_server').disabled = True

# websocket.enableTrace(True)

class QuietWebsocketServer(WebsocketServer):
    def handle_error(self, request, client_address):
        error_type, _, error_traceback = sys.exc_info()
        handshake_errors = (
            AssertionError,
            KeyError,
            UnicodeDecodeError,
            ValueError,
            ConnectionError,
        )
        while error_traceback:
            if (
                error_traceback.tb_frame.f_code.co_name
                in ("handshake", "read_http_headers")
                and error_type in handshake_errors
            ):
                return
            error_traceback = error_traceback.tb_next
        super().handle_error(request, client_address)

class MobileRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, websocket_port, **kwargs):
        self.websocket_port = websocket_port
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path == "/":
            self.send_response(302)
            self.send_header(
                "Location",
                f"/matchLoadouts.html?port={self.websocket_port}",
            )
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, format, *args):
        pass


class Server:
    def __init__(self, log, Error):
        self.Error = Error
        self.log = log
        self.lastMessages = {}

    def start_server(self):
        try:
            # print(self.lastMessage)
            with open(os.path.join(PROJECT_ROOT, "config.json"), "r") as conf:
                port = json.load(conf)["port"]
            self.server = QuietWebsocketServer(host="0.0.0.0", port=port)
            # server = websocket.WebSocketApp("wss://localhost:1100", on_open=on_open, on_message=on_message, on_close=on_close)
            self.server.set_fn_new_client(self.handle_new_client)
            self.server.run_forever(threaded=True)

            docs_directory = PROJECT_ROOT / "docs"
            if not docs_directory.is_dir():
                docs_directory = PROJECT_ROOT.parent / "docs"

            handler = partial(
                MobileRequestHandler,
                directory=docs_directory,
                websocket_port=port,
            )
            self.mobile_server = ThreadingHTTPServer(("0.0.0.0", port + 1), handler)
            self.mobile_port = self.mobile_server.server_address[1]
            threading.Thread(
                target=self.mobile_server.serve_forever,
                daemon=True,
            ).start()
        except Exception as e:
            self.Error.PortError(port)

    def handle_new_client(self, client, server):
        self.send_payload("version",{
            "core": version
        })
        for key in self.lastMessages:
            if key not in ["chat","version"]:
                self.send_message(self.lastMessages[key])

    def send_message(self, message):
        self.server.send_message_to_all(message)

    def send_payload(self, type, payload):
        payload["type"] = type
        msg_str = json.dumps(payload)
        self.lastMessages[type] = msg_str
        self.server.send_message_to_all(msg_str)
