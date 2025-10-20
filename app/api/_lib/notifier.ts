import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function checkBudgetAndSendNotification(projectId: string, currentSpend: number) {
  try {
    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`name, monthly_budget, webhook_url, budget_alerts ( threshold_percent )`)
        .eq('id', projectId)
        .single();
    if (projectError || !projectData) return;
    
    const budget = Number(projectData.monthly_budget);
    const webhookUrl = projectData.webhook_url;
    if (budget <= 0 || !webhookUrl) return;

    const usagePercent = (currentSpend / budget) * 100;
    const thresholdsToAlert = [80, 100];

    for (const threshold of thresholdsToAlert) {
        if (usagePercent >= threshold) {
            const alreadySent = projectData.budget_alerts.some(alert => alert.threshold_percent === threshold);
            if (!alreadySent) {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'BUDGET_ALERT', projectName: projectData.name, thresholdPercent: threshold,
                        currentSpend: currentSpend.toFixed(6), budget: budget.toFixed(2),
                        message: `Your project "${projectData.name}" has reached ${threshold}% of its $${budget.toFixed(2)} budget. Current spend: $${currentSpend.toFixed(6)}.`
                    }),
                });
                await supabase.from('budget_alerts').insert({ project_id: projectId, threshold_percent: threshold });
            }
        }
    }
  } catch (error) {
    console.error("Error in notification system:", error);
  }
}