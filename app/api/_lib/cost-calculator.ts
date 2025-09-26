// File: app/api/_lib/cost-calculator.ts

interface ModelPricing {
  // Price per 1,000,000 tokens in USD to avoid floating point issues
  input: number;
  output: number;
}

// This is our central pricing database
export const PRICING_DATA: Record<string, Record<string, ModelPricing>> = {
  openai: {
    'gpt-4-turbo-preview': { input: 10000, output: 30000 },
    'gpt-4': { input: 30000, output: 60000 },
    'gpt-3.5-turbo': { input: 500, output: 1500 },
    'gpt-3.5-turbo-0125': { input: 500, output: 1500 },
    'embedding-ada-002': { input: 100, output: 0 },
  },
  // --- NEW SECTION FOR GROQ ---
  groq: {
    'llama3-8b-8192': { input: 50, output: 100 },       // $0.05 / 1M input, $0.10 / 1M output
    'llama-3.1-8b-instant': { input: 50, output: 100 }, // Same pricing as above
    'llama3-70b-8192': { input: 590, output: 790 },     // $0.59 / 1M input, $0.79 / 1M output
    'mixtral-8x7b-32768': { input: 270, output: 270 },   // $0.27 / 1M for both
  },
  // ----------------------------
};

export interface CostCalculationInput {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export function calculateCost(input: CostCalculationInput): number {
  const { provider, model, promptTokens, completionTokens } = input;
  
  // The lookup logic is already generic, so it will now work for Groq automatically.
  const modelPricing = PRICING_DATA[provider]?.[model];

  if (!modelPricing) {
    console.warn(`No pricing data found for provider '${provider}' and model '${model}'. Cost will be logged as 0.`);
    return 0;
  }

  const inputCost = promptTokens * modelPricing.input;
  const outputCost = completionTokens * modelPricing.output;
  const totalCostInMillionths = inputCost + outputCost;

  // Convert back to a standard dollar value for storage
  return totalCostInMillionths / 1_000_000;
}