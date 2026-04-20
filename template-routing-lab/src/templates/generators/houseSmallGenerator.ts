/**
 * Small House Voxel Generator
 *
 * Generates concrete voxel coordinates for exp-house-small.
 */

export interface HouseSmallConfig {
  color: {
    walls: string;
    roof: string;
    windows: string;
    door: string;
    chimney: string;
  };
  scale?: {
    roofHeight?: number; // 0.9 - 1.2
    windowSize?: number; // 0.8 - 1.2
    chimneyHeight?: number; // 0.8 - 1.3
  };
  roofStyle?: 'gable' | 'flat' | 'steep';
}

export interface HouseVoxelCell {
  x: number;
  y: number;
  z: number;
  color: string;
  part: 'walls' | 'roof' | 'windows' | 'door' | 'chimney';
}

export interface HouseSmallVoxelModel {
  templateId: 'exp-house-small';
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  voxelSize: 1;
  voxels: HouseVoxelCell[];
  palette: HouseSmallConfig['color'];
  editableParts: {
    palette: { editable: true };
    roof: { editable: true; variants: ['gable', 'flat', 'steep']; currentVariant: 'gable' | 'flat' | 'steep'; currentHeight: number; range: [0.9, 1.2] };
    windows: { editable: true; currentSize: number; range: [0.8, 1.2] };
    door: { editable: true };
    chimney: { editable: true; currentHeight: number; range: [0.8, 1.3] };
  };
  stats: {
    totalVoxels: number;
    partBreakdown: Record<HouseVoxelCell['part'], number>;
  };
}

const HOUSE_VOXEL_BUDGET = {
  min: 145,
  max: 220,
} as const;

