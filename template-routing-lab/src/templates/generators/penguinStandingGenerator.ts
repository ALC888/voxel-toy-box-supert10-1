/**
 * Standing Penguin Voxel Generator
 *
 * Generates concrete voxel coordinates for exp-penguin-standing.
 */

export interface PenguinStandingConfig {
  color: {
    body: string;
    belly: string;
    beak: string;
    wings: string;
    feet: string;
  };
  scale?: {
    wingSpan?: number; // 0.8 - 1.3
    beakLength?: number; // 0.8 - 1.3
    bellySize?: number; // 0.8 - 1.2
  };
  headStyle?: 'rounded' | 'crest' | 'flat';
}

export interface PenguinVoxelCell {
  x: number;
  y: number;
  z: number;
  color: string;
  part: 'body' | 'belly' | 'beak' | 'wings' | 'feet' | 'head' | 'face';
}

export interface PenguinStandingVoxelModel {
  templateId: 'exp-penguin-standing';
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  voxelSize: 1;
  voxels: PenguinVoxelCell[];
  palette: PenguinStandingConfig['color'];
  editableParts: {
    palette: { editable: true };
    wings: { editable: true; currentSize: number; range: [0.8, 1.3] };
    beak: { editable: true; currentLength: number; range: [0.8, 1.3] };
    belly: { editable: true; currentSize: number; range: [0.8, 1.2] };
    head: { editable: true; variants: ['rounded', 'crest', 'flat']; currentVariant: 'rounded' | 'crest' | 'flat' };
  };
  stats: {
    totalVoxels: number;
    partBreakdown: Record<PenguinVoxelCell['part'], number>;
  };
}

const PENGUIN_VOXEL_BUDGET = {
  min: 135,
  max: 205,
} as const;

