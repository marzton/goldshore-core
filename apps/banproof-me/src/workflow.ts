import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

export type ScanParams = {
  userId: string;
  type: 'risk_radar' | 'political_quant';
  symbol: string;
};

type Env = {
  DB: D1Database;
  INFRA_SECRETS: KVNamespace;
};

/**
 * BanproofEngine — stateful Cloudflare Workflow that checkpoints at every
 * external API call (Hugging Face sentiment + Odds API data).
 */
export class BanproofEngine extends WorkflowEntrypoint<Env, ScanParams> {
  async run(event: WorkflowEvent<ScanParams>, step: WorkflowStep) {
    const { userId, type, symbol } = event.payload;

    const sentiment = await step.do('fetch-sentiment', async () => {
      const apiKey = await this.env.INFRA_SECRETS.get('HUGGINGFACE_API_KEY');
      if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not configured');

      const response = await fetch(
        'https://api-inference.huggingface.co/models/ProsusAI/finbert',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: symbol }),
        },
      );
      if (!response.ok) throw new Error(`HuggingFace error: ${response.status}`);
      const data = (await response.json()) as Array<Array<{ label: string; score: number }>>;
      return data[0]?.[0] ?? { label: 'neutral', score: 0 };
    });

    const oddsData = await step.do('fetch-odds', async () => {
      const apiKey = await this.env.INFRA_SECRETS.get('ODDS_API_KEY');
      if (!apiKey) throw new Error('ODDS_API_KEY not configured');

      const response = await fetch(
        `https://api.the-odds-api.com/v4/sports/?apiKey=${apiKey}`,
      );
      if (!response.ok) throw new Error(`Odds API error: ${response.status}`);
      return response.json();
    });

    const result = await step.do('synthesize-and-audit', async () => {
      const signal = { type, symbol, sentiment, oddsData, userId };

      await this.env.DB.prepare(
        `INSERT INTO signals (id, user_id, type, symbol, sentiment, odds_data, result, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          userId,
          type,
          symbol,
          JSON.stringify(sentiment),
          JSON.stringify(oddsData),
          JSON.stringify(signal),
          Date.now(),
        )
        .run();

      await this.env.DB.prepare(
        `INSERT INTO audit_logs (id, user_id, app, action, metadata, created_at)
         VALUES (?, ?, 'banproof-me', ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          userId,
          `${type}_scan_complete`,
          JSON.stringify({ symbol }),
          Date.now(),
        )
        .run();

      return signal;
    });

    return result;
  }
}
