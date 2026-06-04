# Slack Bot プロジェクト

## プロジェクト概要

@bot にメンションされたとき、同じ文章をスレッド返信する Slack Bot。

---

## 技術スタック

| レイヤー | 採用技術 |
|---|---|
| 言語 | TypeScript (Node.js) |
| フレームワーク | Bolt for JavaScript（Slack 公式 SDK） |
| ローカル開発 | ngrok |
| 本番デプロイ | Vercel |
| 環境変数管理 | .env + dotenv |

---

## 要件定義

### 機能要件

- `@bot <テキスト>` とメンションされたとき、`<テキスト>` 部分をそのままスレッド返信する
- メンション部分（`<@UXXXXXXXX>`）は返信テキストから除去する
- 返信は必ず元メッセージのスレッド内に投稿する

### 非機能要件

- `SLACK_SIGNING_SECRET` によるリクエスト検証を必ず行う
- トークン類はすべて `.env` で管理し、コードにハードコードしない
- Slack API 呼び出し失敗時はコンソールにエラーログを出力する
- Slack のリトライリクエスト（`X-Slack-Retry-Num` ヘッダーあり）は無視して二重返信を防ぐ

### デプロイ要件

- 本番環境は **Vercel**（サーバーレス）にデプロイする
- Bolt の受付係として `ExpressReceiver` を使用し、`receiver.app` を export する
- エントリーポイントは `api/slack/events.ts` に配置する
- `vercel.json` でルーティングを設定し、Slack の Request URL は `https://<project>.vercel.app/slack/events` とする
- 環境変数（`SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`）は Vercel の Environment Variables で管理する

### TypeScript ビルド設定

- `tsconfig.json` の `module` は `commonjs` を使用する（Vercel サーバーレス関数の要件）

---

## Slack App 設定

### Bot Token Scopes

| スコープ | 用途 |
|---|---|
| `app_mentions:read` | @bot メンションの読み取り |
| `chat:write` | メッセージの送信 |

### 購読イベント

| イベント | 発火条件 |
|---|---|
| `app_mention` | @bot を含むメッセージが投稿されたとき |

### 環境変数

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

> `PORT` は Vercel サーバーレスではポートを自分で立てないため不要。

---

## ファイル構成

```
Slack Bot/
├── api/
│   └── slack/
│       └── events.ts   # Vercel サーバーレス関数のエントリーポイント
├── .env                # トークン（Git 管理外）
├── .gitignore
├── package.json
├── tsconfig.json
├── vercel.json         # Vercel ルーティング設定
└── CLAUDE.md
```

---

## コアロジック

```typescript
app.event('app_mention', async ({ event, client }) => {
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.ts,
    text: text,
  });
});
```

---

## 開発ステップ

1. `api.slack.com` で Slack App を作成し、トークンを取得
2. `npm init` / Bolt for JavaScript をインストール
3. `src/app.ts` にロジックを実装
4. ngrok でローカルを公開し、Slack の Request URL に登録
5. 動作確認
6. Vercel にデプロイし、Request URL を本番用に差し替え

---

## .gitignore に含めるもの

```
node_modules/
.env
.vercel/
dist/
```

---

## 参考ドキュメント

- [webhook-local-dev.md](./webhook-local-dev.md) — ngrok / Vercel で Webhook を受け取る仕組みの解説
</thinking>
