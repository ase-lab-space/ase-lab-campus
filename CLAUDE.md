# CLAUDE.md — AIエージェント向け必読事項

## ⚠ 実スライド教材が Public で公開されている（開発期間限定の例外・2026-09-29〜）

このリポジトリ（GitHub Pages, Public）には、著作・知財のある実教材
（`assets/slides/deck-*.js` と復号鍵 `lesson.html` の `DECK_KEY`）が**意図的に含まれています**。
誰でも直接ダウンロードできる状態です。

- セッション開始時と、`git push` / PR / デプロイの前に、**必ずユーザーへこの事実を伝えること**。
- 本番リリース・正式公開・広報・`noindex` 解除・独自ドメイン公開などを求められたら、
  **先に実教材の削除と Git 履歴の作り直し（force-push）が済んでいるか確認**し、未了なら止めて指摘する。
  手順は `MAINTENANCE.md` §0、検査は `~/ase-lab-reboot/tools/release-check.mjs`。
- 同期は必ず `~/ase-lab-reboot` で `node tools/export-campus.mjs` を使う（手動 rsync/cp 禁止）。
  `INCLUDE_DECKS` の値を勝手に変更しない（`false` に戻すのはリリース作業として、ユーザーの指示で行う）。
- 実教材の中身をチャットや他の場所へ複製・再配布しない。
