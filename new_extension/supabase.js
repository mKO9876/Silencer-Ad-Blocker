import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
export async function saveToSupabase(data) {
    try {
        const response = await fetch(SUPABASE_URL + "/rest/v1/url_data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + SUPABASE_ANON_KEY
            },
            body: JSON.stringify([data])
        });

        if (!response.ok) {
            console.error("Supabase save error:", await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error("Supabase save error:", error);
        return false;
    }
}
