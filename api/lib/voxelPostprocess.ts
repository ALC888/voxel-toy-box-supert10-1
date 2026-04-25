import type {
  GenerationMetadata,
  GenerationStats,
  VoxelData,
  VoxelValidationResult,
} from '../../types';

type RawVoxel = {
  x: number;
  y: number;
  z: number;
  color: string | number;
};

function toHexColor(input: string | number): number {
  if (typeof input === 'number') {
    return Math.max(0, Math.min(0xffffff, input));
  }

  const normalized = input.trim().replace(/^#/, '');
  const parsed = Number.parseInt(normalized, 16);
  return Number.isNaN(parsed) ? 0x999999 : Math.max(0, Math.min(0xffffff, parsed));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function computeDimensions(voxels: VoxelData[]) {
  if (voxels.length === 0) {
    return { width: 0, height: 0, depth: 0 };
  }

  const xs = voxels.map((voxel) => voxel.x);
  const ys = voxels.map((voxel) => voxel.y);
  const zs = voxels.map((voxel) => voxel.z);

  return {
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
    depth: Math.max(...zs) - Math.min(...zs) + 1,
  };
}

export function calculateMetadataFromVoxels(
  voxels: VoxelData[],
  warnings: string[] = []
): GenerationMetadata {
  const colorCount = new Set(voxels.map((voxel) => voxel.color)).size;
  return {
    voxelCount: voxels.length,
    colorCount,
    dimensions: computeDimensions(voxels),
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function keepLargestConnectedComponent(voxels: VoxelData[]): {
  voxels: VoxelData[];
  removedCount: number;
} {
  if (voxels.length <= 1) {
    return { voxels, removedCount: 0 };
  }

  const indexByCoord = new Map<string, number>();
  voxels.forEach((voxel, index) => {
    indexByCoord.set(`${voxel.x},${voxel.y},${voxel.z}`, index);
  });

  const neighbors = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  const visited = new Set<number>();
  let largestComponent: number[] = [];

  voxels.forEach((_, startIndex) => {
    if (visited.has(startIndex)) {
      return;
    }

    const stack = [startIndex];
    const component: number[] = [];
    visited.add(startIndex);

    while (stack.length > 0) {
      const currentIndex = stack.pop()!;
      component.push(currentIndex);
      const current = voxels[currentIndex];

      neighbors.forEach(([dx, dy, dz]) => {
        const neighborKey = `${current.x + dx},${current.y + dy},${current.z + dz}`;
        const neighborIndex = indexByCoord.get(neighborKey);
        if (neighborIndex !== undefined && !visited.has(neighborIndex)) {
          visited.add(neighborIndex);
          stack.push(neighborIndex);
        }
      });
    }

    if (component.length > largestComponent.length) {
      largestComponent = component;
    }
  });

  if (largestComponent.length === voxels.length) {
    return { voxels, removedCount: 0 };
  }

  const largestIndexSet = new Set(largestComponent);
  const filtered = voxels.filter((_, index) => largestIndexSet.has(index));
  return { voxels: filtered, removedCount: voxels.length - filtered.length };
}

export function validateAndRepairVoxelArray(
  rawVoxels: RawVoxel[],
  voxelBudget?: number
): VoxelValidationResult {
  const warnings: string[] = [];
  const normalized: VoxelData[] = [];
  const seen = new Set<string>();

  rawVoxels.forEach((voxel, index) => {
    if (
      !isFiniteNumber(voxel?.x) ||
      !isFiniteNumber(voxel?.y) ||
      !isFiniteNumber(voxel?.z)
    ) {
      warnings.push(`Dropped invalid voxel at index ${index}.`);
      return;
    }

    const repaired: VoxelData = {
      x: Math.round(voxel.x),
      y: Math.round(voxel.y),
      z: Math.round(voxel.z),
      color: toHexColor(voxel.color),
    };

    const key = `${repaired.x},${repaired.y},${repaired.z}`;
    if (seen.has(key)) {
      warnings.push(`Removed duplicate voxel at ${key}.`);
      return;
    }

    seen.add(key);
    normalized.push(repaired);
  });

  if (normalized.length === 0) {
    return {
      voxels: [],
      warnings: ['No valid voxels were returned by the model.'],
      stats: {
        voxelCount: 0,
        colorCount: 0,
        dimensions: { width: 0, height: 0, depth: 0 },
        repaired: warnings.length > 0,
      },
    };
  }

  let voxels = normalized;

  const minY = Math.min(...voxels.map((voxel) => voxel.y));
  if (minY !== 0) {
    voxels = voxels.map((voxel) => ({ ...voxel, y: voxel.y - minY }));
    warnings.push(`Shifted model vertically by ${-minY} to place the base at y=0.`);
  }

  const xs = voxels.map((voxel) => voxel.x);
  const zs = voxels.map((voxel) => voxel.z);
  const centerX = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
  const centerZ = Math.round((Math.min(...zs) + Math.max(...zs)) / 2);

  if (centerX !== 0 || centerZ !== 0) {
    voxels = voxels.map((voxel) => ({
      ...voxel,
      x: voxel.x - centerX,
      z: voxel.z - centerZ,
    }));
    warnings.push(`Recentered model around x=0, z=0 using offset (${centerX}, ${centerZ}).`);
  }

  const connected = keepLargestConnectedComponent(voxels);
  voxels = connected.voxels;

  if (connected.removedCount > 0) {
    warnings.push(`Removed ${connected.removedCount} disconnected voxels/components.`);
  }

  if (voxelBudget && voxels.length > voxelBudget + 40) {
    const originalCount = voxels.length;
    voxels = voxels.slice(0, voxelBudget + 40);
    warnings.push(
      `Trimmed voxel count from ${originalCount} to ${voxels.length} to stay within the target budget.`
    );
  }

  const stats: GenerationStats = {
    voxelCount: voxels.length,
    colorCount: new Set(voxels.map((voxel) => voxel.color)).size,
    dimensions: computeDimensions(voxels),
    repaired: warnings.length > 0,
    removedVoxelCount: normalized.length - voxels.length,
  };

  return {
    voxels,
    warnings: Array.from(new Set(warnings)),
    stats,
  };
}