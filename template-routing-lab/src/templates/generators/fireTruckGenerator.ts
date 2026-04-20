/**
 * Fire Truck Voxel Generator
 *
 * Generates concrete voxel coordinates for exp-fire-truck.
 */

export interface FireTruckConfig {
  color: {
    body: string;
    stripe: string;
    roof: string;
    wheels: string;
    ladder: string;
  };
  scale?: {
    wheelSize?: number; // 0.8 - 1.2
    roofHeight?: number; // 0.9 - 1.2
    ladderLength?: number; // 0.8 - 1.2
  };
  ladderStyle?: 'compact' | 'extended' | 'rescue';
}

export interface FireTruckVoxelCell {
  x: number;
  y: number;
  z: number;
  color: string;
  part: 'body' | 'cab' | 'roof' | 'wheels' | 'ladder' | 'lights' | 'front';
}

export interface FireTruckVoxelModel {
  templateId: 'exp-fire-truck';
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  voxelSize: 1;
  voxels: FireTruckVoxelCell[];
  palette: FireTruckConfig['color'];
  editableParts: {
    palette: { editable: true };
    ladder: {
      editable: true;
      variants: ['compact', 'extended', 'rescue'];
      currentVariant: 'compact' | 'extended' | 'rescue';
      currentLength: number;
      range: [0.8, 1.2];
    };
    roof: { editable: true; currentHeight: number; range: [0.9, 1.2] };
    front: { editable: true };
    wheels: { editable: true; currentSize: number; range: [0.8, 1.2] };
  };
  stats: {
    totalVoxels: number;
    partBreakdown: Record<FireTruckVoxelCell['part'], number>;
  };
}

const FIRE_TRUCK_VOXEL_BUDGET = {
  min: 160,
  max: 230,
} as const;

