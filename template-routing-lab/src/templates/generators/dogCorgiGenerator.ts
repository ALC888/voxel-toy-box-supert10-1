/**
 * Corgi Dog Voxel Generator
 *
 * Generates concrete voxel coordinates for exp-dog-corgi.
 */

export interface DogCorgiConfig {
  color: {
    body: string;
    legs: string;
    ears: string;
    snout: string;
    tail: string;
  };
  scale?: {
    earSize?: number; // 0.8 - 1.3
    tailLength?: number; // 0.8 - 1.3
    legLength?: number; // 0.8 - 1.3
    snoutLength?: number; // 0.8 - 1.3
  };
  faceStyle?: 'neutral' | 'happy' | 'alert';
}

export interface DogVoxelCell {
  x: number;
  y: number;
  z: number;
  color: string;
  part: 'body' | 'legs' | 'ears' | 'snout' | 'tail' | 'face';
}

export interface DogCorgiVoxelModel {
  templateId: 'exp-dog-corgi';
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  voxelSize: 1;
  voxels: DogVoxelCell[];
  palette: DogCorgiConfig['color'];
  editableParts: {
    palette: { editable: true };
    ears: { editable: true; currentSize: number; range: [0.8, 1.3] };
    tail: { editable: true; currentLength: number; range: [0.8, 1.3] };
    legs: { editable: true; currentLength: number; range: [0.8, 1.3] };
    face: { editable: true; variants: ['neutral', 'happy', 'alert']; currentVariant: 'neutral' | 'happy' | 'alert' };
    snout: { editable: true; currentLength: number; range: [0.8, 1.3] };
  };
  stats: {
    totalVoxels: number;
    partBreakdown: Record<DogVoxelCell['part'], number>;
  };
}

const DOG_VOXEL_BUDGET = {
  min: 140,
  max: 210,
} as const;

