/**
 * Sitting Fox Voxel Generator
 *
 * Generates concrete voxel coordinates for exp-fox-sitting.
 */

export interface FoxSittingConfig {
  color: {
    body: string;
    belly: string;
    ears: string;
    snout: string;
    tail: string;
  };
  scale?: {
    earSize?: number; // 0.8 - 1.3
    tailLength?: number; // 0.8 - 1.3
    snoutLength?: number; // 0.8 - 1.3
  };
  faceStyle?: 'neutral' | 'sly' | 'alert';
}

export interface FoxVoxelCell {
  x: number;
  y: number;
  z: number;
  color: string;
  part: 'body' | 'legs' | 'ears' | 'snout' | 'tail' | 'face' | 'belly';
}

export interface FoxSittingVoxelModel {
  templateId: 'exp-fox-sitting';
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  voxelSize: 1;
  voxels: FoxVoxelCell[];
  palette: FoxSittingConfig['color'];
  editableParts: {
    palette: { editable: true };
    ears: { editable: true; currentSize: number; range: [0.8, 1.3] };
    tail: { editable: true; currentLength: number; range: [0.8, 1.3] };
    snout: { editable: true; currentLength: number; range: [0.8, 1.3] };
    pose: { editable: true; variants: ['neutral', 'sly', 'alert']; currentVariant: 'neutral' | 'sly' | 'alert' };
  };
  stats: {
    totalVoxels: number;
    partBreakdown: Record<FoxVoxelCell['part'], number>;
  };
}

const FOX_VOXEL_BUDGET = {
  min: 145,
  max: 215,
} as const;

