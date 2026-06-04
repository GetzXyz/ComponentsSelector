import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // 1. Grab the API key securely from the environment file
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key is missing from environment variables.' });
        }

        // 2. Initialize the Google Gen AI SDK
        const ai = new GoogleGenAI({ apiKey: apiKey });

        // 3. Call the model (using the standard gemini-2.5-flash model)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // 4. Return the text response back to your app.js
        return res.status(200).json({ text: response.text });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'Failed to generate content', details: error.message });
    }
}