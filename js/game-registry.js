/**
 * ゲームカタログ — ボードゲーム・トランプ・パーティーゲーム一覧
 * 新しいゲームはここに登録するだけでサイトに表示される
 */

const GAME_CATEGORIES = {
  party: {
    id: "party",
    name: "パーティゲーム",
    description: "推理・心理戦・みんなで盛り上がるゲーム",
    icon: "🎭"
  },
  trump: {
    id: "trump",
    name: "トランプ",
    description: "トランプ・ポーカーなどカードで遊ぶ",
    icon: "🃏",
    iconImage: "images/games/playing-cards-icon.png"
  },
  board: {
    id: "board",
    name: "ボードゲーム",
    description: "盤面や駒を使って遊ぶ定番ゲーム",
    icon: "♟️"
  },
  duel: {
    id: "duel",
    name: "デュエル",
    description: "2人だけで対戦するゲーム",
    icon: "⚔️"
  },
  coop: {
    id: "coop",
    name: "協力ゲーム",
    description: "全員で協力してクリアを目指す",
    icon: "🤝"
  },
  dice: {
    id: "dice",
    name: "サイコロ・運試し",
    description: "サイコロや運要素が楽しいゲーム",
    icon: "🎲"
  }
};

/**
 * 開発優先リスト（ユーザー指定）
 * priorityOrder の順で実装予定
 */
