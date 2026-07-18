/**
 * お絵描き人狼
 * 市民だけお題を持ち、1枚の絵を順番に加筆する
 * お題候補はワードウルフと共通
 */
const DrawingWerewolfGame = {
  id: "drawing_werewolf",
  name: "お絵描き人狼",
  minPlayers: 4,
  maxPlayers: 10,
  DISCUSSION_MS: 5 * 60 * 1000,
  DRAW_TURN_MS: 90 * 1000,
  CANVAS_W: 720,
  CANVAS_H: 540,
  _drafts: {},
  _brushColor: "#e11d48",
  PLAYER_COLORS: [
    "#e11d48",
    "#2563eb",
    "#16a34a",
    "#d97706",
    "#7c3aed",
    "#0891b2",
    "#db2777",
    "#ca8a04",
    "#4f46e5",
    "#059669"
  ],

  roleNames: {
    wolf: "お絵描き人狼",
    citizen: "市民"
  },

  assignPlayerColors: function (room) {
    const colors = {};
    const palette = this.PLAYER_COLORS;
    room.players.forEach(function (p, i) {
      colors[p.id] = palette[i % palette.length];
    });
    return colors;
  },

  getPlayerColor: function (room, playerId) {
    const colors = (room.gameState && room.gameState.playerColors) || {};
    if (colors[playerId]) return colors[playerId];
    const idx = room.players.findIndex(function (p) { return p.id === playerId; });
    return this.PLAYER_COLORS[Math.max(0, idx) % this.PLAYER_COLORS.length];
  },

  colorChipHtml: function (color) {
    return '<span class="dw-color-chip" style="background:' + color + '" aria-hidden="true"></span>';
  },

  ww: function () {
    return typeof WordWolfGame !== "undefined" ? WordWolfGame : null;
  },

  TOPIC_LAST_HIRAGANA: {
    "PlayStation": "ん",
    "RPG": "ー",
    "Switch": "ち",
    "アイス": "す",
    "アクション": "ん",
    "あくび": "び",
    "アザラシ": "し",
    "アニメ": "め",
    "アニメ化": "か",
    "アヒル": "る",
    "イルカ": "か",
    "ウォーキング": "ぐ",
    "うさぎ": "ぎ",
    "うどん": "ん",
    "エンディング": "ぐ",
    "オープニング": "ぐ",
    "オタク": "く",
    "おなら": "ら",
    "オンライン対戦": "ん",
    "お好み焼き": "き",
    "お寺": "ら",
    "お風呂": "ろ",
    "かき氷": "り",
    "ガチャ": "ゃ",
    "カフェ": "ぇ",
    "カメ": "め",
    "カレー": "れ",
    "カレンダー": "だ",
    "キーケース": "す",
    "キックボクシング": "ぐ",
    "キャラクターグッズ": "ず",
    "キャンプ": "ぷ",
    "キリン": "ん",
    "くし": "し",
    "くしゃみ": "み",
    "クジラ": "ら",
    "ケーキ": "き",
    "ゲームセンター": "た",
    "ゲップ": "ぷ",
    "げっぷ": "ぷ",
    "コアラ": "ら",
    "コーヒー": "ひ",
    "コオロギ": "ぎ",
    "コスプレ": "れ",
    "ごはん": "ん",
    "ゴルフ": "ふ",
    "コンビニ": "に",
    "サッカー": "か",
    "サングラス": "す",
    "サンドボックスゲーム": "む",
    "シチュー": "ゅ",
    "しゃぶしゃぶ": "ぶ",
    "しゃべくり": "り",
    "シューティング": "ぐ",
    "スーパー": "ぱ",
    "スープ": "ぷ",
    "スカッシュ": "ゅ",
    "スキー": "き",
    "スノボ": "ぼ",
    "ズボン": "ん",
    "スマホ": "ほ",
    "セーブ": "ぶ",
    "せきこみ": "み",
    "ゾウ": "う",
    "ダイビング": "ぐ",
    "たこ焼き": "き",
    "チーズ": "ず",
    "チューリップ": "ぷ",
    "ツンデレ": "れ",
    "テニス": "す",
    "トイレ": "れ",
    "トカゲ": "げ",
    "トラ": "ら",
    "トライアスロン": "ん",
    "ドライブゲーム": "む",
    "ドラマ": "ま",
    "トンボ": "ぼ",
    "ネットカフェ": "ぇ",
    "ネット通販": "ん",
    "バイク": "く",
    "バイト": "と",
    "バス": "す",
    "バスケ": "け",
    "パズルゲーム": "む",
    "パソコン": "ん",
    "バター": "た",
    "バドミントン": "ん",
    "バトルもの": "の",
    "ハムスター": "た",
    "バレー": "れ",
    "パン": "ん",
    "パンダ": "だ",
    "パンツ": "つ",
    "ハンバーガー": "が",
    "ヒーロー": "ろ",
    "ピザ": "ざ",
    "フィギュア": "あ",
    "プリン": "ん",
    "プロレス": "す",
    "ヘビ": "び",
    "ペンギン": "ん",
    "ボウリング": "ぐ",
    "ボクシング": "ぐ",
    "ほくろ": "ろ",
    "ポケモン": "ん",
    "ボス戦": "ん",
    "ぽっこりお腹": "ら",
    "ホテル": "る",
    "マインクラフト": "と",
    "マラソン": "ん",
    "マリオ": "お",
    "みかん": "ん",
    "メカ": "か",
    "モバイルバッテリー": "り",
    "モンスター狩り": "り",
    "ヤンデレ": "れ",
    "ヨーグルト": "と",
    "よだれ": "れ",
    "ラーメン": "ん",
    "ライオン": "ん",
    "ライバル": "る",
    "ライブハウス": "す",
    "ラスボス": "す",
    "リズムゲーム": "む",
    "りんご": "ご",
    "ルイージ": "じ",
    "レースゲーム": "む",
    "レストラン": "ん",
    "ロード": "ど",
    "ロボット": "と",
    "ワニ": "に",
    "異世界": "い",
    "一般道": "う",
    "雨合羽": "ぱ",
    "映画": "が",
    "映画館": "ん",
    "奥義": "ぎ",
    "音ゲー": "げ",
    "夏": "つ",
    "歌手": "ゅ",
    "花火": "び",
    "課金": "ん",
    "海": "み",
    "海賊": "く",
    "咳": "き",
    "格闘ゲーム": "む",
    "学園もの": "の",
    "学校": "う",
    "眼鏡": "ね",
    "牛": "し",
    "牛乳": "う",
    "協力プレイ": "い",
    "鏡": "み",
    "銀行": "う",
    "空港": "う",
    "空手": "て",
    "熊": "ま",
    "警察署": "ょ",
    "鶏": "り",
    "穴あき靴下": "つ",
    "犬": "ぬ",
    "肩のこり": "り",
    "原作": "く",
    "湖": "み",
    "公園": "ん",
    "口臭": "う",
    "向日葵": "り",
    "攻略本": "ん",
    "港": "と",
    "紅茶": "ゃ",
    "紅葉": "じ",
    "高速道路": "う",
    "財布": "ふ",
    "桜": "ら",
    "傘": "さ",
    "山": "ま",
    "仕事": "と",
    "歯磨き": "き",
    "時計": "い",
    "耳垢": "か",
    "自転車": "ゃ",
    "鹿": "か",
    "実況動画": "が",
    "主人公": "う",
    "寿司": "し",
    "秋": "き",
    "充電器": "き",
    "柔道": "う",
    "塾": "く",
    "春": "る",
    "春巻き": "き",
    "少女漫画": "が",
    "少年漫画": "が",
    "消防署": "ょ",
    "焼肉": "く",
    "新月": "つ",
    "新体操": "う",
    "森林": "ん",
    "神社": "ゃ",
    "図書館": "ん",
    "水泳": "い",
    "声優": "う",
    "雪": "き",
    "蝉": "み",
    "川": "わ",
    "洗顔": "ん",
    "洗濯": "く",
    "潜水": "い",
    "掃除": "じ",
    "相撲": "う",
    "草原": "ん",
    "足の指": "び",
    "足裏": "ら",
    "体臭": "う",
    "体操": "う",
    "台風": "う",
    "卓球": "う",
    "地下鉄": "ゃ",
    "昼ごはん": "ん",
    "朝ごはん": "ん",
    "朝日": "ひ",
    "朝霧": "り",
    "蝶": "う",
    "釣り": "り",
    "天ぷら": "ら",
    "転生": "い",
    "電車": "ゃ",
    "登山": "ん",
    "冬": "ゆ",
    "豚": "た",
    "肉球": "う",
    "虹": "じ",
    "忍者": "ゃ",
    "猫": "こ",
    "脳トレゲーム": "む",
    "破れた靴下": "つ",
    "馬": "ま",
    "背中の痒いところ": "ろ",
    "買い物": "い",
    "美術館": "ん",
    "鼻くそ": "そ",
    "鼻血": "ち",
    "必殺技": "ぎ",
    "氷": "り",
    "病院": "ん",
    "布団": "ん",
    "腹筋": "ん",
    "魔法少女": "ょ",
    "満月": "つ",
    "漫画": "が",
    "味噌汁": "る",
    "毛穴": "な",
    "毛布": "ふ",
    "野球": "う",
    "薬局": "き",
    "遊園地": "ち",
    "郵便局": "き",
    "夕日": "ひ",
    "夕霧": "り",
    "羊": "じ",
    "雷": "み",
    "雷雨": "う",
    "陸上": "う",
    "旅館": "ん",
    "路面電車": "ゃ",
    "篝火": "び",
    "腋": "き",
    "餃子": "う",
  },

  TOPIC_YOMI: {
    "PlayStation": "ぷれいすてーしょん",
    "RPG": "あーるぴーじー",
    "Switch": "すいっち",
    "アイス": "あいす",
    "アクション": "あくしょん",
    "あくび": "あくび",
    "アザラシ": "あざらし",
    "アニメ": "あにめ",
    "アニメ化": "あにめか",
    "アヒル": "あひる",
    "イルカ": "いるか",
    "ウォーキング": "うぉーきんぐ",
    "うさぎ": "うさぎ",
    "うどん": "うどん",
    "エンディング": "えんでぃんぐ",
    "オープニング": "おーぷにんぐ",
    "オタク": "おたく",
    "おなら": "おなら",
    "オンライン対戦": "おんらいんたいせん",
    "お好み焼き": "おこのみやき",
    "お寺": "おてら",
    "お風呂": "おふろ",
    "かき氷": "かきごおり",
    "ガチャ": "がちゃ",
    "カフェ": "かふぇ",
    "カメ": "かめ",
    "カレー": "かれー",
    "カレンダー": "かれんだー",
    "キーケース": "きーけーす",
    "キックボクシング": "きっくぼくしんぐ",
    "キャラクターグッズ": "きゃらくたーぐっず",
    "キャンプ": "きゃんぷ",
    "キリン": "きりん",
    "くし": "くし",
    "くしゃみ": "くしゃみ",
    "クジラ": "くじら",
    "ケーキ": "けーき",
    "ゲームセンター": "げーむせんたー",
    "ゲップ": "げっぷ",
    "げっぷ": "げっぷ",
    "コアラ": "こあら",
    "コーヒー": "こーひー",
    "コオロギ": "こおろぎ",
    "コスプレ": "こすぷれ",
    "ごはん": "ごはん",
    "ゴルフ": "ごるふ",
    "コンビニ": "こんびに",
    "サッカー": "さっかー",
    "サングラス": "さんぐらす",
    "サンドボックスゲーム": "さんどぼっくすげーむ",
    "シチュー": "しちゅー",
    "しゃぶしゃぶ": "しゃぶしゃぶ",
    "しゃべくり": "しゃべくり",
    "シューティング": "しゅーてぃんぐ",
    "スーパー": "すーぱー",
    "スープ": "すーぷ",
    "スカッシュ": "すかっしゅ",
    "スキー": "すきー",
    "スノボ": "すのぼ",
    "ズボン": "ずぼん",
    "スマホ": "すまほ",
    "セーブ": "せーぶ",
    "せきこみ": "せきこみ",
    "ゾウ": "ぞう",
    "ダイビング": "だいびんぐ",
    "たこ焼き": "たこやき",
    "チーズ": "ちーず",
    "チューリップ": "ちゅーりっぷ",
    "ツンデレ": "つんでれ",
    "テニス": "てにす",
    "トイレ": "といれ",
    "トカゲ": "とかげ",
    "トラ": "とら",
    "トライアスロン": "とらいあすろん",
    "ドライブゲーム": "どらいぶげーむ",
    "ドラマ": "どらま",
    "トンボ": "とんぼ",
    "ネットカフェ": "ねっとかふぇ",
    "ネット通販": "ねっとつうはん",
    "バイク": "ばいく",
    "バイト": "ばいと",
    "バス": "ばす",
    "バスケ": "ばすけ",
    "パズルゲーム": "ぱずるげーむ",
    "パソコン": "ぱそこん",
    "バター": "ばたー",
    "バドミントン": "ばどみんとん",
    "バトルもの": "ばとるもの",
    "ハムスター": "はむすたー",
    "バレー": "ばれー",
    "パン": "ぱん",
    "パンダ": "ぱんだ",
    "パンツ": "ぱんつ",
    "ハンバーガー": "はんばーがー",
    "ヒーロー": "ひーろー",
    "ピザ": "ぴざ",
    "フィギュア": "ふぃぎゅあ",
    "プリン": "ぷりん",
    "プロレス": "ぷろれす",
    "ヘビ": "へび",
    "ペンギン": "ぺんぎん",
    "ボウリング": "ぼうりんぐ",
    "ボクシング": "ぼくしんぐ",
    "ほくろ": "ほくろ",
    "ポケモン": "ぽけもん",
    "ボス戦": "ぼすせん",
    "ぽっこりお腹": "ぽっこりおなか",
    "ホテル": "ほてる",
    "マインクラフト": "まいんくらふと",
    "マラソン": "まらそん",
    "マリオ": "まりお",
    "みかん": "みかん",
    "メカ": "めか",
    "モバイルバッテリー": "もばいるばってりー",
    "モンスター狩り": "もんすたーがり",
    "ヤンデレ": "やんでれ",
    "ヨーグルト": "よーぐると",
    "よだれ": "よだれ",
    "ラーメン": "らーめん",
    "ライオン": "らいおん",
    "ライバル": "らいばる",
    "ライブハウス": "らいぶはうす",
    "ラスボス": "らすぼす",
    "リズムゲーム": "りずむげーむ",
    "りんご": "りんご",
    "ルイージ": "るいーじ",
    "レースゲーム": "れーすげーむ",
    "レストラン": "れすとらん",
    "ロード": "ろーど",
    "ロボット": "ろぼっと",
    "ワニ": "わに",
    "異世界": "いせかい",
    "一般道": "いっぱんどう",
    "雨合羽": "あまがっぱ",
    "映画": "えいが",
    "映画館": "えいがかん",
    "奥義": "おうぎ",
    "音ゲー": "おとげー",
    "夏": "なつ",
    "歌手": "かしゅ",
    "花火": "はなび",
    "課金": "かきん",
    "海": "うみ",
    "海賊": "かいぞく",
    "咳": "せき",
    "格闘ゲーム": "かくとうげーむ",
    "学園もの": "がくえんもの",
    "学校": "がっこう",
    "眼鏡": "めがね",
    "牛": "うし",
    "牛乳": "ぎゅうにゅう",
    "協力プレイ": "きょうりょくぷれい",
    "鏡": "かがみ",
    "銀行": "ぎんこう",
    "空港": "くうこう",
    "空手": "からて",
    "熊": "くま",
    "警察署": "けいさつしょ",
    "鶏": "にわとり",
    "穴あき靴下": "あなあきくつした",
    "犬": "いぬ",
    "肩のこり": "かたのこり",
    "原作": "げんさく",
    "湖": "みずうみ",
    "公園": "こうえん",
    "口臭": "こうしゅう",
    "向日葵": "ひまわり",
    "攻略本": "こうりゃくぼん",
    "港": "みなと",
    "紅茶": "こうちゃ",
    "紅葉": "もみじ",
    "高速道路": "こうそくどうろ",
    "財布": "さいふ",
    "桜": "さくら",
    "傘": "かさ",
    "山": "やま",
    "仕事": "しごと",
    "歯磨き": "はみがき",
    "時計": "とけい",
    "耳垢": "みみあか",
    "自転車": "じてんしゃ",
    "鹿": "しか",
    "実況動画": "じっきょうどうが",
    "主人公": "しゅじんこう",
    "寿司": "すし",
    "秋": "あき",
    "充電器": "じゅうでんき",
    "柔道": "じゅうどう",
    "塾": "じゅく",
    "春": "はる",
    "春巻き": "はるまき",
    "少女漫画": "しょうじょまんが",
    "少年漫画": "しょうねんまんが",
    "消防署": "しょうぼうしょ",
    "焼肉": "やきにく",
    "新月": "しんげつ",
    "新体操": "しんたいそう",
    "森林": "しんりん",
    "神社": "じんじゃ",
    "図書館": "としょかん",
    "水泳": "すいえい",
    "声優": "せいゆう",
    "雪": "ゆき",
    "蝉": "せみ",
    "川": "かわ",
    "洗顔": "せんがん",
    "洗濯": "せんたく",
    "潜水": "せんすい",
    "掃除": "そうじ",
    "相撲": "すもう",
    "草原": "そうげん",
    "足の指": "あしのゆび",
    "足裏": "あしうら",
    "体臭": "たいしゅう",
    "体操": "たいそう",
    "台風": "たいふう",
    "卓球": "たっきゅう",
    "地下鉄": "ちかてつ",
    "昼ごはん": "ひるごはん",
    "朝ごはん": "あさごはん",
    "朝日": "あさひ",
    "朝霧": "あさぎり",
    "蝶": "ちょう",
    "釣り": "つり",
    "天ぷら": "てんぷら",
    "転生": "てんせい",
    "電車": "でんしゃ",
    "登山": "とざん",
    "冬": "ふゆ",
    "豚": "ぶた",
    "肉球": "にくきゅう",
    "虹": "にじ",
    "忍者": "にんじゃ",
    "猫": "ねこ",
    "脳トレゲーム": "のうとれげーむ",
    "破れた靴下": "やぶれたくつした",
    "馬": "うま",
    "背中の痒いところ": "せなかのかゆいところ",
    "買い物": "かいもの",
    "美術館": "びじゅつかん",
    "鼻くそ": "はなくそ",
    "鼻血": "はなち",
    "必殺技": "ひっさつわざ",
    "氷": "こおり",
    "病院": "びょういん",
    "布団": "ふとん",
    "腹筋": "ふっきん",
    "魔法少女": "まほうしょうじょ",
    "満月": "まんげつ",
    "漫画": "まんが",
    "味噌汁": "みそしる",
    "毛穴": "けあな",
    "毛布": "もうふ",
    "野球": "やきゅう",
    "薬局": "やっきょく",
    "遊園地": "ゆうえんち",
    "郵便局": "ゆうびんきょく",
    "夕日": "ゆうひ",
    "夕霧": "ゆうぎり",
    "羊": "ひつじ",
    "雷": "かみなり",
    "雷雨": "らいう",
    "陸上": "りくじょう",
    "旅館": "りょかん",
    "路面電車": "ろめんでんしゃ",
    "篝火": "かがりび",
    "腋": "わき",
    "餃子": "ぎょうざ",
  },

  /* お絵描き人狼では使わない系統（ワードウルフ側には残す） */
  EXCLUDED_THEME_IDS: ["daily", "nature", "place"],

  /* WordWolfGame が読めないとき用（おまかせ以外も選べるようにする） */
  FALLBACK_THEMES: [
    { id: "all", name: "おまかせ", hint: "" },
    { id: "animal", name: "動物系", hint: "" },
    { id: "food", name: "食べ物系", hint: "" },
    { id: "sports", name: "スポーツ系", hint: "" },
    { id: "shimeta", name: "飲み会系", hint: "" },
    { id: "game", name: "ゲーム系", hint: "" },
    { id: "anime", name: "アニメ系", hint: "" }
  ],

  getThemes: function () {
    const excluded = this.EXCLUDED_THEME_IDS;
    const ww = this.ww();
    const base = (ww && Array.isArray(ww.THEMES) && ww.THEMES.length)
      ? ww.THEMES
      : this.FALLBACK_THEMES;
    const list = base.filter(function (theme) {
      return theme && excluded.indexOf(theme.id) < 0;
    });
    return list.length ? list : this.FALLBACK_THEMES.slice();
  },

  getTheme: function (themeId) {
    if (this.EXCLUDED_THEME_IDS.indexOf(themeId) >= 0) themeId = "all";
    const themes = this.getThemes();
    const found = themes.find(function (t) { return t.id === themeId; });
    if (found) return found;
    return themes[0] || this.FALLBACK_THEMES[0];
  },

  getPairsForTheme: function (themeId) {
    if (this.EXCLUDED_THEME_IDS.indexOf(themeId) >= 0) themeId = "all";
    const ww = this.ww();
    if (!ww || !ww.getPairsForTheme) {
      return [{ citizen: "犬", wolf: "猫", theme: "animal" }];
    }
    const excluded = this.EXCLUDED_THEME_IDS;
    return ww.getPairsForTheme(themeId).filter(function (pair) {
      return excluded.indexOf(pair.theme) < 0;
    });
  },

  getMaxWolves: function (playerCount) {
    if (playerCount <= 5) return 1;
    if (playerCount <= 9) return 2;
    return 3;
  },

  clampWolfCount: function (playerCount, wolfCount) {
    const max = this.getMaxWolves(playerCount);
    return Math.max(1, Math.min(max, wolfCount || 1));
  },

  ensureLobbySetup: function (room, preset) {
    const count = room.players.length;
    if (!room.lobbyDrawingWerewolf) {
      room.lobbyDrawingWerewolf = { themeId: "all", wolfCount: 1 };
    }
    if (preset) {
      if (preset.themeId) {
        room.lobbyDrawingWerewolf.themeId = preset.themeId === "adult" ? "shimeta" : preset.themeId;
      }
      if (preset.wolfCount) room.lobbyDrawingWerewolf.wolfCount = preset.wolfCount;
    }
    if (this.EXCLUDED_THEME_IDS.indexOf(room.lobbyDrawingWerewolf.themeId) >= 0) {
      room.lobbyDrawingWerewolf.themeId = "all";
    }
    room.lobbyDrawingWerewolf.wolfCount = this.clampWolfCount(count, room.lobbyDrawingWerewolf.wolfCount);
    return room.lobbyDrawingWerewolf;
  },

  syncLobbySetupPlayerCount: function (room) {
    if (!room.lobbyDrawingWerewolf) return room;
    room.lobbyDrawingWerewolf.wolfCount = this.clampWolfCount(room.players.length, room.lobbyDrawingWerewolf.wolfCount);
    return room;
  },

  selectLobbyTheme: function (room, themeId) {
    const lobby = this.ensureLobbySetup(room);
    let next = themeId === "adult" ? "shimeta" : themeId;
    if (this.EXCLUDED_THEME_IDS.indexOf(next) >= 0) next = "all";
    lobby.themeId = next;
    return room;
  },

  adjustLobbyWolfCount: function (room, delta) {
    const lobby = this.ensureLobbySetup(room);
    lobby.wolfCount = this.clampWolfCount(room.players.length, lobby.wolfCount + delta);
    return room;
  },

  assignRoles: function (count, wolfCount) {
    const roles = [];
    const wolves = this.clampWolfCount(count, wolfCount);
    for (let i = 0; i < wolves; i++) roles.push("wolf");
    while (roles.length < count) roles.push("citizen");
    return shuffle(roles);
  },

  /**
   * 人狼は後ろほど出やすい（確率）。1番目は底上げ。
   * 最後とそのひとつ前は同じ重み（確定白にしない）。
   */
  WOLF_ORDER_POWER: 1.6,

  getDrawSlotWeight: function (pos0, n) {
    const pos1 = pos0 + 1;
    let rank;
    if (pos1 >= n - 1) {
      /* 最後から2番目と最後は同率 */
      rank = n + 1;
    } else {
      /* 1番目を底上げ: 1→3, 2→4, ... */
      rank = pos1 + 2;
    }
    return Math.pow(rank, this.WOLF_ORDER_POWER);
  },

  buildDrawOrder: function (room, roleMap) {
    const citizens = [];
    const wolves = [];
    room.players.forEach(function (p) {
      if (roleMap[p.id] === "wolf") wolves.push(p.id);
      else citizens.push(p.id);
    });
    shuffle(citizens);
    shuffle(wolves);

    const n = room.players.length;
    if (!n) return [];

    const order = new Array(n);
    const free = [];
    for (let i = 0; i < n; i++) free.push(i);

    const self = this;
    function pickWeightedIndex(slots) {
      let total = 0;
      const weights = slots.map(function (pos) {
        const w = self.getDrawSlotWeight(pos, n);
        total += w;
        return w;
      });
      let r = Math.random() * total;
      for (let i = 0; i < slots.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
      }
      return slots.length - 1;
    }

    wolves.forEach(function (wid) {
      if (!free.length) return;
      const pick = pickWeightedIndex(free);
      const pos = free.splice(pick, 1)[0];
      order[pos] = wid;
    });

    free.forEach(function (pos, i) {
      order[pos] = citizens[i];
    });

    return order;
  },

  init: function (room) {
    const setup = this.ensureLobbySetup(room);
    const pairs = this.getPairsForTheme(setup.themeId);
    const pair = shuffle(pairs.slice())[0];
    const topic = Math.random() < 0.5 ? pair.citizen : pair.wolf;
    const topicGenreId = pair.theme || "all";
    const topicGenre = this.getTheme(topicGenreId);
    const wolfCount = this.clampWolfCount(room.players.length, setup.wolfCount);
    const roles = this.assignRoles(room.players.length, wolfCount);
    const shuffledPlayers = shuffle(room.players.slice());
    const roleMap = {};
    const wordMap = {};
    const theme = this.getTheme(setup.themeId);
    /* おまかせ時だけ、人狼にジャンルを伝える */
    const wolfGenreHint = setup.themeId === "all" ? (topicGenre.name || "") : "";
    const topicYomi = this.resolveTopicYomi(topic);

    shuffledPlayers.forEach(function (p, i) {
      roleMap[p.id] = roles[i];
      wordMap[p.id] = roles[i] === "wolf" ? "" : topic;
    });

    const drawOrder = this.buildDrawOrder(room, roleMap);

    room.gameState = {
      roles: roleMap,
      words: wordMap,
      topic: topic,
      topicYomi: topicYomi,
      topicCharCount: topicYomi ? topicYomi.length : 0,
      pair: { citizen: topic, wolf: "" },
      themeId: setup.themeId,
      themeName: theme.name,
      topicGenreId: topicGenreId,
      topicGenreName: topicGenre.name || "",
      wolfGenreHint: wolfGenreHint,
      wolfCount: wolfCount,
      playerColors: this.assignPlayerColors(room),
      sharedDrawing: null,
      drawHistory: [],
      drawOrder: drawOrder,
      drawings: {},
      votes: {},
      voteIndex: 0,
      wordConfirmed: {},
      winner: null,
      executed: null,
      wolfGuess: null,
      discussionEndsAt: null,
      drawTurnEndsAt: null,
      proceedReady: {},
      drawIndex: 0
    };

    if (room.mode === "online" || room.mode === "room") {
      room.phase = "draw_werewolf_ready";
    } else {
      room.phase = "draw_werewolf_reveal";
      room.gameState.revealIndex = 0;
    }
    return room;
  },

  canManage: function (ctx) {
    return ctx.isHost || ctx.room.mode === "local";
  },

  isRemoteRoom: function (room) {
    return room.mode === "room" || room.mode === "online";
  },

  getWord: function (ctx, playerId) {
    if (!ctx.isOnline) {
      return ctx.room.gameState.words ? ctx.room.gameState.words[playerId] : null;
    }
    if (ctx.hostSecrets && ctx.hostSecrets.words) {
      return ctx.hostSecrets.words[playerId];
    }
    if (playerId === ctx.me.id && ctx.secrets && ctx.secrets.word !== undefined && ctx.secrets.word !== null) {
      return ctx.secrets.word;
    }
    return null;
  },

  getRole: function (ctx, playerId) {
    const roles = this.getRolesMap(ctx);
    if (roles[playerId]) return roles[playerId];
    if (ctx.isOnline && playerId === ctx.me.id && ctx.secrets && ctx.secrets.role) {
      return ctx.secrets.role;
    }
    if (!ctx.isOnline && ctx.room.gameState && ctx.room.gameState.roles) {
      return ctx.room.gameState.roles[playerId] || null;
    }
    return null;
  },

  isWolf: function (ctx, playerId) {
    return this.getRole(ctx, playerId) === "wolf";
  },

  getTopic: function (room) {
    const gs = room.gameState || {};
    return gs.topic || (gs.pair && gs.pair.citizen) || "";
  },

  getRolesMap: function (ctx) {
    const gs = ctx.room.gameState;
    if (!ctx.isOnline) return gs && gs.roles ? gs.roles : {};
    if (gs && gs.revealedRoles) return gs.revealedRoles;
    if (ctx.hostSecrets && ctx.hostSecrets.roles) return ctx.hostSecrets.roles;
    if (gs && gs.roles) return gs.roles;
    return {};
  },

  getWordsMap: function (ctx) {
    const gs = ctx.room.gameState;
    if (!ctx.isOnline) return gs && gs.words ? gs.words : {};
    if (gs && gs.revealedWords) return gs.revealedWords;
    if (ctx.hostSecrets && ctx.hostSecrets.words) return ctx.hostSecrets.words;
    if (gs && gs.words) return gs.words;
    return {};
  },

  confirmWord: function (room, playerId) {
    room.gameState.wordConfirmed[playerId] = true;
    return room;
  },

  allWordsConfirmed: function (room) {
    return room.players.every(function (p) {
      return room.gameState.wordConfirmed[p.id];
    });
  },

  beginDrawTurn: function (room) {
    room.gameState.drawTurnEndsAt = Date.now() + this.DRAW_TURN_MS;
    return room;
  },

  startDraw: function (room) {
    const gs = room.gameState;
    gs.drawIndex = 0;
    gs.sharedDrawing = null;
    gs.drawHistory = [];
    if (!gs.playerColors) {
      gs.playerColors = this.assignPlayerColors(room);
    }
    if (!gs.drawOrder || gs.drawOrder.length !== room.players.length) {
      gs.drawOrder = this.buildDrawOrder(room, gs.roles || {});
    }
    room.phase = "draw_werewolf_draw";
    this.beginDrawTurn(room);
    return room;
  },

  nextReveal: function (room) {
    const gs = room.gameState;
    if (gs.revealIndex < room.players.length - 1) {
      gs.revealIndex += 1;
    } else {
      this.startDraw(room);
    }
    return room;
  },

  getCurrentDrawer: function (room) {
    const gs = room.gameState;
    const order = gs.drawOrder || [];
    const idx = gs.drawIndex || 0;
    if (idx >= order.length) return null;
    const id = order[idx];
    return room.players.find(function (p) { return p.id === id; }) || null;
  },

  allDrawn: function (room) {
    const gs = room.gameState;
    const order = gs.drawOrder || [];
    return (gs.drawIndex || 0) >= order.length && !!gs.sharedDrawing;
  },

  submitDrawing: function (room, playerId, dataUrl) {
    const drawer = this.getCurrentDrawer(room);
    if (!drawer || drawer.id !== playerId) {
      return { room: room, ok: false, error: "あなたの番ではありません" };
    }
    const gs = room.gameState;
    if (!dataUrl || dataUrl.indexOf("data:image") !== 0) {
      dataUrl = gs.sharedDrawing || null;
    }
    if (!dataUrl || dataUrl.indexOf("data:image") !== 0) {
      return { room: room, ok: false, error: "絵を描いてから渡してください" };
    }
    if (dataUrl.length > 180000) {
      return { room: room, ok: false, error: "絵のデータが大きすぎます。もう少しシンプルにしてください" };
    }

    gs.sharedDrawing = dataUrl;
    gs.drawHistory = gs.drawHistory || [];
    gs.drawHistory.push({
      playerId: playerId,
      image: dataUrl,
      color: this.getPlayerColor(room, playerId)
    });
    gs.drawings = gs.drawings || {};
    gs.drawings[playerId] = dataUrl;
    gs.drawIndex = (gs.drawIndex || 0) + 1;

    if (gs.drawIndex >= (gs.drawOrder || []).length) {
      gs.drawTurnEndsAt = null;
      this.startDiscussion(room);
    } else {
      this.beginDrawTurn(room);
    }
    return { room: room, ok: true };
  },

  startDiscussion: function (room) {
    room.gameState.discussionEndsAt = Date.now() + this.DISCUSSION_MS;
    room.gameState.drawTurnEndsAt = null;
    room.gameState.proceedReady = {};
    room.phase = "draw_werewolf_discuss";
    return room;
  },

  markProceedReady: function (room, playerId) {
    room.gameState.proceedReady = room.gameState.proceedReady || {};
    room.gameState.proceedReady[playerId] = true;
    return room;
  },

  hasProceedMajority: function (room) {
    const ready = room.gameState.proceedReady || {};
    const count = room.players.filter(function (p) { return ready[p.id]; }).length;
    return count > room.players.length / 2;
  },

  startVote: function (room) {
    room.gameState.votes = {};
    room.gameState.voteIndex = 0;
    room.phase = "draw_werewolf_vote";
    return room;
  },

  getCurrentVoter: function (room) {
    if (room.mode === "local") {
      const idx = room.gameState.voteIndex;
      if (idx >= room.players.length) return null;
      return room.players[idx];
    }
    return null;
  },

  castVote: function (room, voterId, targetId) {
    room.gameState.votes[voterId] = targetId;
    if (room.mode === "local") {
      room.gameState.voteIndex += 1;
    }
    return room;
  },

  allVoted: function (room) {
    return room.players.every(function (p) {
      return room.gameState.votes[p.id];
    });
  },

  countVotesCast: function (room) {
    const gs = room.gameState;
    return room.players.filter(function (p) { return gs.votes[p.id]; }).length;
  },

  canResolveVote: function (room) {
    const total = room.players.length;
    if (!total) return false;
    return this.countVotesCast(room) > total / 2;
  },

  getVoteTally: function (room) {
    const tally = {};
    Object.values((room.gameState && room.gameState.votes) || {}).forEach(function (id) {
      if (!id) return;
      tally[id] = (tally[id] || 0) + 1;
    });
    return tally;
  },

  getTopVotes: function (room) {
    const tally = this.getVoteTally(room);
    let max = 0;
    Object.keys(tally).forEach(function (id) {
      if (tally[id] > max) max = tally[id];
    });
    const ids = Object.keys(tally).filter(function (id) {
      return tally[id] === max;
    });
    return { max: max, ids: ids, tally: tally };
  },

  playerNameById: function (room, id) {
    const p = room.players.find(function (player) { return player.id === id; });
    return p ? p.name : "？";
  },

  resolveVote: function (room, roles) {
    const gs = room.gameState;
    const tally = this.getTopVotes(room).tally;
    let max = 0;
    let executed = null;
    let tie = false;

    Object.keys(tally).forEach(function (id) {
      if (tally[id] > max) {
        max = tally[id];
        executed = id;
        tie = false;
      } else if (tally[id] === max) {
        tie = true;
      }
    });

    gs.executed = tie ? null : executed;
    gs.executedWasWolf = false;

    if (tie || !executed) {
      gs.winner = "wolf";
      room.phase = "draw_werewolf_end";
      return room;
    }

    if (roles[executed] === "wolf") {
      /* 人狼が当てられても、お題を当てれば人狼の勝ち（逆転） */
      gs.executedWasWolf = true;
      gs.winner = "citizens_pending";
      room.phase = "draw_werewolf_wolf_guess";
      return room;
    }

    gs.winner = "wolf";
    room.phase = "draw_werewolf_end";
    return room;
  },

  toHiragana: function (text) {
    return String(text || "").replace(/[\u30a1-\u30f6]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0x60);
    });
  },

  normalizeGuess: function (text) {
    let s = String(text || "").trim();
    if (typeof s.normalize === "function") {
      try { s = s.normalize("NFKC"); } catch (e) { /* ignore */ }
    }
    s = this.toHiragana(s);
    return s.replace(/\s+/g, "").toLowerCase();
  },

  resolveTopicYomi: function (topic) {
    const raw = String(topic || "").trim();
    if (!raw) return "";
    if (this.TOPIC_YOMI && this.TOPIC_YOMI[raw]) {
      return this.normalizeGuess(this.TOPIC_YOMI[raw]);
    }
    const n = this.normalizeGuess(raw);
    if (/^[\u3041-\u3096ー]+$/.test(n)) return n;
    return "";
  },

  getTopicYomi: function (room) {
    const gs = room.gameState || {};
    if (gs.topicYomi) return this.normalizeGuess(gs.topicYomi);
    return this.resolveTopicYomi(this.getTopic(room));
  },

  getTopicCharCount: function (room) {
    const gs = room.gameState || {};
    if (gs.topicCharCount) return gs.topicCharCount;
    const yomi = this.getTopicYomi(room);
    return yomi ? yomi.length : 0;
  },

  isHiraganaAnswer: function (text) {
    const s = this.normalizeGuess(text);
    return !!s && /^[\u3041-\u3096ー]+$/.test(s);
  },

  sanitizeHiraganaInput: function (text) {
    let s = String(text || "");
    if (typeof s.normalize === "function") {
      try { s = s.normalize("NFKC"); } catch (e) { /* ignore */ }
    }
    s = this.toHiragana(s);
    return s.replace(/[^\u3041-\u3096ー]/g, "");
  },

  isCorrectTopicGuess: function (room, guess) {
    const answer = this.getTopicYomi(room);
    const g = this.normalizeGuess(guess);
    if (!answer || !g) return false;
    if (!this.isHiraganaAnswer(g)) return false;
    return g === answer;
  },

  getTopicLastHiragana: function (topic) {
    const raw = String(topic || "").trim();
    if (!raw) return "";
    const yomi = this.resolveTopicYomi(raw);
    if (yomi) {
      for (let i = yomi.length - 1; i >= 0; i--) {
        const ch = yomi.charAt(i);
        if (ch === "ー") continue;
        if (/[\u3041-\u3096]/.test(ch)) return ch;
      }
    }
    if (this.TOPIC_LAST_HIRAGANA && this.TOPIC_LAST_HIRAGANA[raw]) {
      return this.TOPIC_LAST_HIRAGANA[raw];
    }
    return "";
  },

  submitWolfGuess: function (room, guess) {
    const gs = room.gameState;
    const cleaned = this.sanitizeHiraganaInput(guess);
    gs.wolfGuess = cleaned;
    const ok = this.isCorrectTopicGuess(room, cleaned);
    /* 追放されてもお題正解なら人狼勝ち */
    gs.winner = ok ? "wolf" : "citizens";
    gs.wolfGuessCorrect = ok;
    room.phase = "draw_werewolf_end";
    return room;
  },

  draftKey: function (room, playerId) {
    const idx = (room.gameState && room.gameState.drawIndex) || 0;
    return (room.code || "local") + ":" + playerId + ":" + idx;
  },

  captureCanvas: function () {
    const canvas = document.getElementById("dwCanvas");
    if (!canvas) return null;
    try {
      return canvas.toDataURL("image/jpeg", 0.55);
    } catch (e) {
      return null;
    }
  },

  fillCanvasBase: function (ctx, w, h, baseSrc, onDone) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    if (!baseSrc) {
      if (onDone) onDone();
      return;
    }
    const img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0, w, h);
      if (onDone) onDone();
    };
    img.onerror = function () {
      if (onDone) onDone();
    };
    img.src = baseSrc;
  },

  clearCanvas: function () {
    const canvas = document.getElementById("dwCanvas");
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const w = this.CANVAS_W;
    const h = this.CANVAS_H;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.fillCanvasBase(ctx, w, h, canvas._dwBaseSrc || this._canvasBaseSrc || "");
  },

  bindGuessInput: function () {
    const input = document.getElementById("dwGuessInput");
    if (!input || input.dataset.boundHiragana === "1") return;
    input.dataset.boundHiragana = "1";
    const self = this;
    function sanitize() {
      const next = self.sanitizeHiraganaInput(input.value);
      if (input.value !== next) input.value = next;
    }
    input.addEventListener("input", sanitize);
    input.addEventListener("compositionend", sanitize);
  },

  afterRender: function () {
    this.bindGuessInput();
    const canvas = document.getElementById("dwCanvas");
    if (!canvas || canvas.dataset.bound === "1") return;
    canvas.dataset.bound = "1";

    const w = this.CANVAS_W;
    const h = this.CANVAS_H;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.5;

    const draftKey = canvas.dataset.draftKey || "";
    const draft = draftKey ? this._drafts[draftKey] : null;
    const baseSrc = this._canvasBaseSrc || "";
    const brushColor = canvas.dataset.brushColor || this._brushColor || this.PLAYER_COLORS[0];
    this._brushColor = brushColor;
    canvas._dwBaseSrc = baseSrc;
    if (draft) {
      this.fillCanvasBase(ctx, w, h, draft);
    } else {
      this.fillCanvasBase(ctx, w, h, baseSrc);
    }

    let drawing = false;
    const self = this;

    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches && e.touches[0] ? e.touches[0] : e;
      return {
        x: ((src.clientX - rect.left) / rect.width) * w,
        y: ((src.clientY - rect.top) / rect.height) * h
      };
    }

    function start(e) {
      e.preventDefault();
      drawing = true;
      const p = pos(e);
      ctx.strokeStyle = brushColor;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      const p = pos(e);
      ctx.strokeStyle = brushColor;
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    function end(e) {
      if (!drawing) return;
      if (e) e.preventDefault();
      drawing = false;
      ctx.beginPath();
      if (draftKey) {
        try {
          self._drafts[draftKey] = canvas.toDataURL("image/jpeg", 0.55);
        } catch (err) { /* ignore */ }
      }
    }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end, { passive: false });

    const clearBtn = document.getElementById("dwClearCanvas");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        self.clearCanvas();
        if (draftKey) delete self._drafts[draftKey];
      });
    }
  },

  isMyDrawTurn: function (ctx) {
    const drawer = this.getCurrentDrawer(ctx.room);
    return !!(drawer && ctx.me && drawer.id === ctx.me.id);
  },

  renderLobbySetup: function (room, canManage) {
    const lobby = this.ensureLobbySetup(room);
    const count = room.players.length;
    const maxWolves = this.getMaxWolves(count);
    const html = ['<section class="card setup-panel lobby-setup-panel">'];
    const self = this;

    html.push("<h2>ゲーム設定</h2>");
    html.push('<p class="section-lead">お題の系統と人狼の人数を選んでください</p>');

    html.push('<h3 class="setup-subtitle">お題の系統</h3>');
    html.push('<div class="setup-options ww-theme-options">');
    this.getThemes().forEach(function (theme) {
      const selected = lobby.themeId === theme.id;
      if (canManage) {
        html.push(
          '<button type="button" class="setup-option' + (selected ? " is-selected" : "") + '" data-action="dw-lobby-theme" data-dw-theme="' + theme.id + '">' +
            '<span class="setup-option-name">' + escapeHtml(theme.name) + "</span>" +
            (theme.hint ? '<span class="setup-option-hint">' + escapeHtml(theme.hint) + "</span>" : "") +
          "</button>"
        );
      } else {
        html.push(
          '<div class="setup-option setup-option--readonly' + (selected ? " is-selected" : "") + '">' +
            '<span class="setup-option-name">' + escapeHtml(theme.name) + "</span>" +
            (theme.hint ? '<span class="setup-option-hint">' + escapeHtml(theme.hint) + "</span>" : "") +
          "</div>"
        );
      }
    });
    html.push("</div>");

    html.push('<h3 class="setup-subtitle" style="margin-top:1rem">人狼の人数</h3>');
    html.push('<div class="player-count-row">');
    if (canManage) {
      html.push('<button type="button" class="btn btn-secondary player-count-btn" data-action="dw-lobby-wolves" data-delta="-1" ' + (lobby.wolfCount <= 1 ? "disabled" : "") + ">−</button>");
    }
    html.push('<span class="player-count-value">' + lobby.wolfCount + "</span>");
    if (canManage) {
      html.push('<button type="button" class="btn btn-secondary player-count-btn" data-action="dw-lobby-wolves" data-delta="1" ' + (lobby.wolfCount >= maxWolves ? "disabled" : "") + ">＋</button>");
    }
    html.push('<span class="player-count-hint">人（最大 ' + maxWolves + "人）</span>");
    html.push("</div>");

    if (!canManage) {
      html.push('<p class="note">ホストが設定を選びます</p>');
    }

    html.push("</section>");
    return html.join("");
  },

  renderPlaySetup: function (playerCount, themeId, wolfCount, canEdit) {
    const lobby = {
      themeId: themeId || "all",
      wolfCount: this.clampWolfCount(playerCount, wolfCount || 1)
    };
    const maxWolves = this.getMaxWolves(playerCount);
    const parts = ['<div class="wordwolf-play-setup-inner">'];
    parts.push('<h3 class="setup-title">ゲーム設定</h3>');
    parts.push('<p class="note">お題の系統と人狼の人数</p>');
    parts.push('<div class="setup-options ww-theme-options">');
    this.getThemes().forEach(function (theme) {
      const selected = lobby.themeId === theme.id;
      if (canEdit) {
        parts.push(
          '<button type="button" class="setup-option' + (selected ? " is-selected" : "") + '" data-dw-theme="' + theme.id + '">' +
            '<span class="setup-option-name">' + escapeHtml(theme.name) + "</span>" +
            (theme.hint ? '<span class="setup-option-hint">' + escapeHtml(theme.hint) + "</span>" : "") +
          "</button>"
        );
      }
    });
    parts.push("</div>");
    parts.push('<div class="player-count-row" style="margin-top:0.75rem">');
    parts.push('<span class="player-count-label">人狼</span>');
    if (canEdit) {
      parts.push('<button type="button" class="btn btn-secondary player-count-btn" data-dw-wolves-delta="-1" ' + (lobby.wolfCount <= 1 ? "disabled" : "") + ">−</button>");
    }
    parts.push('<span class="player-count-value" id="dwPlayWolfCount">' + lobby.wolfCount + "</span>");
    if (canEdit) {
      parts.push('<button type="button" class="btn btn-secondary player-count-btn" data-dw-wolves-delta="1" ' + (lobby.wolfCount >= maxWolves ? "disabled" : "") + ">＋</button>");
    }
    parts.push('<span class="player-count-hint">人（最大 ' + maxWolves + "人）</span>");
    parts.push("</div></div>");
    return parts.join("");
  },

  renderWordReveal: function (word, isWolf, genreHint) {
    if (isWolf) {
      let hintHtml = "";
      if (genreHint) {
        hintHtml =
          '<p class="dw-wolf-genre-hint">ジャンル：<strong style="color:var(--accent-2)">' +
          escapeHtml(genreHint) +
          "</strong></p>" +
          '<p class="note">おまかせのためジャンルだけ分かります。お題そのものは分かりません。</p>';
      } else {
        hintHtml = '<p class="note" style="margin-top:0.75rem">お題はありません。みんなの絵に自然に加筆して、バレないようにしましょう。</p>';
      }
      return (
        '<div id="dwWordReveal" class="hidden secret-panel">' +
          '<p class="note">あなたの役職</p>' +
          '<p class="big" style="color:var(--danger)">お絵描き人狼</p>' +
          hintHtml +
          (genreHint
            ? '<p class="note" style="margin-top:0.5rem">みんなの絵に自然に加筆して、バレないようにしましょう。</p>'
            : "") +
        "</div>"
      );
    }
    return (
      '<div id="dwWordReveal" class="hidden secret-panel">' +
        '<p class="note">あなたのお題（描くもの）</p>' +
        '<p class="big" style="color:var(--accent-2)">' + escapeHtml(word || "？") + "</p>" +
        '<p class="note" style="margin-top:0.75rem">お題を文字で書かず、みんなで1枚の絵に加筆してください。</p>' +
      "</div>"
    );
  },

  renderDiscussionTimer: function () {
    return (
      '<section class="card discussion-panel">' +
        '<p class="discussion-timer-label">話し合い 残り時間</p>' +
        '<p class="discussion-timer" id="discussionTimer">5:00</p>' +
        '<p class="note">お題を直接言わず、加筆の様子から人狼を探しましょう。</p>' +
      "</section>"
    );
  },

  renderSharedDrawing: function (room, title) {
    const gs = room.gameState;
    const html = ['<section class="card dw-gallery"><h2>' + escapeHtml(title || "みんなの絵") + "</h2>"];
    if (gs.sharedDrawing) {
      html.push('<img class="dw-mine-preview" src="' + gs.sharedDrawing + '" alt="共同の絵" decoding="async">');
    } else {
      html.push('<div class="dw-gallery-empty">まだ絵がありません</div>');
    }
    html.push("</section>");
    return html.join("");
  },

  renderDrawHistory: function (room) {
    const history = room.gameState.drawHistory || [];
    if (!history.length) return "";
    const self = this;
    const html = ['<section class="card dw-gallery"><h2>加筆の流れ</h2><div class="dw-gallery-grid">'];
    history.forEach(function (step, i) {
      const name = self.playerNameById(room, step.playerId);
      const color = step.color || self.getPlayerColor(room, step.playerId);
      html.push('<figure class="dw-gallery-item">');
      if (step.image) {
        html.push('<img src="' + step.image + '" alt="' + escapeHtml(name) + 'の加筆後" decoding="async">');
      }
      html.push(
        "<figcaption>" + self.colorChipHtml(color) + " " + (i + 1) + ". " + escapeHtml(name) + "</figcaption>"
      );
      html.push("</figure>");
    });
    html.push("</div></section>");
    return html.join("");
  },

  renderDrawTurnTimer: function () {
    return (
      '<section class="card discussion-panel dw-draw-timer-panel">' +
        '<p class="discussion-timer-label">この人の残り時間</p>' +
        '<p class="discussion-timer" id="dwDrawTimer">1:30</p>' +
        '<p class="note">制限時間は最大1分30秒です。終わると自動で次の人へ進みます。</p>' +
      "</section>"
    );
  },

  renderDrawPad: function (room, player, word, isWolf) {
    const draftKey = this.draftKey(room, player.id);
    const baseSrc = room.gameState.sharedDrawing || "";
    const color = this.getPlayerColor(room, player.id);
    this._canvasBaseSrc = baseSrc;
    this._brushColor = color;
    const html = [];
    const turn = (room.gameState.drawIndex || 0) + 1;
    const total = (room.gameState.drawOrder || room.players).length;
    html.push('<section class="card secret-panel dw-draw-panel">');
    html.push(
      "<p>" + this.colorChipHtml(color) + " <strong>" + escapeHtml(player.name) +
        "</strong> さんの番（" + turn + "/" + total + "）</p>"
    );
    html.push(
      '<p class="dw-player-color-line">ペンの色：' + this.colorChipHtml(color) +
        ' <strong style="color:' + color + '">この色だけ</strong>（だれが書いたか色で分かります）</p>'
    );
    if (isWolf) {
      html.push('<p class="dw-draw-prompt" style="color:var(--danger)">お題なし（人狼）</p>');
      if (room.gameState.wolfGenreHint) {
        html.push(
          '<p class="dw-wolf-genre-hint">ジャンル：<strong style="color:var(--accent-2)">' +
            escapeHtml(room.gameState.wolfGenreHint) +
            "</strong></p>"
        );
      }
      html.push('<p class="note">様子を見ながら自然に加筆してください</p>');
    } else {
      html.push('<p class="dw-draw-prompt">お題：<strong style="color:var(--accent-2)">' + escapeHtml(word || "？") + "</strong></p>");
      html.push('<p class="note">お題を文字で書かず、前の人の絵に加筆してください</p>');
    }
    if (baseSrc) {
      html.push('<p class="note">いまの絵に続いて描きます</p>');
    } else {
      html.push('<p class="note">最初の1筆です。お題が分かるように描き始めましょう</p>');
    }
    html.push('<div class="dw-color-row">');
    html.push('<span class="dw-color-btn is-selected" style="background:' + color + '" aria-label="固定色"></span>');
    html.push('<button type="button" class="btn btn-secondary btn-sm" id="dwClearCanvas">消す</button>');
    html.push("</div>");
    html.push(
      '<canvas id="dwCanvas" class="dw-canvas" width="' + this.CANVAS_W + '" height="' + this.CANVAS_H +
        '" data-draft-key="' + escapeHtml(draftKey) +
        '" data-brush-color="' + escapeHtml(color) + '"></canvas>'
    );
    html.push('<button type="button" class="btn btn-primary" style="margin-top:0.85rem" data-action="dw-submit-draw">次の人へ渡す</button>');
    html.push("</section>");
    return html.join("");
  },

  renderVoteGrid: function (room, action, excludeId) {
    let html = '<div class="player-pick-grid">';
    room.players.filter(function (p) { return p.id !== excludeId; }).forEach(function (p) {
      html += '<button type="button" class="player-pick" data-action="' + action + '" data-player="' + p.id + '">' + escapeHtml(p.name) + "</button>";
    });
    html += "</div>";
    return html;
  },

  renderVoteResults: function (room) {
    const gs = room.gameState;
    const top = this.getTopVotes(room);
    const html = [];
    html.push('<section class="card wordwolf-vote-results">');

    if (gs.executed) {
      html.push(
        "<p>最多票：<strong>" +
          escapeHtml(this.playerNameById(room, gs.executed)) +
          "</strong>（" + top.max + "票）</p>"
      );
    } else {
      html.push("<p>同票のため、追放されませんでした</p>");
      if (top.ids.length && top.max > 0) {
        const names = top.ids.map(function (id) {
          return DrawingWerewolfGame.playerNameById(room, id);
        }).join("、");
        html.push(
          "<p>最多票：<strong>" +
            escapeHtml(names) +
            "</strong>（各 " + top.max + "票）</p>"
        );
      }
    }

    html.push('<h3 class="wordwolf-vote-heading">投票の内訳</h3>');
    html.push('<ul class="player-list wordwolf-vote-breakdown">');
    room.players.forEach(function (p) {
      const targetId = gs.votes && gs.votes[p.id];
      if (!targetId) {
        html.push("<li><span>" + escapeHtml(p.name) + "：未投票</span></li>");
        return;
      }
      html.push(
        "<li><span>" +
          escapeHtml(p.name) +
          " → " +
          escapeHtml(DrawingWerewolfGame.playerNameById(room, targetId)) +
          "</span></li>"
      );
    });
    html.push("</ul></section>");
    return html.join("");
  },

  renderProceedReadyPanel: function (room, me, action) {
    const ready = room.gameState.proceedReady || {};
    const count = room.players.filter(function (p) { return ready[p.id]; }).length;
    const majority = Math.floor(room.players.length / 2) + 1;
    const html = ['<section class="card"><h2>投票に進む</h2>'];
    html.push("<p class=\"note\">過半数（" + majority + "人）が賛成すると投票に進みます。</p>");
    html.push("<p>賛成 " + count + " / " + room.players.length + "人</p>");
    if (!ready[me.id]) {
      html.push('<button type="button" class="btn btn-secondary btn-block" data-action="' + action + '">投票に進みたい</button>');
    } else {
      html.push('<p class="note">あなたは投票に進みたいに賛成済みです</p>');
    }
    html.push("</section>");
    return html.join("");
  },

  render: function (ctx) {
    const room = ctx.room;
    const me = ctx.me;
    const gs = room.gameState;
    const html = [];
    const canManage = this.canManage(ctx);
    const myWord = this.getWord(ctx, me.id);

    if (room.phase === "draw_werewolf_ready") {
      const amWolf = this.isWolf(ctx, me.id);
      const genreHint = amWolf ? (gs.wolfGenreHint || "") : "";
      html.push('<div class="phase-banner"><h2>役職・お題確認</h2><p>自分のスマホだけで確認してください</p></div>');
      html.push('<section class="card secret-panel">');
      html.push('<button type="button" class="btn btn-primary" data-action="dw-show-word">' + (amWolf ? "役職を見る" : "お題を見る") + "</button>");
      html.push(this.renderWordReveal(myWord, amWolf, genreHint));
      if (!gs.wordConfirmed[me.id]) {
        html.push('<button type="button" class="btn btn-success" style="margin-top:1rem" data-action="dw-confirm-word">確認した</button>');
      } else {
        html.push('<p class="note" style="margin-top:1rem">確認済み ✓</p>');
      }
      html.push("</section>");
      const confirmedCount = room.players.filter(function (p) { return gs.wordConfirmed[p.id]; }).length;
      html.push('<p class="note" style="text-align:center">確認済み ' + confirmedCount + " / " + room.players.length + "人</p>");
      if (canManage) {
        const allDone = this.allWordsConfirmed(room);
        html.push('<button type="button" class="btn btn-primary" data-action="dw-start-draw" ' + (allDone ? "" : "disabled") + ">お絵描きへ</button>");
        if (!allDone) html.push('<p class="note">全員の確認を待っています</p>');
      }
      return html.join("");
    }

    if (room.phase === "draw_werewolf_reveal") {
      const target = room.players[gs.revealIndex];
      const targetWolf = this.isWolf(ctx, target.id);
      const genreHint = targetWolf ? (gs.wolfGenreHint || "") : "";
      html.push('<div class="phase-banner"><h2>役職・お題確認 ' + (gs.revealIndex + 1) + "/" + room.players.length + "</h2><p>端末を回して本人だけが見てください</p></div>");
      html.push('<section class="card secret-panel">');
      html.push("<p><strong>" + escapeHtml(target.name) + "</strong> さん</p>");
      html.push('<button type="button" class="btn btn-primary" data-action="dw-show-word">' + (targetWolf ? "役職を見る" : "お題を見る") + "</button>");
      html.push(this.renderWordReveal(this.getWord(ctx, target.id), targetWolf, genreHint));
      if (canManage) {
        html.push('<button type="button" class="btn btn-success" style="margin-top:1rem" data-action="dw-next-reveal">次へ</button>');
      }
      html.push("</section>");
      return html.join("");
    }

    if (room.phase === "draw_werewolf_draw") {
      const self = this;
      html.push('<div class="phase-banner"><h2>お絵描き</h2><p>1枚の絵に、順番に加筆していきます（1人最大1分30秒）</p></div>');
      html.push(this.renderDrawTurnTimer());
      const drawer = this.getCurrentDrawer(room);
      const order = gs.drawOrder || [];

      if (drawer) {
        const canDraw = room.mode === "local" || this.isMyDrawTurn(ctx);
        if (canDraw) {
          const drawerWord = this.getWord(ctx, drawer.id);
          const drawerWolf = this.isWolf(ctx, drawer.id);
          html.push(this.renderDrawPad(room, drawer, drawerWord, drawerWolf));
        } else {
          const waitColor = this.getPlayerColor(room, drawer.id);
          html.push('<section class="card">');
          html.push(
            "<p>いまは " + this.colorChipHtml(waitColor) + " <strong>" +
              escapeHtml(drawer.name) + "</strong> さんの番です</p>"
          );
          if (gs.sharedDrawing) {
            html.push('<img class="dw-mine-preview" src="' + gs.sharedDrawing + '" alt="いまの絵" decoding="async">');
          }
          html.push('<p class="note">加筆が終わるのを待ってください</p></section>');
        }
      } else {
        html.push('<p class="note">全員の加筆が終わりました</p>');
      }

      html.push('<section class="card"><h2>順番（色＝その人のペン）</h2><ul class="player-list">');
      order.forEach(function (pid, i) {
        const p = room.players.find(function (x) { return x.id === pid; });
        const done = i < (gs.drawIndex || 0);
        const current = i === (gs.drawIndex || 0);
        const color = self.getPlayerColor(room, pid);
        html.push(
          "<li>" + self.colorChipHtml(color) + " " + escapeHtml(p ? p.name : "？") +
            (done ? " ✓" : "") +
            (current ? " ← いま" : "") +
          "</li>"
        );
      });
      html.push("</ul></section>");

      if (canManage && this.allDrawn(room)) {
        html.push('<button type="button" class="btn btn-primary" data-action="dw-start-discuss">話し合いへ</button>');
      }
      return html.join("");
    }

    if (room.phase === "draw_werewolf_discuss") {
      html.push('<div class="phase-banner"><h2>話し合い</h2><p>絵と加筆の様子から人狼を探してください（5分）</p></div>');
      if (gs.themeName) {
        html.push('<p class="note" style="text-align:center;margin:-0.5rem 0 1rem">' + escapeHtml(gs.themeName) + "</p>");
      }
      html.push(this.renderDiscussionTimer());
      html.push(this.renderSharedDrawing(room, "完成した絵"));
      html.push(this.renderDrawHistory(room));

      if (me && room.mode !== "local") {
        html.push(this.renderProceedReadyPanel(room, me, "dw-proceed-ready"));
      }

      if (canManage) {
        html.push('<button type="button" class="btn btn-primary" data-action="dw-start-vote">投票へ進む</button>');
      } else {
        html.push('<p class="note">ホストが投票へ進むのを待っています…</p>');
      }
      return html.join("");
    }

    if (room.phase === "draw_werewolf_vote") {
      html.push('<div class="phase-banner"><h2>投票</h2><p>お絵描き人狼だと思う人に投票してください</p></div>');
      html.push(this.renderSharedDrawing(room, "完成した絵"));
      html.push(this.renderDrawHistory(room));

      if (room.mode === "local") {
        const voter = this.getCurrentVoter(room);
        if (voter) {
          html.push('<section class="card secret-panel vote-card-panel">');
          html.push('<p class="vote-card-player"><strong>' + escapeHtml(voter.name) + "</strong> さんの番</p>");
          html.push('<p class="vote-card-prompt">人狼だと思う人を選んでください</p>');
          html.push(this.renderVoteGrid(room, "dw-vote", voter.id));
          html.push("</section>");
        }
      } else if (!gs.votes[me.id]) {
        html.push('<section class="card"><h2>人狼だと思う人</h2>');
        html.push(this.renderVoteGrid(room, "dw-vote", me.id));
        html.push("</section>");
      } else {
        html.push('<p class="note">投票済み。他の人を待っています。</p>');
      }

      html.push('<section class="card"><h2>投票状況</h2><ul class="player-list">');
      room.players.forEach(function (p) {
        html.push("<li>" + escapeHtml(p.name) + (gs.votes[p.id] ? " ✓" : "") + "</li>");
      });
      html.push("</ul></section>");

      if (canManage && this.canResolveVote(room)) {
        html.push('<button type="button" class="btn btn-danger" data-action="dw-resolve-vote">投票を集計</button>');
      } else if (canManage) {
        const voted = this.countVotesCast(room);
        const total = room.players.length;
        const majority = Math.floor(total / 2) + 1;
        html.push('<p class="note">投票済み ' + voted + "/" + total + "人（過半数 " + majority + "人で集計可能）</p>");
      }
      return html.join("");
    }

    if (room.phase === "draw_werewolf_wolf_guess") {
      const executed = room.players.find(function (p) { return p.id === gs.executed; });
      const roles = this.getRolesMap(ctx);
      const isExecutedWolf = !!(gs.executedWasWolf || (executed && roles[executed.id] === "wolf"));
      const canGuess = executed && (
        room.mode === "local" ||
        (me && executed.id === me.id)
      );

      const topic = this.getTopic(room);
      const lastKana = this.getTopicLastHiragana(topic);
      const charCount = this.getTopicCharCount(room);
      const executedName = executed ? executed.name : "？";
      html.push('<div class="phase-banner"><h2>逆転チャンス</h2><p>人狼が見つかっても、お題を当てれば人狼の勝ち！</p></div>');
      html.push(
        '<div class="dw-wolf-reveal" role="status">' +
          '<p class="dw-wolf-reveal-line"><strong>' + escapeHtml(executedName) + "</strong>は人狼でした</p>" +
        "</div>"
      );
      html.push('<section class="card">');
      html.push('<p class="note"><strong>市民のお題を正解</strong>すると人狼の逆転勝利です。外せば市民の勝利です。</p>');
      html.push('<div class="dw-guess-hints">');
      if (charCount) {
        html.push('<p class="dw-guess-kana-hint">ヒント：<strong>' + charCount + "</strong>文字</p>");
      }
      if (lastKana) {
        html.push(
          '<p class="dw-guess-kana-hint">最後のひらがなは「<strong>' +
            escapeHtml(lastKana) +
            "</strong>」</p>"
        );
      }
      html.push("</div>");
      html.push(this.renderSharedDrawing(room, "みんなの絵"));
      html.push("</section>");

      if (canGuess) {
        html.push('<section class="card secret-panel">');
        html.push("<h2>市民のお題を予想</h2>");
        if (room.mode === "local" && executed) {
          html.push("<p><strong>" + escapeHtml(executed.name) + "</strong> さんが答えてください</p>");
        }
        html.push('<div class="dw-guess-hints">');
        if (charCount) {
          html.push(
            '<p class="dw-guess-kana-hint"><strong style="font-size:1.6rem;color:var(--accent-2)">' +
              charCount +
              "</strong> 文字</p>"
          );
        }
        if (lastKana) {
          html.push(
            '<p class="dw-guess-kana-hint">最後のひらがな：<strong style="font-size:1.6rem;color:var(--accent-2)">' +
              escapeHtml(lastKana) +
              "</strong></p>"
          );
        }
        html.push("</div>");
        html.push('<p class="note">ひらがなで答えてください（カタカナ・漢字・英字は使えません）</p>');
        html.push(
          '<input type="text" id="dwGuessInput" class="dw-guess-input" placeholder="ひらがなで入力" maxlength="30" autocomplete="off" lang="ja" inputmode="kana" autocapitalize="off" spellcheck="false">'
        );
        html.push('<button type="button" class="btn btn-primary" style="margin-top:0.75rem" data-action="dw-submit-guess">答えを出す（当たれば人狼の勝ち）</button>');
        html.push("</section>");
      } else if (isExecutedWolf) {
        html.push('<p class="note">人狼がお題を予想しています…</p>');
        html.push('<div class="dw-guess-hints">');
        if (charCount) {
          html.push('<p class="dw-guess-kana-hint" style="text-align:center">ヒント：<strong>' + charCount + "</strong>文字</p>");
        }
        if (lastKana) {
          html.push(
            '<p class="dw-guess-kana-hint" style="text-align:center">最後のひらがなは「<strong>' +
              escapeHtml(lastKana) +
              "</strong>」</p>"
          );
        }
        html.push("</div>");
      }

      return html.join("");
    }

    if (room.phase === "draw_werewolf_end") {
      const roles = this.getRolesMap(ctx);
      const topic = this.getTopic(room);
      const isCitizensWin = gs.winner === "citizens" || gs.winner === "citizens_pending";
      const winners = room.players.filter(function (p) {
        const role = roles[p.id];
        return isCitizensWin ? role === "citizen" : role === "wolf";
      });

      html.push('<div class="phase-banner"><h2>結果</h2></div>');
      if (typeof WordWolfGame !== "undefined" && WordWolfGame.renderWinCard) {
        html.push(WordWolfGame.renderWinCard(gs.winner));
      }
      html.push('<div class="wordwolf-win-headline">勝利</div>');
      html.push('<ul class="wordwolf-win-players">');
      winners.forEach(function (p) {
        html.push("<li>" + escapeHtml(p.name) + "</li>");
      });
      html.push("</ul>");

      html.push('<section class="card wordwolf-end-summary">');
      html.push('<p class="wordwolf-theme-line">お題の系統：<strong>' + escapeHtml(gs.themeName || "おまかせ") + "</strong></p>");
      html.push('<p class="wordwolf-topic-line">市民のお題：<strong>' + escapeHtml(topic) + "</strong></p>");
      html.push('<p class="note">人狼にはお題はありません</p>');
      html.push("</section>");

      html.push(this.renderSharedDrawing(room, "完成した絵"));
      html.push(this.renderDrawHistory(room));
      html.push(this.renderVoteResults(room));

      if (gs.executedWasWolf) {
        if (gs.wolfGuess) {
          const ok = gs.wolfGuessCorrect === true || this.isCorrectTopicGuess(room, gs.wolfGuess);
          html.push(
            '<section class="card"><p>人狼は追放されたがお題予想：<strong>' +
              escapeHtml(gs.wolfGuess) +
              "</strong> — " +
              (ok ? "正解！人狼の逆転勝利" : "不正解（市民の勝利）") +
              "</p></section>"
          );
        } else {
          html.push('<section class="card"><p>人狼は追放されました（お題予想なし）</p></section>');
        }
      }

      html.push('<section class="card"><h2>役職一覧</h2><ul class="player-list wordwolf-topic-list">');
      room.players.forEach(function (p) {
        const role = roles[p.id];
        const label = role === "wolf" ? "お絵描き人狼（お題なし）" : ("市民：" + topic);
        html.push("<li><span>" + escapeHtml(p.name) + "：" + escapeHtml(label) + "</span></li>");
      });
      html.push("</ul></section>");

      if (canManage) {
        html.push('<button type="button" class="btn btn-primary" data-action="dw-restart">もう一局</button>');
      }
      return html.join("");
    }

    return "";
  }
};
