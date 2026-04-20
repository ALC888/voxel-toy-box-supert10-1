/**
 * Sedan Car Voxel Generator
 *
 * Produces concrete voxel coordinates for a compact sedan silhouette.
 * The output is deterministic and can be consumed by downstream mesh builders.
 */

export interface SedanCarConfig {
  color: {
    body: string;
    wheels: string;
    windows: string;
    front: string;
  };
  scale?: {
    wheelSize?: number;
    roofHeight?: number;
    windowSize?: number;
  };
  frontVariant?: 'simple_grille' | 'detailed_grille' | 'no_grille';
}

export interface VoxelCell {
  x: number;
  y: number;
  z: number;
  color: string;
  part: 'chassis' | 'roof' | 'windows' | 'wheels' | 'front' | 'lights';
}

export interface SedanCarVoxelModel {
  templateId: 'exp-sedan-car';
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  voxelSize: 1;
  voxels: VoxelCell[];
  palette: {
    body: string;
    wheels: string;
    windows: string;
    front: string;
  };
  editableParts: {
    palette: { editable: true };
    wheels: { editable: true; range: [0.8, 1.2]; currentSize: number };
    roof: { editable: true; range: [0.9, 1.1]; currentHeight: number };
    windows: { editable: true; range: [0.8, 1.2]; currentSize: number };
    front: { editable: true; variants: ['simple_grille', 'detailed_grille', 'no_grille']; currentVariant: 'simple_grille' | 'detailed_grille' | 'no_grille' };
  };
  stats: {
    totalVoxels: number;
    partBreakdown: Record<VoxelCell['part'], number>;
  };
}

type PartName = VoxelCell['part'];

