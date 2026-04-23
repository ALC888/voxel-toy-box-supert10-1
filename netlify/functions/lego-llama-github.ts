import { Config, Context } from "@netlify/functions";

import {callLlamaClient} from '@/netlify/model/openai';
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
        console.log("Received request in lego-llama-github function");
        const data = await req.json(); 
        const {systemContext, prompt } = data;
        // console.log("Received systemContext:", systemContext);

        const voxel_arrays = await callLlamaClient(systemContext, prompt);
        const response = new Response(
            JSON.stringify(voxel_arrays), { status: 200 }
        );
        // const response = await callLlamaClient(systemContext, prompt);
        //         // const response = context.waitUntil(callGemini(systemContext, prompt));
        return response;
                } catch (error) {
                      return new Response("Error: " + error.message, { status: 500 });

                }

        // const response = await callLlamaClient(systemContext);
                        // const rawResponse = response;

        // const rawData = JSON.parse(rawResponse);
};

export const config:Config = {
  path: "/api/lego-llama-github",
};