const GAME_REGISTRY = {
  /* --- 対応済み --- */
  werewolf: {
    id: "werewolf",
    name: "人狼",
    iconImage: "images/games/werewolf-icon.png",
    category: "party",
    description: "正体を隠し、仲間を信じ、相手を見抜く定番の正体隠匿ゲーム",
    minPlayers: 3,
    maxPlayers: 13,
    status: "live",
    featured: true,
    priority: true,
    priorityOrder: 3,
    modesSoon: ["online"],
    module: "WerewolfGame"
  },
  drawing_werewolf: {
    id: "drawing_werewolf",
    name: "お絵描き人狼",
    iconImage: "images/games/werewolf-icon.png",
    category: "party",
    description: "市民だけお題を持ち、1枚の絵に順番に加筆。お題がない人狼を見つける心理戦",
    minPlayers: 4,
    maxPlayers: 10,
    status: "live",
    featured: true,
    priority: true,
    priorityOrder: 4,
    modesSoon: ["online"],
    module: "DrawingWerewolfGame"
  },
  /* --- 協力・ワード（対応済み） --- */
  ngword: {
    id: "ngword",
    name: "NGワードゲーム",
    category: "coop",
    description: "各自に言っちゃダメなワードが配られる。自分のは見えず、他の人のNGワードだけ分かる心理戦",
    minPlayers: 3,
    maxPlayers: 8,
    status: "live",
    featured: true,
    modesSoon: ["online"],
    module: "NgWordGame"
  },
  ito: {
    id: "ito",
    name: "ナンバーリンク",
    category: "coop",
    description: "1〜100の数字を、お題に沿った言葉だけで協力して昇順に並べる。各自のスマホで数字を確認",
    minPlayers: 2,
    maxPlayers: 8,
    status: "live",
    playCaution: "バグあるかも",
    modesSoon: ["online"],
    module: "ItoGame"
  },

  /* --- 開発優先（準備中） --- */
  daifugo: {
    id: "daifugo",
    name: "大富豪",
    category: "trump",
    description: "階級ありのトランプ。各自のスマホで大富豪を目指してカードを出し合う",
    minPlayers: 4,
    maxPlayers: 8,
    status: "live",
    featured: true,
    priority: true,
    priorityOrder: 1,
    modesSoon: ["local", "online"],
    module: "DaifugoGame"
  },
  doubt: {
    id: "doubt",
    name: "ダウト",
    category: "trump",
    description: "4枚のカードを裏向きで出し、嘘か本当かを見破る心理戦トランプ",
    minPlayers: 2,
    maxPlayers: 4,
    status: "soon",
    featured: true,
    priority: true,
    priorityOrder: 2,
    module: "DoubtGame"
  },
  wordwolf: {
    id: "wordwolf",
    name: "ワードウルフ",
    iconImage: "images/games/wordwolf-icon.png",
    category: "party",
    description: "お題について話し合い、違うお題を持つワードウルフを見つける心理戦。各自のスマホで4〜12人",
    minPlayers: 4,
    maxPlayers: 12,
    status: "live",
    featured: true,
    priority: true,
    priorityOrder: 4,
    modesSoon: ["online"],
    module: "WordWolfGame"
  },
  coyote: {
    id: "coyote",
    name: "コヨーテ",
    category: "party",
    description: "数字カードを裏向きで重ね、合計を超えたら負け。ブラフが楽しい",
    minPlayers: 3,
    maxPlayers: 6,
    status: "soon",
    featured: true,
    priority: true,
    priorityOrder: 5,
    module: "CoyoteGame"
  },
  codenames: {
    id: "codenames",
    name: "コードネーム",
    category: "coop",
    description: "スパイマスターの1語ヒントで、自チームのワードを当てる",
    minPlayers: 4,
    maxPlayers: 8,
    status: "soon",
    featured: true,
    priority: true,
    priorityOrder: 6,
    module: "CodenamesGame"
  },
  skull: {
    id: "skull",
    name: "爆弾",
    category: "party",
    description: "宝石か爆弾か。かけて裏返し、2勝で優勝。各自のスマホで心理戦",
    minPlayers: 3,
    maxPlayers: 6,
    status: "live",
    featured: true,
    priority: true,
    priorityOrder: 7,
    modesSoon: ["local", "online"],
    module: "SkullGame"
  },
  cockroach: {
    id: "cockroach",
    name: "ごきぶりポーカー",
    category: "party",
    description: "虫カードを渡し合い、最後にゴキブリが残った人の負け",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon",
    priority: true,
    priorityOrder: 8
  },
  catan: {
    id: "catan",
    name: "カタン",
    category: "board",
    description: "資源を集めて開拓地を広げる。交渉と戦略のボードゲーム",
    minPlayers: 3,
    maxPlayers: 4,
    status: "soon",
    priority: true,
    priorityOrder: 9
  },
  dixit: {
    id: "dixit",
    name: "ディクシット",
    category: "coop",
    description: "絵カードに連想するヒントを出し、当てすぎず外しすぎずを狙う",
    minPlayers: 3,
    maxPlayers: 6,
    status: "soon",
    priority: true,
    priorityOrder: 10
  },

  /* --- その他（準備中） --- */
  oldmaid: {
    id: "oldmaid",
    name: "ババ抜き",
    category: "trump",
    description: "ペアを揃えて手札を減らす。最後にジョーカーが残った人の負け",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon",
    featured: true,
    module: "OldMaidGame"
  },
  sevens: {
    id: "sevens",
    name: "七並べ",
    category: "trump",
    description: "7を中心に並べていく定番トランプ",
    minPlayers: 2,
    maxPlayers: 4,
    status: "soon",
    featured: true,
    module: "SevensGame"
  },
  memory: {
    id: "memory",
    name: "神経衰弱",
    category: "trump",
    description: "裏向きのカードをめくってペアを揃える。枚数多い人が勝ち",
    minPlayers: 2,
    maxPlayers: 4,
    status: "soon"
  },
  speed: {
    id: "speed",
    name: "スピード",
    category: "duel",
    description: "場のカード±1で出し切る早押しトランプ",
    minPlayers: 2,
    maxPlayers: 2,
    status: "soon"
  },
  blackjack: {
    id: "blackjack",
    name: "ブラックジャック",
    category: "trump",
    description: "ディーラーに21を目指して勝負。ヒット・ダブル・スプリット対応",
    minPlayers: 2,
    maxPlayers: 7,
    status: "live",
    featured: true,
    modesSoon: ["local", "online"],
    module: "BlackjackGame"
  },
  ninetyNine: {
    id: "ninetyNine",
    name: "99",
    category: "trump",
    description: "合計99を超えたら負け。A・K・ジョーカーなど特殊カードの心理戦",
    minPlayers: 2,
    maxPlayers: 6,
    status: "live",
    featured: true,
    modesSoon: ["local", "online"],
    module: "NinetyNineGame"
  },
  pageOne: {
    id: "pageOne",
    name: "大富豪（ページワン）",
    category: "trump",
    description: "1枚ずつ出して同じ数字・マークで縛り。1枚残しで勝ち",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon"
  },
  texas_holdem: {
    id: "texas_holdem",
    name: "テキサスホールデム ⭐",
    category: "trump",
    description: "手札2枚＋場札5枚。各自のスマホでWSOPスタイルのポーカー",
    minPlayers: 2,
    maxPlayers: 9,
    status: "live",
    featured: true,
    modesSoon: ["local", "online"],
    module: "TexasHoldemGame"
  },
  seven_stud: {
    id: "seven_stud",
    name: "セブンカード・スタッド",
    category: "trump",
    description: "場札なし。最大7枚から5枚で役を作る昔ながらのポーカー",
    minPlayers: 2,
    maxPlayers: 8,
    status: "soon",
    featured: true,
    module: "SevenStudGame"
  },
  five_draw: {
    id: "five_draw",
    name: "ファイブカード・ドロー",
    category: "trump",
    description: "5枚配られ、カードを交換して役を作る。映画でおなじみのポーカー",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon",
    featured: true,
    module: "FiveDrawGame"
  },
  reversi: {
    id: "reversi",
    name: "オセロ",
    iconImage: "images/games/reversi-icon.png",
    category: "duel",
    description: "石を裏返しながら陣地を広げる2人対戦。1台または各自のスマホで対戦",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    modesSoon: ["online"],
    module: "ReversiGame"
  },
  gomoku: {
    id: "gomoku",
    name: "五目並べ",
    iconImage: "images/games/gomoku-icon.png",
    category: "duel",
    description: "黒白の石を交互に置き、5つ並べたら勝ち。1台または各自のスマホで2人対戦",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    modesSoon: ["online"],
    module: "GomokuGame"
  },
  shogi: {
    id: "shogi",
    name: "将棋",
    iconImage: "images/games/shogi-icon.png",
    category: "duel",
    description: "駒を動かして相手の玉を詰ます。1台または各自のスマホで2人対戦",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    modesSoon: ["online"],
    module: "ShogiGame"
  },
  vanishing_ttt: {
    id: "vanishing_ttt",
    name: "消える○×",
    iconImage: "images/games/marubatu-icon.png",
    category: "duel",
    description: "3×3で〇×を並べるが、4個目を置くと最古の駒が消える三目並べ",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    instantLocal: true,
    modesSoon: ["online"],
    module: "VanishingTttGame"
  },
  tic_tac_toe: {
    id: "tic_tac_toe",
    name: "ノーマル○×ゲーム",
    iconImage: "images/games/marubatu-icon.png",
    category: "duel",
    description: "3×3の定番○×。横・縦・斜めに3つ並べた方の勝ち",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    instantLocal: true,
    modesSoon: ["online"],
    module: "TicTacToeGame"
  },
  matryoshka_ttt: {
    id: "matryoshka_ttt",
    name: "マトリョーシカ○×",
    iconImage: "images/games/marubatu-icon.png",
    category: "duel",
    description: "小・中・大のコマを重ねて三目を狙う。1台または各自のスマホで2人対戦",
    minPlayers: 2,
    maxPlayers: 2,
    status: "live",
    featured: true,
    instantLocal: true,
    modesSoon: ["online"],
    module: "MatryoshkaTttGame"
  },
  chinchiro: {
    id: "chinchiro",
    name: "チンチロ",
    category: "dice",
    description: "サイコロ3つで役を競う",
    minPlayers: 2,
    maxPlayers: 6,
    status: "soon"
  },
  chess: {
    id: "chess",
    name: "チェス",
    category: "duel",
    description: "駒の動きを駆使して相手のキングを詰ます。1台または各自のスマホで2人対戦",
    minPlayers: 2,
    maxPlayers: 2,
    status: "soon",
    featured: true
  }
};

