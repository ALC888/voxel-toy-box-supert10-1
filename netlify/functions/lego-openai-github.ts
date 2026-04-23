



import { Config, Context } from "@netlify/functions";

import callOpenAIClient, { callLlamaClient, callOpenAICompletionsStructuredStream } from '@/netlify/model/openai';
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // const response = await callOpenrouter(systemContext);
  // const rawResponse = response?.text;
  // const rawData = JSON.parse(rawResponse);

  // const rawResponse = response;
  try {
    // const {systemContext} = context.params;
    console.log("Received request in lego-openai-github function");
    const data = await req.json();
    const { systemContext, prompt, stream } = data;
    console.log( "stream:", stream);

    if (stream) {
    const stream = await callOpenAICompletionsStructuredStream(systemContext, prompt);

    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          // Enqueue the chunk into the ReadableStream
          // console.log("chunk:", chunk);
          controller.enqueue(
            new TextEncoder().encode(
              chunk.choices[0]?.delta?.content 
              || ""
            )
          );
        }

        controller.close(); // Close the stream when it's done
      }
    });

    return new Response(readableStream, {
      headers: {
        // This is the mimetype for server-sent events
        "content-type": "text/event-stream",
        // "Netlify-CDN-Cache-Control": "public, no-store"
      }
    });
  // for await (const event of stream) {
  // console.log(event);
// }


  }else{
    const voxel_arrays = await callOpenAIClient(systemContext, prompt);
    const response = new Response(
      JSON.stringify(voxel_arrays), { status: 200 }
    );
    // const response = await callLlamaClient(systemContext, prompt);
    //         // const response = context.waitUntil(callGemini(systemContext, prompt));
    return response;
    }

  } catch (error) {
    return new Response("Error: " + error.message, { status: 500 });

  }
};

export const config: Config = {
  // path: "/api/lego-openai-github",
};
