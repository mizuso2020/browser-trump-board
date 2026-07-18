/**

 * トップページ：ゲーム一覧

 */



(function () {

  const gameId = getQueryParam("game");

  if (gameId) {

    const mode = getQueryParam("mode");

    let url = "play.html?v=20260712&game=" + encodeURIComponent(gameId);

    if (mode) {

      url += "&mode=" + encodeURIComponent(mode);

    }

    window.location.replace(url);

    return;

  }



  const catalogEl = document.getElementById("homeCatalog");

  if (catalogEl) {

    catalogEl.innerHTML = GamesCatalog.renderHomeCatalog();

  }

})();

