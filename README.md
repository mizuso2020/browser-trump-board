# ブラウザ・トランプ＆ボード

**トランプ・ボードゲーム・パーティゲーム** をブラウザで遊べる Web プラットフォーム。

ゲームを `game-registry.js` に登録するだけで、サイト全体に表示されます。順次タイトルを追加していく設計です。

---

## 掲載カテゴリ

| カテゴリ | 例 |
|----------|-----|
| 🎭 パーティー・推理 | 人狼、ワードウルフ |
| 🃏 トランプ | 大富豪、ポーカー3種、ババ抜き、七並べ、ダウト… |
| ♟️ ボードゲーム | オセロ、五目並べ、将棋、チェス |
| 🤝 協力・ワード | イト（Ito） |
| 🎲 サイコロ・運試し | チンチロ |

---

## 開発優先リスト

次に実装していくゲーム（ユーザー指定順）：

| # | ゲーム | 状態 |
|---|--------|------|
| 1 | 大富豪 | **遊べる** |
| 2 | ダウト | **遊べる** |
| 3 | 人狼 | **遊べる** |
| 4 | ワードウルフ | **遊べる** |
| 5 | コヨーテ | **遊べる** |
| 6 | コードネーム | **遊べる** |
| 7 | スカル | 準備中 |
| 8 | ごきぶりポーカー | 準備中 |
| 9 | カタン | 準備中 |
| 10 | ディクシット | 準備中 |

※ イト（Ito）も対応済み。

---

## 今遊べるゲーム

| ゲーム | 人数 |
|--------|------|
| 人狼 | 4〜12人 |
| イト（Ito） | 2〜10人 |
| 大富豪 | 3〜6人 |
| ダウト | 2〜4人 |
| ワードウルフ | 4〜12人 |
| コヨーテ | 3〜6人 |
| コードネーム | 4〜8人 |
| ババ抜き | 2〜6人 |
| 七並べ | 2〜4人 |
| テキサスホールデム ⭐ | 2〜9人 |
| セブンカード・スタッド | 2〜8人 |
| ファイブカード・ドロー | 2〜6人 |

その他は [ゲーム一覧](games.html) に掲載（準備中）。

---

## 遊び方

### 📱 その場で遊ぶ
設定不要。スマホ1台を回す。

### 🌐 オンライン
Firebase 設定後、各自のスマホから参加。  
手順は下の「Firebase セットアップ」を参照。

---

## ページ構成

```
party-games/
├── index.html          # トップ（ルーム作成・参加）
├── games.html          # ゲーム一覧（カテゴリ・フィルタ）
├── room.html           # ゲームルーム
├── js/
│   ├── game-registry.js   ★ ゲーム登録（ここに追加）
│   ├── games-catalog.js   # 一覧画面の描画
│   ├── sync.js            # ローカル / オンライン同期
│   └── games/
│       ├── ito.js
│       ├── werewolf.js
│       └── _template.js   # 新ゲーム用テンプレート
└── css/style.css
```

---

## 新しいゲームの追加方法

### 1. ゲームロジックを作る

`js/games/_template.js` をコピーして、例：`daifugo.js`

```javascript
const DaifugoGame = {
  id: "daifugo",
  name: "大富豪",
  minPlayers: 3,
  maxPlayers: 6,

  init: function (room) { /* 初期化 */ return room; },
  render: function (ctx) { /* HTMLを返す */ return "..."; }
};
```

### 2. レジストリに登録

`js/game-registry.js`：

```javascript
daifugo: {
  id: "daifugo",
  name: "大富豪",
  category: "trump",
  description: "...",
  minPlayers: 3,
  maxPlayers: 6,
  status: "live",        // "soon" → "live" に変更
  module: "DaifugoGame"
}
```

### 3. room.html に読み込み

```html
<script src="js/games/daifugo.js"></script>
```

これだけで **トップ・ゲーム一覧・ルーム選択** に自動表示されます。

---

## Firebase セットアップ（オンライン用）