type PenguinPart = PenguinVoxelCell['part'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function putVoxel(
  map: Map<string, PenguinVoxelCell>,
  x: number,
  y: number,
  z: number,
  color: string,
  part: PenguinPart
): void {
  map.set(keyFor(x, y, z), { x, y, z, color, part });
}

function addCuboid(
  map: Map<string, PenguinVoxelCell>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  color: string,
  part: PenguinPart
): void {
  for (let x = from.x; x <= to.x; x += 1) {
    for (let y = from.y; y <= to.y; y += 1) {
      for (let z = from.z; z <= to.z; z += 1) {
        putVoxel(map, x, y, z, color, part);
      }
    }
  }
}

function countParts(voxels: PenguinVoxelCell[]): Record<PenguinVoxelCell['part'], number> {
  const parts: Record<PenguinVoxelCell['part'], number> = {
    body: 0,
    belly: 0,
    beak: 0,
    wings: 0,
    feet: 0,
    head: 0,
    face: 0,
  };
  voxels.forEach((voxel) => {
    parts[voxel.part] += 1;
  });
  return parts;
}

export function generatePenguinStandingModel(config: PenguinStandingConfig): PenguinStandingVoxelModel {
  const { color, scale = {} } = config;
  const wingSpan = clamp(scale.wingSpan ?? 1.0, 0.8, 1.3);
  const beakLength = clamp(scale.beakLength ?? 1.0, 0.8, 1.3);
  const bellySize = clamp(scale.bellySize ?? 1.0, 0.8, 1.2);
  const headStyle = config.headStyle ?? 'rounded';

  const voxels = new Map<string, PenguinVoxelCell>();

  // Body mass with a narrow upper torso.
  addCuboid(voxels, { x: 1, y: 1, z: 0 }, { x: 6, y: 4, z: 3 }, color.body, 'body');
  addCuboid(voxels, { x: 2, y: 1, z: 4 }, { x: 5, y: 4, z: 6 }, color.body, 'body');

  // Belly panel.
  addCuboid(voxels, { x: 3, y: 1, z: 1 }, { x: 4, y: 1, z: 5 }, color.belly, 'belly');
  if (bellySize > 1.05) {
    addCuboid(voxels, { x: 3, y: 2, z: 2 }, { x: 4, y: 2, z: 5 }, color.belly, 'belly');
  }

  // Wings.
  addCuboid(voxels, { x: 2, y: 0, z: 2 }, { x: 3, y: 0, z: 5 }, color.wings, 'wings');
  addCuboid(voxels, { x: 2, y: 5, z: 2 }, { x: 3, y: 5, z: 5 }, color.wings, 'wings');
  if (wingSpan > 1.05) {
    addCuboid(voxels, { x: 1, y: 0, z: 2 }, { x: 1, y: 0, z: 5 }, color.wings, 'wings');
    addCuboid(voxels, { x: 1, y: 5, z: 2 }, { x: 1, y: 5, z: 5 }, color.wings, 'wings');
  }

  // Beak.
  addCuboid(voxels, { x: 5, y: 2, z: 4 }, { x: 6, y: 3, z: 4 }, color.beak, 'beak');
  if (beakLength > 1.05) {
    addCuboid(voxels, { x: 7, y: 2, z: 4 }, { x: 7, y: 3, z: 4 }, color.beak, 'beak');
  }

  // Head cap styles.
  addCuboid(voxels, { x: 3, y: 2, z: 7 }, { x: 4, y: 3, z: 7 }, color.body, 'head');
  if (headStyle === 'crest') {
    putVoxel(voxels, 3, 2, 8, color.body, 'head');
    putVoxel(voxels, 4, 3, 8, color.body, 'head');
  } else if (headStyle === 'rounded') {
    addCuboid(voxels, { x: 3, y: 2, z: 8 }, { x: 4, y: 3, z: 8 }, color.body, 'head');
  }

  // Feet and face details.
  putVoxel(voxels, 0, 2, 0, color.feet, 'feet');
  putVoxel(voxels, 0, 3, 0, color.feet, 'feet');
  putVoxel(voxels, 7, 2, 0, color.feet, 'feet');
  putVoxel(voxels, 7, 3, 0, color.feet, 'feet');

  putVoxel(voxels, 5, 2, 5, '#111111', 'face');
  putVoxel(voxels, 5, 3, 5, '#111111', 'face');

  const voxelArray = Array.from(voxels.values()).sort((a, b) => {
    if (a.x !== b.x) {
      return a.x - b.x;
    }
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.z - b.z;
  });

  if (voxelArray.length < PENGUIN_VOXEL_BUDGET.min || voxelArray.length > PENGUIN_VOXEL_BUDGET.max) {
    throw new Error(
      `Generated penguin voxel count ${voxelArray.length} is out of budget range ` +
      `[${PENGUIN_VOXEL_BUDGET.min}, ${PENGUIN_VOXEL_BUDGET.max}].`
    );
  }

  const maxX = voxelArray.reduce((max, voxel) => Math.max(max, voxel.x), voxelArray[0].x);
  const maxY = voxelArray.reduce((max, voxel) => Math.max(max, voxel.y), voxelArray[0].y);
  const maxZ = voxelArray.reduce((max, voxel) => Math.max(max, voxel.z), voxelArray[0].z);

  return {
    templateId: 'exp-penguin-standing',
    bounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    voxelSize: 1,
    voxels: voxelArray,
    palette: color,
    editableParts: {
      palette: { editable: true },
      wings: {
        editable: true,
        currentSize: wingSpan,
        range: [0.8, 1.3],
      },
      beak: {
        editable: true,
        currentLength: beakLength,
        range: [0.8, 1.3],
      },
      belly: {
        editable: true,
        currentSize: bellySize,
        range: [0.8, 1.2],
      },
      head: {
        editable: true,
        variants: ['rounded', 'crest', 'flat'],
        currentVariant: headStyle,
      },
    },
    stats: {
      totalVoxels: voxelArray.length,
      partBreakdown: countParts(voxelArray),
    },
  };
}

export function generatePenguinStanding(config: PenguinStandingConfig): string {
  return JSON.stringify(generatePenguinStandingModel(config));
}

export const PENGUIN_STANDING_PRESETS: Record<string, PenguinStandingConfig> = {
  classic_penguin: {
    color: {
      body: '#1f2430',
      belly: '#f4f6f9',
      beak: '#f0b429',
      wings: '#1f2430',
      feet: '#e39b2d',
    },
    headStyle: 'rounded',
  },
  baby_penguin: {
    color: {
      body: '#3a3f4d',
      belly: '#f8f8f4',
      beak: '#f2bc3d',
      wings: '#3a3f4d',
      feet: '#e7aa33',
    },
    headStyle: 'flat',
  },
  mascot_penguin: {
    color: {
      body: '#202530',
      belly: '#ffffff',
      beak: '#f3c341',
      wings: '#202530',
      feet: '#f0a83a',
    },
    headStyle: 'crest',
  },
};
