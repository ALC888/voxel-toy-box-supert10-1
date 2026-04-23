import { OpenRouter } from "@openrouter/sdk";
import OpenAI from 'openai';
import { llmResponseSchema, getLLMMessageContent } from "./modelCallTypes";
import { contentImageURLToJSON } from "@openrouter/sdk/models/operations";
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  // defaultHeaders: {
  //   'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
  //   'X-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
  // },
  dangerouslyAllowBrowser: false
});

function initOpenrouter() {
  return new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY ?? ""
  });
}


async function callOpenrouterOpenAICompatible(systemContext: string, prompt: string) {
  const model = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.2-3b-instruct:free";

  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "user",
        content: `
                    ${systemContext}
                    
                    Task: Generate a 3D voxel art model of: "${prompt}".
                    
                    Strict Rules:
                    1. Use approximately 150 to 200 voxels.
                    2. The model must be centered at x=0, z=0.
                    3. The bottom of the model must be at y=0 or slightly higher.
                    4. Ensure the structure is physically plausible (connected).
                    5. Coordinates should be integers.
                    
                    Return ONLY a JSON array of objects with x, y, z, and color properties.`
      }
    ]

  }
  );
  return response;

};

async function callOpenRouterStructuredTesting(systemContext: string, prompt: string) {
  const openrouter = initOpenrouter();
  const model = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.2-3b-instruct:free";
console.log("openrouter model:", model);
const response = await openrouter.chat.send({
  model: model,
  messages: [
    { role: 'user', content: 'What is the weather like in London?' },
  ],
  responseFormat: {
    type: 'json_schema',
    jsonSchema: {
      name: 'weather',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City or location name',
          },
          temperature: {
            type: 'number',
            description: 'Temperature in Celsius',
          },
          conditions: {
            type: 'string',
            description: 'Weather conditions description',
          },
        },
        required: ['location', 'temperature', 'conditions'],
        additionalProperties: false,
      },
    },
  },
  stream: false,
});

const weatherInfo = response.choices[0].message.content;
return weatherInfo
}

async function callOpenrouterStream(systemContext: string, prompt: string) {
  const openrouter = initOpenrouter();
  const model = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.2-3b-instruct:free";

  const llm_message_content = getLLMMessageContent(systemContext, prompt);
  const response = await openrouter.chat.send({
    model: model,
    messages: [
      { role: 'user', 
        content: llm_message_content 
      },
    ],

    responseFormat: {
      type: 'json_schema',
      jsonSchema: {
        name: 'lego_voxel_model',
        strict: true,
        schema: llmResponseSchema,
      },
    },
    stream: true,
  });

  // const conent = response.choices[0].message.content;
  // return content;

  //  let complete_response = "";
  // for await (const chunk of response) {
  //   console.log("Received chunk:", chunk);
  //   let end =chunk.choices[0].delta.content;
  //   complete_response += end;
  //   console.log("chunk content:", end);
  // }
  
  //  return complete_response
  return response;


}

export { callOpenrouterOpenAICompatible, callOpenRouterStructuredTesting };
export default callOpenrouterStream;
