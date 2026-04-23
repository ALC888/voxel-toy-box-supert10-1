import OpenAI, {ChatCompletionFunctionMessageParam} from "openai";

import { zodTextFormat, zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {getLLMMessageContent, llmResponseSchema} from "./modelCallTypes";
import { get } from "http";
interface ServerConfig {
  base_url: string;
  api_key?: string;
  embedding_url?: string;
}

interface EndpointsConfig {
  [key: string]: ServerConfig;
}

const ENDPOINTS: EndpointsConfig = {
  llamacpp: {
    base_url: process.env.VITE_LLAMA_BASE_URL ?? "http://localhost:8080/v1",
    api_key: "sk-no-key-required",
  },
  github: {
    base_url: process.env.VITE_GITHUB_MODELS_BASE_URL ?? "https://models.inference.ai.azure.com",
    api_key: process.env.VITE_GITHUB_TOKEN ?? "sk-no-key-required",
  },
  ollama: {
    base_url: process.env.VITE_OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    api_key: "sk-no-key-required",
    embedding_url: process.env.VITE_OLLAMA_EMBEDDING_URL ?? "http://localhost:11434",
  },
  vllm: {
    base_url: process.env.VITE_VLLM_BASE_URL ?? "http://localhost:8000/v1",
    api_key: "sk-no-key-required",
  },
};



const VoxelModel = z.object({
  x: z.int(),
  y: z.int(),
  z: z.int(),
  color: z.string()
}
)
const VoxelModelArray = z.object({
  voxel_model_array: z.array(VoxelModel)
}
)

const mode = process.env.VITE_SERVER_MODE || "github";

// export default OpenAICompatibleServer;   
const openai = new OpenAI({
  baseURL: ENDPOINTS[mode].base_url,
  apiKey: ENDPOINTS[mode].api_key,
  // defaultHeaders: {
  //   'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
  //   'X-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
  // },
  // dangerouslyAllowBrowser: false
});

const getChatCompletionRequestBody = (model, llm_message_content):ChatCompletionFunctionMessageParam => ({
    model: model,
    messages: [
      {
        role: "user",
        content: llm_message_content
      }
    ],

    response_format: zodResponseFormat(VoxelModelArray, "voxel_model_array"),
}
);
async function callOpenAICompletionsStructuredStream(systemContext, prompt) {
  const model = "gpt-4.1-mini";
  const llm_message_content = getLLMMessageContent(systemContext, prompt);
  const requestBody = getChatCompletionRequestBody(model, llm_message_content);
  const stream = openai.chat.completions.stream({
    ...requestBody,
    // response_format:llmResponseSchema
    // stream: true,
    })  
  //   .on("refusal.done", () => console.log("request refused"))
  //   .on("content.delta", ({ snapshot, parsed }) => {
  //   console.log("content:", snapshot);
  //   console.log("parsed:", parsed);
  //   console.log();
  // })
  // .on("content.done", (props) => {
  //   console.log(props);
  // });
return stream;
// await stream.done();

// const finalCompletion = await stream.finalChatCompletion();

// console.log(finalCompletion);
// return finalCompletion

}

async function callOpenAICompletionsParse(model, llm_message_content) {
    const requestBody = getChatCompletionRequestBody(model, llm_message_content);
  return openai.chat.completions.parse({
    ...requestBody,  
  }
  );
}

async function callOpenAIParse(model, llm_message_content) {
  return openai.responses.parse({
    model: model,
    input: [
      {
        role: "system",
        content:
          "You are an expert at structured data extraction. You will be given unstructured text from a research paper and should convert it into the given structure.",
      },
      { role: "user", content: llm_message_content },
    ],
    text: {
      format: zodTextFormat(VoxelModelArray, "voxel_model_array"),
    },
  });
}

async function callLlamaClient(systemContext, prompt) {
  /*
    As of Jan 2026, per
    https://github.blog/changelog/2025-05-08-upcoming-deprecations-for-llama-models-in-github-models/
    Github-hosted model options after deprecation:  
    "Llama-3.3-70B-Instruct";
    "Llama-4-Scout-17B-16E-Instruct";

  */
  const model = "Llama-4-Scout-17B-16E-Instruct"
  const llmMessageContent = getLLMMessageContent(systemContext, prompt);
  const response = await openai.chat.completions.parse({
    "model": model,
    "messages": [
      {
        "role": "system",
        "content": "Extract the data from the user input into the specified JSON format."
      },
      {
        "role": "user",
        "content": llmMessageContent

      }
    ],
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "VoxelModel",
        "schema": llmResponseSchema
      }
    }
  })

  return response?.choices[0].message.parsed;
}

async function callOpenAIClient(systemContext, prompt, stream=false) {
  const model = "gpt-4.1-mini";
  const llm_message_content = getLLMMessageContent(systemContext, prompt);
  const response = await callOpenAICompletionsParse(model, llm_message_content);
  console.log("OpenAI response:", response.choices[0].message.parsed?.voxel_model_array);
  return response.choices[0].message.parsed?.voxel_model_array;

};

export { callLlamaClient, callOpenAICompletionsStructuredStream };
export default callOpenAIClient;