type DogPart = DogVoxelCell['part'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function putVoxel(
  map: Map<string, DogVoxelCell>,
  x: number,
  y: number,
  z: number,
  color: string,
  part: DogPart
): void {
  map.set(keyFor(x, y, z), { x, y, z, color, part });
}

function addCuboid(
  map: Map<string, DogVoxelCell>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  color: string,
  part: DogPart
): void {
  for (let x = from.x; x <= to.x; x += 1) {
    for (let y = from.y; y <= to.y; y += 1) {
      for (let z = from.z; z <= to.z; z += 1) {
        putVoxel(map, x, y, z, color, part);
      }
    }
  }
}

function countParts(voxels: DogVoxelCell[]): Record<DogVoxelCell['part'], number> {
  const parts: Record<DogVoxelCell['part'], number> = {
    body: 0,
    legs: 0,
    ears: 0,
    snout: 0,
    tail: 0,
    face: 0,
  };
  voxels.forEach((voxel) => {
    parts[voxel.part] += 1;
  });
  return parts;
}

export function generateDogCorgiModel(config: DogCorgiConfig): DogCorgiVoxelModel {
  const { color, scale = {} } = config;
  const earSize = clamp(scale.earSize ?? 1.0, 0.8, 1.3);
  const tailLength = clamp(scale.tailLength ?? 1.0, 0.8, 1.3);
  const legLength = clamp(scale.legLength ?? 1.0, 0.8, 1.3);
  const snoutLength = clamp(scale.snoutLength ?? 1.0, 0.8, 1.3);
  const faceStyle = config.faceStyle ?? 'neutral';

  const voxels = new Map<string, DogVoxelCell>();

  // Main body mass
  addCuboid(voxels, { x: 0, y: 1, z: 1 }, { x: 8, y: 5, z: 2 }, color.body, 'body');
  // Back upper line
  addCuboid(voxels, { x: 1, y: 2, z: 3 }, { x: 7, y: 4, z: 3 }, color.body, 'body');

  // Head block
  addCuboid(voxels, { x: 7, y: 1, z: 2 }, { x: 10, y: 5, z: 4 }, color.body, 'body');

  // Legs (corgi short legs)
  const legTop = 1;
  const legBottom = legLength > 1.05 ? 0 : 1;
  addCuboid(voxels, { x: 1, y: 1, z: legBottom }, { x: 2, y: 2, z: legTop }, color.legs, 'legs');
  addCuboid(voxels, { x: 1, y: 4, z: legBottom }, { x: 2, y: 5, z: legTop }, color.legs, 'legs');
  addCuboid(voxels, { x: 6, y: 1, z: legBottom }, { x: 7, y: 2, z: legTop }, color.legs, 'legs');
  addCuboid(voxels, { x: 6, y: 4, z: legBottom }, { x: 7, y: 5, z: legTop }, color.legs, 'legs');

  // Ears
  addCuboid(voxels, { x: 8, y: 1, z: 5 }, { x: 8, y: 2, z: 5 }, color.ears, 'ears');
  addCuboid(voxels, { x: 8, y: 4, z: 5 }, { x: 8, y: 5, z: 5 }, color.ears, 'ears');
  if (earSize > 1.05) {
    putVoxel(voxels, 8, 1, 6, color.ears, 'ears');
    putVoxel(voxels, 8, 5, 6, color.ears, 'ears');
  }

  // Tail
  addCuboid(voxels, { x: 0, y: 2, z: 3 }, { x: 0, y: 4, z: 3 }, color.tail, 'tail');
  if (tailLength > 1.05) {
    addCuboid(voxels, { x: -1, y: 2, z: 3 }, { x: -1, y: 4, z: 3 }, color.tail, 'tail');
  }

  // Snout
  addCuboid(voxels, { x: 10, y: 2, z: 2 }, { x: 10, y: 4, z: 3 }, color.snout, 'snout');
  if (snoutLength > 1.05) {
    addCuboid(voxels, { x: 11, y: 2, z: 2 }, { x: 11, y: 4, z: 3 }, color.snout, 'snout');
  }

  // Face style details
  putVoxel(voxels, 10, 2, 4, '#111111', 'face');
  putVoxel(voxels, 10, 4, 4, '#111111', 'face');
  if (faceStyle === 'happy') {
    putVoxel(voxels, 10, 3, 2, '#ee8888', 'face');
    putVoxel(voxels, 10, 3, 1, '#ee8888', 'face');
  } else if (faceStyle === 'alert') {
    putVoxel(voxels, 9, 2, 4, '#111111', 'face');
    putVoxel(voxels, 9, 4, 4, '#111111', 'face');
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

  if (voxelArray.length < DOG_VOXEL_BUDGET.min || voxelArray.length > DOG_VOXEL_BUDGET.max) {
    throw new Error(
      `Generated dog voxel count ${voxelArray.length} is out of budget range ` +
      `[${DOG_VOXEL_BUDGET.min}, ${DOG_VOXEL_BUDGET.max}].`
    );
  }

  const maxX = voxelArray.reduce((max, voxel) => Math.max(max, voxel.x), 0);
  const maxY = voxelArray.reduce((max, voxel) => Math.max(max, voxel.y), 0);
  const maxZ = voxelArray.reduce((max, voxel) => Math.max(max, voxel.z), 0);
  const minX = voxelArray.reduce((min, voxel) => Math.min(min, voxel.x), 0);

  return {
    templateId: 'exp-dog-corgi',
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
      legs: {
        editable: true,
        currentLength: legLength,
        range: [0.8, 1.3],
      },
      face: {
        editable: true,
        variants: ['neutral', 'happy', 'alert'],
        currentVariant: faceStyle,
      },
      snout: {
        editable: true,
        currentLength: snoutLength,
        range: [0.8, 1.3],
      },
    },
    stats: {
      totalVoxels: voxelArray.length,
      partBreakdown: countParts(voxelArray),
    },
  };
}

export function generateDogCorgi(config: DogCorgiConfig): string {
  return JSON.stringify(generateDogCorgiModel(config));
}

export const DOG_CORGI_PRESETS: Record<string, DogCorgiConfig> = {
  classic_corgi: {
    color: {
      body: '#d89b5a',
      legs: '#f4efe8',
      ears: '#c98045',
      snout: '#f4efe8',
      tail: '#c98045',
    },
    faceStyle: 'neutral',
  },
  fluffy_corgi: {
    color: {
      body: '#e1a96d',
      legs: '#fff8f0',
      ears: '#cf8a4f',
      snout: '#fff8f0',
      tail: '#cf8a4f',
    },
    faceStyle: 'happy',
  },
  alert_corgi: {
    color: {
      body: '#c98d4f',
      legs: '#f6eee2',
      ears: '#b97841',
      snout: '#f6eee2',
      tail: '#b97841',
    },
    faceStyle: 'alert',
  },
};
