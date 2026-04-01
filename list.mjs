import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
async function run() {
  try {
    const models = await ai.models.list();
    for await (const m of models) {
        if(m.name.includes("embed")) console.log(m.name);
    }
  } catch (e) {
    console.error('err:', e.message);
  }
}
run();
