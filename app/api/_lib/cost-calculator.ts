// File: app/api/_lib/cost-calculator.ts

interface ModelPricing {
  // Price per 1,000,000 tokens in USD to avoid floating point issues
  input: number;
  output: number;
}

const PRICING_DATA: Record<string, Record<string, ModelPricing>> = {
  openai: {
    'gpt-4-turbo-preview': { input: 10000, output: 30000 },
    'gpt-4': { input: 30000, output: 60000 },
    'gpt-3.5-turbo': { input: 500, output: 1500 }, // A common gpt-3.5-turbo model
    'gpt-3.5-turbo-0125': { input: 500, output: 1500 },
    'embedding-ada-002': { input: 100, output: 0 },
  },
  // Future providers will be added here
};

export interface CostCalculationInput {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export function calculateCost(input: CostCalculationInput): number {
  const { provider, model, promptTokens, completionTokens } = input;
  const modelPricing = PRICING_DATA[provider]?.[model];

  if (!modelPricing) {
    console.warn(`No pricing data for provider '${provider}', model '${model}'.`);
    return 0;
  }

  const inputCost = promptTokens * modelPricing.input;
  const outputCost = completionTokens * modelPricing.output;
  const totalCostInMillionths = inputCost + outputCost;

  return totalCostInMillionths / 1_000_000;
}