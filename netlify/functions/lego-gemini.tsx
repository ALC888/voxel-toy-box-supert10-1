import { Config, Context } from "@netlify/functions";
  // import callGeminiStream from '@/netlify/model/gemini';
import callGeminiStream from "netlify/model/gemini"

import callOpenAIClient, { callLlamaClient } from '@/netlify/model/openai';
export default async (req: Request, context: Context) => {
    // const { greeting } = require(`./languages/${lang}.json`);

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // const response = await callOpenrouter(systemContext);
  // const rawResponse = response?.text;
  // const rawData = JSON.parse(rawResponse);

  // const response = await callOpenAIClient(systemContext);
  // const rawResponse = response;
  try {
    // const {systemContext} = context.params;
    console.log("Received request in lego-gemini function");
    const data = await req.json();
   //Bian Ziling 
    //update: support either `options` or legacy/new frontend `params`.
    const { systemContext, prompt, options, params } = data;
    const generationOptions: GenerationOptions | undefined = options ?? params;

    console.log("Received systemContext:", systemContext);

    const response = await callGeminiStream(systemContext, prompt);
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          // Enqueue the chunk into the ReadableStream
          controller.enqueue(
            new TextEncoder().encode(chunk.text || "")
          );
        }

        controller.close(); // Close the stream when it's done
      }
    });

    return new Response(readableStream, {
      headers: {
        // This is the mimetype for server-sent events
        "content-type": "text/event-stream"
      }
    });
    // return response;
  } catch (error) {
    return new Response("Error: " + error.message, { status: 500 });

  }

  // const response = await callLlamaClient(systemContext);
  // const rawResponse = response;

  // const rawData = JSON.parse(rawResponse);
};

export const config: Config = {
  path: "/api/lego-gemini",
};
