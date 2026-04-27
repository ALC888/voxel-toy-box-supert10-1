import { saveGenerationRecord } from '../lib/saveGeneration.js';

type FeedbackBody = {
  prompt?: string;
  options?: Record<string, unknown>;
  error?: string;
};

function parseBody(body: unknown): FeedbackBody {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as FeedbackBody;
    } catch {
      return {};
    }
  }

  return body as FeedbackBody;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Use GET for default probe or POST with prompt/options/error payload.',
    });
  }

  try {
    const data = parseBody(req.body);
    const prompt = data.prompt ?? '[debug] database feedback probe';
    const errorMessage = data.error ?? 'Debug probe: no model API call involved.';

    const databaseReport = await saveGenerationRecord({
      prompt,
      options: (data.options as any) ?? {},
      success: false,
      voxelCount: 0,
      colorCount: 0,
      warnings: ['Intentional failure record for DB feedback validation.'],
      templateMatch: null,
      error: errorMessage,
    });

    return res.status(databaseReport.health.ok ? 200 : 503).json({
      success: databaseReport.health.ok,
      purpose: 'db-feedback-without-kimi',
      databaseReport,
      recordedFailure: {
        prompt,
        error: errorMessage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      purpose: 'db-feedback-without-kimi',
      error: message,
    });
  }
}
