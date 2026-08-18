/**

 * ルーム同期：ローカル（1台） / サーバーAPI（各自のスマホ） / Firebase（オンライン）

 */



const Sync = {

  mode: "local",

  db: null,

  auth: null,

  uid: null,

  listener: null,

  pollTimer: null,



  isOnline: function () {

    return this.mode === "online" || this.mode === "room";

  },



  shouldUseServerApi: function (mode) {
    const m = mode || this.mode;
    return m === "room" || m === "online";
  },

  /** オンラインは当初 Firebase で作る想定だったが、実際にはルームAPI(HTTP)へ
   *  移行済みで、room と online は同じ経路で動く。Firebase の有無で判定すると
   *  設定が空のままオンラインだけ永久に塞がるため、API基準で判定する。 */
  canUseMultiDevice: function (mode) {
    const m = mode || this.mode;
    return m === "room" || m === "online";
  },



  isReady: function () {

    return this.mode === "local" || this.shouldUseServerApi() || (this.db && this.uid);

  },



  apiBase: function () {

    const path = window.location.pathname;

    const idx = path.indexOf("/games");

    if (idx >= 0) {

      return window.location.origin + path.slice(0, idx) + "/games/api";

    }

    return window.location.origin + "/games/api";

  },



  /* --- 参加者トークン ---

     役職・手札・お題は本人（と進行役のホスト）しか読めないよう、サーバー側で

     X-Room-Token を検証している。トークンはルーム作成・参加のときに受け取り、

     ルームコードごとに localStorage へ保存する。 */



  tokenKey: function (code) {

    // プレイヤーIDまで含める。1台のブラウザで別の人が入り直しても混ざらないように。

    return "partyGames_roomToken_" + String(code || "").toUpperCase() + "_" + this.uid;

  },



  saveRoomToken: function (code, token) {

    if (!code || !token) return;

    try { localStorage.setItem(this.tokenKey(code), token); } catch (e) { /* ignore */ }

  },



  getRoomToken: function (code) {

    if (!code) return "";

    try { return localStorage.getItem(this.tokenKey(code)) || ""; } catch (e) { return ""; }

  },



  roomCodeFromPath: function (url) {

    const m = /^\/room\/([A-Za-z0-9]{4})(\/|\?|$)/.exec(String(url || ""));

    return m ? m[1].toUpperCase() : "";

  },



  apiFetch: async function (url, options) {

    const opts = Object.assign({ cache: "no-store" }, options || {});

    const token = this.getRoomToken(this.roomCodeFromPath(url));

    if (token) {

      opts.headers = Object.assign({}, opts.headers || {}, { "X-Room-Token": token });

    }

    if ((!opts.method || opts.method === "GET") && url.indexOf("/room/") === 0) {

      const sep = url.indexOf("?") >= 0 ? "&" : "?";

      url = url + sep + "_=" + Date.now();

    }

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;

    if (controller) {

      opts.signal = controller.signal;

      setTimeout(function () { controller.abort(); }, 12000);

    }

    const res = await fetch(this.apiBase() + url, opts);

    let data = {};

    try {

      data = await res.json();

    } catch (e) {

      data = {};

    }

    if (!res.ok) {

      const msg = data.error || "通信に失敗しました";

      if (res.status === 404 && msg === "not found") {

        throw new Error("ルームが見つかりません");

      }

      if (res.status === 409 && msg === "stale") {

        throw new Error("保存が古くなりました。画面を更新してください");

      }

      if (res.status === 409 && msg === "started") {

        throw new Error("すでにゲームが始まっています");

      }

      if (res.status === 409 && msg === "full") {

        throw new Error("ルームが満員です");

      }

      if (res.status === 409 && msg === "exists") {

        throw new Error("ルーム作成に失敗しました。もう一度お試しください。");

      }

      throw new Error(msg);

    }

    return data;

  },



  init: async function (mode) {

    this.mode = mode;



    if (mode === "local") {

      return true;

    }



    // room / online はどちらもルームAPI(HTTP)。Firebase は使わない
    this.uid = getStablePlayerId();

    this.db = null;

    this.auth = null;

    return true;

  },



  getPlayerId: function () {

    return this.isOnline() ? this.uid : null;

  },



  /* --- ローカル --- */



  saveLocal: function (room) {

    RoomStore.save(room.code, room);

  },



  loadLocal: function (code) {

    return RoomStore.load(code);

  },



  subscribeLocal: function (code, callback) {

    let last = null;

    return setInterval(function () {

      const latest = RoomStore.load(code);

      if (!latest) return;

      const json = JSON.stringify(latest);

      if (json === last) return;

      last = json;

      callback(latest);

    }, 800);

  },



  /* --- サーバーAPI --- */



  createServer: async function (room) {

    room.mode = room.mode || "room";

    room.hostId = this.uid;

    room.players = [{ id: this.uid, name: room._creatorName, isHost: true }];



    const created = await this.apiFetch("/room/" + room.code + "/create", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ public: this._publicPayload(room) })

    });

    if (created && created.token) {

      this.saveRoomToken(room.code, created.token);

    }

    return room;

  },



  joinServer: async function (code, name) {

    const roomCode = String(code || "").toUpperCase();

    const joined = await this.apiFetch("/room/" + roomCode + "/join", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ playerId: this.uid, name: name })

    });

    if (joined && joined._token) {

      this.saveRoomToken(roomCode, joined._token);

      delete joined._token;

    }

    return joined;

  },



  resolvePlayerServer: async function (code, name, playerId) {

    return this.apiFetch("/room/" + String(code || "").toUpperCase() + "/resolve-player", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ playerId: playerId || this.uid, name: name || "" })

    });

  },



  resolvePlayer: async function (code, name, playerId) {

    if (this.shouldUseServerApi()) {

      return this.resolvePlayerServer(code, name, playerId);

    }

    return null;

  },



  loadServer: async function (code) {

    return this.apiFetch("/room/" + String(code || "").toUpperCase());

  },



  saveServer: async function (room) {

    await this.apiFetch("/room/" + String(room.code || "").toUpperCase(), {

      method: "PUT",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ public: this._publicPayload(room) })

    });

  },



  saveServerWithSecrets: async function (room, hostSecrets, playerSecrets) {

    const split = Secrets.stripFromRoom(room);

    const payload = { public: this._publicPayload(split.room) };



    if (hostSecrets && (hostSecrets.numbers || hostSecrets.roles || hostSecrets.hands || hostSecrets.words || hostSecrets.ngWords || hostSecrets.holeCards || hostSecrets.deck || hostSecrets.skullTypes || hostSecrets.bjStates)) {

      payload.hostSecrets = hostSecrets;

    }

    if (playerSecrets && Object.keys(playerSecrets).length) {

      payload.playerSecrets = playerSecrets;

    }



    await this.apiFetch("/room/" + room.code, {

      method: "PUT",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(payload)

    });

  },



  getPlayerSecretServer: async function (code, playerId) {

    try {

      return await this.apiFetch("/room/" + code + "/private/" + playerId);

    } catch (e) {

      return null;

    }

  },



  getHostSecretsServer: async function (code) {

    try {

      return await this.apiFetch("/room/" + code + "/hostSecrets");

    } catch (e) {

      return null;

    }

  },



  updatePlayerSecretServer: async function (code, playerId, data) {

    await this.apiFetch("/room/" + code + "/private/" + playerId, {

      method: "PUT",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(data)

    });

  },



  updateHostSecretsServer: async function (code, data) {

    await this.apiFetch("/room/" + code + "/hostSecrets", {

      method: "PUT",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(data)

    });

  },



  /* --- 募集中の部屋 --- */



  fetchOpenRooms: async function () {

    try {

      return await this.apiFetch("/rooms/open");

    } catch (e) {

      return null;

    }

  },



  reportToRoom: async function (code, payload) {

    return this.apiFetch("/room/" + String(code || "").toUpperCase() + "/report", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(payload || {})

    });

  },



  kickPlayer: async function (code, playerId) {

    return this.apiFetch("/room/" + String(code || "").toUpperCase() + "/kick", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ playerId: playerId })

    });

  },



  /* --- 掲示板 --- */



  fetchMessages: async function (code, since) {

    try {

      return await this.apiFetch("/room/" + String(code || "").toUpperCase() + "/messages?since=" + (since || 0));

    } catch (e) {

      return null;

    }

  },



  sendMessage: async function (code, kind, body, channel) {

    return this.apiFetch("/room/" + String(code || "").toUpperCase() + "/messages", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ kind: kind, body: body, channel: channel || undefined })

    });

  },



  subscribeServer: function (code, callback) {

    const roomId = String(code || "").toUpperCase();
    let lastPollSnapshot = "";

    const pollSnapshot = function (room) {
      if (!room || room.__syncFailed) return "";
      const copy = JSON.parse(JSON.stringify(room));
      delete copy.updatedAt;
      delete copy.gameStartedAt;
      delete copy._syncedGameState;
      delete copy._syncedAt;
      delete copy._creatorName;
      return JSON.stringify(copy);
    };

    const poll = async function () {

      try {

        const latest = await Sync.apiFetch("/room/" + roomId);
        const snap = pollSnapshot(latest);
        if (snap && snap === lastPollSnapshot) return;
        lastPollSnapshot = snap;

        callback(latest);

      } catch (e) {

        callback({ __syncFailed: true, error: String(e.message || e) });

      }

    };

    poll();

    const timer = setInterval(poll, 400);

    timer.forcePoll = poll;

    timer.resetPollCache = function () {
      lastPollSnapshot = "";
    };

    return timer;

  },



  /* --- Firebase --- */



  roomRef: function (code) {

    return this.db.ref("rooms/" + code);

  },



  createOnline: async function (room) {

    if (this.shouldUseServerApi()) {

      return this.createServer(room);

    }



    const ref = this.roomRef(room.code);

    const snap = await ref.child("public").once("value");

    if (snap.exists()) {

      throw new Error("ルーム作成に失敗しました。もう一度お試しください。");

    }



    room.mode = room.mode || "online";

    room.hostId = this.uid;

    room.players = [{ id: this.uid, name: room._creatorName, isHost: true }];



    await ref.child("public").set(this._publicPayload(room));

    return room;

  },



  joinOnline: async function (code, name) {

    if (this.shouldUseServerApi()) {

      return this.joinServer(code, name);

    }



    const ref = this.roomRef(code);

    const snap = await ref.child("public").once("value");

    if (!snap.exists()) {

      throw new Error("ルームが見つかりません");

    }



    const room = snap.val();

    if (room.phase !== "lobby") {

      throw new Error("すでにゲームが始まっています");

    }



    const exists = room.players.some(function (p) { return p.id === Sync.uid; });

    if (!exists) {

      await ref.child("public/players").transaction(function (players) {

        players = players || [];

        if (players.some(function (p) { return p.id === Sync.uid; })) return players;

        players.push({ id: Sync.uid, name: name, isHost: false });

        return players;

      });

    }



    const updated = await ref.child("public").once("value");

    return updated.val();

  },



  loadOnline: async function (code) {

    if (this.shouldUseServerApi()) {

      return this.loadServer(code);

    }



    const snap = await this.roomRef(code).child("public").once("value");

    return snap.exists() ? snap.val() : null;

  },



  saveOnline: async function (room) {

    if (this.shouldUseServerApi()) {

      return this.saveServer(room);

    }



    await this.roomRef(room.code).child("public").set(this._publicPayload(room));

  },



  saveOnlineWithSecrets: async function (room, hostSecrets, playerSecrets) {

    if (this.shouldUseServerApi()) {

      return this.saveServerWithSecrets(room, hostSecrets, playerSecrets);

    }



    const split = Secrets.stripFromRoom(room);

    const ref = this.roomRef(room.code);



    await ref.child("public").set(this._publicPayload(split.room));



    if (hostSecrets && (hostSecrets.numbers || hostSecrets.roles || hostSecrets.hands || hostSecrets.words || hostSecrets.ngWords || hostSecrets.holeCards || hostSecrets.deck || hostSecrets.skullTypes || hostSecrets.bjStates)) {

      await ref.child("hostSecrets").set(hostSecrets);

    }



    const writes = [];

    Object.keys(playerSecrets).forEach(function (pid) {

      writes.push(ref.child("private/" + pid).set(playerSecrets[pid]));

    });

    await Promise.all(writes);

  },



  getPlayerSecret: async function (code, playerId) {

    if (this.shouldUseServerApi()) {

      return this.getPlayerSecretServer(code, playerId);

    }



    const snap = await this.roomRef(code).child("private/" + playerId).once("value");

    return snap.exists() ? snap.val() : null;

  },



  getHostSecrets: async function (code) {

    if (this.shouldUseServerApi()) {

      return this.getHostSecretsServer(code);

    }



    const snap = await this.roomRef(code).child("hostSecrets").once("value");

    return snap.exists() ? snap.val() : null;

  },



  updatePlayerSecret: async function (code, playerId, data) {

    if (this.shouldUseServerApi()) {

      return this.updatePlayerSecretServer(code, playerId, data);

    }



    await this.roomRef(code).child("private/" + playerId).update(data);

  },



  updateHostSecrets: async function (code, data) {

    if (this.shouldUseServerApi()) {

      return this.updateHostSecretsServer(code, data);

    }



    await this.roomRef(code).child("hostSecrets").update(data);

  },



  /** ホスト用全手札のうち1人分だけ更新（参加者のプレイ後も同期） */
  patchHostHand: async function (code, playerId, hand) {

    if (this.shouldUseServerApi()) {

      let current = await this.getHostSecretsServer(code);

      if (!current || typeof current !== "object") current = {};

      if (!current.hands || typeof current.hands !== "object") current.hands = {};

      current.hands[playerId] = hand;

      return this.updateHostSecretsServer(code, current);

    }



    await this.roomRef(code).child("hostSecrets").child("hands").child(playerId).set(hand);

  },



  subscribeOnline: function (code, callback) {

    if (this.listener) {

      this.listener.off();

    }

    this.listener = this.roomRef(code).child("public");

    this.listener.on("value", function (snap) {

      if (snap.exists()) callback(snap.val());

    });

  },



  unsubscribe: function () {

    if (this.listener) {

      this.listener.off();

      this.listener = null;

    }

    if (this.pollTimer) {

      clearInterval(this.pollTimer);

      this.pollTimer = null;

    }

  },



  _publicPayload: function (room) {

    const payload = JSON.parse(JSON.stringify(room));

    delete payload._creatorName;
    delete payload._syncedGameState;
    delete payload._syncedAt;

    payload.mode = room.mode || "online";

    const prevAt = Number(room.updatedAt);
    payload.updatedAt = Math.max(Date.now(), (isFinite(prevAt) ? prevAt : 0) + 1);

    return payload;

  },



  /* --- 共通 --- */



  save: async function (room, secretBundle) {

    if (this.isOnline()) {

      if (secretBundle) {

        await this.saveOnlineWithSecrets(

          room,

          secretBundle.hostSecrets,

          secretBundle.playerSecrets

        );

      } else {

        await this.saveOnline(room);

      }

      return;

    }

    this.saveLocal(room);

  },



  load: async function (code) {

    if (this.isOnline()) {

      return this.loadOnline(code);

    }

    return this.loadLocal(code);

  },



  subscribe: function (code, callback) {

    if (this.isOnline()) {

      if (this.shouldUseServerApi()) {

        return this.subscribeServer(code, callback);

      }

      this.subscribeOnline(code, callback);

      return null;

    }

    return this.subscribeLocal(code, callback);

  }

};