const SEDAN_VOXEL_BUDGET = {
  min: 140,
  max: 210,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function putVoxel(
  map: Map<string, VoxelCell>,
  x: number,
  y: number,
  z: number,
  color: string,
  part: PartName
): void {
  map.set(keyFor(x, y, z), { x, y, z, color, part });
}

function addCuboid(
  map: Map<string, VoxelCell>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  color: string,
  part: PartName
): void {
  for (let x = from.x; x <= to.x; x += 1) {
    for (let y = from.y; y <= to.y; y += 1) {
      for (let z = from.z; z <= to.z; z += 1) {
        putVoxel(map, x, y, z, color, part);
      }
    }
  }
}

function addWheelPair(
  map: Map<string, VoxelCell>,
  xStart: number,
  wheelThickness: number,
  wheelColor: string
): void {
  for (let x = xStart; x < xStart + 2; x += 1) {
    putVoxel(map, x, 0, 0, wheelColor, 'wheels');
    putVoxel(map, x, 3, 0, wheelColor, 'wheels');
    if (wheelThickness === 2) {
      putVoxel(map, x, 0, 1, wheelColor, 'wheels');
      putVoxel(map, x, 3, 1, wheelColor, 'wheels');
    }
  }
}

function countParts(voxels: VoxelCell[]): Record<VoxelCell['part'], number> {
  const parts: Record<VoxelCell['part'], number> = {
    chassis: 0,
    roof: 0,
    windows: 0,
    wheels: 0,
    front: 0,
    lights: 0,
  };
  voxels.forEach((voxel) => {
    parts[voxel.part] += 1;
  });
  return parts;
}

/**
 * Returns a strongly-typed in-memory voxel model.
 */
export function generateSedanCarModel(config: SedanCarConfig): SedanCarVoxelModel {
  const { color, scale = {} } = config;
  const wheelSize = clamp(scale.wheelSize ?? 1.0, 0.8, 1.2);
  const roofHeight = clamp(scale.roofHeight ?? 1.0, 0.9, 1.1);
  const windowSize = clamp(scale.windowSize ?? 1.0, 0.8, 1.2);
  const frontVariant = config.frontVariant ?? 'detailed_grille';

  const voxels = new Map<string, VoxelCell>();

  // Main body (x: 0-7, y: 0-3, z: 1-3)
  addCuboid(voxels, { x: 0, y: 0, z: 1 }, { x: 7, y: 3, z: 3 }, color.body, 'chassis');

  // Lower chassis strip increases structural thickness and keeps voxel count in-budget.
  addCuboid(voxels, { x: 0, y: 1, z: 0 }, { x: 7, y: 2, z: 0 }, color.body, 'chassis');

  // Roof block with optional extra roof layer when roofHeight is high.
  addCuboid(voxels, { x: 2, y: 0, z: 4 }, { x: 5, y: 3, z: 4 }, color.body, 'roof');
  if (roofHeight > 1.04) {
    addCuboid(voxels, { x: 3, y: 1, z: 5 }, { x: 4, y: 2, z: 5 }, color.body, 'roof');
  }

  // Side windows on both sides.
  addCuboid(voxels, { x: 2, y: 0, z: 3 }, { x: 5, y: 0, z: 4 }, color.windows, 'windows');
  addCuboid(voxels, { x: 2, y: 3, z: 3 }, { x: 5, y: 3, z: 4 }, color.windows, 'windows');
  if (windowSize > 1.04) {
    putVoxel(voxels, 1, 0, 3, color.windows, 'windows');
    putVoxel(voxels, 6, 0, 3, color.windows, 'windows');
    putVoxel(voxels, 1, 3, 3, color.windows, 'windows');
    putVoxel(voxels, 6, 3, 3, color.windows, 'windows');
  }

  // Side mirrors provide stable detail and keep baseline voxel count in-budget.
  putVoxel(voxels, 6, 0, 4, color.front, 'front');
  putVoxel(voxels, 6, 3, 4, color.front, 'front');

  // Front section and lights.
  addCuboid(voxels, { x: 7, y: 1, z: 1 }, { x: 7, y: 2, z: 2 }, color.front, 'front');
  putVoxel(voxels, 7, 0, 1, '#f8f8c8', 'lights');
  putVoxel(voxels, 7, 3, 1, '#f8f8c8', 'lights');

  if (frontVariant === 'simple_grille') {
    putVoxel(voxels, 7, 1, 0, color.front, 'front');
    putVoxel(voxels, 7, 2, 0, color.front, 'front');
  } else if (frontVariant === 'detailed_grille') {
    addCuboid(voxels, { x: 7, y: 1, z: 0 }, { x: 7, y: 2, z: 0 }, color.front, 'front');
    putVoxel(voxels, 6, 1, 1, color.front, 'front');
    putVoxel(voxels, 6, 2, 1, color.front, 'front');
  }

  // Rear bumper strip.
  addCuboid(voxels, { x: 0, y: 1, z: 1 }, { x: 0, y: 2, z: 1 }, color.front, 'front');
  putVoxel(voxels, 0, 0, 0, '#d74a4a', 'lights');
  putVoxel(voxels, 0, 3, 0, '#d74a4a', 'lights');

  // Wheels: two pairs, thickness depends on wheelSize.
  const wheelThickness = wheelSize >= 1.0 ? 2 : 1;
  addWheelPair(voxels, 1, wheelThickness, color.wheels);
  addWheelPair(voxels, 5, wheelThickness, color.wheels);

  // Fill wheel arches for larger wheels so silhouette remains balanced.
  if (wheelSize > 1.08) {
    putVoxel(voxels, 1, 0, 2, color.body, 'chassis');
    putVoxel(voxels, 2, 0, 2, color.body, 'chassis');
    putVoxel(voxels, 5, 0, 2, color.body, 'chassis');
    putVoxel(voxels, 6, 0, 2, color.body, 'chassis');
    putVoxel(voxels, 1, 3, 2, color.body, 'chassis');
    putVoxel(voxels, 2, 3, 2, color.body, 'chassis');
    putVoxel(voxels, 5, 3, 2, color.body, 'chassis');
    putVoxel(voxels, 6, 3, 2, color.body, 'chassis');
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

  if (voxelArray.length < SEDAN_VOXEL_BUDGET.min || voxelArray.length > SEDAN_VOXEL_BUDGET.max) {
    throw new Error(
      `Generated sedan voxel count ${voxelArray.length} is out of budget range ` +
      `[${SEDAN_VOXEL_BUDGET.min}, ${SEDAN_VOXEL_BUDGET.max}].`
    );
  }

  return {
    templateId: 'exp-sedan-car',
    bounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 7, y: 3, z: roofHeight > 1.04 ? 5 : 4 },
    },
    voxelSize: 1,
    voxels: voxelArray,
    palette: {
      body: color.body,
      wheels: color.wheels,
      windows: color.windows,
      front: color.front,
    },
    editableParts: {
      palette: {
        editable: true,
      },
      wheels: {
        editable: true,
        currentSize: wheelSize,
        range: [0.8, 1.2],
      },
      roof: {
        editable: true,
        currentHeight: roofHeight,
        range: [0.9, 1.1],
      },
      windows: {
        editable: true,
        currentSize: windowSize,
        range: [0.8, 1.2],
      },
      front: {
        editable: true,
        variants: ['simple_grille', 'detailed_grille', 'no_grille'],
        currentVariant: frontVariant,
      },
    },
    stats: {
      totalVoxels: voxelArray.length,
      partBreakdown: countParts(voxelArray),
    },
  };
}

/**
 * Backward-compatible output used by existing registry references.
 */
export function generateSedanCar(config: SedanCarConfig): string {
  return JSON.stringify(generateSedanCarModel(config));
}

/**
 * Preset color schemes for sedan cars
 */
export const SEDAN_CAR_PRESETS = {
  red_taxi: {
    color: {
      body: '#ff0000',
      wheels: '#000000',
      windows: '#87ceeb',
      front: '#cc0000',
    },
  },
  blue_sedan: {
    color: {
      body: '#0066cc',
      wheels: '#000000',
      windows: '#87ceeb',
      front: '#003399',
    },
  },
  white_city_car: {
    color: {
      body: '#ffffff',
      wheels: '#333333',
      windows: '#87ceeb',
      front: '#eeeeee',
    },
  },
  yellow_taxi: {
    color: {
      body: '#ffff00',
      wheels: '#000000',
      windows: '#87ceeb',
      front: '#ffcc00',
    },
  },
};
