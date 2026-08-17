# scripts/

開発・運用に使う補助ファイル置き場。サイトの配信物ではない。

## ファイル

| ファイル | 用途 |
|----------|------|
| `local-server.ps1` | ローカルサーバー起動。`アプリを開く.bat` から呼ばれる |
| `publish-github.ps1` | GitHub へ公開するときの補助 |
| `topics.txt` | お絵描き人狼のお題マスター（268件） |

## お題データの流れ

`topics.txt` がお題の元データで、ここから読みがなを作って
`js/games/drawing-werewolf.js` に直接埋め込んでいる。

```
scripts/topics.txt  （268件のお題）
        ↓ 読みがなを付ける
js/games/drawing-werewolf.js
  ├─ TOPIC_YOMI          … お題 → 全文の読みがな（回答判定に使用）
  └─ TOPIC_LAST_HIRAGANA … お題 → 末尾の1文字（しりとり判定に使用）
```

お題を足すときは **`topics.txt` と `drawing-werewolf.js` の2つの辞書、
合わせて3か所を同じ件数に保つこと**。件数がずれると、
読みがなの無いお題が正しく判定されなくなる。

現在はどれも268件。確認するときは:

```
grep -c . scripts/topics.txt
```

## 補足

読みがなを作る途中で使った中間ファイル（`*.jsfrag`、`topics-need-*.txt` など）は
`drawing-werewolf.js` へ取り込み済みのため `tmp/topic-gen/` へ退避した。
`tmp/` は `.gitignore` 対象。
