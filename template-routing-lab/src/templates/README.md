# 模板资产边界说明

## v1 中什么算模板
在本项目中，v1 的“模板”必须同时满足以下条件：

1. 有稳定的模板 `id`
2. 有完整的 `TemplateMetadata`
3. 有明确的本地内容来源 `TemplateSourceRef`
4. 可以被检索模块召回
5. 可以被路由模块用于 `reuse / adapt / free_generate` 判定

只有几何内容、不带元数据的 voxel 数据或生成器函数，在 v1 中不算正式模板。

## v1 支持的模板来源
- `generator`
  指向现有或新增的本地生成器
- `static_voxel`
  指向固定体素数据文件
- `variant_seed`
  指向一个基础模板及其变体关系

## 当前种子模板
当前已注册 4 个种子模板：

- `seed-eagle-perched`
- `seed-cat-seated`
- `seed-rabbit-sitting`
- `seed-twins-birds`

这些模板都来自 `src/legacy/utils/voxelGenerators.ts`，并且都附带了首版人工元数据。

## v1 不接受的模板形式
- 只有名称，没有 metadata
- 只有 prompt 样例，没有本地来源
- 生成式模型一次性吐出的候选体素数据，未经人工审查
- 无法说明适用场景、可编辑部位或负向冲突词的模板

## 模板扩展原则
- 优先人工注册高质量模板
- 可以用生成式方法辅助补标签、别名和变体建议
- 生成式候选不能直接进入正式模板注册表
