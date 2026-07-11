#!/usr/bin/env python3
"""Party Games room sync API (stdlib only)."""

import json
import os
import re
import time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

DATA_ROOT = os.environ.get("PARTY_GAMES_DATA", "/home/ec2-user/party-games-data")
ROOM_DIR = os.path.join(DATA_ROOT, "rooms")
STATS_PATH = os.path.join(DATA_ROOT, "stats.json")
STATS_BOOT_PATH = os.path.join(DATA_ROOT, "stats-boot.js")
STATS_BOOT_WEB_PATH = os.environ.get(
    "PARTY_GAMES_STATS_BOOT_WEB",
    "/usr/share/nginx/html/games/js/stats-boot.js",
)
CODE_RE = re.compile(r"^[A-Z0-9]{4}$")
PLAYER_RE = re.compile(r"^[a-z0-9]{6,16}$")


def ensure_dirs():
    os.makedirs(ROOM_DIR, exist_ok=True)


def room_path(code):
    return os.path.join(ROOM_DIR, code)


def read_json(path):
    if not os.path.isfile(path):
        return None
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False)
    os.replace(tmp, path)


def read_stats():
    data = read_json(STATS_PATH)
    if not isinstance(data, dict):
        return {"playCount": 0}
    return {"playCount": int(data.get("playCount", 0) or 0)}


def write_stats_boot(count):
    body = "window.PARTY_GAMES_PLAY_COUNT = %d;\n" % int(count)
    for path in (STATS_BOOT_PATH, STATS_BOOT_WEB_PATH):
        try:
            parent = os.path.dirname(path)
            if parent:
                os.makedirs(parent, exist_ok=True)
            tmp = path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                fh.write(body)
            os.replace(tmp, path)
        except OSError:
            continue


def sync_stats_boot():
    stats = read_stats()
    write_stats_boot(stats["playCount"])
    return stats["playCount"]


def should_count_new_play(old_public, new_public):
    if not isinstance(new_public, dict):
        return False
    if not new_public.get("game"):
        return False
    old_phase = "lobby"
    if isinstance(old_public, dict):
        old_phase = old_public.get("phase") or "lobby"
    new_phase = new_public.get("phase") or "lobby"
    return old_phase == "lobby" and new_phase != "lobby"


def increment_play_count():
    stats = read_stats()
    stats["playCount"] = int(stats.get("playCount", 0)) + 1
    write_json(STATS_PATH, stats)
    write_stats_boot(stats["playCount"])
    return stats["playCount"]


def json_response(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(body)


def read_body(handler):
    length = int(handler.headers.get("Content-Length", "0") or "0")
    if length <= 0:
        return {}
    raw = handler.rfile.read(length)
    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return None


class RoomHandler(BaseHTTPRequestHandler):
    server_version = "PartyGamesRoom/1.0"

    def log_message(self, fmt, *args):
        return

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        ensure_dirs()
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]

        if len(parts) == 2 and parts[0] == "room":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            data = read_json(os.path.join(room_path(code), "public.json"))
            if not data:
                return json_response(self, 404, {"error": "not found"})
            return json_response(self, 200, data)

        if len(parts) == 4 and parts[0] == "room" and parts[2] == "private":
            code = parts[1].upper()
            player_id = parts[3]
            if not CODE_RE.match(code) or not PLAYER_RE.match(player_id):
                return json_response(self, 400, {"error": "invalid path"})
            data = read_json(os.path.join(room_path(code), "private", player_id + ".json"))
            if not data:
                return json_response(self, 404, {"error": "not found"})
            return json_response(self, 200, data)

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "hostSecrets":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            data = read_json(os.path.join(room_path(code), "hostSecrets.json"))
            if not data:
                return json_response(self, 404, {"error": "not found"})
            return json_response(self, 200, data)

        if len(parts) == 2 and parts[0] == "stats" and parts[1] == "plays":
            stats = read_stats()
            return json_response(self, 200, stats)

        if len(parts) == 3 and parts[0] == "stats" and parts[1] == "plays" and parts[2] == "inc":
            count = increment_play_count()
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return

        return json_response(self, 404, {"error": "not found"})

    def do_PUT(self):
        ensure_dirs()
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        body = read_body(self)
        if body is None:
            return json_response(self, 400, {"error": "invalid json"})

        if len(parts) == 2 and parts[0] == "room":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            public = body.get("public")
            if not isinstance(public, dict):
                return json_response(self, 400, {"error": "invalid public"})
            public_path = os.path.join(room_path(code), "public.json")
            old_public = read_json(public_path)
            if should_count_new_play(old_public, public):
                increment_play_count()
            public["updatedAt"] = int(time.time() * 1000)
            write_json(public_path, public)
            if "hostSecrets" in body and body["hostSecrets"] is not None:
                write_json(os.path.join(room_path(code), "hostSecrets.json"), body["hostSecrets"])
            if "playerSecrets" in body and isinstance(body["playerSecrets"], dict):
                for pid, secret in body["playerSecrets"].items():
                    if PLAYER_RE.match(pid):
                        write_json(os.path.join(room_path(code), "private", pid + ".json"), secret)
            return json_response(self, 200, {"ok": True})

        if len(parts) == 4 and parts[0] == "room" and parts[2] == "private":
            code = parts[1].upper()
            player_id = parts[3]
            if not CODE_RE.match(code) or not PLAYER_RE.match(player_id):
                return json_response(self, 400, {"error": "invalid path"})
            write_json(os.path.join(room_path(code), "private", player_id + ".json"), body)
            return json_response(self, 200, {"ok": True})

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "hostSecrets":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            write_json(os.path.join(room_path(code), "hostSecrets.json"), body)
            return json_response(self, 200, {"ok": True})

        return json_response(self, 404, {"error": "not found"})

    def do_POST(self):
        ensure_dirs()
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        body = read_body(self)
        if body is None:
            return json_response(self, 400, {"error": "invalid json"})

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "create":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            if os.path.exists(os.path.join(room_path(code), "public.json")):
                return json_response(self, 409, {"error": "exists"})
            public = body.get("public")
            if not isinstance(public, dict):
                return json_response(self, 400, {"error": "public required"})
            public["updatedAt"] = int(time.time() * 1000)
            write_json(os.path.join(room_path(code), "public.json"), public)
            return json_response(self, 200, {"ok": True})

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "join":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            public_path = os.path.join(room_path(code), "public.json")
            public = read_json(public_path)
            if not public:
                return json_response(self, 404, {"error": "not found"})
            if public.get("phase") != "lobby":
                return json_response(self, 409, {"error": "started"})
            player_id = body.get("playerId", "")
            name = (body.get("name") or "").strip()
            if not PLAYER_RE.match(player_id) or not name:
                return json_response(self, 400, {"error": "invalid player"})
            players = public.get("players") or []
            if not any(p.get("id") == player_id for p in players):
                players.append({"id": player_id, "name": name, "isHost": False})
                public["players"] = players
                public["updatedAt"] = int(time.time() * 1000)
                write_json(public_path, public)
            return json_response(self, 200, public)

        if len(parts) == 2 and parts[0] == "stats" and parts[1] == "plays":
            count = increment_play_count()
            return json_response(self, 200, {"playCount": count})

        return json_response(self, 404, {"error": "not found"})


def main():
    ensure_dirs()
    sync_stats_boot()
    host = os.environ.get("PARTY_GAMES_HOST", "127.0.0.1")
    port = int(os.environ.get("PARTY_GAMES_PORT", "8765"))
    server = ThreadingHTTPServer((host, port), RoomHandler)
    print(f"Party Games room API on {host}:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
