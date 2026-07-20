# ASE-Lab. Campus (Reboot β)

ASE-Lab. 5周年プロジェクト「Reboot」の学習プラットフォーム **Campus** の共有用サイトです。
ステークホルダー向けに GitHub Pages で公開するための、静的サイト（HTML/CSS/JS のみ・ビルド不要）です。

- **入口**: `index.html` はゲート。ログイン済みなら `dashboard.html`、未ログインなら `login.html` へ自動遷移します。
- **認証**: localStorage ベースの**モック認証**（実バックエンドなし・構想デモ用）。`login.html` から
  デモアカウント（Maya Abe / SCORE 274）または任意の表示名で開始できます。学習データはブラウザ内にのみ保存されます。
- 本体サイト（ase-lab.space）とは切り離した独立サービスとして構成しています。フッターの「公式サイト」等は
  本番 https://ase-lab.space へ外部リンクします。

> ソースの正は `~/ase-lab-reboot/site/`。本リポジトリはそこから Campus 部分だけを取り出した公開用コピーです
> （本体LPの `home.html`・`about.html` は含みません）。編集はソース側で行い、本リポジトリへ同期してください。

---

## GitHub Pages で公開する手順

> 前提: 本番リポジトリ `ase-lab-space/ase-lab` とは**別の新規リポジトリ** `ase-lab-space/ase-lab-campus` に公開します。
> このディレクトリは既に `git` 初期化・初回コミット済みです（`git log` で確認可）。

### 方法A: GitHub Web UI + git（`gh` 不要・推奨）

1. ブラウザで **https://github.com/organizations/ase-lab-space/repositories/new** を開く
   （または org トップ → New repository）。
   - Repository name: `ase-lab-campus`
   - Visibility: **Public**（GitHub Pages を無料で使う場合。Private + Pages は Team/Enterprise プランが必要）
   - **README/.gitignore/ライセンスは追加しない**（空リポジトリで作成）
2. 作成後に表示される URL を remote に登録して push（このディレクトリで実行）:
   ```bash
   cd ~/ase-lab-campus
   git branch -M main
   git remote add origin https://github.com/ase-lab-space/ase-lab-campus.git
   git push -u origin main
   ```
3. リポジトリの **Settings → Pages** を開く:
   - Build and deployment → Source: **Deploy from a branch**
   - Branch: **main** / フォルダ: **/ (root)** → **Save**
4. 数十秒〜数分後、次の URL で公開されます（ステークホルダーにはこの URL を共有）:
   **https://ase-lab-space.github.io/ase-lab-campus/**

### 方法B: GitHub CLI（`gh`）を使う場合

`gh` 未インストールなら先に導入し `gh auth login`（org へのアクセス権が必要）:
```bash
# Debian/Ubuntu(WSL) 例
sudo apt update && sudo apt install gh    # もしくは https://github.com/cli/cli の手順
gh auth login
```
その後、このディレクトリから一括で作成・push・Pages 有効化:
```bash
cd ~/ase-lab-campus
gh repo create ase-lab-space/ase-lab-campus --public --source=. --remote=origin --push
gh api -X POST repos/ase-lab-space/ase-lab-campus/pages \
  -f "source[branch]=main" -f "source[path]=/"
```
公開 URL: **https://ase-lab-space.github.io/ase-lab-campus/**

---

## 更新の反映

ソース（`~/ase-lab-reboot/site/`）を編集したら、Campus 部分を本リポジトリへ同期して push:
```bash
# 例: home.html/about.html を除いて同期（rsync がなければ cp で該当ファイルをコピー）
rsync -a --exclude home.html --exclude about.html \
  ~/ase-lab-reboot/site/ ~/ase-lab-campus/
cd ~/ase-lab-campus && git add -A && git commit -m "update campus" && git push
```
push すると GitHub Pages が自動で再デプロイします。

## （任意）独自ドメイン `campus.ase-lab.space`
1. このディレクトリに `CNAME` ファイルを追加し、中身を `campus.ase-lab.space` にする → commit & push
2. DNS で `campus` の CNAME を `ase-lab-space.github.io` に向ける
3. Settings → Pages → Custom domain に `campus.ase-lab.space` を設定（Enforce HTTPS を有効化）

## 秘匿性について
GitHub Pages（Public リポジトリ）は **URL を知る誰でも閲覧可能** です。限定共有したい場合は
(a) Private リポジトリ + Pages（GitHub Team/Enterprise が必要）、(b) 公開 URL を限定的に共有、
のいずれかを検討してください。構想資料の PDF 等は本リポジトリには含めていません。
