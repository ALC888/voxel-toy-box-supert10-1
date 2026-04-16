import { GoogleGenAI, Type } from "@google/genai";

async function callGeminiStream(systemContext:string, prompt: string) {
            const ai = new GoogleGenAI(
                { 
                // apiKey: process.env.GEMINI_API_KEY 
            }
        );
            const model = 'gemini-3-pro-preview';
            console.log("Gemini model:", model);

            // const response = ai.models.generateContent({
            const response = ai.models.generateContentStream({

            model,
           //Bian Ziling update: use shared prompt builder so Gemini respects frontend advanced params.
            contents: getLLMMessageContent(systemContext, prompt, options),
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.INTEGER },
                            y: { type: Type.INTEGER },
                            z: { type: Type.INTEGER },
                            color: { type: Type.STRING, description: "Hex color code e.g. #FF5500" }
                        },
                        required: ["x", "y", "z", "color"]
                    }
                }
            }
        });
        console.log("Gemini response:", response);
        return response;
    }

export default callGeminiStream;
