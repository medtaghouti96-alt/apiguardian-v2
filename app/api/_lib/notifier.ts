import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

/**
 * Checks budget and sends a notification. This version includes exhaustive
 * logging to debug why webhooks may not be sending.
 */
export async function checkBudgetAndSendNotification(projectId: string) {
    console.log(`[Notifier] START: Received check for project ID: ${projectId}`);
    try {
        const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select(`name, monthly_budget, webhook_url, budget_alerts ( threshold_percent )`)
            .eq('id', projectId)
            .single();

        if (projectError) {
            console.error(`[Notifier] EXIT A-1: Supabase query for project failed. Error: ${projectError.message}`);
            return;
        }
        if (!projectData) {
            console.error(`[Notifier] EXIT A-2: Supabase query succeeded but returned NO DATA for project ${projectId}. Is the ID correct?`);
            return; 
        }
        
        console.log(`[Notifier] Fetched project data. Name: ${projectData.name}`);
        
        const budget = Number(projectData.monthly_budget);
        const webhookUrl = projectData.webhook_url;
        console.log(`[Notifier] Values found - Budget: ${budget}, Webhook URL: ${webhookUrl}`);

        if (budget <= 0) {
            console.log(`[Notifier] EXIT B-1: Budget is ${budget}. Exiting because no budget is set.`);
            return;
        }
        if (!webhookUrl) {
            console.log(`[Notifier] EXIT B-2: Webhook URL is null or empty. Exiting.`);
            return;
        }

        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const { data: costData, error: costError } = await supabase
            .from('api_logs')
            .select('cost')
            .eq('project_id', projectId)
            .gte('created_at', firstDayOfMonth.toISOString());

        if (costError) {
            console.error("[Notifier] EXIT C: Could not fetch live cost data from api_logs.", costError.message);
            return;
        }
        if (!costData) {
            console.log("[Notifier] EXIT D: No cost data found for this month.");
            // This is a valid state, not an error, so we just finish.
            console.log(`[Notifier] END: Check complete.`);
            return;
        }

        const currentSpend = costData.reduce((acc, log) => acc + Number(log.cost), 0);
        console.log(`[Notifier] Calculated live spend: $${currentSpend}`);
        
        const usagePercent = (currentSpend / budget) * 100;
        console.log(`[Notifier] Current usage is ${usagePercent.toFixed(2)}% of the budget.`);

        const thresholdsToAlert = [80, 100];
        for (const threshold of thresholdsToAlert) {
            if (usagePercent >= threshold) {
                const alreadySent = projectData.budget_alerts.some(alert => alert.threshold_percent === threshold);
                
                if (!alreadySent) {
                    console.log(`[Notifier] SUCCESS PATH: Threshold of ${threshold}% reached. Sending webhook...`);
                    
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'BUDGET_ALERT',
                            projectName: projectData.name,
                            thresholdPercent: threshold,
                            currentSpend: currentSpend.toFixed(6),
                            budget: budget.toFixed(2),
                            message: `Your project "${projectData.name}" has reached ${threshold}% of its $${budget.toFixed(2)} budget. Current spend: $${currentSpend.toFixed(6)}.`
                        }),
                    });

                    await supabase.from('budget_alerts').insert({
                        project_id: projectId,
                        threshold_percent: threshold,
                    });
                    
                    console.log(`[Notifier] Webhook sent and alert recorded for ${threshold}%.`);
                } else {
                    console.log(`[Notifier] INFO: Threshold of ${threshold}% reached, but alert was already sent this month. Skipping.`);
                }
            }
        }
    } catch (error) {
        console.error("[Notifier] CRITICAL EXIT: An unexpected error occurred in the try/catch block:", error);
    }
    console.log(`[Notifier] END: Check complete for project: ${projectId}`);
}