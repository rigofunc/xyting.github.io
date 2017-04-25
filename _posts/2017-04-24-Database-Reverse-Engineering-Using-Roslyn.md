---
layout: default
---

前段时间，团队领导跟我说：有一个关于“CLR，JIT，Roslyn详解”的主题分享，但是我没有时间，你顶替我去分享一下……当时我一脸懵逼，因为对我而言，CLR，JIT，Roslyn，别说详解，让我照着PPT念都够喝一壶的。我虽尽力各种推脱，你懂的，最后我只能硬着头皮上了，但是选了其中一个：Roslyn

1. 使用Roslyn实现一个Code Review工具：做过Code Review的团队都知道，虽然Code Review会带来无数好处，但其成本也是相当可观的，特别是在团队成员水平参差不齐的情况下，各种问题会重复发生，比如，假设团队要求所有的using，需要把System放在最前面，但是无论强调多少次，总有人就是不那么干，再比如，要求源文件的第一行是Copyright信息，但总有人喜欢把自己的大名放进去。这个时候，在人工review之前，有一个工具能自动检测这些规则是很有用处的；
2. 使用Roslyn实现一个符合团队规则的Code Fix工具：对于Code Review工具检测出来的问题，最简单粗暴的方式是直接无法提交代码进行人工Code Review，但是这不应该一个团队的水平，更好的办法是自动修复掉这些问题；
3. 使用Roslyn从数据库生成Code First代码：任何公司、任何团队都有自己的一套数据库标准，有些团队的标准可能无法使用类似于EF的Code First，然后通过Migration方式创建和更新数据库的。最主要的一点是，很多老系统在做重构的时候，数据库本身是不能动的（华丽的表面背后总隐藏不少肮脏的东西），这个时候，通过数据库来生成符合C# Convention/Idioms的POCO代码将会减少不少工作量。

# Database Reverse Engineering
1.、2.代码量太大，一篇文章很难分享，所以本篇文章，只跟大家分享一下如何使用Roslyn从数据库生成Code First代码。

## 数据库建模

要逆向工程数据库，需要定义一个能表示数据库的数据结构：

### DatabaseModel.cs
<script src="https://gist.github.com/xyting/6b1d8472d193b1668c9a0dfe5f30c9b1.js"></script>

### TableModel.cs
<script src="https://gist.github.com/xyting/ce9804ba0124ca5ad40854f3c7df8331.js"></script>

### ColumnModel.cs
<script src="https://gist.github.com/xyting/4d3d407e7b40b9fecf0b0f1231b58ded.js"></script>

## 数据库模型创建工厂
为了屏蔽数据库间的差异，需要提供一个`IDatabaseModelFactory.cs`

### IDatabaseModelFactory.cs
<script src="https://gist.github.com/xyting/db175aec0927deac68025f131d1a8829.js"></script>

## 从数据库模型生成代码
我们已经有了逆向数据库的通用数据结构，接下来就可以通过Vistor模式不断地Visitor这个数据结构就可以生成Code First POCO代码，在这之前，为了屏蔽不同实现，还是抽象一个`ICodeGenerator.cs`

### ICodeGenerator.cs
<script src="https://gist.github.com/xyting/34a8beae25784db7ad5e3971693f1217.js"></script>

## 针对MySql的具体实现

我已经提供了MySQL的全部实现，代码开源在[CodeRobot](https://github.com/Arch/CodeRobot)，目前我并没有提交所有的代码，为了测试大家是否真的喜欢我写的文章，麻烦各位移步到[CodeRobot](https://github.com/Arch/CodeRobot)进行`Star`，当`Star`超过30时，我提交所有的代码。由于代码量不适合全部Blog，所以`MySqlCodeFirstGenerator.cs`只提供了POCO类的生产，EF Core的DbContext已经Mapping代码没有放上来（想看所有代码，前往我的GitHub Star）。

###  MySqlCodeFirstGenerator.cs
<script src="https://gist.github.com/xyting/c01c50bfa915ad77bfb3df182e1f6eae.js"></script>

## 结果展示
<script src="https://gist.github.com/xyting/e7a314a41e3f6055b4fdfcbdc1c6016e.js"></script> 