const CATALOG_SOON_IDS = ["chinchiro", "codenames", "chess"];

/** 遊び方ガイド用ルール */
const GAME_RULES = {
  werewolf: [
    "村人陣営は人狼を全員追放すると勝ち、人狼陣営は人狼数が村人陣営と同じになると勝ちです",
    "夜に役職能力 → 朝に襲撃結果 → 話し合い → 投票で追放、を繰り返します",
    "占い師・狩人など役職ごとの能力を使い分けます"
  ],
  drawing_werewolf: [
    "市民だけが同じお題を持ち、人狼にはお題がありません（おまかせ時は人狼にジャンルだけ伝わります）",
    "1枚の絵を順番に加筆します（1人最大1分30秒、プレイヤーごとに決まった色）",
    "投票で人狼を当てても、人狼がお題を当てれば人狼の勝ち（外せば市民の勝ち）です"
  ],
  ngword: {
    summary: "人数: 3〜8人 / 協力・早押しパーティー",
    sections: [
      {
        title: "基本の流れ",
        items: [
          "各プレイヤーに「言ってはいけない単語（NGワード）」が1つ配られます。ただし自分のNGワードは見えず、他のプレイヤーには見えます",
          "全員で自由におしゃべりします",
          "誰かがうっかり他人のNGワードを口にしたら⚡早押し。早い順に点、脱落者も出ます",
          "「自分だけ知らない禁句」を踏まないよう会話するドキドキ感が楽しさのポイントです"
        ]
      }
    ]
  },
  ito: {
    summary: "人数: 2〜8人 / 協力パズル",
    sections: [
      {
        title: "基本の流れ",
        items: [
          "1〜100の数字が参加者に配られます（自分の数字は自分だけが分かります）",
          "お題（テーマ）に沿った言葉やヒントだけで、数字の大小を探り合います",
          "数字そのものを言うのはNG。比喩やニュアンスだけで伝えます",
          "相談しながら全員の数字を小さい順（昇順）に並べていきます",
          "順番を間違えるとライフが減ります。残っているうちにクリアを目指します"
        ]
      }
    ]
  },
  daifugo: {
    summary: "人数: 4〜8人 / 使用カード: トランプ1組（ジョーカー2枚）",
    sections: [
      {
        title: "基本の流れ",
        items: [
          "カードを配り切り、最初は特定のカード持ち（または前回の大貧民）からスタートします",
          "場に出ているカードより強い、同じ枚数のカードを出せます。出せない／出したくない場合はパス",
          "全員がパスすると場が流れ、最後に出した人が次の親になり、好きなカードから出し直せます",
          "手札が最初になくなった人から順に「大富豪 → 富豪 → 平民 → 貧民 → 大貧民」が決まります"
        ]
      },
      {
        title: "強さの順番",
        body: "3が一番弱く、4→5→6→7→8→9→10→J→Q→K→A→2 の順に強くなります（2が最強）。ジョーカーは基本的に最強です。"
      },
      {
        title: "代表的なローカルルール",
        items: [
          "革命: 同じ数字4枚などを同時に出すと、強さが逆転（2が最弱、3が最強に）",
          "8切り: 8を出すとその場が強制的に流れ、出した人がまた出せます",
          "階段: 同じマークで数字が連続していればまとめて出せます",
          "Jバック: Jを出すと、その場だけ強さが逆転します",
          "しばり: 同じマークなどが続くと、以降その条件でしか出せなくなります",
          "カード交換: 次ラウンド前に、大貧民が大富豪へカードを差し出す定番ルールがあります"
        ]
      }
    ]
  },
  doubt: [
    "カードを裏向きで出し、「〇の△枚」などと宣言します（嘘でも可）",
    "他の人は「ダウト！」で疑えます。嘘なら罰、本当なら疑った側が罰です",
    "手札を早くなくした人が勝ちです"
  ],
  wordwolf: {
    summary: "人数: 4〜12人 / 心理戦・多数決",
    sections: [
      {
        title: "基本の流れ",
        items: [
          "全員に1つずつお題（単語）が配られますが、1人（または数人）だけ違う単語（ウルフ）です。例：多数派「うどん」／少数派「そば」",
          "自分の単語は分かりますが、他人の単語は見えません",
          "お題について当たり障りのない発言をしつつ、誰が少数派（ウルフ）かを推理します",
          "話し合い後、投票で最も疑わしい人を決めます"
        ]
      },
      {
        title: "勝敗",
        items: [
          "多数派がウルフを当てられれば多数派の勝ち",
          "ウルフが逃げ切ればウルフの勝ち",
          "人狼と違い「敵か味方か」ではなく、「自分の単語がズレているか」を悟られないのがポイントです"
        ]
      }
    ]
  },
  coyote: [
    "自分以外のカードは見えますが、自分の額（手札）の数字は見えません",
    "合計を宣言しながら上げていき、実際の合計を超えたら負けです",
    "ブラフ（ハッタリ）と観察が勝負のポイントです"
  ],
  codenames: [
    "盤面のワードを、スパイマスターが1語ヒントで自チームに伝えます",
    "ヒントから自チームのカードだけを当てます。相手色・黒マスに注意",
    "黒（アサシン）を選ぶとその場で負け、自チームを先に揃えた側の勝ちです"
  ],
  skull: {
    summary: "人数: 3〜6人 / ブラフ（はったり）",
    sections: [
      {
        title: "基本の流れ",
        items: [
          "各自は宝石のカード3枚と爆弾1枚を持ちます",
          "自分の前に裏向きでカードを1枚ずつ置いていきます（宝石か爆弾かは自由）",
          "自分の番では「カードを置く」か「賭けを宣言する」かを選べます",
          "賭けが始まると、以降は賭けの枚数を釣り上げていきます（パス可）",
          "最後まで残った人が、宣言した枚数だけ裏向きカードをめくります",
          "途中で爆弾をめくらず、宝石だけなら成功。爆弾をめくると失敗でカードを失います"
        ]
      },
      {
        title: "勝利条件",
        body: "賭けに成功した回数が規定（例: 2回）に達した人が優勝です。読み合いとハッタリが肝の心理戦です。"
      }
    ]
  },
  blackjack: [
    "ディーラーと対決し、21を超えずに強い得点を目指します",
    "ヒット（追加）・スタンド（止める）・ダブル・スプリットなどが使えます",
    "ディーラーより高得点（またはディーラーがバースト）なら勝ちです"
  ],
  ninetyNine: {
    summary: "人数: 2〜6人 / 使用カード: トランプ（特殊効果あり）",
    sections: [
      {
        title: "基本の流れ",
        items: [
          "場の合計は0から始まり、順番にカードを1枚出して合計に加算（または操作）します",
          "合計が99を超えたらその人の負け（脱落）です",
          "手札がなくなったら補充し、最後まで残った人が勝ちです"
        ]
      },
      {
        title: "特殊カードの例",
        items: [
          "A（エース）: 1 または 11 として加算",
          "K（キング）: 合計を99にする／リセット系の効果",
          "Q（クイーン）: 加算しない（パスに近い効果）",
          "10: 合計から10を引く",
          "9: 合計を変えない",
          "ジョーカー: 合計を0にするなど特殊効果",
          "※効果の割り当てはルール設定により多少異なります"
        ]
      }
    ]
  },
  texas_holdem: {
    summary: "人数: 2〜9人 / ポーカー（WSOPスタイル）",
    sections: [
      {
        title: "基本の流れ",
        items: [
          "各プレイヤーに手札（ホールカード）2枚が配られます（他人には見えません）",
          "場札（コミュニティカード）が最大5枚、フロップ3枚 → ターン → リバーの順で公開されます",
          "各段階でベッティングがあり、チェック／ベット／コール／レイズ／フォールドを選びます",
          "最終的に手札2枚＋場札5枚からベストな5枚で役を作り、ショーダウンします"
        ]
      },
      {
        title: "役の強さ（強い順）",
        body: "ロイヤルフラッシュ ＞ ストレートフラッシュ ＞ フォーカード ＞ フルハウス ＞ フラッシュ ＞ ストレート ＞ スリーカード ＞ ツーペア ＞ ワンペア ＞ ハイカード"
      }
    ]
  },
  seven_stud: [
    "最大7枚のカードを受け取り、そのうち5枚で役を作ります（場札なし）",
    "配られるたびにベットラウンドがあります",
    "最後まで残った中で最も強い役の人がポットを取ります"
  ],
  five_draw: [
    "最初に5枚配られ、不要なカードを交换して役を作ります",
    "交換の前後にベットラウンドがあります",
    "ショーダウンで役が一番強い人が勝ちです"
  ],
  oldmaid: [
    "ペア（同じ数字）になったカードを捨てて手札を減らします",
    "隣の人の手札から1枚引き、ペアができたら捨てます",
    "最後にジョーカー（ババ）が残った人の負けです"
  ],
  sevens: [
    "7を中心に、同じマークで繋がりになる数字を並べていきます",
    "出せるカードがないときはパスします",
    "手札を早くなくした人が勝ちです"
  ],
  reversi: {
    summary: "人数: 2人 / デュエル",
    sections: [
      {
        title: "基本の流れ",
        items: [
          "8×8マスの盤の中央に白黒2個ずつの石を置いてスタートします",
          "黒番から交互に打ちます。自分の石で相手の石を挟める位置にのみ置けます",
          "石を置くと、挟んだ相手の石はすべて自分の色にひっくり返ります",
          "置ける場所がない場合はパス。両者ともに置けなくなったら終了です",
          "最終的に盤上の石が多い方が勝ちです"
        ]
      },
      {
        title: "ポイント",
        body: "序盤で石を取りすぎないこと、角（隅）を取ることが有利になりやすい、シンプルながら戦略性の高いゲームです。"
      }
    ]
  },
  gomoku: [
    "交互に石を置き、縦・横・斜めいずれかで5つ並べたら勝ちです",
    "先手は黒、後手は白です",
    "盤面いっぱいでも並ばなければ引き分けです"
  ],
  shogi: [
    "先手・後手が交互に駒を動かし、相手の玉を詰ませたら勝ちです",
    "取った駒は持ち駒として再配置できます",
    "王手に気をつけつつ、攻めと守りを同時に考えます"
  ],
  vanishing_ttt: [
    "通常の○×と同じく3つ並べたら勝ちですが、4個目を置くと一番古い自分の印が消えます",
    "盤面が常に入れ替わるので、詰みの読みがいつもと違います",
    "交互に置き、先に3つ揃えた人の勝ちです"
  ],
  tic_tac_toe: [
    "3×3のマスに交互に〇と×を置きます",
    "縦・横・斜めのいずれかに同じ印が3つ並んだら勝ちです",
    "すべて埋まっても並ばなければ引き分けです"
  ],
  matryoshka_ttt: [
    "小・中・大のコマを持ち、手持ちか盤上の自分のコマを動かして置きます",
    "上にあるコマより大きいサイズだけ重ねられます",
    "盤面のいちばん上の色で見て、三目揃えた人の勝ちです"
  ],
  chinchiro: [
    "サイコロを3つ振り、役の強さを競います",
    "ゾロ目やヒフミなど、役ごとに勝ち負けが決まります",
    "掛け金を守りながら勝ちを積み重ねます"
  ],
  chess: [
    "各駒の決まった動きで盤上を進め、相手のキングを詰ましたら勝ちです",
    "取った駒は使えません（将棋の持ち駒とは違います）",
    "キャスリングやアンパッサンなど特殊ルールもあります"
  ],
  cockroach: [
    "虫カードを裏向きで相手に渡し、「これは〇だ」と宣言します",
    "相手は信じる／疑うを選び、正解・不正解でカードが付きます",
    "同じ虫が規定枚たまるか、ゴキブリが揃うとその人の負けです"
  ],
  catan: [
    "サイコロで資源を集め、道・開拓地・都市を建てて点数を伸ばします",
    "資源の不足は交渉で補います",
    "先に勝利点の目標に達した人が勝ちです"
  ],
  dixit: [
    "手番の人が絵カードにヒントを出し、他の人も似た絵を混ぜて伏せます",
    "ヒントの主の絵を当てすぎず・外しすぎない得点を狙います",
    "点数がいちばん多い人の勝ちです"
  ],
  memory: [
    "裏向きのカードから2枚めくり、同じ絵（数字）なら獲得です",
    "外れたら裏に戻し、次の人の番です",
    "獲得枚数が最も多い人が勝ちです"
  ],
  speed: [
    "場の山のいちばん上と数字が±1のカードを素早く出します",
    "出せるカードがなくなったら山から補充します",
    "手札を先になくした人の勝ちです"
  ],
  pageOne: [
    "1枚ずつ出し、同じ数字または同じマークでつなぎます",
    "出せないときは山から引きます",
    "手札が1枚になったら宣言し、先に出し切った人の勝ちです"
  ]
};

