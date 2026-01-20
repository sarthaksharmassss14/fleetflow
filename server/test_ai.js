import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    console.log("--- 🤖 GEMINI DIAGNOSTIC TOOL ---");
    console.log(`📡 API Key: ${apiKey ? 'Found (Starts with ' + apiKey.substring(0, 4) + ')' : 'MISSING ❌'}`);
    console.log(`📦 Model Name: ${modelName}`);

    if (!apiKey) {
        console.error("❌ ERROR: GEMINI_API_KEY is not defined in your .env file.");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        console.log("⏳ Sending test prompt to Google AI...");
        const result = await model.generateContent("Hello! Are you operational? Please respond with 'YES' if you are working.");
        const response = await result.response;
        const text = response.text();

        console.log("✅ SUCCESS: The model responded!");
        console.log(`💬 Response: ${text}`);
    } catch (error) {
        console.error("❌ FAILED: The AI model is NOT working.");
        console.error(`🛑 Error Message: ${error.message}`);
        
        if (error.message.includes("404")) {
            console.log("\n💡 DIAGNOSIS: 404 Not Found");
            console.log("This usually means the model name is wrong. Your current model is: " + modelName);
            console.log("Check if you have a typo in GEMINI_MODEL in your .env file.");
        } else if (error.message.includes("403") || error.message.includes("API key not valid")) {
            console.log("\n💡 DIAGNOSIS: 403 Forbidden / Invalid Key");
            console.log("Your API Key is either invalid or doesn't have permissions for the requested model.");
        } else if (error.message.includes("quota")) {
            console.log("\n💡 DIAGNOSIS: Quota Exceeded");
            console.log("You have run out of free requests for this project.");
        }
    }
}

testGemini();
