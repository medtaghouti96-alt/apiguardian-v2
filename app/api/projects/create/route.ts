import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { encryptSecret } from '../../_lib/encryption';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
    try {
        // We now correctly await the auth() call
        const { userId } = await auth(); 
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, openaiKey } = await req.json();
        if (!name || !openaiKey) {
            return NextResponse.json({ error: "Project name and OpenAI key are required." }, { status: 400 });
        }

        const masterKey = process.env.ENCRYPTION_KEY;
        if (!masterKey) {
            throw new Error("ENCRYPTION_KEY is not set on the server.");
        }
        
        const newApiKey = `ag-${randomBytes(16).toString('hex')}`;
        const encryptedOpenaiKey = encryptSecret(openaiKey, masterKey);

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );

        const { data, error } = await supabase
            .from('projects')
            .insert({
                user_id: userId,
                name: name,
                apiguardian_api_key: newApiKey,
                openai_api_key_encrypted: encryptedOpenaiKey,
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error:", error);
            if (error.code === '23505') {
                return NextResponse.json({ error: "An error occurred. A project with this name may already exist." }, { status: 409 });
            }
            return NextResponse.json({ error: "Could not create project in database." }, { status: 500 });
        }

        return NextResponse.json({ apiKey: data.apiguardian_api_key }, { status: 201 });

    } catch (error) {
        console.error("Error creating project:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}