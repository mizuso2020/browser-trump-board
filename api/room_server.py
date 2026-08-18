#!/usr/bin/env python3
"""Party Games room sync API (stdlib only)."""

import json
import os
import re
import secrets as token_lib
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

# --- 掲示板 ---------------------------------------------------------------
MESSAGE_MAX_CHARS = 200      # 1件の本文の上限
MESSAGE_KEEP = 200           # 1部屋で保持する件数。超えたら古い順に捨てる
MESSAGE_MIN_INTERVAL = 0.8   # 同じ人の連投を抑える秒数
# スタンプは種類IDだけを送らせる。任意の文字列を許すと本文の抜け道になるため、
# サーバー側のこの一覧が正。js/room.js の ROOM_STAMPS と同じ並びにすること。
ALLOWED_STAMPS = [
    "👍", "👎", "😀", "😂", "😮", "😭", "😡", "🤔",
    "🎉", "👏", "🙏", "💡", "❓", "❗", "🔥", "💯",
    "⏰", "🆗", "🈵", "🐺",
]
GAME_MAX_PLAYERS = {
    "werewolf": 13,
    "wordwolf": 12,
    "drawing_werewolf": 10,
    "ito": 8,
    "tic_tac_toe": 2,
    "vanishing_ttt": 2,
    "matryoshka_ttt": 2,
    "reversi": 2,
    "gomoku": 2,
    "shogi": 2,
    "ngword": 8,
    "daifugo": 8,
    "skull": 6,
    "blackjack": 7,
    "ninetyNine": 6,
    "texas_holdem": 9,
}


def room_max_players(public):
    game_id = public.get("pendingGame") or public.get("game")
    return GAME_MAX_PLAYERS.get(game_id, 16)


# --- 参加者トークン ---------------------------------------------------------
# 役職・手札・お題などの秘密情報は、本人（と進行役のホスト）だけが読めるように
# する。ルーム作成・参加のときにプレイヤーごとのトークンを発行し、以後は
# X-Room-Token ヘッダーで本人確認する。
#
# 再接続用の resolve-player はトークンを返さない。名前を言うだけでトークンが
# もらえてしまうと、他人になりすまして秘密を読めるため。


def tokens_path(code):
    return os.path.join(room_path(code), "tokens.json")


def read_tokens(code):
    data = read_json(tokens_path(code))
    if not isinstance(data, dict):
        return None
    if not isinstance(data.get("players"), dict):
        data["players"] = {}
    return data


def issue_token(code, player_id, is_host=False):
    """このプレイヤーのトークンを発行（既にあれば再利用）して返す。"""
    data = read_tokens(code) or {"hostId": None, "players": {}}
    token = data["players"].get(player_id)
    if not token:
        token = token_lib.token_urlsafe(24)
        data["players"][player_id] = token
    if is_host and not data.get("hostId"):
        data["hostId"] = player_id
    write_json(tokens_path(code), data)
    return token


def request_token(handler):
    return (handler.headers.get("X-Room-Token") or "").strip()


def token_owner(code, token):
    """そのトークンの持ち主のプレイヤーIDを返す。不明なら None。"""
    if not token:
        return None
    data = read_tokens(code)
    if not data:
        return None
    for pid, value in data["players"].items():
        if token_lib.compare_digest(str(value), token):
            return pid
    return None


def is_legacy_room(code):
    """この機能より前に作られたルーム。進行中のゲームを壊さないため素通しする。"""
    return read_tokens(code) is None


def may_read_private(code, player_id, handler):
    """本人か、進行役のホストだけ許可。"""
    if is_legacy_room(code):
        return True
    owner = token_owner(code, request_token(handler))
    if owner is None:
        return False
    if owner == player_id:
        return True
    return owner == (read_tokens(code) or {}).get("hostId")


def may_act_as_host(code, handler):
    if is_legacy_room(code):
        return True
    owner = token_owner(code, request_token(handler))
    return owner is not None and owner == (read_tokens(code) or {}).get("hostId")


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


def is_game_started(public):
    if not isinstance(public, dict):
        return False
    phase = public.get("phase") or "lobby"
    return phase != "lobby" or bool(public.get("game"))