const GameRegistry = {
  all: function () {
    return Object.values(GAME_REGISTRY);
  },

  isCatalogVisible: function (meta) {
    if (!meta) return false;
    if (meta.status === "live") return true;
    if (meta.status === "soon") {
      return CATALOG_SOON_IDS.indexOf(meta.id) !== -1;
    }
    return false;
  },

  catalogGames: function () {
    return this.all().filter(function (g) {
      return GameRegistry.isCatalogVisible(g);
    });
  },

  catalogByCategory: function (categoryId) {
    return this.catalogGames().filter(function (g) {
      return g.category === categoryId;
    });
  },

  featured: function () {
    return this.all().filter(function (g) { return g.featured && g.status === "live"; });
  },

  priority: function () {
    return this.all()
      .filter(function (g) { return g.priority; })
      .sort(function (a, b) { return a.priorityOrder - b.priorityOrder; });
  },

  live: function () {
    return this.all().filter(function (g) { return g.status === "live"; });
  },

  soon: function () {
    return this.all().filter(function (g) { return g.status === "soon"; });
  },

  get: function (id) {
    return GAME_REGISTRY[id] || null;
  },

  getRules: function (id) {
    const meta = this.get(id);
    if (meta && meta.rules) return meta.rules;
    return GAME_RULES[id] || [];
  },

  formatPlayers: function (min, max) {
    const lo = parseInt(min, 10);
    const hi = parseInt(max, 10);
    if (lo === hi) return lo + "人";
    return lo + "〜" + hi + "人";
  },

  byCategory: function (categoryId) {
    return this.all().filter(function (g) { return g.category === categoryId; });
  },

  resolveModule: function (moduleName) {
    if (!moduleName) return null;
    if (typeof window[moduleName] !== "undefined") {
      return window[moduleName];
    }
    try {
      return (0, eval)(moduleName);
    } catch (e) {
      return null;
    }
  },

  getModule: function (id) {
    const meta = this.get(id);
    if (!meta || !meta.module || meta.status !== "live") return null;
    return this.resolveModule(meta.module);
  },

  getLiveModules: function () {
    const map = {};
    const self = this;
    this.live().forEach(function (meta) {
      const mod = self.resolveModule(meta.module);
      if (mod) map[meta.id] = mod;
    });
    return map;
  },

  countByStatus: function () {
    const catalog = this.catalogGames();
    return {
      live: catalog.filter(function (g) { return g.status === "live"; }).length,
      soon: catalog.filter(function (g) { return g.status === "soon"; }).length,
      total: catalog.length,
      priority: this.priority().length
    };
  }
};
