/**
 * City Bus Voxel Generator
 *
 * Generates concrete voxel coordinates for exp-bus-city.
 */

export interface BusCityConfig {
  color: {
    body: string;
    roof: string;
    windows: string;
    wheels: string;
    front: string;
  };
  scale?: {
    windowBandHeight?: number; // 0.8 - 1.2
    wheelSize?: number; // 0.8 - 1.2
    roofHeight?: number; // 0.9 - 1.2
  };
  frontStyle?: 'flat' | 'angled' | 'school';
}

export interface BusVoxelCell {
  x: number;
  y: number;
  z: number;
  color: string;
  part: 'body' | 'roof' | 'windows' | 'wheels' | 'front' | 'lights' | 'door';
}

export interface BusCityVoxelModel {
  templateId: 'exp-bus-city';
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  voxelSize: 1;
  voxels: BusVoxelCell[];
  palette: BusCityConfig['color'];
  editableParts: {
    palette: { editable: true };
    windows: { editable: true; currentHeight: number; range: [0.8, 1.2] };
    roof: {
      editable: true;
      currentHeight: number;
      range: [0.9, 1.2];
    };
    front: {
      editable: true;
      variants: ['flat', 'angled', 'school'];
      currentVariant: 'flat' | 'angled' | 'school';
    };
    wheels: { editable: true; currentSize: number; range: [0.8, 1.2] };
  };
  stats: {
    totalVoxels: number;
    partBreakdown: Record<BusVoxelCell['part'], number>;
  };
}

const BUS_VOXEL_BUDGET = {
  min: 155,
  max: 225,
} as const;

