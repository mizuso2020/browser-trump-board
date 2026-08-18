#!/usr/bin/env python3
"""Party Games room sync API (stdlib only)."""

import json
import os
import re
import secrets as token_lib
import shutil
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

# --- 部屋の寿命 -----------------------------------------------------------
# 以前は掃除処理が無く、作られた部屋がディスクに残り続けていた。
# 募集一覧に死んだ部屋が並ぶのを防ぐためにも必要。
REPORT_PATH = os.path.join(DATA_ROOT, "reports.jsonl")
REPORT_MIN_INTERVAL = 10.0    # 同じ人の連続通報を抑える秒数
REPORT_MAX_CHARS = 300
_last_report = {}             # playerId -> 最後に通報した時刻

ROOM_STALE_SECONDS = 3 * 60 * 60      # これ以上更新が無い部屋は消す
ROOM_OPEN_STALE_SECONDS = 10 * 60     # 募集一覧に載せる上限（体感の鮮度）
ROOM_SWEEP_INTERVAL = 10 * 60         # 掃除を走らせる間隔
MESSAGE_CHANNELS = ("main", "spirit", "wolf")
# 生死で発言先が変わるゲーム。ポーカー系も gameState.alive を持つが、あちらは
# 「このハンドに残っているか」の意味なので巻き込まない。
LIVENESS_GAMES = {"werewolf"}
# 人狼だけの相談を許すフェーズ。昼に私語させると、嘘の口裏合わせが
# 他の人に見えないまま進んでしまいゲームが壊れる。
WOLF_TALK_PHASES = {"wolf_night"}

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
    "doubt": 4,
    "coyote": 6,
    "codenames": 8,
    "oldmaid": 6,
    "sevens": 4,
    "seven_stud": 8,
    "five_draw": 6,
}
# 注意: js/game-registry.js の maxPlayers と対応させること。ここに無いゲームは
# 既定の16人になり、定員を超えて参加できてしまう（募集一覧の表示も 16 になる）。


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
    """壊れたファイルは「無い」として扱う。

    1つの部屋の public.json が壊れただけで例外を上げると、全部屋を走査する
    募集一覧や掃除処理がまとめて落ちてしまう。BOM 付きも読めるようにしておく
    （Windows のエディタで触ると付くことがある）。
    """
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8-sig") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        return None


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


def merge_players(old_players, new_players, kicked=None):
    """Keep everyone who already joined; host saves can lag behind the server.

    追い出した相手だけは戻さない。ホストの保存は古い参加者一覧を送ってくるため、
    素直に合成するとキックが取り消されてしまう。
    """
    kicked = set(kicked or [])
    old_players = old_players if isinstance(old_players, list) else []
    new_players = new_players if isinstance(new_players, list) else []
    old_players = [p for p in old_players if not (isinstance(p, dict) and p.get("id") in kicked)]
    new_players = [p for p in new_players if not (isinstance(p, dict) and p.get("id") in kicked)]
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