type FirePart = FireTruckVoxelCell['part'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function putVoxel(
  map: Map<string, FireTruckVoxelCell>,
  x: number,
  y: number,
  z: number,
  color: string,
  part: FirePart
): void {
  map.set(keyFor(x, y, z), { x, y, z, color, part });
}

function addCuboid(
  map: Map<string, FireTruckVoxelCell>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  color: string,
  part: FirePart
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
  map: Map<string, FireTruckVoxelCell>,
  xStart: number,
  wheelThickness: number,
  wheelColor: string
): void {
  for (let x = xStart; x < xStart + 2; x += 1) {
    putVoxel(map, x, 0, 0, wheelColor, 'wheels');
    putVoxel(map, x, 3, 0, wheelColor, 'wheels');
    if (wheelThickness >= 2) {
      putVoxel(map, x, 0, 1, wheelColor, 'wheels');
      putVoxel(map, x, 3, 1, wheelColor, 'wheels');
    }
  }
}

function countParts(voxels: FireTruckVoxelCell[]): Record<FireTruckVoxelCell['part'], number> {
  const parts: Record<FireTruckVoxelCell['part'], number> = {
    body: 0,
    cab: 0,
    roof: 0,
    wheels: 0,
    ladder: 0,
    lights: 0,
    front: 0,
  };

  voxels.forEach((voxel) => {
    parts[voxel.part] += 1;
  });

  return parts;
}

export function generateFireTruckModel(config: FireTruckConfig): FireTruckVoxelModel {
  const { color, scale = {} } = config;
  const wheelSize = clamp(scale.wheelSize ?? 1.0, 0.8, 1.2);
  const roofHeight = clamp(scale.roofHeight ?? 1.0, 0.9, 1.2);
  const ladderLength = clamp(scale.ladderLength ?? 1.0, 0.8, 1.2);
  const ladderStyle = config.ladderStyle ?? 'compact';

  const voxels = new Map<string, FireTruckVoxelCell>();

  // Main truck body and rear unit.
  addCuboid(voxels, { x: 0, y: 0, z: 1 }, { x: 11, y: 3, z: 3 }, color.body, 'body');
  addCuboid(voxels, { x: 4, y: 0, z: 1 }, { x: 10, y: 3, z: 4 }, color.body, 'body');

  // Front cab and bumper.
  addCuboid(voxels, { x: 0, y: 0, z: 1 }, { x: 3, y: 3, z: 4 }, color.body, 'cab');
  addCuboid(voxels, { x: 0, y: 1, z: 0 }, { x: 1, y: 2, z: 1 }, color.stripe, 'front');

  // Roof stripe and emergency lights.
  addCuboid(voxels, { x: 1, y: 0, z: 4 }, { x: 10, y: 3, z: 4 }, color.roof, 'roof');
  if (roofHeight > 1.05) {
    addCuboid(voxels, { x: 2, y: 1, z: 5 }, { x: 9, y: 2, z: 5 }, color.roof, 'roof');
  }
  putVoxel(voxels, 2, 1, 5, '#3b77ff', 'lights');
  putVoxel(voxels, 2, 2, 5, '#ff3b3b', 'lights');

  // Side stripe.
  addCuboid(voxels, { x: 2, y: 0, z: 2 }, { x: 10, y: 0, z: 2 }, color.stripe, 'body');
  addCuboid(voxels, { x: 2, y: 3, z: 2 }, { x: 10, y: 3, z: 2 }, color.stripe, 'body');

  // Ladder variants.
  addCuboid(voxels, { x: 4, y: 1, z: 5 }, { x: 8, y: 2, z: 5 }, color.ladder, 'ladder');
  if (ladderStyle === 'extended' || ladderLength > 1.05) {
    addCuboid(voxels, { x: 9, y: 1, z: 5 }, { x: 11, y: 2, z: 5 }, color.ladder, 'ladder');
  }
  if (ladderStyle === 'rescue') {
    putVoxel(voxels, 6, 1, 6, color.ladder, 'ladder');
    putVoxel(voxels, 7, 1, 6, color.ladder, 'ladder');
    putVoxel(voxels, 6, 2, 6, color.ladder, 'ladder');
    putVoxel(voxels, 7, 2, 6, color.ladder, 'ladder');
  }

  const wheelThickness = wheelSize >= 1.0 ? 2 : 1;
  addWheelPair(voxels, 1, wheelThickness, color.wheels);
  addWheelPair(voxels, 5, wheelThickness, color.wheels);
  addWheelPair(voxels, 9, wheelThickness, color.wheels);

  if (wheelSize > 1.08) {
    putVoxel(voxels, 1, 0, 2, color.body, 'body');
    putVoxel(voxels, 2, 0, 2, color.body, 'body');
    putVoxel(voxels, 9, 0, 2, color.body, 'body');
    putVoxel(voxels, 10, 0, 2, color.body, 'body');
    putVoxel(voxels, 1, 3, 2, color.body, 'body');
    putVoxel(voxels, 2, 3, 2, color.body, 'body');
    putVoxel(voxels, 9, 3, 2, color.body, 'body');
    putVoxel(voxels, 10, 3, 2, color.body, 'body');
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

  if (
    voxelArray.length < FIRE_TRUCK_VOXEL_BUDGET.min ||
    voxelArray.length > FIRE_TRUCK_VOXEL_BUDGET.max
  ) {
    throw new Error(
      `Generated fire truck voxel count ${voxelArray.length} is out of budget range ` +
      `[${FIRE_TRUCK_VOXEL_BUDGET.min}, ${FIRE_TRUCK_VOXEL_BUDGET.max}].`
    );
  }

  const maxX = voxelArray.reduce((max, voxel) => Math.max(max, voxel.x), 0);
  const maxY = voxelArray.reduce((max, voxel) => Math.max(max, voxel.y), 0);
  const maxZ = voxelArray.reduce((max, voxel) => Math.max(max, voxel.z), 0);

  return {
    templateId: 'exp-fire-truck',
    bounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    voxelSize: 1,
    voxels: voxelArray,
    palette: color,
    editableParts: {
      palette: { editable: true },
      ladder: {
        editable: true,
        variants: ['compact', 'extended', 'rescue'],
        currentVariant: ladderStyle,
        currentLength: ladderLength,
        range: [0.8, 1.2],
      },
      roof: {
        editable: true,
        currentHeight: roofHeight,
        range: [0.9, 1.2],
      },
      front: {
        editable: true,
      },
      wheels: {
        editable: true,
        currentSize: wheelSize,
        range: [0.8, 1.2],
      },
    },
    stats: {
      totalVoxels: voxelArray.length,
      partBreakdown: countParts(voxelArray),
    },
  };
}

export function generateFireTruck(config: FireTruckConfig): string {
  return JSON.stringify(generateFireTruckModel(config));
}

export const FIRE_TRUCK_PRESETS: Record<string, FireTruckConfig> = {
  city_rescue: {
    color: {
      body: '#d8332f',
      stripe: '#f4f4f4',
      roof: '#b32522',
      wheels: '#1f1f1f',
      ladder: '#d0d0d0',
    },
    ladderStyle: 'compact',
  },
  extended_ladder: {
    color: {
      body: '#cc2f2b',
      stripe: '#f4f4f4',
      roof: '#a82421',
      wheels: '#202020',
      ladder: '#c8c8c8',
    },
    ladderStyle: 'extended',
  },
  rescue_unit: {
    color: {
      body: '#d63b35',
      stripe: '#f9f9f9',
      roof: '#ad2723',
      wheels: '#1f1f1f',
      ladder: '#cfcfcf',
    },
    ladderStyle: 'rescue',
  },
};