type BusPart = BusVoxelCell['part'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function keyFor(x: number, y: number, z: number): string {
  return `${x}:${y}:${z}`;
}

function putVoxel(
  map: Map<string, BusVoxelCell>,
  x: number,
  y: number,
  z: number,
  color: string,
  part: BusPart
): void {
  map.set(keyFor(x, y, z), { x, y, z, color, part });
}

function addCuboid(
  map: Map<string, BusVoxelCell>,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  color: string,
  part: BusPart
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
  map: Map<string, BusVoxelCell>,
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

function countParts(voxels: BusVoxelCell[]): Record<BusVoxelCell['part'], number> {
  const parts: Record<BusVoxelCell['part'], number> = {
    body: 0,
    roof: 0,
    windows: 0,
    wheels: 0,
    front: 0,
    lights: 0,
    door: 0,
  };

  voxels.forEach((voxel) => {
    parts[voxel.part] += 1;
  });

  return parts;
}

export function generateBusCityModel(config: BusCityConfig): BusCityVoxelModel {
  const { color, scale = {} } = config;
  const windowBandHeight = clamp(scale.windowBandHeight ?? 1.0, 0.8, 1.2);
  const wheelSize = clamp(scale.wheelSize ?? 1.0, 0.8, 1.2);
  const roofHeight = clamp(scale.roofHeight ?? 1.0, 0.9, 1.2);
  const frontStyle = config.frontStyle ?? 'flat';

  const voxels = new Map<string, BusVoxelCell>();

  // Main bus body and lower strip.
  addCuboid(voxels, { x: 0, y: 0, z: 1 }, { x: 11, y: 3, z: 3 }, color.body, 'body');
  addCuboid(voxels, { x: 0, y: 1, z: 0 }, { x: 11, y: 2, z: 0 }, color.body, 'body');

  // Roof cap.
  addCuboid(voxels, { x: 2, y: 0, z: 4 }, { x: 10, y: 3, z: 4 }, color.roof, 'roof');
  if (roofHeight > 1.05) {
    addCuboid(voxels, { x: 4, y: 1, z: 5 }, { x: 7, y: 2, z: 5 }, color.roof, 'roof');
  }

  // Window band on both sides.
  addCuboid(voxels, { x: 1, y: 0, z: 3 }, { x: 10, y: 0, z: 3 }, color.windows, 'windows');
  addCuboid(voxels, { x: 1, y: 3, z: 3 }, { x: 10, y: 3, z: 3 }, color.windows, 'windows');
  if (windowBandHeight > 1.05) {
    addCuboid(voxels, { x: 3, y: 0, z: 2 }, { x: 7, y: 0, z: 2 }, color.windows, 'windows');
    addCuboid(voxels, { x: 3, y: 3, z: 2 }, { x: 7, y: 3, z: 2 }, color.windows, 'windows');
  }

  // Door and marker lights.
  addCuboid(voxels, { x: 4, y: 0, z: 1 }, { x: 5, y: 0, z: 2 }, '#2f2f2f', 'door');
  putVoxel(voxels, 11, 1, 1, '#f8f2b0', 'lights');
  putVoxel(voxels, 11, 2, 1, '#f8f2b0', 'lights');
  putVoxel(voxels, 0, 1, 0, '#d74a4a', 'lights');
  putVoxel(voxels, 0, 2, 0, '#d74a4a', 'lights');

  // Front style variants.
  addCuboid(voxels, { x: 11, y: 1, z: 1 }, { x: 11, y: 2, z: 2 }, color.front, 'front');
  if (frontStyle === 'angled') {
    putVoxel(voxels, 10, 1, 1, color.front, 'front');
    putVoxel(voxels, 10, 2, 1, color.front, 'front');
  } else if (frontStyle === 'school') {
    addCuboid(voxels, { x: 10, y: 1, z: 0 }, { x: 11, y: 2, z: 0 }, color.front, 'front');
  }

  const wheelThickness = wheelSize >= 1.0 ? 2 : 1;
  addWheelPair(voxels, 1, wheelThickness, color.wheels);
  addWheelPair(voxels, 5, wheelThickness, color.wheels);
  addWheelPair(voxels, 9, wheelThickness, color.wheels);

  if (wheelSize > 1.08) {
    putVoxel(voxels, 1, 0, 2, color.body, 'body');
    putVoxel(voxels, 2, 0, 2, color.body, 'body');
    putVoxel(voxels, 1, 3, 2, color.body, 'body');
    putVoxel(voxels, 2, 3, 2, color.body, 'body');
    putVoxel(voxels, 9, 0, 2, color.body, 'body');
    putVoxel(voxels, 10, 0, 2, color.body, 'body');
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

  if (voxelArray.length < BUS_VOXEL_BUDGET.min || voxelArray.length > BUS_VOXEL_BUDGET.max) {
    throw new Error(
      `Generated bus voxel count ${voxelArray.length} is out of budget range ` +
      `[${BUS_VOXEL_BUDGET.min}, ${BUS_VOXEL_BUDGET.max}].`
    );
  }

  const maxX = voxelArray.reduce((max, voxel) => Math.max(max, voxel.x), 0);
  const maxY = voxelArray.reduce((max, voxel) => Math.max(max, voxel.y), 0);
  const maxZ = voxelArray.reduce((max, voxel) => Math.max(max, voxel.z), 0);

  return {
    templateId: 'exp-bus-city',
    bounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    voxelSize: 1,
    voxels: voxelArray,
    palette: color,
    editableParts: {
      palette: { editable: true },
      windows: {
        editable: true,
        currentHeight: windowBandHeight,
        range: [0.8, 1.2],
      },
      roof: {
        editable: true,
        currentHeight: roofHeight,
        range: [0.9, 1.2],
      },
      front: {
        editable: true,
        variants: ['flat', 'angled', 'school'],
        currentVariant: frontStyle,
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

export function generateBusCity(config: BusCityConfig): string {
  return JSON.stringify(generateBusCityModel(config));
}

export const BUS_CITY_PRESETS: Record<string, BusCityConfig> = {
  city_blue: {
    color: {
      body: '#2e66c7',
      roof: '#d7dde8',
      windows: '#8ecaf0',
      wheels: '#1f1f1f',
      front: '#1d4f9f',
    },
    frontStyle: 'flat',
  },
  school_yellow: {
    color: {
      body: '#f2bf2f',
      roof: '#f6d666',
      windows: '#97cdef',
      wheels: '#202020',
      front: '#c8931b',
    },
    frontStyle: 'school',
  },
  shuttle_white: {
    color: {
      body: '#efefef',
      roof: '#c8c8c8',
      windows: '#a6d9f5',
      wheels: '#2c2c2c',
      front: '#b4b4b4',
    },
    frontStyle: 'angled',
  },
};