def is_game_finished(public):
    if not isinstance(public, dict):
        return False
    phase = public.get("phase") or "lobby"
    if phase == "lobby" or not public.get("game"):
        return False
    gs = public.get("gameState")
    if isinstance(gs, dict):
        if gs.get("finished") is True:
            return True
        if gs.get("gameOver") is True:
            return True
    finished_phases = {
        "wolf_end",
        "wordwolf_end",
        "wordwolf_result",
        "draw_werewolf_end",
        "ngword_end",
        "ito_result",
        "oldmaid_result",
        "coyote_result",
        "sevens_result",
    }
    return phase in finished_phases


def reject_public_put(old_public, public):
    """Return error code string if PUT must be rejected, else None."""
    if not isinstance(public, dict):
        return "invalid public"
    if not isinstance(old_public, dict):
        return None
    if not is_game_started(old_public):
        return None
    incoming_at = int(public.get("updatedAt") or 0)
    old_at = int(old_public.get("updatedAt") or 0)
    if incoming_at and old_at and incoming_at < old_at:
        return "stale"
    if not is_game_started(public):
        if is_game_finished(old_public):
            return None
        return "started"
    return None


def increment_play_count():
    stats = read_stats()
    stats["playCount"] = int(stats.get("playCount", 0)) + 1
    write_json(STATS_PATH, stats)
    write_stats_boot(stats["playCount"])
    return stats["playCount"]


def merge_players(old_players, new_players):
    """Keep everyone who already joined; host saves can lag behind the server."""
    old_players = old_players if isinstance(old_players, list) else []
    new_players = new_players if isinstance(new_players, list) else []
    by_id = {}
    for p in old_players:
        if isinstance(p, dict) and p.get("id"):
            by_id[p["id"]] = dict(p)
    for p in new_players:
        if isinstance(p, dict) and p.get("id"):
            merged = dict(by_id.get(p["id"], {}))
            merged.update(p)
            by_id[p["id"]] = merged
    ordered = []
    seen = set()
    for p in old_players + new_players:
        pid = p.get("id") if isinstance(p, dict) else None
        if not pid or pid in seen or pid not in by_id:
            continue
        ordered.append(by_id[pid])
        seen.add(pid)
    return ordered


def messages_path(code):
    return os.path.join(room_path(code), "messages.json")


def read_messages(code):
    data = read_json(messages_path(code))
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        return {"nextId": 1, "items": []}
    if not isinstance(data.get("nextId"), int):
        data["nextId"] = len(data["items"]) + 1
    return data


def player_display_name(code, player_id):
    """名前は公開データ側を正とする。投稿者が名乗る名前は信用しない。"""
    public = read_json(os.path.join(room_path(code), "public.json"))
    for p in (public or {}).get("players") or []:
        if isinstance(p, dict) and p.get("id") == player_id:
            return str(p.get("name") or "")[:12]
    return ""


def append_message(code, player_id, kind, body):
    data = read_messages(code)
    items = data["items"]

    now = time.time()
    for item in reversed(items):
        if item.get("playerId") == player_id:
            if now - float(item.get("at", 0)) / 1000.0 < MESSAGE_MIN_INTERVAL:
                return None, "too fast"
            break

    entry = {
        "id": data["nextId"],
        "playerId": player_id,
        "name": player_display_name(code, player_id),
        "kind": kind,
        "body": body,
        "at": int(now * 1000),
    }
    items.append(entry)
    data["nextId"] += 1
    if len(items) > MESSAGE_KEEP:
        data["items"] = items[-MESSAGE_KEEP:]
    write_json(messages_path(code), data)
    return entry, None


