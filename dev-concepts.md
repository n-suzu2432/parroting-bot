# ローカル開発時の Webhook を受け取る方法

## Webhook とは？

普通のインターネットのやり取りはこうです：

```
あなた → 「情報ちょうだい！」 → Slack
あなた ← 「はい、どうぞ」    ← Slack
```

**あなたが聞きに行く**スタイル。

でも Webhook は逆です：

```
Slack → 「メッセージが来たよ！」 → あなたのプログラム
```

**Slack が勝手に教えに来る**スタイル。

---

## 問題：ローカル開発だと届かない

あなたのパソコンで作ったプログラムは、**インターネットから見えない場所**にいます。

```
インターネット
    │
    │  ← Slack が送りたいけど…
    │
[家の壁・ルーター]  ← ここで止まってしまう！
    │
[あなたのパソコン]  ← Slack は住所を知らない
```

Slack からすると「どこに送ればいいの？」となってしまいます。

---

## 解決策

### ngrok を使う方法

ngrok はパソコンに**一時的な住所（URL）を作ってくれるトンネル**です。

```
インターネット
    │
[ngrok のサーバー]  ← 「abc123.ngrok.io」という住所を持つ
    │  トンネル（穴）
[あなたのパソコン]  ← ngrok が橋渡ししてくれる
```

Slack に `abc123.ngrok.io` に送るよう設定すれば、  
ngrok が受け取ってパソコンに転送してくれます。

### Vercel を使う方法

Vercel は**プログラムをクラウドに置く**サービスです。  
ローカルではなく最初から「インターネット上の住所」があるので  
Webhook がそのまま届きます。

---

## まとめ

| 方法 | やること |
|---|---|
| **ngrok** | ローカルのパソコンに仮の住所を作ってトンネルで繋ぐ |
| **Vercel** | プログラムをクラウドに置いてしまって直接受け取る |

どちらも「Slack Bot の開発中に Slack からのイベント通知を受け取れるようにする」ための方法です。

---

## Bolt とは？

Slack 公式が作った「Slack Bot を簡単に作れる道具箱」です。

Bot を自分でゼロから作ると、署名の検証・JSON の解析・3秒以内の応答など  
大量の面倒な処理が必要です。Bolt はそれを全部やってくれます。

たとえ話：
> カレーのルーみたいなもの。入れるだけで難しいところを全部やってくれる。

### Bolt が裏でやってくれること

```
Slack から届く
      │
      ▼
┌─────────────────────────────┐
│           Bolt              │
│                             │
│  ① 「本物のSlackか？」確認  │
│  ② 「どんなイベント？」判断 │
│  ③ 「受け取ったよ」即返信   │
│  ④ あなたのコードを呼ぶ    │
└──────────────┬──────────────┘
               │
               ▼
    あなたのコード（やりたい処理だけ書けばいい）
```

### Bolt を使うとコードがシンプルになる

```typescript
// Bolt あり → やりたいことだけ書けばいい
app.event('app_mention', async ({ event, client }) => {
  await client.chat.postMessage({ ... });
});
```

---

## ExpressReceiver とは？

Bolt の「受付係」を Express 製に交換するものです。

### なぜ必要？

Bolt のデフォルトは `app.start()` で**常時起動するサーバー**を前提にしています。  
Vercel はリクエストが来たときだけ起動する**サーバーレス**なので、そのままでは動きません。

```
デフォルト Bolt:
  app.start(3000)  ← 常時起動が必要 → Vercel では不可

ExpressReceiver:
  receiver.app     ← Express アプリとして取り出せる → Vercel で動く！
```

### 登場人物の全体像

```
Slack
  │ メッセージ送ってくる
  ▼
ExpressReceiver  ← 受付係（署名確認・玄関）
  │
  ▼
Bolt App         ← 本体（イベントを判断して振り分ける）
  │ app_mention だ！
  ▼
あなたのコード   ← やりたい処理（エコー返信など）
  │
  ▼
Slack API        ← 返信を送る
```

### コードのイメージ

```typescript
const receiver = new ExpressReceiver({ signingSecret });
const app = new App({ token, receiver });

app.event('app_mention', async ({ event, client }) => { ... });

export default receiver.app; // Vercel に Express アプリを渡す
```

---

## Vercel vs Cloudflare Workers：どちらで実装すべきか

### 結論：Vercel を推奨

### 比較表

| 観点 | Vercel | Cloudflare Workers |
|---|---|---|
| Bolt との相性 | ◎ ExpressReceiver で対応済み | △ Node.js 非対応で要工夫 |
| 実装コスト | 低い | 高い |
| 速度 | 十分 | より速い |
| 無料枠 | 十分 | 十分 |
| TypeScript 対応 | ◎ | ○ |

### 理由①：Cloudflare Workers は Node.js が動かない

`@slack/bolt` は Node.js 前提で作られているため、Cloudflare Workers ではそのまま動きません。

```
Bolt for JavaScript
        │ Node.js の API を使っている（Buffer, crypto など）
        ▼
Cloudflare Workers  ← V8 isolate という別の環境（Node.js ではない）
```

### 理由②：Cloudflare Workers では Bolt を捨てる必要がある

```
Cloudflare Workers で動かそうとすると…
  → 署名検証を自分で実装
  → JSON 解析を自分で実装
  → 3秒応答を自分で実装
  → Bolt の恩恵がゼロになる
```

### 理由③：このBotに Cloudflare Workers のメリットは不要

Cloudflare Workers が活きる場面は「世界中の大量ユーザーへの高速レスポンス」。  
社内 Slack Bot のエコー返信には**オーバースペック**。

### まとめ

```
Cloudflare Workers → 速いが Bolt が動かない。実装コスト大。このBotには過剰。
Vercel            → Bolt + ExpressReceiver でそのまま動く。このBotに最適。
```

> Slack Bot に Bolt を使う限り、Vercel 一択。

---

## Bash コマンドとは？

### コンピューターへの「命令書」

Bash コマンドは、コンピューターに「これをやって！」と伝えるための**短い文章**です。

マウスでカチカチするかわりに、キーボードで命令を打ち込みます。

### 身近なたとえ

| 普通の生活 | Bash コマンド |
|---|---|
| 部屋の中を歩き回って探す | `ls`（ファイルの一覧を見る） |
| 部屋を移動する | `cd フォルダ名`（場所を移動する） |
| メモを書く | `echo "文字"`（文字を表示する） |
| ゴミ箱に捨てる | `rm ファイル名`（ファイルを消す） |

### よく使うコマンド（超基本）

```bash
ls          # 今いる場所にあるファイルを見る
cd Desktop  # Desktop フォルダに移動する
pwd         # 今どこにいるか確認する
mkdir test  # test という名前のフォルダを作る
```

### 「Bash」って何？

Bash は**コマンドを受け取って動かす係**のプログラムです。

```
あなた → 「ls と打つ」
  ↓
Bash  → 「わかった！ファイル一覧を見せるよ」
  ↓
画面  → ファイルの名前がずらっと出てくる
```

### このプロジェクトで使う場面

このSlack Botプロジェクトでは、こんなコマンドをよく使います：

```bash
npm install        # 必要な道具をインストール
npm run build      # TypeScript をコンパイル
vercel deploy      # Vercel にデプロイ
```
