[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/MlYCdgDq)
[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=23454891&assignment_repo_type=AssignmentRepo)
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1pF4WKSt5t07yj2fk7sCbL4EK6CO2_2dx

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Shared MVP Types

The shared request/response types for frontend-backend integration live in [types.ts](/C:/Users/33852/Desktop/voxel-toy-box-supert10-1-main/types.ts).

```ts
interface MVPRequest {
  prompt: string;
}

interface MVPResponse {
  success: boolean;
  voxels?: VoxelData[];
  error?: string;
}
```

## Gemini Backend Interface

The Netlify backend entry is `/.netlify/functions/lego-gemini`.

Request example:

```json
{
  "systemContext": "You are a creative voxel generator.",
  "prompt": "Build a cute voxel rabbit",
  "mode": "expert",
  "options": {
    "style": "cartoon",
    "colorScheme": "pastel",
    "size": "medium",
    "symmetry": "bilateral"
  }
}
```

Response fields include:

- `success`
- `voxels`
- `warnings`
- `stats`
- `metadata`
- `templateMatch`
- `mode`
- `usedTwoStage`
- `intent`
- `error` and `errorCode` on failure

More backend details are documented in [docs/backend-postprocess.md](/C:/Users/33852/Desktop/voxel-toy-box-supert10-1-main/docs/backend-postprocess.md).

## Member 2 Integration Notes

Member 2 owns the shared API contract and should coordinate with:

- Member 1: confirm frontend request payload and response field names
- Member 3: confirm `GenerationOptions` and `ModelIntent` field semantics
- Member 4: confirm template/database payloads can map to `TemplateMatchResult`
- Member 5: confirm `/.netlify/functions/lego-gemini` returns the unified backend response shape
- Member 6: confirm the renderer consumes `VoxelData[]` with numeric `color`

Current unified contract highlights:

- `LegoApiCallRequest` supports `prompt`, `systemContext`, `options`, `params`, `mode`, and `useTwoStage`
- `BackendGenerationResponse` returns `success`, `voxels`, `warnings`, `stats`, `metadata`, `templateMatch`, `mode`, `usedTwoStage`, `intent`, `error`, and `errorCode`
- `MVPResponse.voxels` is standardized as `VoxelData[]`
  