def json_response(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
    handler.send_header("Pragma", "no-cache")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, X-Room-Token")
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
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Room-Token")
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
            if not may_read_private(code, player_id, self):
                return json_response(self, 403, {"error": "forbidden"})
            data = read_json(os.path.join(room_path(code), "private", player_id + ".json"))
            if not data:
                return json_response(self, 404, {"error": "not found"})
            return json_response(self, 200, data)

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "hostSecrets":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            if not may_act_as_host(code, self):
                return json_response(self, 403, {"error": "forbidden"})
            data = read_json(os.path.join(room_path(code), "hostSecrets.json"))
            if not data:
                return json_response(self, 404, {"error": "not found"})
            return json_response(self, 200, data)

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "messages":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            # 部屋の参加者だけが読める
            if not is_legacy_room(code) and token_owner(code, request_token(self)) is None:
                return json_response(self, 403, {"error": "forbidden"})
            data = read_messages(code)
            try:
                since = int((parsed.query.split("since=")[1].split("&")[0]) if "since=" in parsed.query else 0)
            except (ValueError, IndexError):
                since = 0
            items = [m for m in data["items"] if int(m.get("id", 0)) > since]
            return json_response(self, 200, {"items": items, "nextId": data["nextId"]})

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
            carries_secrets = body.get("hostSecrets") is not None or isinstance(
                body.get("playerSecrets"), dict
            )
            if carries_secrets and not may_act_as_host(code, self):
                return json_response(self, 403, {"error": "forbidden"})
            old_public = read_json(public_path)
            reject = reject_public_put(old_public, public)
            if reject:
                return json_response(self, 409, {"error": reject})
            if should_count_new_play(old_public, public):
                increment_play_count()
                public["gameStartedAt"] = int(time.time() * 1000)
            elif isinstance(old_public, dict) and old_public.get("gameStartedAt"):
                public["gameStartedAt"] = old_public["gameStartedAt"]
            if isinstance(public.get("players"), list):
                old_players = old_public.get("players") if isinstance(old_public, dict) else []
                public["players"] = merge_players(old_players, public["players"])
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
            if not may_read_private(code, player_id, self):
                return json_response(self, 403, {"error": "forbidden"})
            write_json(os.path.join(room_path(code), "private", player_id + ".json"), body)
            return json_response(self, 200, {"ok": True})

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "hostSecrets":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            if not may_act_as_host(code, self):
                return json_response(self, 403, {"error": "forbidden"})
            path = os.path.join(room_path(code), "hostSecrets.json")
            old = read_json(path)
            if isinstance(old, dict) and isinstance(body, dict):
                merged = dict(old)
                if isinstance(body.get("hands"), dict):
                    old_hands = merged.get("hands") if isinstance(merged.get("hands"), dict) else {}
                    merged["hands"] = dict(old_hands)
                    merged["hands"].update(body["hands"])
                    body = dict(body)
                    body["hands"] = merged["hands"]
                for key, value in body.items():
                    if key != "hands":
                        merged[key] = value
                body = merged
            write_json(path, body)
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
            host_id = public.get("hostId")
            if not PLAYER_RE.match(str(host_id or "")):
                players = public.get("players") or []
                host_id = players[0].get("id") if players else None
            if not PLAYER_RE.match(str(host_id or "")):
                return json_response(self, 400, {"error": "invalid host"})
            token = issue_token(code, host_id, is_host=True)
            return json_response(self, 200, {"ok": True, "playerId": host_id, "token": token})

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
                max_players = room_max_players(public)
                if len(players) >= max_players:
                    return json_response(self, 409, {"error": "full"})
                players.append({"id": player_id, "name": name, "isHost": False})
                public["players"] = players
                public["updatedAt"] = int(time.time() * 1000)
                write_json(public_path, public)
            # 参加できた人にだけトークンを渡す（保存はせず、この応答にのみ載せる）
            response = dict(public)
            response["_token"] = issue_token(code, player_id)
            return json_response(self, 200, response)

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "resolve-player":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            public_path = os.path.join(room_path(code), "public.json")
            public = read_json(public_path)
            if not public:
                return json_response(self, 404, {"error": "not found"})
            player_id = body.get("playerId", "")
            name = (body.get("name") or "").strip()
            players = public.get("players") or []
            if PLAYER_RE.match(player_id) and any(p.get("id") == player_id for p in players):
                return json_response(self, 200, {"playerId": player_id})
            if name:
                matches = [p for p in players if isinstance(p, dict) and p.get("name") == name]
                if matches:
                    return json_response(self, 200, {"playerId": matches[0]["id"]})
            return json_response(self, 404, {"error": "not in room"})

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "messages":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            player_id = token_owner(code, request_token(self))
            if player_id is None:
                return json_response(self, 403, {"error": "forbidden"})

            kind = body.get("kind")
            if kind == "stamp":
                stamp = body.get("body")
                if stamp not in ALLOWED_STAMPS:
                    return json_response(self, 400, {"error": "unknown stamp"})
                content = stamp
            elif kind == "text":
                content = str(body.get("body") or "").strip()
                if not content:
                    return json_response(self, 400, {"error": "empty"})
                content = content[:MESSAGE_MAX_CHARS]
            else:
                return json_response(self, 400, {"error": "invalid kind"})

            entry, err = append_message(code, player_id, kind, content)
            if err:
                return json_response(self, 429, {"error": err})
            return json_response(self, 200, entry)

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
