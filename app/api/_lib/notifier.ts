import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

/**
 * Checks a project's spending against its budget and sends a webhook notification.
 * This function is now very efficient, as it receives the up-to-the-second 
 * `currentSpend` directly from the analytics module that uses Redis.
 * 
 * @param projectId - The UUID of the project to check.
 * @param currentSpend - The 100% accurate, real-time total spend for the project this month.
 */
export async function checkBudgetAndSendNotification(projectId: string, currentSpend: number) {
  try {
    // 1. Fetch the project's rules (budget, webhook) and a list of alerts already sent.
    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`name, monthly_budget, webhook_url, budget_alerts ( threshold_percent )`)
        .eq('id', projectId)
        .single();

    // Exit safely if we can't find the project.
    if (projectError || !projectData) {
        if(projectError) console.error("Notifier Error: Could not fetch project data.", projectError.message);
        return;
    }
    
    const budget = Number(projectData.monthly_budget);
    const webhookUrl = projectData.webhook_url;
    
    // Exit if there's no budget set or no webhook URL to send to.
    if (budget <= 0 || !webhookUrl) {
        return;
    }

    // 2. Calculate the usage percentage based on the accurate data passed in.
    const usagePercent = (currentSpend / budget) * 100;
    const thresholdsToAlert = [80, 100]; // Our defined alert levels.

    // 3. Loop through the alert levels to see if any have been crossed.
    for (const threshold of thresholdsToAlert) {
        if (usagePercent >= threshold) {
            // Check our database to see if we've already sent this alert this month.
            const alreadySent = projectData.budget_alerts.some(alert => alert.threshold_percent === threshold);
            
            // If we haven't sent it before, send it now.
            if (!alreadySent) {
                console.log(`Sending ${threshold}% webhook notification for project ${projectId}`);
                
                // Send the webhook to the user's configured URL.
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

                // Record that this alert has been sent to prevent spamming the user.
                await supabase.from('budget_alerts').insert({
                    project_id: projectId,
                    threshold_percent: threshold,
                });
            }
        }
    }
  } catch (error) {
    console.error("Critical error in notification system:", error);
  }
}