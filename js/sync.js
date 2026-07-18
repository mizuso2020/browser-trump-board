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
    if (m !== "room" && m !== "online") return false;
    if (m === "room") return true;
    return !isFirebaseConfigured();
  },

  canUseMultiDevice: function (mode) {
    const m = mode || this.mode;
    if (m === "room") return true;
    if (m === "online") return isFirebaseConfigured();
    return false;
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



  apiFetch: async function (url, options) {

    const opts = Object.assign({ cache: "no-store" }, options || {});

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



    if (this.shouldUseServerApi()) {

      this.uid = getStablePlayerId();

      this.db = null;

      this.auth = null;

      return true;

    }



    if (!isFirebaseConfigured()) {

      throw new Error("Firebase が未設定です。js/firebase-config.js を編集してください。");

    }



    if (!firebase.apps.length) {

      firebase.initializeApp(FIREBASE_CONFIG);

    }



    this.db = firebase.database();

    this.auth = firebase.auth();



    if (!this.auth.currentUser) {

      await this.auth.signInAnonymously();

    }

    this.uid = this.auth.currentUser.uid;

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



    await this.apiFetch("/room/" + room.code + "/create", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ public: this._publicPayload(room) })

    });

    return room;

  },



  joinServer: async function (code, name) {

    return this.apiFetch("/room/" + String(code || "").toUpperCase() + "/join", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ playerId: this.uid, name: name })

    });

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


