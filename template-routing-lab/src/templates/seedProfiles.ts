export interface TemplateSeedProfile {
  templateId: string;
  generatorRef: string;
  observedIntent: string;
  estimatedVoxelCount: number;
  bboxHint: string;
  primaryColorTags: string[];
  adaptationNotes: string[];
}

export const SEED_TEMPLATE_PROFILES: TemplateSeedProfile[] = [
  {
    templateId: 'seed-eagle-perched',
    generatorRef: 'Generators.Eagle',
    observedIntent: '停栖在树枝上的鹰类体素模板，强调翅膀、头部和栖木场景。',
    estimatedVoxelCount: 185,
    bboxHint: '中等偏高，主体居中，横向由翅膀与树枝共同展开。',
    primaryColorTags: ['brown', 'white', 'gold', 'green'],
    adaptationNotes: ['适合改头部', '适合改翅膀', '适合改配色', '可改为其他鸟类'],
  },
  {
    templateId: 'seed-cat-seated',
    generatorRef: 'Generators.Cat',
    observedIntent: '坐姿猫模板，强调圆头、耳朵、前爪和尾巴轮廓。',
    estimatedVoxelCount: 170,
    bboxHint: '中等高度，正面轮廓集中，姿态稳定。',
    primaryColorTags: ['brown', 'white', 'gold', 'black'],
    adaptationNotes: ['适合改耳朵', '适合改尾巴', '适合改表情', '可改为其他小型猫科'],
  },
  {
    templateId: 'seed-rabbit-sitting',
    generatorRef: 'Generators.Rabbit',
    observedIntent: '坐姿兔子模板，强调长耳、圆润身体与木桩场景。',
    estimatedVoxelCount: 175,
    bboxHint: '中高竖向轮廓明显，耳朵提供强识别性。',
    primaryColorTags: ['white', 'brown', 'green', 'black'],
    adaptationNotes: ['适合改耳朵', '适合改姿态', '适合改配色', '可改为其他小型草食动物'],
  },
  {
    templateId: 'seed-twins-birds',
    generatorRef: 'Generators.Twins',
    observedIntent: '双鸟并列模板，强调成对结构和左右分布。',
    estimatedVoxelCount: 165,
    bboxHint: '横向展开明显，成对主体分离但风格一致。',
    primaryColorTags: ['brown', 'white', 'gold', 'green'],
    adaptationNotes: ['适合改为双角色', '适合改为成对动物', '适合保留双体结构做 morph'],
  },
];
