import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
async function run() {
  try {
    const res = await ai.models.embedContent({model: 'text-embedding-004', contents: 'hello'});
    console.log('emb-004 works:', res.embeddings);
  } catch (e) {
    console.error('emb-004 err:', e.message);
  }
}
run();
