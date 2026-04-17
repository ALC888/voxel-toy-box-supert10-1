# 审查日志

## 2026-04-11 检索与排序人工推演

### 样例：`car`
- 输入规范化后为 `car`
- 推断类别为 `vehicle`
- 对当前 4 个动物模板均无正向命中
- 因为当前召回规则要求至少 1 个正向信号，最终不会召回任何模板
- 结论：该样例行为正确，后续路由应走 `free_generate`

### 样例：`cute car`
- 输入规范化后为 `cute car`
- `cute` 会对 `Cat` 和 `Rabbit` 产生正向命中
- `car` 会对部分动物模板产生负向关键词冲突
- 当前实现下，`Cat` 和 `Rabbit` 仍会进入候选，但总分应为负值
- 结论：最终路由预期仍应走 `free_generate`，但检索层存在“风格词过度召回”的问题

### 当前判断
- 当前问题更偏向“候选不够干净”，不一定是最终路由错误
- 第一轮改进先尝试单独增大 `negative_keyword_conflict` 惩罚力度
- 本轮暂不引入类别冲突惩罚，避免一次改动多个变量，影响观察

## 2026-04-11 第二轮改进

### 改动
- 在检索信号中新增 `category_conflict`
- 当 prompt 已推断出类别，且模板类别不一致时，加入类别冲突信号
- 在打分权重中新增 `categoryConflict = -70`

### 目的
- 修复 `cute car` 这类“风格词有正向命中、类别却明显冲突”的场景
- 让错误模板不仅因为负向词被扣分，也因为类别不一致被进一步压低

### 当前预期
- `car`：仍不召回任何模板
- `cute car`：即使召回 `Cat` / `Rabbit`，分数也应比第一轮更低
- `cute rabbit`：仍应由 Rabbit 保持高分领先，不受类别冲突影响

## 2026-04-11 路由前人工验证

### 样例：`bird`
- 规范化预期：`tokens = [bird]`
- 类别推断预期：`animal`
- 候选排序预期：`seed-eagle-perched` 第一
- 路由预期：`reuse`
- 判断依据：Eagle 同时命中 `promptAliases`、`tags`、`baseCategory`，且无冲突信号

### 样例：`double birds`
- 规范化预期：`tokens = [double, bird]`
- 类别推断预期：`animal`
- 当前推演结果：`seed-eagle-perched` 可能仍排第一，`seed-twins-birds` 次之
- 预期结果：`seed-twins-birds` 应优先于 Eagle
- 当前问题：精确短语别名 `double birds` 的权重不够高，导致成对结构信号不足
- 改进决定：优先提高“精确短语 alias 命中”的分值，不同时改 shape 映射规则

### `double birds` 复核
- 第一轮调权后，Twins 的排序已接近 Eagle，但仍可能略低于 Eagle
- 结论：方向正确，但还未达到“Twins 稳定第一”的目标
- 第二轮改进：继续上调 `exactPhraseAliasMatch`，只改一个参数，确保成对短语优先级足够高

### `double birds` 二次复核
- 在 `exactPhraseAliasMatch` 上调到 70 后，Twins 预期总分已稳定高于 Eagle
- 当前排序预期：`seed-twins-birds` 第一，`seed-eagle-perched` 第二
- 当前路由预期：`reuse`
- 结论：该样例当前已符合预期，可暂时收敛这一轮调权
