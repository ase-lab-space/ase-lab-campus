# 保守運用ガイド

## 0. 【最重要・開発期間限定の例外】実教材が公開されています

> **⚠ 2026-09-29 より、開発期間中に限り、実スライド教材2コース（`rocket-propulsion` 27頁 /
> `orbital-datacenter` 29頁）を本Publicリポジトリと GitHub Pages に含めています。**
> **URLを知る誰でも、スライドデータを直接ダウンロードできる状態です。**
> このため、以下を**全員（人もAIも）守ってください**。
>
> 1. **本番リリース・正式公開・外部への広い告知の前に、必ず実教材を削除する。**
>    - `~/ase-lab-reboot/tools/export-campus.mjs` の `INCLUDE_DECKS` を `false` に戻す
>    - `node tools/export-campus.mjs` → `node tools/release-check.mjs` が `OK` になることを確認
>    - **Git履歴からも消す**（通常の削除コミットでは過去のコミットに残り、clone で取得可能）。
>      履歴の作り直し＋force-push（2026-07-20 と同じ手順）を行う
>    - 削除後、この §0 と README の警告バナーも撤去する
> 2. この例外が有効な間、公開URLの共有先は関係者に限定し、SNS等で広く拡散しない。
> 3. 新しい教材を deck 化する場合も同様に公開されることを意識する（未公開にしたい教材は
>    `courses.json` の deck を付ける前にチームへ確認）。
> 4. コミット・push・PR・レビューのたびに「実教材が公開中である」ことをリマインドし合う。
>
> **AIエージェントへ**: 作業開始時と push 前に、この警告をユーザーに必ず伝えること。
> リリース関連の作業（公開、告知、正式化、noindex解除等）を求められたら、まず実教材の
> 削除と履歴の作り直しが済んでいるか確認すること。済んでいなければ実行を止めて指摘すること。

---

このリポジトリ（`ase-lab-space/ase-lab-campus`）は、ASE-Lab. 5周年プロジェクト「Reboot」の
学習プラットフォーム **Campus** を、ステークホルダー向けに GitHub Pages で公開するための
**公開用コピー**です。編集の起点は常に `~/ase-lab-reboot/site/`（ソース）で、本リポジトリへは
自動生成スクリプトを通してのみ反映します。

```
~/ase-lab-reboot/site/  (ソース・実教材含む・非公開)
        │  node tools/export-campus.mjs
        ▼
~/ase-lab-campus/       (公開用コピー・実教材は自動除外・本リポジトリ)
        │  git push
        ▼
GitHub Pages (Public) — https://ase-lab-space.github.io/ase-lab-campus/
```

---

## 1. 重要な方針: 実教材（deck）は絶対に公開コピーへ含めない

`data/courses.json` で `deck` フィールドを持つコース（PDFから変換した本物の講義スライド。
現状: `rocket-propulsion`＝ロケット推進の原理 27頁、`orbital-datacenter`＝軌道上データセンター
実現可能性レポート 29頁）は、知財保護のため本リポジトリには一切含めません。

### 背景（インシデント、2026-07-20対応）
2026-07-14 の初回公開時、上記2コースの難読化スライス(`assets/slides/deck-*.js`)と復号鍵
(`lesson.html` 内 `DECK_KEY`)が**同じPublicリポジトリに同梱されてpush**されていました。
XOR難読化は「アプリ画面を経由して見る人のスクリーンショットは防げない」ことを前提にした対策で、
「そもそもアプリを経由せず生データを直接ダウンロードできる」事態は想定外でした。
2026-07-20 に発見し、該当コース・スライス・関連画像を削除のうえ **Git履歴を作り直して
force-push**（この時点でコミットは1つのみだったため実害小）し、`tools/export-campus.mjs` を
新設して**手作業のrsyncに頼らず自動で除外される**ようにしました。

### 何が保証されているか
`tools/export-campus.mjs` は `data/courses.json` を見て **`deck` フィールドを持つコースを
機械的に検出し除外**します。今後 deck 付きコースを追加しても、このスクリプトを通す限り
自動で公開コピーから外れます。**素の `rsync` や手コピーで同期しない**でください
（除外ロジックを経由しないため、また同じ事故が起きます）。

