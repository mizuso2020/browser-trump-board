# ブラウザ・トランプ＆ボード

**トランプ・ボードゲーム・パーティゲーム** をブラウザで遊べる Web プラットフォーム。

ゲームを `game-registry.js` に登録するだけで、サイト全体に表示されます。順次タイトルを追加していく設計です。

---

## 現バージョン（pre-online マイルストーン）

> **GitHub:** [mizuso2020/browser-trump-board](https://github.com/mizuso2020/browser-trump-board)  
> 独自ドメイン取得・本格オンライン移行 **前** のスナップショットです。

### いま遊べるのは 9 タイトルのみ

| ゲーム | 人数 | 備考 |
|--------|------|------|
| 人狼 | 5〜13人 | |
| ワードウルフ | 4〜12人 | |
| イト（Ito） | 2〜8人 | クモノイト方式 |
| オセロ | 2人 | |
| ノーマル○×ゲーム | 2人 | |
| マトリョーシカ○× | 2人 | コマ重ね三目 |
| 五目並べ | 2人 | |
| 将棋 | 2人 | 王手・詰みエフェクトあり |
| 消える○× | 2人 | 4個目で最古の駒が消える |

### 遊び方は「スマホ1台を回す」モードのみ

- **1台で遊ぶ** … 利用可能（上記9タイトル）
- **各自のスマホ** … UI上は準備中（`modesSoon`）
- **オンライン** … UI上は準備中（Firebase 未設定）

大富豪・ダウト・ポーカー系など **コードがあるタイトルも、公開状態は「準備中」** で一覧には出ますが遊べません。  
（トランプ系は各自スマホ前提のため、1台モードでは成立しにくい）

### 公開URL

- デモ: http://54.65.228.227/games/

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

## 開発優先リスト（今後の実装予定）

コード済み・未公開を含む、今後の実装優先順：

| # | ゲーム | 状態 |
|---|--------|------|
| 1 | 大富豪 | コードあり・**未公開** |
| 2 | ダウト | コードあり・**未公開** |
| 3 | 人狼 | **公開済み** |
| 4 | ワードウルフ | **公開済み** |
| 5 | コヨーテ | コードあり・**未公開** |
| 6 | コードネーム | コードあり・**未公開** |
| 7 | スカル | 準備中 |
| 8 | ごきぶりポーカー | 準備中 |
| 9 | カタン | 準備中 |
| 10 | ディクシット | 準備中 |

※ イト・オセロ・五目・将棋・○×系3種も **公開済み**（上記9タイトル）。

---

## 遊び方（現バージョン）

### 📱 1台で遊ぶ（いま使える）
設定不要。スマホ1台を順番に回して遊びます。

### 📱 各自のスマホ / 🌐 オンライン（これから）
ルームAPI・Firebase の整備後に有効化予定。現状は選択肢が「準備中」表示です。

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

優先リストの **スカル** 以降、およびトランプ系の公開・各自スマホ対応を順次進める予定。

### コード済み・未公開（各自スマホ前提）
- 大富豪、ダウト、コヨーテ、コードネーム
- ババ抜き、七並べ、テキサスホールデム、セブンカード・スタッド、ファイブカード・ドロー

### 未実装
- スカル、ごきぶりポーカー、カタン、ディクシット
- 神経衰弱、スピード、99、ページワン、チンチロ、NGワード など

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
| 2026-07-12 | **pre-online マイルストーン** — 9タイトル・1台モードのみ。GitHub 初回公開 |
| 2026-07-12 | 将棋詰みエフェクト、○×系3種、マトリョーシカ○×、ゲームアイコン追加 |
| 2026-07-11 | 初版（イト・人狼） |
| 2026-07-11 | ルームAPI・EC2デプロイ |
| 2026-07-11 | ポーカー3種などコード実装（未公開） |
