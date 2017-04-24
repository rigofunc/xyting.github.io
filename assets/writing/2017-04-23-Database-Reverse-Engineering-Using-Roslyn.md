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

```csharp

```

## IDatabaseModelFactory

## ICodeGenerator

## MySqlCodeFirstGenerator

##  