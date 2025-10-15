import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { encryptSecret } from '../../_lib/encryption';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        // 1. Authenticate the user to ensure they are logged in
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Parse the data from the frontend form
        const { name, openaiKey } = await req.json();
        if (!name || !openaiKey) {
            return NextResponse.json({ error: "Project name and Provider API key are required." }, { status: 400 });
        }

        // 3. Get the master encryption key from the environment
        const masterKey = process.env.ENCRYPTION_KEY;
        if (!masterKey) {
            console.error("CRITICAL: ENCRYPTION_KEY is not set on the server.");
            throw new Error("Server configuration error.");
        }
        
        // 4. Generate a new, secure APIGuardian key for this project
        const newApiKey = `ag-${randomBytes(16).toString('hex')}`;

        // 5. Encrypt the user's provided secret key (e.g., their Groq gsk_... key)
        const encryptedProviderKey = encryptSecret(openaiKey, masterKey);

        // 6. Connect to the Supabase admin client
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        // 7. Insert the new project into the database
        const { data, error } = await supabase
            .from('projects')
            .insert({
                user_id: userId,
                name: name,
                apiguardian_api_key: newApiKey,
                openai_api_key_encrypted: encryptedProviderKey,
                // --- THE FIX: Set the provider for this new project ---
                // For the MVP, we will default all new projects to 'groq'.
                // In the future, the user will select this in the UI.
                provider_id: 'groq' 
            })
            .select()
            .single();

        if (error) {
            // Re-throw the error to be handled by our main catch block
            throw error;
        }

        // 8. Return the newly generated APIGuardian key to the frontend
        return NextResponse.json({ apiKey: data.apiguardian_api_key }, { status: 201 });

    } catch (error) {
        // This block handles all errors, including database errors
        if (typeof error === 'object' && error !== null && 'code' in error) {
            if (error.code === '23505') { // Handle unique constraint violation
                return NextResponse.json({ error: "A project with this name or key might already exist." }, { status: 409 });
            }
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error creating project:", errorMessage);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}