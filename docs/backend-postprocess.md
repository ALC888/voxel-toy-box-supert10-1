# Backend Postprocess And Netlify Function Notes

This document describes the backend work for Member 5: postprocessing and Netlify function orchestration.

## Implemented Responsibilities

- upgrade the Netlify entry function in `lego-gemini.tsx`
- support fast mode vs expert mode backend routing
- use pseudo-two-stage generation for fast mode
- use real two-stage generation for expert mode
- validate and repair voxel output
- return `warnings`, `stats`, and `templateMatch`
- provide structured error handling

## Backend Flow

### Fast mode

Fast mode is the transition version.

The backend does **not** ask the model to generate intent first.
Instead, it builds a lightweight local `ModelIntent` from:

- user prompt
- advanced params if provided

Then it sends one combined prompt to Gemini and gets voxel JSON back in a single model call.

### Expert mode

Expert mode uses a real two-stage flow.

Stage 1:

- input: prompt + advanced params
- output: `ModelIntent`

Stage 2:

- input: `ModelIntent`
- output: voxel JSON

## Response Shape

`/.netlify/functions/lego-gemini` now returns JSON like:

```json
{
  "success": true,
  "voxels": [
    { "x": 0, "y": 0, "z": 0, "color": 65280 }
  ],
  "warnings": [
    "Shifted model vertically by 2 to place the base at y=0."
  ],
  "stats": {
    "voxelCount": 120,
    "colorCount": 4,
    "dimensions": { "width": 12, "height": 14, "depth": 9 },
    "repaired": true,
    "removedVoxelCount": 3
  },
  "metadata": {
    "voxelCount": 120,
    "colorCount": 4,
    "dimensions": { "width": 12, "height": 14, "depth": 9 },
    "warnings": [
      "Shifted model vertically by 2 to place the base at y=0."
    ]
  },
  "templateMatch": {
    "matched": true,
    "templateName": "Cat",
    "confidence": 0.74,
    "templateInfo": "Matched Cat using prompt/intent keyword overlap."
  },
  "mode": "expert",
  "usedTwoStage": true,
  "intent": {
    "subject": "cute sitting cat",
    "style": "cartoon",
    "colorScheme": "pastel",
    "size": "medium",
    "symmetry": "bilateral",
    "voxelBudget": 200,
    "silhouetteKeywords": ["round head", "tail", "sitting pose"],
    "structuralRules": ["Keep all main parts connected."]
  }
}
```

## Added Files

- [netlify/utils/voxelPostprocess.ts](/C:/Users/15925/Documents/New project/voxel-toy-box-supert10-1-main/netlify/utils/voxelPostprocess.ts)
- [netlify/utils/templateMatcher.ts](/C:/Users/15925/Documents/New project/voxel-toy-box-supert10-1-main/netlify/utils/templateMatcher.ts)
- [docs/backend-postprocess.md](/C:/Users/15925/Documents/New project/voxel-toy-box-supert10-1-main/docs/backend-postprocess.md)

## Updated Files

- [netlify/functions/lego-gemini.tsx](/C:/Users/15925/Documents/New project/voxel-toy-box-supert10-1-main/netlify/functions/lego-gemini.tsx)
- [netlify/model/gemini.tsx](/C:/Users/15925/Documents/New project/voxel-toy-box-supert10-1-main/netlify/model/gemini.tsx)
- [types.ts](/C:/Users/15925/Documents/New project/voxel-toy-box-supert10-1-main/types.ts)
- [README.md](/C:/Users/15925/Documents/New project/voxel-toy-box-supert10-1-main/README.md)

## Validation And Repair Rules

Current repair logic includes:

- drop invalid voxels
- round coordinates to integers
- normalize colors
- remove duplicate coordinates
- shift base to `y=0`
- recenter model around `x=0`, `z=0`
- keep the largest connected component
- trim voxel count if it exceeds the intended budget too much

## Error Handling

When backend generation fails, the function returns:

- `success: false`
- `error`
- `errorCode`
- a fallback warning list

This makes the frontend easier to debug and keeps the response shape stable.
