(function () {
  if (location.protocol !== "file:") return;

  document.documentElement.classList.add("file-protocol-blocked");

  var style = document.createElement("style");
  style.textContent =
    "body.file-protocol-blocked > :not(#fileProtocolWarning){display:none!important}" +
    "#fileProtocolWarning{max-width:520px;margin:2rem auto;padding:1.5rem;font-family:sans-serif;line-height:1.7;background:#1e293b;color:#e2e8f0;border-radius:12px;border:2px solid #f59e0b}";
  document.head.appendChild(style);

  var warn = document.createElement("div");
  warn.id = "fileProtocolWarning";
  warn.innerHTML =
    "<h1 style=\"margin:0 0 1rem;font-size:1.25rem;color:#fbbf24;\">このページは直接開けません</h1>" +
    "<p>ZIPの中から開いたり、<code style=\"color:#fcd34d;\">file://</code> で開くと <strong>ボタンが効かない</strong> 状態になります。</p>" +
    "<ol style=\"padding-left:1.25rem;\">" +
    "<li>ZIPを<strong>「すべて展開」</strong>してフォルダにする</li>" +
    "<li>展開したフォルダで <strong>アプリを開く.bat</strong> をダブルクリック</li>" +
    "<li>ブラウザで <code style=\"color:#fcd34d;\">http://localhost:29500/</code> が開きます</li>" +
    "</ol>" +
    "<p style=\"margin-bottom:0;color:#94a3b8;font-size:0.9rem;\">※ html ファイルは直接押さないでください</p>";

  document.body.classList.add("file-protocol-blocked");
  document.body.insertBefore(warn, document.body.firstChild);
})();
