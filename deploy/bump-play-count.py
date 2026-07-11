import json
import os

DATA_ROOT = os.environ.get("PARTY_GAMES_DATA", "/home/ec2-user/party-games-data")
STATS_PATH = os.path.join(DATA_ROOT, "stats.json")
STATS_BOOT_PATH = os.path.join(DATA_ROOT, "stats-boot.js")

data = {"playCount": 0}
if os.path.isfile(STATS_PATH):
    with open(STATS_PATH, "r", encoding="utf-8") as fh:
        data = json.load(fh)

data["playCount"] = int(data.get("playCount", 0)) + 200

with open(STATS_PATH, "w", encoding="utf-8") as fh:
    json.dump(data, fh, ensure_ascii=False)

boot = "window.PARTY_GAMES_PLAY_COUNT = %d;\n" % data["playCount"]
with open(STATS_BOOT_PATH, "w", encoding="utf-8") as fh:
    fh.write(boot)

print(json.dumps(data, ensure_ascii=False))
