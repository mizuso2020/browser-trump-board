/**
 * イト（Ito）— クモノイト（完全協力モード）1台交代プレイ
 * 数字を直接言わず、お題に沿った言葉で「今いちばん小さい」と思った人からカードを出す
 */
const ItoGame = {
  id: "ito",
  name: "イト（Ito）",
  minPlayers: 2,
  maxPlayers: 8,
  INITIAL_LIFE: 3,
  MAX_STAGES: 5,

  THEME_CATEGORIES: [
    {
      id: "normal",
      label: "通常",
      icon: "🎯",
      themes: [
        "動物の大きさ", "辛さ", "速さ", "値段", "怖いもの", "好きな度合い",
        "距離", "音の大きさ", "有名さ", "危険度", "美味しさ", "疲れ度",
        "寒さ", "面白さ", "重さ", "楽しさ", "人気の食べ物",
        "無人島に持っていきたいもの", "生き物の強さ"
      ]
    },
    {
      id: "romance",
      label: "恋愛",
      icon: "😏",
      themes: [
        "異性にされたら嬉しいこと", "キュンとする仕草", "モテると思う行動",
        "恋人に言われたい言葉", "デートで行きたい場所", "恋愛で大事なもの",
        "色気を感じる瞬間", "大人っぽい行動", "付き合いたいタイプ",
        "好きな人にされたら嬉しいこと"
      ]
    },
    {
      id: "adult",
      label: "大人向け",
      icon: "🔞",
      note: "下ネタ寄り・大学生向け",
      themes: [
        "エロいと思う仕草", "セクシーだと思う服装", "異性の魅力的な部分",
        "ちょっとドキドキする場所", "恋人としたいこと", "言われたら照れる言葉",
        "想像すると恥ずかしいこと", "大人の魅力を感じるもの",
        "夜にしたくなること", "人には言いにくい願望"
      ]
    },
    {
      id: "drinking",
      label: "飲み会",
      icon: "🍺",
      themes: [
        "酔った時にやりそうなこと", "黒歴史になりそうな恋愛",
        "告白で言われたいセリフ", "浮気だと思うライン",
        "恋人に求める条件", "一夜の恋で大事なもの"
      ]
    },
    {
      id: "school",
      label: "学校",
      icon: "🏫",
      themes: [
        "学校で恥ずかしかったこと", "学校で起きた最悪の出来事",
        "授業中にやらかしたこと", "先生に怒られた理由", "クラスで目立つ行動",
        "学校でモテそうな行動", "青春っぽい瞬間", "体育で恥ずかしいこと",
        "給食で嬉しかったもの", "卒業までにしたいこと"
      ]
    },
    {
      id: "blackhistory",
      label: "黒歴史",
      icon: "🕶",
      themes: [
        "一生忘れたい黒歴史", "恥ずかしい過去", "思い出すと顔が赤くなること",
        "中二病っぽい行動", "SNSで消したい投稿", "人に見られたくない写真",
        "友達に知られたくないこと", "黒歴史になりそうな発言"
      ]
    },
    {
      id: "college",
      label: "大学生",
      icon: "🤣",
      themes: [
        "新歓でやらかしそうなこと", "飲み会での失敗", "バイトでの失敗",
        "初対面で引かれる行動", "LINEで恥ずかしいこと", "隠している趣味",
        "陰キャっぽい行動", "陽キャっぽい行動"
      ]
    },
    {
      id: "omakase",
      label: "おまかせ",
      icon: "🎲",
      themes: null
    }
  ],

  canManage: function (ctx) {
    return ctx.isHost || (ctx.room && ctx.room.mode === "local");
  },

  getCategory: function (categoryId) {
    return this.THEME_CATEGORIES.find(function (c) { return c.id === categoryId; })
      || this.THEME_CATEGORIES.find(function (c) { return c.id === "omakase"; });
  },

  getThemesForCategory: function (categoryId) {
    const cat = this.getCategory(categoryId);
    if (cat.id === "omakase" || !cat.themes) {
      const merged = [];
      this.THEME_CATEGORIES.forEach(function (c) {
        if (c.themes) merged.push.apply(merged, c.themes);
      });
      return merged;
    }
    return cat.themes.slice();
  },

  pickRandomTheme: function (categoryId) {
    const themes = this.getThemesForCategory(categoryId || "omakase");
    if (!themes.length) return "好きな度合い";
    return themes[Math.floor(Math.random() * themes.length)];
  },

  ensureState: function (gs) {
    if (!gs) return;
    if (!gs.hands) gs.hands = {};
    if (!gs.field) gs.field = [];
    if (!gs.discarded) gs.discarded = [];
    if (!gs.themeCategoryId) gs.themeCategoryId = "omakase";
    if (typeof gs.revealIndex !== "number") gs.revealIndex = 0;
    if (typeof gs.stage !== "number") gs.stage = 1;
    if (typeof gs.maxStages !== "number") gs.maxStages = this.MAX_STAGES;
  },

  playerName: function (room, playerId) {
    const p = room.players.find(function (x) { return x.id === playerId; });
    return p ? p.name : "?";
  },

  handCount: function (gs, playerId) {
    const hand = gs.hands[playerId];
    return hand ? hand.length : 0;
  },

  allHandsEmpty: function (gs, room) {
    const self = this;
    return room.players.every(function (p) {
      return self.handCount(gs, p.id) === 0;
    });
  },

  totalRemainingCards: function (gs, room) {
    const self = this;
    return room.players.reduce(function (sum, p) {
      return sum + self.handCount(gs, p.id);
    }, 0);
  },

  dealStage: function (room) {
    const gs = room.gameState;
    const cardsNeeded = gs.stage * room.players.length;
    const deck = shuffle(Array.from({ length: 100 }, function (_, i) { return i + 1; }));
    const hands = {};
    let idx = 0;
    room.players.forEach(function (p) {
      const cards = deck.slice(idx, idx + gs.stage).sort(function (a, b) { return a - b; });
      idx += gs.stage;
      hands[p.id] = cards;
    });
    gs.hands = hands;
    gs.numbers = hands;
    gs.field = [];
    gs.discarded = [];
    gs.revealIndex = 0;
    gs.lastPlayResult = null;
    return room;
  },

  init: function (room) {
    room.gameState = {
      stage: 1,
      maxStages: this.MAX_STAGES,
      life: this.INITIAL_LIFE,
      maxLife: this.INITIAL_LIFE,
      theme: "",
      themeCategoryId: "omakase",
      hands: {},
      numbers: {},
      field: [],
      discarded: [],
      revealIndex: 0,
      lastPlayResult: null
    };
    this.dealStage(room);
    room.phase = "ito_reveal";
    return room;
  },

  setThemeCategory: function (room, categoryId) {
    room.gameState.themeCategoryId = categoryId;
    return room;
  },

  applyRandomTheme: function (room) {
    const gs = room.gameState;
    gs.theme = this.pickRandomTheme("omakase");
    room.phase = "ito_play";
    return room;
  },

  setTheme: function (room, theme) {
    const text = (theme || "").trim();
    if (!text) return room;
    room.gameState.theme = text;
    room.phase = "ito_play";
    return room;
  },

  advanceReveal: function (room) {
    const gs = room.gameState;
    gs.revealIndex += 1;
    if (gs.revealIndex >= room.players.length) {
      room.phase = "ito_theme";
    }
    return room;
  },

  getMinCard: function (gs, playerId) {
    const hand = gs.hands[playerId];
    if (!hand || !hand.length) return null;
    return hand[0];
  },

  playCard: function (room, playerId) {
    const gs = room.gameState;
    this.ensureState(gs);
    const hand = gs.hands[playerId];
    if (!hand || !hand.length) {
      return { ok: false, error: "カードがありません" };
    }

    const played = hand[0];
    const playerName = this.playerName(room, playerId);
    gs.hands[playerId] = hand.slice(1);

    const revealed = [];
    room.players.forEach(function (p) {
      if (p.id === playerId) return;
      const cards = (gs.hands[p.id] || []).slice();
      const keep = [];
      cards.forEach(function (num) {
        if (num < played) {
          revealed.push({
            playerId: p.id,
            name: p.name,
            number: num
          });
        } else {
          keep.push(num);
        }
      });
      gs.hands[p.id] = keep.sort(function (a, b) { return a - b; });
    });

    const success = revealed.length === 0;
    gs.field.push({ playerId: playerId, name: playerName, number: played });

    if (!success) {
      gs.life = Math.max(0, gs.life - 1);
      revealed.forEach(function (item) {
        gs.discarded.push(item);
      });
    }

    gs.lastPlayResult = {
      success: success,
      playerId: playerId,
      name: playerName,
      number: played,
      revealed: revealed,
      lifeLost: success ? 0 : 1
    };

    if (gs.life <= 0) {
      room.phase = "ito_gameover";
      return { ok: true, room: room };
    }

    if (this.allHandsEmpty(gs, room)) {
      if (gs.stage >= gs.maxStages) {
        room.phase = "ito_victory";
      } else {
        room.phase = "ito_stage_clear";
      }
      return { ok: true, room: room };
    }

    room.phase = "ito_play_feedback";
    return { ok: true, room: room };
  },

  continueAfterPlay: function (room) {
    if (room.gameState.life <= 0) {
      room.phase = "ito_gameover";
      return room;
    }
    room.phase = "ito_play";
    return room;
  },

  startNextStage: function (room) {
    const gs = room.gameState;
    if (gs.stage >= gs.maxStages) {
      room.phase = "ito_victory";
      return room;
    }
    gs.stage += 1;
    gs.theme = "";
    this.dealStage(room);
    room.phase = "ito_reveal";
    return room;
  },

  restart: function (room) {
    return this.init(room);
  },

  renderLife: function (life, maxLife) {
    let html = '<span class="ito-life" aria-label="残りライフ ' + life + '">';
    for (let i = 0; i < maxLife; i++) {
      html += '<span class="ito-life-icon' + (i < life ? " is-full" : " is-empty") + '">♥</span>';
    }
    html += '</span>';
    return html;
  },

  renderHud: function (gs) {
    let html = '<div class="ito-hud">';
    html += '<span class="ito-hud-item">ステージ <strong>' + gs.stage + '</strong></span>';
    html += '<span class="ito-hud-item">手札 <strong>' + gs.stage + '枚</strong></span>';
    html += '<span class="ito-hud-item">ライフ ' + this.renderLife(gs.life, gs.maxLife) + '</span>';
    html += '</div>';
    return html;
  },

  renderHandCards: function (cards) {
    if (!cards || !cards.length) return '<span class="ito-no-cards">なし</span>';
    return cards.map(function (n) {
      return '<span class="ito-card-chip">' + n + '</span>';
    }).join("");
  },

  render: function (ctx) {
    const room = ctx.room;
    const gs = room.gameState;
    this.ensureState(gs);
    const html = [];
    const manage = this.canManage(ctx);

    if (room.phase === "ito_reveal") {
      const current = room.players[gs.revealIndex];
      html.push(this.renderHud(gs));
      html.push('<div class="phase-banner"><h2>手札確認 ' + (gs.revealIndex + 1) + ' / ' + room.players.length + '</h2>');
      html.push('<p>ステージ ' + gs.stage + ' — 各プレイヤーに <strong>' + gs.stage + '枚</strong> 配布済み</p></div>');
      html.push('<section class="card ito-reveal-card">');
      if (current) {
        html.push('<h2>' + escapeHtml(current.name) + ' さんの番</h2>');
        html.push('<p class="note">周りに見えないようにしてから数字を確認してください。</p>');
        html.push('<button type="button" class="btn btn-secondary" data-action="ito-reveal-number">数字を見る</button>');
        html.push('<div id="revealArea" class="hidden secret-panel ito-secret-panel">');
        html.push('<p class="ito-secret-label">あなたの数字（小→大）</p>');
        html.push('<div class="ito-hand-preview">' + this.renderHandCards(gs.hands[current.id]) + '</div>');
        html.push('<p class="note">お題に沿った言葉だけで表現。数字は言わない！</p>');
        html.push('<button type="button" class="btn btn-primary" data-action="ito-hide-number">隠す</button></div>');
        html.push('<button type="button" class="btn btn-primary ito-next-reveal-btn" data-action="ito-next-reveal">次の人へ渡す</button>');
      }
      html.push('</section>');
      return html.join("");
    }

    if (room.phase === "ito_theme") {
      html.push(this.renderHud(gs));
      html.push('<div class="phase-banner"><h2>お題を決める</h2>');
      html.push('<p>1＝弱い / 100＝強い。お題に沿った言葉だけで数字の大小を伝え合います。</p></div>');
      html.push('<section class="card"><h2>クモノイトの流れ</h2><ul class="clue-list ito-rules">');
      html.push('<li>話し合いながら「今いちばん小さい」と思った人がカードを出す</li>');
      html.push('<li>出した数字が残り全員の手札より小さければ <strong>成功</strong></li>');
      html.push('<li>失敗すると <strong>ライフ -1</strong> ＋ より小さいカードが公開・除外</li>');
      html.push('<li>全員の手札を出し切ったらステージクリア（全' + gs.maxStages + 'ステージで勝利）</li>');
      html.push('</ul></section>');
      if (manage) {
        html.push('<section class="card ito-theme-card"><h2>お題を選ぶ</h2>');
        html.push('<button type="button" class="btn btn-primary ito-random-theme-btn" data-action="ito-random-theme">🎲 ランダムでお題を決める</button>');
        html.push('<p class="ito-theme-or">または</p>');
        html.push('<label class="ito-custom-label">自由入力</label>');
        html.push('<input type="text" id="customTheme" placeholder="例：怖いもの、キュンとする仕草" maxlength="30">');
        html.push('<button type="button" class="btn btn-secondary" data-action="ito-custom-theme">このお題で始める</button>');
        html.push('</section>');
      }
      return html.join("");
    }

    if (room.phase === "ito_play" || room.phase === "ito_play_feedback") {
      html.push(this.renderHud(gs));
      html.push('<div class="phase-banner"><h2>プレイ中</h2>');
      html.push('<p class="ito-theme-display">お題：「<strong>' + escapeHtml(gs.theme) + '</strong>」</p></div>');

      html.push('<section class="card"><h2>場（出されたカード）</h2>');
      if (!gs.field.length) {
        html.push('<p class="note">まだカードは出ていません</p>');
      } else {
        html.push('<div class="ito-field-line">');
        gs.field.forEach(function (card, i) {
          html += '<span class="ito-field-card"><strong>' + escapeHtml(card.name) + '</strong> <span class="ito-reveal-num">' + card.number + '</span>';
          if (i < gs.field.length - 1) html += '<span class="ito-field-arrow">→</span>';
          html += '</span>';
        });
        html += '</div>';
      }
      html.push('</section>');

      if (gs.discarded.length) {
        html.push('<section class="card"><h2>公開・除外されたカード</h2><ul class="clue-list">');
        gs.discarded.forEach(function (d) {
          html.push('<li><strong>' + escapeHtml(d.name) + '</strong>：' + d.number + '</li>');
        });
        html.push('</ul></section>');
      }

      html.push('<section class="card"><h2>残り手札</h2><ul class="clue-list ito-hand-status">');
      room.players.forEach(function (p) {
        const n = this.handCount(gs, p.id);
        html.push('<li><strong>' + escapeHtml(p.name) + '</strong>：残り ' + n + ' 枚</li>');
      }, this);
      html.push('</ul></section>');

      if (room.phase === "ito_play_feedback" && gs.lastPlayResult) {
        const r = gs.lastPlayResult;
        html.push('<section class="card ito-round-result ' + (r.success ? "is-success" : "is-fail") + '">');
        if (r.success) {
          html.push('<h2 class="ito-result-title">✅ 成功！</h2>');
          html.push('<p><strong>' + escapeHtml(r.name) + '</strong> が <strong>' + r.number + '</strong> を出しました。残りより小さかった！</p>');
        } else {
          html.push('<h2 class="ito-result-title">😱 失敗！</h2>');
          html.push('<p><strong>' + escapeHtml(r.name) + '</strong> が <strong>' + r.number + '</strong> を出しましたが、もっと小さいカードがありました。</p>');
          html.push('<p class="ito-life-penalty">ライフ <strong>-1</strong>　残り ' + this.renderLife(gs.life, gs.maxLife) + '</p>');
          if (r.revealed.length) {
            html.push('<p>公開されたカード：</p><ul class="clue-list">');
            r.revealed.forEach(function (item) {
              html.push('<li><strong>' + escapeHtml(item.name) + '</strong>：' + item.number + '</li>');
            });
            html.push('</ul>');
          }
        }
        if (manage) {
          html.push('<button type="button" class="btn btn-primary" data-action="ito-continue-play">続ける</button>');
        }
        html.push('</section>');
        return html.join("");
      }

      html.push('<section class="card"><h2>カードを出す</h2>');
      html.push('<p class="note ito-play-hint">話し合って「今いちばん小さい」と思った人のボタンを押してください（最小のカードが出ます）</p>');
      html.push('<div class="ito-play-grid">');
      room.players.forEach(function (p) {
        const n = this.handCount(gs, p.id);
        const disabled = n === 0 ? " disabled" : "";
        html.push('<button type="button" class="btn btn-secondary ito-play-btn' + disabled + '" data-action="ito-play-card" data-player="' + p.id + '"' + disabled + '>');
        html.push(escapeHtml(p.name) + ' が出す');
        if (n > 0) html.push('<span class="ito-play-sub">残り ' + n + ' 枚</span>');
        html.push('</button>');
      }, this);
      html.push('</div>');

      html.push('<details class="ito-peek-details"><summary>手札を再確認する</summary><div class="ito-peek-grid">');
      room.players.forEach(function (p) {
        if (!this.handCount(gs, p.id)) return;
        html.push('<button type="button" class="btn btn-ghost ito-peek-btn" data-action="ito-peek-player" data-player="' + p.id + '">' + escapeHtml(p.name) + ' の数字</button>');
      }, this);
      html.push('</div>');
      html.push('<div id="peekArea" class="hidden secret-panel ito-secret-panel"></div>');
      html.push('</details></section>');

      return html.join("");
    }

    if (room.phase === "ito_stage_clear") {
      html.push(this.renderHud(gs));
      html.push('<section class="card ito-round-result is-success">');
      html.push('<h2 class="ito-result-title">🎉 ステージ ' + gs.stage + ' クリア！</h2>');
      html.push('<p>全員の手札を出し切りました。お題「' + escapeHtml(gs.theme) + '」</p>');
      if (gs.stage >= gs.maxStages) {
        html.push('<p>全ステージ達成です！</p>');
      } else {
        html.push('<p>次はステージ ' + (gs.stage + 1) + '（手札 ' + (gs.stage + 1) + ' 枚）です。</p>');
      }
      if (manage && gs.stage < gs.maxStages) {
        html.push('<button type="button" class="btn btn-primary" data-action="ito-next-stage">次のステージへ</button>');
      }
      html.push('</section>');
      return html.join("");
    }

    if (room.phase === "ito_victory") {
      html.push('<div class="phase-banner ito-victory-banner"><h2>🎉 全ステージクリア！</h2>');
      html.push('<p>全員の価値観が見事に一致しました</p></div>');
      html.push('<section class="card">');
      html.push('<p>最終ライフ ' + this.renderLife(gs.life, gs.maxLife) + '</p>');
      html.push('<p>ステージ ' + gs.maxStages + ' までクリア</p></section>');
      if (manage) {
        html.push('<button type="button" class="btn btn-primary" data-action="ito-restart">もう一度遊ぶ</button>');
        html.push('<button type="button" class="btn btn-secondary" data-action="back-lobby" style="margin-top:0.5rem">ロビーに戻る</button>');
      }
      return html.join("");
    }

    if (room.phase === "ito_gameover") {
      html.push('<div class="phase-banner ito-gameover-banner"><h2>ゲームオーバー</h2>');
      html.push('<p>ライフが0になりました…</p></div>');
      html.push('<section class="card">');
      html.push('<p>ステージ <strong>' + gs.stage + '</strong> で終了</p>');
      html.push('<p>お題：「' + escapeHtml(gs.theme || "—") + '」</p></section>');
      if (manage) {
        html.push('<button type="button" class="btn btn-primary" data-action="ito-restart">もう一度遊ぶ</button>');
        html.push('<button type="button" class="btn btn-secondary" data-action="back-lobby" style="margin-top:0.5rem">ロビーに戻る</button>');
      }
      return html.join("");
    }

    return "";
  }
};
