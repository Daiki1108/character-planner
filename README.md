# キャラクター企画室

**[ブラウザでデモを開く](https://daiki1108.github.io/character-planner/)**

デモは `index.html` をブラウザで開くと使えます。入力 → 候補採用 → 最終承認まで試せます。サンプルは事前に用意した内容です。デモの進捗はブラウザに保存され、画面右上から決定内容を JSON に書き出せます。

工程番号は企画原案テンプレートに合わせています。Step 0 は制作方針、Step 1 は市場調査です。

## Grokbot に接続する

Node.js 20 以降で、このフォルダから実行します。

```sh
GROKBOT_WEBHOOK='https://実際のWebhookのURL' PLANNER_TOKEN='登録用の秘密の値' node server.mjs
```

ブラウザで http://127.0.0.1:8787 を開きます。Webhook が認証を求める場合は `GROKBOT_WEBHOOK_TOKEN` も設定します。ローカルサーバーは同じPCのループバックにのみバインドします。図のように Grokbot がPC上でコマンドを実行できる構成で、以下の登録コマンドを実行します。

```sh
curl -fsS http://127.0.0.1:8787/api/tasks \
  -H "Authorization: Bearer ${PLANNER_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"id":"plan-001","stage":"0","kind":"input","fields":["制作方針","ターゲットユーザー","ユーザーに提供する体験"]}'
```

PLANNER_TOKEN は登録側のシェルにも同じ値を設定します。タスクには毎回異なる `id`、テンプレートの `stage` と、以下の `kind` を渡します。`description` で画面の説明文を上書きできます。

- `input` は `fields` に入力項目名の配列を渡します。
- `choice` は `options` に `{"id":"a","title":"候補名","body":"候補の全文"}` 形式の配列を渡します。候補画像がある場合は `image` にブラウザで開ける HTTP(S) の URL を渡します。
- `progress` は作業中の表示に使います。
- `review` は決定履歴と採用基準を表示します。`draft` に最終確認用の企画原案の全文を渡せます。

Webhook は `taskId`、`stage`、`action` と、アクションに対応する `values`、`option`、`feedback`、`criteria` のいずれかを受け取ります。Grokbot 側で受付を記録し、10秒以内に HTTP 2xx を返してください。再送には `Idempotency-Key` ヘッダーを使って重複処理を防ぎます。Grokbot 側で Notion への反映や次候補の生成を行い、その結果を別タスクとして登録します。受付中に登録が競合して HTTP 409 が返った場合は、受付完了後に再試行してください。

接続モードの UI は現在のタスクを1件表示します。回答履歴はサーバーの `planner-state.json` に保存します。
