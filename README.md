# ブラウザ・トランプ＆ボード

**トランプ・ボードゲーム・パーティゲーム** をブラウザで遊べる Web プラットフォーム。

ゲームを `game-registry.js` に登録するだけで、サイト全体に表示されます。順次タイトルを追加していく設計です。

---

## バージョン1（v1.0.0）— 確定・固定

> **GitHub:** [mizuso2020/browser-trump-board](https://github.com/mizuso2020/browser-trump-board)  
> **リリース:** [v1.0.0](https://github.com/mizuso2020/browser-trump-board/releases/tag/v1.0.0)  
> **ZIP保存:** [browser-trump-board-v1.0.0.zip](https://github.com/mizuso2020/browser-trump-board/releases/download/v1.0.0/browser-trump-board-v1.0.0.zip)  
> **2026-07-12 固定。** 独自ドメイン・各自スマホ対応は **Version 2** で進めます。  
> 詳細版（依頼単位・細かい修正まで）: **[CHANGELOG.md](CHANGELOG.md)**

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

### 遊び方

- **1台で遊ぶ** … 利用可能（上記9タイトル）
- **各自のスマホ** … **人狼・ノーマル○×・消える○×・マトリョーシカ○×** が本番で利用可能（ルームコード / QR / 参加リンク）。その他は順次対応
- **オンライン** … UI上は準備中（Firebase 未設定）。人狼の各自スマホはルームAPIで動作

#### 各自のスマホ — ルームモード（2026-07-13〜）

| ゲーム | ホスト用URL |
|--------|-------------|
| 人狼 | https://browser-trump-board.com/games/play.html?game=werewolf |
| ノーマル○× | https://browser-trump-board.com/games/play.html?game=tic_tac_toe |
| 消える○× | https://browser-trump-board.com/games/play.html?game=vanishing_ttt |
| マトリョーシカ○× | https://browser-trump-board.com/games/play.html?game=matryoshka_ttt |

参加者: `play.html?game=＜ゲームID＞&mode=room&code=XXXX`（XXXX は4桁コード）

同期まわりで大きなバグがあったため、詳細は **[CHANGELOG.md（2026-07-13）](CHANGELOG.md)** を参照。

大富豪・ダウト・ポーカー系など **コードがあるタイトルも、公開状態は「準備中」** で一覧には出ますが遊べません。  
（トランプ系は各自スマホ前提のため、1台モードでは成立しにくい）

### このフォルダ（ZIP）から起動する — Version 1 の正しい使い方

1. **ZIPは必ず解凍**（圧縮フォルダの中を見るだけでは動きません）
2. 解凍したフォルダで **`アプリを開く.bat`** をダブルクリック
3. ブラウザが開いたらゲーム一覧から遊ぶ

詳しくは **`起動のしかた.txt`** を参照。

### 公開URL（ネット経由・別手段）

- 本番: https://browser-trump-board.com/games/
- デモ（IP直）: http://54.65.228.227/games/（常に最新。V1 ZIPとは別）

---

## Version 2（進行中）

| 項目 | 内容 |
|------|------|
| 独自ドメイン | **browser-trump-board.com** 運用中 |
| 各自のスマホ | **人狼・○×3種 解禁済み**（2026-07-13）。ワードウルフ等は順次 |
| オンライン | Firebase 設定、ルームAPI本番運用 |
| ゲーム拡大 | 大富豪・ポーカー系などコード済みタイトルの公開 |

### 人狼ルームモードで直した主なバグ

1. **参加者1人だけロビーに残る** — 古いロビー保存がゲーム開始を上書き → サーバーで開始後の逆行を拒否
2. **ルームが作れない** — 対策が強すぎた → ロビー中は緩和、開始後のみ厳格化
3. **人狼役だけクラッシュ** — 存在しない全員役職リストを参照 → 秘密データから仲間表示

詳細: [CHANGELOG.md](CHANGELOG.md)

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

詳細は **[CHANGELOG.md](CHANGELOG.md)**（チャット記録ベースの全更新一覧）。

| 日付 | 概要 |
|------|------|
| 2026-07-12 | **V1確定** — 9タイトル固定、ZIP/GitHub、ローカル起動、累計プレイ表示 |
| 2026-07-12 | 将棋詰み演出、○×3種、マトリョーシカ○×、ゲームアイコン |
| 2026-07-12 | QR参加・HTTPS・各自スマホルーム（人狼・V2向け基盤） |
| 2026-07-11 | 人狼フロー大改修、play.html分離、UI刷新、EC2公開 |
| 2026-07-11 | コヨーテ・コードネーム・ババ抜き・七並べ・ポーカー3種（多くはV2向けにコードのみ） |
| 2026-07-11 | 初版（イト・人狼・ワードウルフ）、ルームAPI |