1. https://console.firebase.google.com/ でプロジェクト作成
2. **Realtime Database** を有効化
3. **Authentication → 匿名** を有効化
4. Web アプリの設定値を `js/firebase-config.js` に貼る
5. DB ルール：

```json
{
  "rules": {
    "rooms": {
      "$code": {
        "public": { ".read": true, ".write": "auth != null" },
        "private": {
          "$uid": {
            ".read": "auth != null && auth.uid == $uid",
            ".write": "auth != null && (auth.uid == $uid || root.child('rooms').child($code).child('public').child('hostId').val() == auth.uid)"
          }
        },
        "hostSecrets": {
          ".read": "auth != null && root.child('rooms').child($code).child('public').child('hostId').val() == auth.uid",
          ".write": "auth != null && root.child('rooms').child($code).child('public').child('hostId').val() == auth.uid"
        }
      }
    }
  }
}
```

---

## 追加予定のゲーム

優先リストの **1. 大富豪** から順に実装予定。

### 優先
- [x] 大富豪
- [x] ダウト
- [x] 人狼
- [x] ワードウルフ
- [x] コヨーテ
- [x] コードネーム
- [ ] スカル
- [ ] ごきぶりポーカー
- [ ] カタン
- [ ] ディクシット

### トランプ（遊べる）
- [x] 大富豪
- [x] ダウト
- [x] ババ抜き
- [x] 七並べ
- [x] テキサスホールデム ⭐
- [x] セブンカード・スタッド
- [x] ファイブカード・ドロー

### トランプ（準備中）
- [ ] 神経衰弱
- [ ] スピード
- [ ] 99
- [ ] ページワン（大富豪系）

### その他
- [ ] オセロ
- [ ] 五目並べ

---

## 公開URL（革ショップと別リンク）

| サイト | URL | サーバー上の場所 |
|--------|-----|------------------|
| オーダーメイド工房（革ショップ） | http://54.65.228.227/ | `/usr/share/nginx/html/` |
| **ブラウザ・トランプ＆ボード（ゲーム）** | **http://54.65.228.227/games/** | `/usr/share/nginx/html/games/` |

同じ EC2・同じドメインだが、**URL が完全に別**です。混ざりません。

---

## EC2 デプロイ

### ゲームサイトだけ更新する場合

```bash
scp -i my-shop-key.pem -r party-games ec2-user@54.65.228.227:~/
ssh -i my-shop-key.pem ec2-user@54.65.228.227
sudo rm -rf /usr/share/nginx/html/games
sudo cp -r ~/party-games /usr/share/nginx/html/games
sudo find /usr/share/nginx/html/games -type d -exec chmod 755 {} \;
sudo find /usr/share/nginx/html/games -type f -exec chmod 644 {} \;
sudo systemctl reload nginx
```

→ http://54.65.228.227/games/ で確認

### 革ショップだけ更新する場合

```bash
scp -i my-shop-key.pem -r custom-shop-site/* ec2-user@54.65.228.227:~/shop/
ssh -i my-shop-key.pem ec2-user@54.65.228.227
sudo cp -r ~/shop/* /usr/share/nginx/html/
sudo systemctl reload nginx
```

→ http://54.65.228.227/ で確認（ゲームは `/games/` のまま）

### 両方まとめて（初回）

```bash
# ゲーム
scp -i my-shop-key.pem -r party-games ec2-user@54.65.228.227:~/
# ショップ
scp -i my-shop-key.pem -r custom-shop-site/* ec2-user@54.65.228.227:~/shop/

ssh -i my-shop-key.pem ec2-user@54.65.228.227
sudo cp -r ~/shop/* /usr/share/nginx/html/
sudo cp -r ~/party-games /usr/share/nginx/html/games
sudo systemctl reload nginx
```

革ショップのナビに「🎲 ボードゲーム」→ `/games/` へのリンクあり。
ゲームサイトのフッターから革ショップ（`/`）へ戻れます。

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-07-11 | 初版（イト・人狼） |
| 2026-07-11 | オンライン / その場 両対応 |
| 2026-07-11 | コードネーム実装 |
| 2026-07-11 | ポーカー3種（ホールデム・スタッド・ドロー）チップ付き |
