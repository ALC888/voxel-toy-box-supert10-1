import callOpenRouterStream, { callOpenRouterStructuredTesting } from '@/netlify/model/openrouter';
import { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    console.log("Received request in lego-openrouter function");
    const data = await req.json();
    const { systemContext, prompt } = data;
    // console.log("Received systemContext:", systemContext);

    // const voxel_arrays = await callOpenRouter(systemContext, prompt);
    // const voxel_arrays = await callOpenRouterStructuredTesting(systemContext, prompt);
    // console.log("testing:", voxel_arrays);

    // const response = new Response(
    //         JSON.stringify(voxel_arrays), { status: 200 }
    //     );
    // return response;
    // Wrap the Stream<ChatCompletionChunk> in a ReadableStream
    const stream = await callOpenRouterStream(systemContext, prompt);
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          // Enqueue the chunk into the ReadableStream
          controller.enqueue(
            new TextEncoder().encode(chunk.choices[0]?.delta?.content || "")
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
  } catch (error) {
    return new Response("Error: " + error.message, { status: 500 });


  }
};

export const config: Config = {
  path: "/api/lego-openrouter",
};