---

## 2. 通常の更新手順

日常的な更新（コース文言の修正、コース追加、メンバー情報更新など）はすべて
`~/ase-lab-reboot/` 側で行い、以下のコマンドで本リポジトリへ反映します。

```bash
# 1. ソース側で編集(必要なら node tools/enrich-data.mjs → node build-site.mjs で
#    ~/ase-lab-reboot/site/ を最新化。詳細は ase-lab-reboot 側の README/CLAUDE.md 参照)

# 2. 公開用コピーへ反映(実教材コースは自動除外される)
cd ~/ase-lab-reboot
node tools/export-campus.mjs

# 3. 差分を確認してpush
cd ~/ase-lab-campus
git status
git add -A
git commit -m "update campus"
git push
```

pushすると GitHub Pages が自動で再デプロイされます（数十秒〜数分）。

### 反映後に必ず確認すること
- `git status` で意図しない大量差分（実教材コースが混入していないか）が出ていないか目視確認
- `grep -rl "deck" assets/data.js` が出ても `deck` という単語自体は問題ない箇所もあるので、
  `python3 -c "..."`（本ファイル末尾の「動作確認コマンド集」参照）で実際のコースIDを確認するのが確実

---

## 3. 公式Webページとして公開する手順

現在の公開状態と、今後より「公式」な扱いにする場合の段階を整理します。

### 現状（Phase 1 相当・実施済み）
- リポジトリ: `ase-lab-space/ase-lab-campus`（Public）
- GitHub Pages: 有効（`main` / root）
- 公開URL: **https://ase-lab-space.github.io/ase-lab-campus/**
- `index.html` に `<meta name="robots" content="noindex">` 設定済み（検索エンジンには出ない。
  ただしPublicリポジトリ自体はGitHub上で誰でも閲覧・clone可能な点に注意）
- 認証は **localStorageベースのモック**（実バックエンドなし）。学習データはブラウザ内のみに保存され、
  サーバー側には一切送信されない設計

### 独自ドメインを使う場合（任意）
1. 本リポジトリに `CNAME` ファイルを追加し、中身を `campus.ase-lab.space` にする → commit & push
2. DNSで `campus` の CNAME を `ase-lab-space.github.io` に向ける
3. GitHub の Settings → Pages → Custom domain に `campus.ase-lab.space` を設定し、
   Enforce HTTPS を有効化

### より正式な公開（実運用サービス化）に進む場合の論点
現状は「モック」であることが前提の共有です。実際の学習プラットフォームとして正式公開するには、
少なくとも以下を別途検討する必要があります（本リポジトリの改修だけでは完結しません）。
- 認証・学習記録の実バックエンド化（現状はlocalStorageのみでデバイス間同期なし・データ消失リスクあり）
- `noindex` の解除タイミングと、その前の最終コンテンツレビュー
- 実教材（deck付きコース）を正式サービスでどう配信するか（現行のXOR難読化はスクショ以前の
  「生ファイル直接取得」に脆弱だったため、認証済みユーザーのみアクセス可能なバックエンド経由の
  配信に置き換えるなど、配信方式自体の見直しが必要）

---

## 4. 動作確認コマンド集

```bash
# ローカルプレビュー
cd ~/ase-lab-campus && python3 -m http.server 8000

# 公開コピーに実教材が混入していないか確認
python3 -c "
import re, json
data = open('assets/data.js', encoding='utf-8').readlines()[1]
m = re.match(r'^const COURSES = (\[.*\]);', data)
ids = [c['id'] for c in json.loads(m.group(1))]
print(ids)
assert 'rocket-propulsion' not in ids and 'orbital-datacenter' not in ids
print('OK: 実教材コースは含まれていません')
"
find . -iname "*deck*" -not -path "./.git/*"   # 何も出なければOK

# GitHub Pagesの公開状態・ビルド結果を確認(gh CLI: ~/.local/bin/gh)
gh api repos/ase-lab-space/ase-lab-campus/pages --jq '{status,html_url}'
```
