/**

 * トランプ画像表示（images/cards/）

 * 54枚: 1〜13 × 4スート + 赤/黒ジョーカー

 */

const PlayingCards = {

  IMAGE_BASE: "images/cards/",

  VERSION: "20260715c",



  SUITS: ["spade", "heart", "diamond", "club"],

  SUIT_LABEL: { spade: "♠", heart: "♥", diamond: "♦", club: "♣" },

  RANK_LABEL: { 11: "J", 12: "Q", 13: "K" },



  /** 54枚デッキ（1〜13 × 4 + ジョーカー2枚） */

  createDeck54: function (options) {

    options = options || {};

    const deck = [];

    const includeJokers = options.jokers !== false;

    this.SUITS.forEach(function (suit) {

      for (let rank = 1; rank <= 13; rank++) {

        deck.push({ id: suit + rank, suit: suit, rank: rank, isJoker: false });

      }

    });

    if (includeJokers) {

      deck.push({ id: "joker-red", suit: null, rank: 0, isJoker: true, jokerColor: "red" });

      deck.push({ id: "joker-black", suit: null, rank: 0, isJoker: true, jokerColor: "black" });

    }

    return deck;

  },



  /** 手札を 1→13 順（ジョーカーは末尾） */

  compareByRank: function (a, b) {

    if (a.isJoker && b.isJoker) {

      const order = { red: 0, black: 1 };

      return (order[a.jokerColor] || 0) - (order[b.jokerColor] || 0);

    }

    if (a.isJoker) return 1;

    if (b.isJoker) return -1;

    if (a.rank !== b.rank) return a.rank - b.rank;

    return PlayingCards.SUITS.indexOf(a.suit) - PlayingCards.SUITS.indexOf(b.suit);

  },



  sortHandByRank: function (hand) {

    hand.sort(PlayingCards.compareByRank);

    return hand;

  },



  /** 全員に均等配布 */

  dealEvenly: function (players, deck) {

    const hands = {};

    const n = players.length;

    const base = Math.floor(deck.length / n);

    const extra = deck.length % n;

    let idx = 0;

    players.forEach(function (p, i) {

      const count = base + (i < extra ? 1 : 0);

      hands[p.id] = deck.slice(idx, idx + count);

      idx += count;

    });

    return hands;

  },



  /** ゲーム内 rank → 画像ファイル名（01=1, 02-10, jack/queen/king） */

  resolveImageFile: function (suit, rank) {

    if (!suit || rank == null) return null;

    if (rank >= 1 && rank <= 10) {

      if (rank === 1) return suit + "_01.png";

      return suit + "_" + String(rank).padStart(2, "0") + ".png";

    }

    if (rank === 11) return suit + "_jack.png";

    if (rank === 12) return suit + "_queen.png";

    if (rank === 13) return suit + "_king.png";

    return null;

  },



  imageUrl: function (card, options) {

    options = options || {};

    if (!card) return null;



    if (options.faceDown) return null;



    if (card.isJoker) {

      const color = (card.jokerColor === "red" || options.joker === "red") ? "red" : "black";

      const joker = color === "red" ? "joker_red.png" : "joker_black.png";

      return this.IMAGE_BASE + joker + "?v=" + this.VERSION;

    }



    if (!card.suit) return null;



    const file = this.resolveImageFile(card.suit, card.rank);

    if (!file) return null;

    return this.IMAGE_BASE + file + "?v=" + this.VERSION;

  },



  label: function (card) {

    if (!card) return "";

    if (card.isJoker) return "JOKER";

    const r = this.RANK_LABEL[card.rank] || card.rank;

    return (this.SUIT_LABEL[card.suit] || "") + r;

  },



  cardHtml: function (card, options) {

    options = options || {};

    const classes = ["playing-card"];

    const attrs = [];



    if (options.small) classes.push("poker-card-sm");

    if (options.selected) classes.push("is-selected");

    if (options.disabled) classes.push("is-disabled");



    if (options.faceDown) {

      classes.push("card-back");

      const tag = options.asButton === false ? "div" : "button";

      const typeAttr = tag === "button" ? ' type="button"' : "";

      const dis = options.disabled ? " disabled" : "";

      this._appendDataAttrs(attrs, options);

      return (

        "<" + tag + typeAttr + ' class="' + classes.join(" ") + '"' + dis +

        (attrs.length ? " " + attrs.join(" ") : "") + ">🂠</" + tag + ">"

      );

    }



    if (!card) {

      classes.push("card-back");

      return '<div class="' + classes.join(" ") + '">🂠</div>';

    }



    const imgUrl = this.imageUrl(card, options);

    if (imgUrl) {

      classes.push("playing-card--image");

      if (card.isJoker) classes.push("card-joker");

      else classes.push("card-suit-" + card.suit);

    } else if (card.isJoker) {

      classes.push("card-joker");

    } else if (card.suit) {

      classes.push("card-suit-" + card.suit);

    }



    const tag = options.asButton === false ? "div" : "button";

    const typeAttr = tag === "button" ? ' type="button"' : "";

    const dis = options.disabled ? " disabled" : "";

    this._appendDataAttrs(attrs, options);



    let inner;

    if (imgUrl) {

      inner = '<img src="' + imgUrl + '" alt="' + this._escape(this.label(card)) + '" draggable="false" loading="lazy">';

    } else {

      const r = card.isJoker ? "JOKER" : (this.RANK_LABEL[card.rank] || card.rank);

      const suit = card.isJoker ? "🃏" : (this.SUIT_LABEL[card.suit] || "");

      inner = '<span class="card-rank">' + this._escape(String(r)) + '</span>' +

        (suit ? '<span class="card-suit">' + suit + "</span>" : "");

    }



    return (

      "<" + tag + typeAttr + ' class="' + classes.join(" ") + '"' + dis +

      (attrs.length ? " " + attrs.join(" ") : "") + ">" + inner + "</" + tag + ">"

    );

  },



  _appendDataAttrs: function (attrs, options) {

    if (options.action) attrs.push('data-action="' + this._escape(options.action) + '"');

    const data = options.data || {};

    Object.keys(data).forEach(function (key) {

      if (data[key] === undefined || data[key] === null) return;

      attrs.push("data-" + key + '="' + PlayingCards._escape(String(data[key])) + '"');

    });

  },



  _escape: function (str) {

    return String(str)

      .replace(/&/g, "&amp;")

      .replace(/"/g, "&quot;")

      .replace(/</g, "&lt;");

  }

};


