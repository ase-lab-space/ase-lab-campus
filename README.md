# ASE-Lab. Campus (Reboot β)

ASE-Lab. 5周年プロジェクト「Reboot」の学習プラットフォーム **Campus** の共有用サイトです。
ステークホルダー向けに GitHub Pages で公開するための、静的サイト（HTML/CSS/JS のみ・ビルド不要）です。

- **入口**: `index.html` はゲート。ログイン済みなら `dashboard.html`、未ログインなら `login.html` へ自動遷移します。
- **認証**: localStorage ベースの**モック認証**（実バックエンドなし・構想デモ用）。`login.html` から
  デモアカウント（Maya Abe / SCORE 274）または任意の表示名で開始できます。学習データはブラウザ内にのみ保存されます。
- 本体サイト（ase-lab.space）とは切り離した独立サービスとして構成しています。フッターの「公式サイト」等は
  本番 https://ase-lab.space へ外部リンクします。

> ソースの正は `~/ase-lab-reboot/site/`。本リポジトリはそこから Campus 部分だけを取り出した公開用コピーです
> （本体LPの `home.html`・`about.html`、および実スライド教材を持つコースは含みません）。
> 編集はソース側で行い、本リポジトリへは **必ず `node tools/export-campus.mjs` を通して**同期してください。
> 保守運用・公開手順の詳細は **[MAINTENANCE.md](MAINTENANCE.md)** を参照してください。

---

## 公開状態

- リポジトリ `ase-lab-space/ase-lab-campus`（Public）で GitHub Pages 公開済み
- 公開URL: **https://ase-lab-space.github.io/ase-lab-campus/**
- リポジトリの再作成手順・独自ドメイン設定・公式公開に向けた論点は
  **[MAINTENANCE.md](MAINTENANCE.md)** にまとめています

## 更新の反映

ソース（`~/ase-lab-reboot/site/`）を編集したら、以下のスクリプトで本リポジトリへ同期します
（**素の `rsync`/`cp` で直接同期しないこと** — 実スライド教材を持つコースを自動除外する
ロジックを経由しなくなります。詳細は [MAINTENANCE.md](MAINTENANCE.md) 参照）:
```bash
cd ~/ase-lab-reboot
node tools/export-campus.mjs
cd ~/ase-lab-campus && git add -A && git commit -m "update campus" && git push
```
push すると GitHub Pages が自動で再デプロイします。

## 秘匿性について
GitHub Pages（Public リポジトリ）は **URL を知る誰でも閲覧・clone可能** です。限定共有したい場合は
(a) Private リポジトリ + Pages（GitHub Team/Enterprise が必要）、(b) 公開 URL を限定的に共有、
のいずれかを検討してください。実スライド教材（deck付きコース）は `tools/export-campus.mjs` により
自動的に本リポジトリから除外されます（経緯は [MAINTENANCE.md](MAINTENANCE.md) 参照）。
