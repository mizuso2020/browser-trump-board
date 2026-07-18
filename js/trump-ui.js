/**

 * TrumpUi — room.html 用（ensure-utils のスタブを上書き）

 * ターン順表示・ルール・パス

 */

(function () {

  function markSkipSet(options, gs) {

    var skip = {};

    function mark(id) {

      if (id) skip[id] = true;

    }

    (options.skipIds || []).forEach(mark);

    if (gs && gs.finished) gs.finished.forEach(mark);

    (options.eliminated || (gs && gs.eliminated) || []).forEach(mark);

    (options.folded || (gs && gs.folded) || []).forEach(mark);

    (options.out || []).forEach(mark);

    (options.extraSkip || []).forEach(mark);

    return skip;

  }



  window.TrumpUi = {

    buildPlayOrder: function (room, gs, options) {

      options = options || {};

      var players = room.players || [];

      if (!players.length) return [];



      var skip = markSkipSet(options, gs);

      var turnId = options.turnPlayerId != null ? options.turnPlayerId : (gs && gs.turnPlayerId);



      if (options.orderIds && options.orderIds.length) {

        var ordered = [];

        options.orderIds.forEach(function (id) {

          var p = players.find(function (x) { return x.id === id; });

          if (p) ordered.push(p);

        });

        if (turnId) {

          var ti = ordered.findIndex(function (p) { return p.id === turnId; });

          if (ti > 0) {

            return ordered.slice(ti).concat(ordered.slice(0, ti));

          }

        }

        return ordered;

      }



      if (!turnId) return players.slice();



      var reverse = !!(options.reverse != null ? options.reverse : (gs && gs.reverseOrder));

      var startIdx = players.findIndex(function (p) { return p.id === turnId; });

      var start = startIdx >= 0 ? startIdx : 0;

      var active = [];

      var tail = [];

      var n = players.length;

      var i;

      var idx;

      var p;



      for (i = 0; i < n; i++) {

        idx = reverse ? (start - i + n * 100) % n : (start + i) % n;

        p = players[idx];

        if (!skip[p.id]) active.push(p);

      }



      players.forEach(function (pl) {

        if (skip[pl.id]) tail.push(pl);

      });



      return active.concat(tail);

    },



    getPlayerStatus: function (p, gs, options) {

      options = options || {};

      var finished = (gs && gs.finished) || [];

      var eliminated = options.eliminated || (gs && gs.eliminated) || [];

      var folded = options.folded || (gs && gs.folded) || [];

      var finIdx = finished.indexOf(p.id);

      if (finIdx >= 0) return { out: true, label: (finIdx + 1) + "\u4f4d\u3067\u4e0a\u304c\u308a" };

      if (eliminated.indexOf(p.id) >= 0) return { out: true, label: "\u8131\u843d" };

      if (folded.indexOf(p.id) >= 0) return { out: true, label: "\u30d5\u30a9\u30fc\u30eb\u30c9" };

      if ((options.out || []).indexOf(p.id) >= 0) return { out: true, label: "\u8131\u843d" };

      return { out: false, label: "" };

    },



    renderTurnOrderStrip: function (room, gs, options) {

      options = options || {};

      var turnId = options.turnPlayerId != null ? options.turnPlayerId : (gs && gs.turnPlayerId);

      var players = room.players || [];

      var order = [];

      if (options.orderIds && options.orderIds.length) {

        options.orderIds.forEach(function (id) {

          var p = players.find(function (x) { return x.id === id; });

          if (p) order.push(p);

        });

      } else {

        order = players.slice();

      }

      if (!order.length) return "";



      var reverse = !!(options.reverse != null ? options.reverse : (gs && gs.reverseOrder));

      var arrow = reverse ? "\u2190" : "\u2192";

      var html = '<div class="turn-order-strip' + (reverse ? " is-reverse" : "") + '">';

      html += '<span class="turn-order-strip-label">\u9806\u756a</span>';

      html += '<div class="turn-order-strip-track">';



      order.forEach(function (p, i) {

        if (i > 0) {

          html += '<span class="turn-order-strip-arrow" aria-hidden="true">' + arrow + "</span>";

        }

        var st = TrumpUi.getPlayerStatus(p, gs, options);

        var isCurrent = p.id === turnId && !st.out;

        var cls = "turn-order-strip-chip";

        if (isCurrent) cls += " is-current";

        if (st.out) cls += " is-out";

        html += '<span class="' + cls + '">';

        html += escapeHtml(p.name);

        if (isCurrent) html += '<span class="turn-order-now-tag">\u4eca</span>';

        if (st.label) html += '<small class="turn-order-strip-status">\uff08' + st.label + "\uff09</small>";

        html += "</span>";

      });



      html += "</div></div>";

      return html;

    },



    renderTurnOrder: function (room, gs, options) {

      options = options || {};

      if (options.stripOnly) return this.renderTurnOrderStrip(room, gs, options);

      return this.renderTurnOrderStrip(room, gs, options);

    },



    renderTurnOrderBlock: function (room, gs, options) {

      return this.renderTurnOrderStrip(room, gs, options);

    },



    renderFooter: function (options) {

      var html = ['<section class="card trump-footer-bar"><div class="btn-row trump-footer-row">'];



      if (options.passAction) {

        var dis = options.canPass ? "" : " disabled";

        html.push(

          '<button type="button" class="btn btn-secondary trump-pass-btn" data-action="' +

          options.passAction + '"' + dis + ">\u30d1\u30b9</button>"

        );

      }

      if (options.rulesAction) {

        html.push(

          '<button type="button" class="btn btn-secondary" data-action="' +

          options.rulesAction + '">\u30eb\u30fc\u30eb</button>'

        );

      }

      if (options.localRulesAction) {

        html.push(

          '<button type="button" class="btn btn-secondary" data-action="' +

          options.localRulesAction + '">\u30ed\u30fc\u30ab\u30eb\u30eb\u30fc\u30eb</button>'

        );

      }



      html.push("</div></section>");

      return html.join("");

    },



    renderRulesPanel: function (panelId, title, bodyHtml) {

      return (

        '<section id="' + panelId + '" class="card trump-rules-panel hidden">' +

        "<h2>" + escapeHtml(title) + "</h2>" + bodyHtml +

        "</section>"

      );

    },



    togglePanel: function (panelId) {

      var el = document.getElementById(panelId);

      if (!el) return;

      el.classList.toggle("hidden");

    },



    hidePanel: function (panelId) {

      var el = document.getElementById(panelId);

      if (el) el.classList.add("hidden");

    }

  };

})();


