#!/usr/bin/env python3
import json
import urllib.request

body = json.dumps({
    "public": {
        "code": "AB12",
        "phase": "lobby",
        "players": [],
        "mode": "room"
    }
}).encode("utf-8")

req = urllib.request.Request(
    "http://127.0.0.1:8765/room/AB12/create",
    data=body,
    method="POST",
    headers={"Content-Type": "application/json"},
)
print("create:", urllib.request.urlopen(req).read().decode("utf-8"))
print("get:", urllib.request.urlopen("http://127.0.0.1/games/api/room/AB12").read().decode("utf-8"))
