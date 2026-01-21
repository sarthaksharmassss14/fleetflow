import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    console.log("--- System Health Check ---");
    
    // Check TomTom
    try {
        const query = 'Delhi';
        const ttKey = process.env.TOMTOM_API_KEY;
        const ttUrl = `https://api.tomtom.com/search/2/search/${query}.json?key=${ttKey}&limit=1&countrySet=IN`;
        const ttResp = await axios.get(ttUrl);
        console.log("✅ TomTom API: OK (Results found)");
    } catch (e) {
        console.error("❌ TomTom API: FAILED", e.message);
    }

    // Check Groq
    try {
        const gKey = process.env.GROQ_API_KEY;
        const gModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
        const gUrl = 'https://api.groq.com/openai/v1/chat/completions';
        await axios.post(gUrl, {
            model: gModel,
            messages: [{role: 'user', content: 'hi'}],
            max_tokens: 5
        }, { headers: { 'Authorization': `Bearer ${gKey}` } });
        console.log("✅ Groq API: OK");
    } catch (e) {
        console.error("❌ Groq API: FAILED", e.message);
    }
}

check();
