import 'dotenv/config';
import { App, ExpressReceiver } from '@slack/bolt';
import { Request, Response, NextFunction } from 'express';

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Slack のリトライリクエストは無視して二重返信を防ぐ
receiver.app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.headers['x-slack-retry-num']) {
    res.status(200).send('OK');
    return;
  }
  next();
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
  processBeforeResponse: true,
});

app.event('app_mention', async ({ event, client, logger }) => {
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  try {
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: text,
    });
  } catch (error) {
    logger.error('chat.postMessage failed:', error);
  }
});

export default receiver.app;
