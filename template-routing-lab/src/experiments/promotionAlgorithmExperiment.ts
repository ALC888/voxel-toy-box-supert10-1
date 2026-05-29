//Changan.Liu
import { pathToFileURL } from 'node:url';
import {
  ACTIVE_TEMPLATE_REGISTRY,
  TEMPLATE_REGISTRY,
  TemplateRoutingLogger,
  buildPromotionVisualizationReport,
  evaluateTemplatePromotion,
  generateLowTurtleModel,
  generateSmallBoatModel,
} from '../index.js';
import { MemoryLogStorage } from '../logging/index.js';

function requireTemplate(templateId: string) {
  const template = TEMPLATE_REGISTRY.find((entry) => entry.metadata.id === templateId);
  if (!template) {
    throw new Error(`Missing template ${templateId}`);
  }
  return template;
}

export function runPromotionAlgorithmExperiment() {
  const turtleModel = generateLowTurtleModel({
    color: {
      shell: '#3f7f3a',
      body: '#6fb35f',
      belly: '#d6c56a',
      eyes: '#111111',
    },
  });

  const boatModel = generateSmallBoatModel({
    color: {
      hull: '#2d6cdf',
      deck: '#f0f0e6',
      cabin: '#ffffff',
      windows: '#83cbe8',
      trim: '#1c335f',
    },
  });

  const evaluations = [
    evaluateTemplatePromotion({
      template: requireTemplate('exp-turtle-low'),
      templates: ACTIVE_TEMPLATE_REGISTRY,
      positivePrompts: ['turtle', 'cute turtle', 'sea turtle', 'pond turtle'],
      negativePrompts: ['car', 'bus', 'house', 'penguin'],
      fromStatus: 'candidate',
      toStatus: 'active',
      geometryVoxelCount: turtleModel.stats.totalVoxels,
    }),
    evaluateTemplatePromotion({
      template: requireTemplate('exp-boat-small'),
      templates: ACTIVE_TEMPLATE_REGISTRY,
      positivePrompts: ['boat', 'small boat', 'fishing boat', 'rescue boat'],
      negativePrompts: ['animal', 'house', 'car', 'penguin'],
      fromStatus: 'candidate',
      toStatus: 'active',
      geometryVoxelCount: boatModel.stats.totalVoxels,
    }),
  ];

  const storage = new MemoryLogStorage();
  const logger = new TemplateRoutingLogger(storage);

  evaluations.forEach((evaluation) => {
    logger.logTemplatePromotion(evaluation);
  });

  return {
    evaluations,
    visualization: buildPromotionVisualizationReport(evaluations),
    logEvents: logger.listEvents(),
  };
}

function summarizeExperimentResult(result: ReturnType<typeof runPromotionAlgorithmExperiment>) {
  return {
    evaluations: result.evaluations.map((evaluation) => ({
      templateId: evaluation.templateId,
      decision: evaluation.decision,
      totalScore: evaluation.totalScore,
      scoreBreakdown: evaluation.scoreBreakdown,
      geometry: evaluation.geometry,
      positiveChecks: evaluation.positiveChecks.map((check) => ({
        prompt: check.prompt,
        passed: check.passed,
        decision: check.routing.decision,
        topTemplateId: check.routing.topCandidate?.template.metadata.id ?? null,
      })),
      negativeChecks: evaluation.negativeChecks.map((check) => ({
        prompt: check.prompt,
        passed: check.passed,
        decision: check.routing.decision,
        topTemplateId: check.routing.topCandidate?.template.metadata.id ?? null,
      })),
      passedChecks: evaluation.passedChecks,
      failedChecks: evaluation.failedChecks,
    })),
    visualization: result.visualization,
    logEvents: result.logEvents,
  };
}

async function main() {
  console.log(JSON.stringify(summarizeExperimentResult(runPromotionAlgorithmExperiment()), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