def append_report(code, reporter_id, target_id, message_id, reason):
    """通報を1行ずつ追記する。運営が後から読んで判断するための記録。

    自動でBANはしない。誤報や嫌がらせ通報で人を弾くほうが害が大きいため、
    その場の対処はホストのキックに任せ、ここは記録に徹する。
    """
    now = time.time()
    last = _last_report.get(reporter_id, 0)
    if now - last < REPORT_MIN_INTERVAL:
        return False, "too fast"
    _last_report[reporter_id] = now

    # 通報された発言そのものを残す。後から部屋が消えても判断できるように
    quoted = None
    if message_id:
        for m in read_messages(code)["items"]:
            if int(m.get("id", 0)) == int(message_id):
                quoted = {"name": m.get("name"), "kind": m.get("kind"), "body": m.get("body")}
                break

    entry = {
        "at": int(now * 1000),
        "code": code,
        "reporter": reporter_id,
        "target": target_id or None,
        "targetName": player_display_name(code, target_id) if target_id else None,
        "messageId": message_id or None,
        "quoted": quoted,
        "reason": str(reason or "")[:REPORT_MAX_CHARS],
    }
    try:
        os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
        with open(REPORT_PATH, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError:
        return False, "write failed"
    return True, None


def room_updated_at(public):
    try:
        return float(public.get("updatedAt") or 0) / 1000.0
    except (TypeError, ValueError):
        return 0.0


_last_sweep = [0.0]


def sweep_stale_rooms(force=False):
    """更新が止まった部屋を消す。GET のついでに間引いて呼ぶ。"""
    now = time.time()
    if not force and now - _last_sweep[0] < ROOM_SWEEP_INTERVAL:
        return 0
    _last_sweep[0] = now

    removed = 0
    try:
        codes = os.listdir(ROOM_DIR)
    except OSError:
        return 0

    for code in codes:
        target = os.path.join(ROOM_DIR, code)
        if not os.path.isdir(target):
            continue
        public = read_json(os.path.join(target, "public.json"))
        if not public:
            # public.json が無い壊れた部屋。作りかけのまま放置されたもの
            updated = 0.0
            try:
                updated = os.path.getmtime(target)
            except OSError:
                pass
        else:
            updated = room_updated_at(public)
        if updated and now - updated < ROOM_STALE_SECONDS:
            continue
        try:
            shutil.rmtree(target)
            removed += 1
        except OSError:
            continue
    return removed


def list_open_rooms():
    """募集中の部屋。公開設定・ロビー・空きあり・最近更新、を満たすものだけ。"""
    now = time.time()
    rooms = []
    try:
        codes = os.listdir(ROOM_DIR)
    except OSError:
        return rooms

    for code in codes:
        if not CODE_RE.match(code):
            continue
        public = read_json(os.path.join(ROOM_DIR, code, "public.json"))
        if not isinstance(public, dict):
            continue
        if not public.get("isOpen"):
            continue
        if (public.get("phase") or "lobby") != "lobby":
            continue
        updated = room_updated_at(public)
        if not updated or now - updated > ROOM_OPEN_STALE_SECONDS:
            continue
        players = public.get("players") or []
        capacity = room_max_players(public)
        if len(players) >= capacity:
            continue
        # 参加者の名前は返さない。募集判断に要らない情報は出さない
        rooms.append({
            "code": code,
            "game": public.get("pendingGame") or public.get("game"),
            "mode": public.get("mode") or "online",
            "players": len(players),
            "capacity": capacity,
            "updatedAt": int(updated * 1000),
        })

    rooms.sort(key=lambda r: r["updatedAt"], reverse=True)
    return rooms


def messages_path(code):
    return os.path.join(room_path(code), "messages.json")


def read_messages(code):
    data = read_json(messages_path(code))
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        return {"nextId": 1, "items": []}
    if not isinstance(data.get("nextId"), int):
        data["nextId"] = len(data["items"]) + 1
    return data


def player_liveness(code, player_id):
    """その人が生きているか。人狼で追放・襲撃された人は "dead"。

    対象外のゲームでは全員 "alive" として扱い、霊界チャンネルは使わせない。
    """
    public = read_json(os.path.join(room_path(code), "public.json"))
    if not isinstance(public, dict):
        return "alive"
    if (public.get("game") or "") not in LIVENESS_GAMES:
        return "alive"
    gs = public.get("gameState")
    if not isinstance(gs, dict) or not isinstance(gs.get("alive"), list):
        return "alive"
    return "alive" if player_id in gs["alive"] else "dead"


def player_role(code, player_id):
    """役職を引く。チャンネルの出し分けにだけ使い、外へは返さない。"""
    public = read_json(os.path.join(room_path(code), "public.json"))
    if not isinstance(public, dict) or (public.get("game") or "") not in LIVENESS_GAMES:
        return None
    secrets = read_json(os.path.join(room_path(code), "hostSecrets.json"))
    roles = (secrets or {}).get("roles")
    if not isinstance(roles, dict):
        return None
    return roles.get(player_id)


def is_wolf_talk_time(code):
    public = read_json(os.path.join(room_path(code), "public.json"))
    return isinstance(public, dict) and (public.get("phase") or "") in WOLF_TALK_PHASES


def readable_channels(code, player_id):
    """生きている人に霊界は見せない。死んだ人は議論を見られる（観戦のため）。

    人狼の相談ログは、生きている人狼なら昼でも読み返せる。害があるのは
    昼に「書ける」ことなので、読む側は絞らない。狂人は人狼ではないので見えない。
    """
    if player_liveness(code, player_id) == "dead":
        return ("main", "spirit")
    if player_role(code, player_id) == "wolf":
        return ("main", "wolf")
    return ("main",)


def writable_channels(code, player_id):
    """書ける先の一覧。先頭が既定。

    死んだ人は霊界だけ（生存者の議論に割り込ませない）。生きている人狼は
    夜だけ相談できる。夜は既定を相談側にする — 作戦を誤って全体に
    書いてしまう事故のほうが取り返しがつかないため。
    """
    if player_liveness(code, player_id) == "dead":
        return ("spirit",)
    if player_role(code, player_id) == "wolf" and is_wolf_talk_time(code):
        return ("wolf", "main")
    return ("main",)


def clean_name(raw):
    """表示名の正規化。制御文字や長すぎる名前をそのまま通さない。"""
    text = str(raw or "")
    text = "".join(ch for ch in text if ch.isprintable())
    text = re.sub(r"\s+", " ", text).strip()
    return text[:12]


def player_display_name(code, player_id):
    """名前は公開データ側を正とする。投稿者が名乗る名前は信用しない。"""
    public = read_json(os.path.join(room_path(code), "public.json"))
    for p in (public or {}).get("players") or []:
        if isinstance(p, dict) and p.get("id") == player_id:
            return str(p.get("name") or "")[:12]
    return ""


def append_message(code, player_id, kind, body, channel):
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
        "channel": channel,
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

        if len(parts) == 2 and parts[0] == "rooms" and parts[1] == "open":
            sweep_stale_rooms()
            return json_response(self, 200, {"rooms": list_open_rooms()})

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "messages":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            # 部屋の参加者だけが読める
            viewer = token_owner(code, request_token(self))
            if viewer is None and not is_legacy_room(code):
                return json_response(self, 403, {"error": "forbidden"})
            data = read_messages(code)
            try:
                since = int((parsed.query.split("since=")[1].split("&")[0]) if "since=" in parsed.query else 0)
            except (ValueError, IndexError):
                since = 0
            allowed = readable_channels(code, viewer) if viewer else ("main",)
            items = [
                m for m in data["items"]
                if int(m.get("id", 0)) > since and (m.get("channel") or "main") in allowed
            ]
            return json_response(self, 200, {
                "items": items,
                "nextId": data["nextId"],
                "channels": list(allowed),
                "writable": list(writable_channels(code, viewer)) if viewer else ["main"],
            })

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
            kicked = old_public.get("kicked") if isinstance(old_public, dict) else []
            kicked = kicked if isinstance(kicked, list) else []
            if kicked:
                public["kicked"] = kicked
            if isinstance(public.get("players"), list):
                old_players = old_public.get("players") if isinstance(old_public, dict) else []
                public["players"] = merge_players(old_players, public["players"], kicked)
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
            for p in public.get("players") or []:
                if isinstance(p, dict):
                    p["name"] = clean_name(p.get("name")) or "プレイヤー"
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
            # クライアント側の maxlength だけでは通り抜けるのでここで正規化する
            name = clean_name(body.get("name"))
            if not PLAYER_RE.match(player_id) or not name:
                return json_response(self, 400, {"error": "invalid player"})
            if player_id in (public.get("kicked") or []):
                return json_response(self, 403, {"error": "kicked"})
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

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "report":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            reporter = token_owner(code, request_token(self))
            if reporter is None:
                return json_response(self, 403, {"error": "forbidden"})

            target = body.get("targetId") or ""
            if target and not PLAYER_RE.match(str(target)):
                return json_response(self, 400, {"error": "invalid player"})
            message_id = body.get("messageId")
            reason = body.get("reason")
            if not target and not message_id:
                return json_response(self, 400, {"error": "nothing to report"})

            ok, err = append_report(code, reporter, target, message_id, reason)
            if not ok:
                return json_response(self, 429 if err == "too fast" else 500, {"error": err})
            return json_response(self, 200, {"ok": True})

        if len(parts) == 3 and parts[0] == "room" and parts[2] == "kick":
            code = parts[1].upper()
            if not CODE_RE.match(code):
                return json_response(self, 400, {"error": "invalid code"})
            if not may_act_as_host(code, self):
                return json_response(self, 403, {"error": "forbidden"})
            target = body.get("playerId", "")
            if not PLAYER_RE.match(str(target or "")):
                return json_response(self, 400, {"error": "invalid player"})

            public_path = os.path.join(room_path(code), "public.json")
            public = read_json(public_path)
            if not public:
                return json_response(self, 404, {"error": "not found"})
            tokens = read_tokens(code) or {"hostId": None, "players": {}}
            if target == tokens.get("hostId"):
                return json_response(self, 400, {"error": "cannot kick host"})

            public["players"] = [
                p for p in (public.get("players") or [])
                if not (isinstance(p, dict) and p.get("id") == target)
            ]
            kicked = public.get("kicked")
            public["kicked"] = (kicked if isinstance(kicked, list) else []) + [target]
            public["updatedAt"] = int(time.time() * 1000)
            write_json(public_path, public)

            # 追い出した相手のトークンと秘密を無効化する。残すと復帰できてしまう
            tokens["players"].pop(target, None)
            write_json(tokens_path(code), tokens)
            try:
                os.remove(os.path.join(room_path(code), "private", target + ".json"))
            except OSError:
                pass
            return json_response(self, 200, {"ok": True})

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

            # 書ける先はサーバーが決める。クライアントは希望を出せるだけで、
            # 一覧に無い先は既定へ落とす（死んだ人が議論に割り込む道を残さない）
            allowed_write = writable_channels(code, player_id)
            requested = body.get("channel")
            channel = requested if requested in allowed_write else allowed_write[0]
            entry, err = append_message(code, player_id, kind, content, channel)
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