type FoxPart = FoxVoxelCell['part'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function putVoxel(
  map: Map<string, FoxVoxelCell>,
  x: number,
  y: number,
  z: number,
  color: string,
  part: FoxPart
): void {
  map.set(keyFor(x, y, z), { x, y, z, color, part });
}

function addCuboid(
  map: Map<string, FoxVoxelCell>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  color: string,
  part: FoxPart
): void {
  for (let x = from.x; x <= to.x; x += 1) {
    for (let y = from.y; y <= to.y; y += 1) {
      for (let z = from.z; z <= to.z; z += 1) {
        putVoxel(map, x, y, z, color, part);
      }
    }
  }
}

function countParts(voxels: FoxVoxelCell[]): Record<FoxVoxelCell['part'], number> {
  const parts: Record<FoxVoxelCell['part'], number> = {
    body: 0,
    legs: 0,
    ears: 0,
    snout: 0,
    tail: 0,
    face: 0,
    belly: 0,
  };
  voxels.forEach((voxel) => {
    parts[voxel.part] += 1;
  });
  return parts;
}

export function generateFoxSittingModel(config: FoxSittingConfig): FoxSittingVoxelModel {
  const { color, scale = {} } = config;
  const earSize = clamp(scale.earSize ?? 1.0, 0.8, 1.3);
  const tailLength = clamp(scale.tailLength ?? 1.0, 0.8, 1.3);
  const snoutLength = clamp(scale.snoutLength ?? 1.0, 0.8, 1.3);
  const faceStyle = config.faceStyle ?? 'neutral';

  const voxels = new Map<string, FoxVoxelCell>();

  // Main seated body and chest mass.
  addCuboid(voxels, { x: 1, y: 1, z: 1 }, { x: 8, y: 4, z: 3 }, color.body, 'body');
  addCuboid(voxels, { x: 6, y: 1, z: 2 }, { x: 9, y: 4, z: 4 }, color.body, 'body');
  addCuboid(voxels, { x: 0, y: 1, z: 2 }, { x: 2, y: 4, z: 3 }, color.body, 'body');

  // Front belly panel.
  addCuboid(voxels, { x: 7, y: 2, z: 1 }, { x: 9, y: 3, z: 3 }, color.belly, 'belly');

  // Legs (seated posture).
  addCuboid(voxels, { x: 4, y: 1, z: 0 }, { x: 5, y: 1, z: 1 }, color.body, 'legs');
  addCuboid(voxels, { x: 4, y: 4, z: 0 }, { x: 5, y: 4, z: 1 }, color.body, 'legs');

  // Tail wraps behind body.
  addCuboid(voxels, { x: -1, y: 3, z: 3 }, { x: 0, y: 4, z: 4 }, color.tail, 'tail');
  if (tailLength > 1.05) {
    addCuboid(voxels, { x: -2, y: 3, z: 3 }, { x: -2, y: 4, z: 4 }, color.tail, 'tail');
    putVoxel(voxels, -3, 3, 3, color.tail, 'tail');
    putVoxel(voxels, -3, 4, 3, color.tail, 'tail');
  }

  // Snout and ears.
  addCuboid(voxels, { x: 9, y: 2, z: 2 }, { x: 10, y: 3, z: 3 }, color.snout, 'snout');
  if (snoutLength > 1.05) {
    addCuboid(voxels, { x: 11, y: 2, z: 2 }, { x: 11, y: 3, z: 3 }, color.snout, 'snout');
  }

  addCuboid(voxels, { x: 8, y: 1, z: 5 }, { x: 8, y: 1, z: 6 }, color.ears, 'ears');
  addCuboid(voxels, { x: 8, y: 4, z: 5 }, { x: 8, y: 4, z: 6 }, color.ears, 'ears');
  if (earSize > 1.05) {
    putVoxel(voxels, 8, 1, 7, color.ears, 'ears');
    putVoxel(voxels, 8, 4, 7, color.ears, 'ears');
  }

  // Face detail variants.
  putVoxel(voxels, 10, 2, 4, '#111111', 'face');
  putVoxel(voxels, 10, 3, 4, '#111111', 'face');
  putVoxel(voxels, 10, 2, 2, '#101010', 'face');
  if (faceStyle === 'sly') {
    putVoxel(voxels, 9, 2, 4, '#111111', 'face');
    putVoxel(voxels, 10, 3, 2, '#d88484', 'face');
  } else if (faceStyle === 'alert') {
    putVoxel(voxels, 9, 2, 4, '#111111', 'face');
    putVoxel(voxels, 9, 3, 4, '#111111', 'face');
  }

  const voxelArray = Array.from(voxels.values()).sort((a, b) => {
    if (a.x !== b.x) {
      return a.x - b.x;
    }
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.z - b.z;
  });

  if (voxelArray.length < FOX_VOXEL_BUDGET.min || voxelArray.length > FOX_VOXEL_BUDGET.max) {
    throw new Error(
      `Generated fox voxel count ${voxelArray.length} is out of budget range ` +
      `[${FOX_VOXEL_BUDGET.min}, ${FOX_VOXEL_BUDGET.max}].`
    );
  }

  const maxX = voxelArray.reduce((max, voxel) => Math.max(max, voxel.x), voxelArray[0].x);
  const maxY = voxelArray.reduce((max, voxel) => Math.max(max, voxel.y), voxelArray[0].y);
  const maxZ = voxelArray.reduce((max, voxel) => Math.max(max, voxel.z), voxelArray[0].z);
  const minX = voxelArray.reduce((min, voxel) => Math.min(min, voxel.x), voxelArray[0].x);

  return {
    templateId: 'exp-fox-sitting',
    bounds: {
      min: { x: minX, y: 0, z: 0 },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    voxelSize: 1,
    voxels: voxelArray,
    palette: color,
    editableParts: {
      palette: { editable: true },
      ears: {
        editable: true,
        currentSize: earSize,
        range: [0.8, 1.3],
      },
      tail: {
        editable: true,
        currentLength: tailLength,
        range: [0.8, 1.3],
      },
      snout: {
        editable: true,
        currentLength: snoutLength,
        range: [0.8, 1.3],
      },
      pose: {
        editable: true,
        variants: ['neutral', 'sly', 'alert'],
        currentVariant: faceStyle,
      },
    },
    stats: {
      totalVoxels: voxelArray.length,
      partBreakdown: countParts(voxelArray),
    },
  };
}

export function generateFoxSitting(config: FoxSittingConfig): string {
  return JSON.stringify(generateFoxSittingModel(config));
}

export const FOX_SITTING_PRESETS: Record<string, FoxSittingConfig> = {
  classic_fox: {
    color: {
      body: '#d8752d',
      belly: '#f2e6d8',
      ears: '#b35325',
      snout: '#f2e6d8',
      tail: '#c55f2c',
    },
    faceStyle: 'neutral',
  },
  arctic_fox: {
    color: {
      body: '#ece9e0',
      belly: '#ffffff',
      ears: '#d7d1c7',
      snout: '#fdfdfc',
      tail: '#e1ddd4',
    },
    faceStyle: 'alert',
  },
  sunset_fox: {
    color: {
      body: '#dd6e38',
      belly: '#f5e8dc',
      ears: '#a64a23',
      snout: '#f5e8dc',
      tail: '#c95b2c',
    },
    faceStyle: 'sly',
  },
};