type HousePart = HouseVoxelCell['part'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function putVoxel(
  map: Map<string, HouseVoxelCell>,
  x: number,
  y: number,
  z: number,
  color: string,
  part: HousePart
): void {
  map.set(keyFor(x, y, z), { x, y, z, color, part });
}

function addCuboid(
  map: Map<string, HouseVoxelCell>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  color: string,
  part: HousePart
): void {
  for (let x = from.x; x <= to.x; x += 1) {
    for (let y = from.y; y <= to.y; y += 1) {
      for (let z = from.z; z <= to.z; z += 1) {
        putVoxel(map, x, y, z, color, part);
      }
    }
  }
}

function countParts(voxels: HouseVoxelCell[]): Record<HouseVoxelCell['part'], number> {
  const parts: Record<HouseVoxelCell['part'], number> = {
    walls: 0,
    roof: 0,
    windows: 0,
    door: 0,
    chimney: 0,
  };
  voxels.forEach((voxel) => {
    parts[voxel.part] += 1;
  });
  return parts;
}

export function generateSmallHouseModel(config: HouseSmallConfig): HouseSmallVoxelModel {
  const { color, scale = {} } = config;
  const roofHeight = clamp(scale.roofHeight ?? 1.0, 0.9, 1.2);
  const windowSize = clamp(scale.windowSize ?? 1.0, 0.8, 1.2);
  const chimneyHeight = clamp(scale.chimneyHeight ?? 1.0, 0.8, 1.3);
  const roofStyle = config.roofStyle ?? 'gable';

  const voxels = new Map<string, HouseVoxelCell>();

  // Walls block: 8 x 8 x 2 to fit template budget while preserving silhouette.
  addCuboid(voxels, { x: 0, y: 0, z: 0 }, { x: 7, y: 7, z: 1 }, color.walls, 'walls');

  // Hollow center for interior space while keeping shell thickness.
  addCuboid(voxels, { x: 1, y: 1, z: 1 }, { x: 6, y: 6, z: 1 }, color.walls, 'walls');
  for (let x = 1; x <= 6; x += 1) {
    for (let y = 1; y <= 6; y += 1) {
      for (let z = 1; z <= 1; z += 1) {
        voxels.delete(keyFor(x, y, z));
      }
    }
  }

  // Door (front center)
  addCuboid(voxels, { x: 3, y: 0, z: 0 }, { x: 4, y: 0, z: 1 }, color.door, 'door');

  // Windows (front, side, back)
  putVoxel(voxels, 1, 0, 1, color.windows, 'windows');
  putVoxel(voxels, 6, 0, 1, color.windows, 'windows');
  putVoxel(voxels, 0, 3, 1, color.windows, 'windows');
  putVoxel(voxels, 7, 3, 1, color.windows, 'windows');
  putVoxel(voxels, 3, 7, 1, color.windows, 'windows');
  putVoxel(voxels, 4, 7, 1, color.windows, 'windows');

  if (windowSize > 1.04) {
    putVoxel(voxels, 1, 0, 2, color.windows, 'windows');
    putVoxel(voxels, 6, 0, 2, color.windows, 'windows');
    putVoxel(voxels, 0, 4, 1, color.windows, 'windows');
    putVoxel(voxels, 7, 4, 1, color.windows, 'windows');
  }

  if (roofStyle === 'flat') {
    // Flat roof keeps full cap coverage.
    addCuboid(voxels, { x: 0, y: 0, z: 3 }, { x: 7, y: 7, z: 3 }, color.roof, 'roof');
    if (roofHeight > 1.05) {
      addCuboid(voxels, { x: 1, y: 1, z: 4 }, { x: 6, y: 6, z: 4 }, color.roof, 'roof');
    }
  } else if (roofStyle === 'gable') {
    // Gable roof keeps dense first layer plus narrower ridge.
    addCuboid(voxels, { x: 0, y: 0, z: 3 }, { x: 7, y: 7, z: 3 }, color.roof, 'roof');
    addCuboid(voxels, { x: 1, y: 0, z: 4 }, { x: 6, y: 7, z: 4 }, color.roof, 'roof');
    if (roofHeight > 1.05) {
      addCuboid(voxels, { x: 2, y: 1, z: 5 }, { x: 5, y: 6, z: 5 }, color.roof, 'roof');
    }
  } else {
    // Steep roof uses a slimmer stack to stay inside voxel budget.
    addCuboid(voxels, { x: 1, y: 1, z: 3 }, { x: 6, y: 6, z: 3 }, color.roof, 'roof');
    addCuboid(voxels, { x: 2, y: 2, z: 4 }, { x: 5, y: 5, z: 4 }, color.roof, 'roof');
    addCuboid(voxels, { x: 3, y: 3, z: 5 }, { x: 4, y: 4, z: 5 }, color.roof, 'roof');
    if (roofHeight > 1.0) {
      addCuboid(voxels, { x: 3, y: 3, z: 6 }, { x: 4, y: 4, z: 6 }, color.roof, 'roof');
    }
  }

  // Chimney
  addCuboid(voxels, { x: 6, y: 5, z: 4 }, { x: 7, y: 6, z: 5 }, color.chimney, 'chimney');
  if (chimneyHeight > 1.05) {
    addCuboid(voxels, { x: 6, y: 5, z: 6 }, { x: 7, y: 6, z: 6 }, color.chimney, 'chimney');
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

  if (voxelArray.length < HOUSE_VOXEL_BUDGET.min || voxelArray.length > HOUSE_VOXEL_BUDGET.max) {
    throw new Error(
      `Generated house voxel count ${voxelArray.length} is out of budget range ` +
      `[${HOUSE_VOXEL_BUDGET.min}, ${HOUSE_VOXEL_BUDGET.max}].`
    );
  }

  const maxX = voxelArray.reduce((max, voxel) => Math.max(max, voxel.x), 0);
  const maxY = voxelArray.reduce((max, voxel) => Math.max(max, voxel.y), 0);
  const maxZ = voxelArray.reduce((max, voxel) => Math.max(max, voxel.z), 0);

  return {
    templateId: 'exp-house-small',
    bounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    voxelSize: 1,
    voxels: voxelArray,
    palette: color,
    editableParts: {
      palette: { editable: true },
      roof: {
        editable: true,
        variants: ['gable', 'flat', 'steep'],
        currentVariant: roofStyle,
        currentHeight: roofHeight,
        range: [0.9, 1.2],
      },
      windows: {
        editable: true,
        currentSize: windowSize,
        range: [0.8, 1.2],
      },
      door: { editable: true },
      chimney: {
        editable: true,
        currentHeight: chimneyHeight,
        range: [0.8, 1.3],
      },
    },
    stats: {
      totalVoxels: voxelArray.length,
      partBreakdown: countParts(voxelArray),
    },
  };
}

export function generateSmallHouse(config: HouseSmallConfig): string {
  return JSON.stringify(generateSmallHouseModel(config));
}

export const SMALL_HOUSE_PRESETS: Record<string, HouseSmallConfig> = {
  cozy_cabin: {
    color: {
      walls: '#c49a6c',
      roof: '#a23d2a',
      windows: '#87ceeb',
      door: '#6a3f20',
      chimney: '#8f8f8f',
    },
    roofStyle: 'gable',
  },
  white_suburban: {
    color: {
      walls: '#f3f3ef',
      roof: '#5a5a5a',
      windows: '#99c9ef',
      door: '#7b4a2a',
      chimney: '#808080',
    },
    roofStyle: 'flat',
  },
  red_roof_house: {
    color: {
      walls: '#e4d4bf',
      roof: '#b82525',
      windows: '#8bd2ff',
      door: '#5b341d',
      chimney: '#7f7f7f',
    },
    roofStyle: 'steep',
  },
};
