import { GoogleGenAI, Type } from "@google/genai";
import type { GenerationOptions, ModelIntent } from "@/types";
import { getIntentPrompt, getLLMMessageContent, getVoxelPromptFromIntent } from "./modelCallTypes";
const createGeminiClient = () =>
  new GoogleGenAI(
    {
      // apiKey: process.env.GEMINI_API_KEY
    }
  );

const model = 'gemini-3-pro-preview';
async function callGeminiStream(systemContext:string, prompt: string) {
            {
            const ai = createGeminiClient();
            console.log("Gemini model:", model);

            const response = ai.models.generateContentStream({
            model,
            // Bian: fast mode keeps a single-call prompt path.
            contents: getLLMMessageContent(systemContext, prompt),
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

async function callGeminiIntent(
  systemContext: string,
  prompt: string,
  options: GenerationOptions
): Promise<ModelIntent> {
            const ai = createGeminiClient();
            console.log("Gemini model:", model);

            const response = await ai.models.generateContent({
            model,
            //Bian: expert mode stage 1 extracts a real ModelIntent from prompt + options.
            contents: getIntentPrompt(systemContext, prompt, options),
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING },
                        style: { type: Type.STRING },
                        colorScheme: { type: Type.STRING },
                        size: { type: Type.STRING },
                        symmetry: { type: Type.STRING },
                        voxelBudget: { type: Type.INTEGER },
                        silhouetteKeywords: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        structuralRules: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        }
                    },
                    required: [
                      "subject",
                      "style",
                      "colorScheme",
                      "size",
                      "symmetry",
                      "voxelBudget",
                      "silhouetteKeywords",
                      "structuralRules"
                    ]
                }
            }
        });

        const rawText = response.text;
        return JSON.parse(rawText) as ModelIntent;
}

async function callGeminiVoxelStreamFromIntent(
  systemContext: string,
  intent: ModelIntent
) {
            const ai = createGeminiClient();
            console.log("Gemini model:", model);

            const response = ai.models.generateContentStream({
            model,
            // Bian: expert mode stage 2 generates voxels from the extracted ModelIntent.
            contents: getVoxelPromptFromIntent(systemContext, intent),
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

async function callGeminiStream(
  systemContext: string,
  prompt: string,
  options?: GenerationOptions
) {
            if (!options) {
              return callGeminiFastModeStream(systemContext, prompt);
            }

            const intent = await callGeminiIntent(systemContext, prompt, options);
            return callGeminiVoxelStreamFromIntent(systemContext, intent);
}

export default callGeminiStream;
export { callGeminiFastModeStream, callGeminiIntent, callGeminiVoxelStreamFromIntent };
