---
layout: default
title: Code Review Use GitLab/Git Flow
---

# 导语

我们花一点点时间，一次蹲坑的时间足矣，看看如何使用Git Flow进行高效开发，什么才是Git提交的正确姿势，怎样使用GitLab进行Code Review：

- 使用Git Flow高效开发；
- Git提交正确姿势，Commit message编写指南；
- 使用GitLab进行团队内的Code Review；

# 使用Git Flow进行高效开发
 
在工作环境中，绕不开**效率**一词，由于任何一次版本迭代，几乎都是需要整个团队协作的，所以，**高效开发**不仅仅是个人效率问题，还涉及到整个团队的协作效率。个人开发，可以怎么顺手怎么搞，怎么开心怎么玩，但在团队里协作的时候，只一个人顺手开心是不够，还需要整个团队协作高效。提高效率，一般我们会这么搞：

- 遵守行业内的最佳实践；
- 使用工具自动遵循规范；

## 什么是Git Flow？

Git Flow是构建在Git之上的一个组织软件开发活动的模型，是在Git之上构建的一项软件开发最佳实践。Git Flow是一套使用Git进行源代码管理时的一套行为规范和简化部分Git操作的工具，一篇名为[A successful Git branching model](http://nvie.com/posts/a-successful-git-branching-model/)的博文介绍了一种在Git之上的软件开发模型。通过利用Git创建和管理分支的能力，为每个分支设定具有特定的含义名称，并将软件生命周期中的各类活动归并到不同的分支上。实现了软件开发过程不同操作的相互隔离。这种软件开发的活动模型被称为**Git Flow**。

## Git Flow备忘清

Git Flow是一个Git扩展集，按[Vincent Driessen的分支模型](http://nvie.com/posts/a-successful-git-branching-model/)提供高层次的库操作, 这个[备忘清单](http://danielkummer.github.io/git-flow-cheatsheet/index.zh_CN.html)展示了Git Flow的基本操作和效果。

## Git Flow介绍

1. Git Flow常用的分支：master, develop, feature, hotfix, release;
2. 历史分支(master , develop): 相对使用仅有的一个master分支，Gitflow工作流使用2个分支来记录项目的历史。master分支存储了正式发布的历史，而develop分支作为功能的集成分支。 这样也方便master分支上的所有提交分配一个版本号;
    
    ![git-flow-hostory-branch](/images/git_flow_master_develop.png)

3. 功能分支(Feature): 每个新功能位于一个自己的分支，这样可以push到中央仓库以备份和协作。 但功能分支不是从master分支上拉出新分支，而是使用develop分支作为父分支。当新功能完成时，合并回develop分支。 新功能提交应该从不直接与master分支交互;

    ![git-flow-feature](/images/git_flow_feature.png)

4. 发布分支(release): 一旦develop分支上有了做一次发布（或者说快到了既定的发布日）的足够功能，就从develop分支上fork一个发布分支。 新建的分支用于开始发布循环，所以从这个时间点开始之后新的功能不能再加到这个分支上—— 这个分支只应该做Bug修复、文档生成和其它面向发布任务。 一旦对外发布的工作都完成了，发布分支合并到master分支并分配一个版本号打好Tag。 另外，这些从新建发布分支以来的做的修改要合并回develop分支;

    ![git-flow-release](/images/git_flow_release.png)

5. 维护分支(hotfix): 维护分支或说是热修复（hotfix）分支用于生成快速给产品发布版（production releases）打补丁，这是唯一可以直接从master分支fork出来的分支。 修复完成，修改应该马上合并回master分支和develop分支（当前的发布分支）,master分支应该用新的版本号打好Tag。为Bug修复使用专门分支，让团队可以处理掉问题而不用打断其它工作或是等待下一个发布循环。 你可以把维护分支想成是一个直接在master分支上处理的临时发布;

    ![git-flow-hotfix](/images/git_flow_hotfix.png)

## 使用工具自动遵循规范

Visual Studio有一个Git Flow插件[GitFlow.VS](http://blog.ehn.nu/2015/02/introducing-gitflow-for-visual-studio/), Sourcetree最新版本集成了Git Flow插件，这些插件的好处是最大化地简化了命令，只有**Start Feature**、**Finish Feature**、**Start Release**、**Finish Release**、**Start Hotfix**、**Finish Hotfix**几个操作，其他工作，Git Flow自动帮你完成：

- 新建功能分支：Git Flow会自动拉取最新的develop分支，然后自动从develop分支创建一个新的feature分支；
- 完成功能分支：Git Flow自动合并回develop分支，并默认删除feature分支，可以更改默认行为；
- 新建发布分支：Git Flow会自动拉取最新的develop分支，然后自动从develop分支创建一个新的release分支；
- 完成发布分支：Git Flow自动合并回develop，master分支，如果提供tag名称，则会自动在master打上Tag，并默认删除feature分支，可以更改默认行为；
- 新建修复分支：Git Flow会自动拉取最新的或者指定Tag的master分支，然后自动从master分支创建一个新的hotfix分支；
- 完成修复分支：Git Flow自动合并回develop，master分支，如果提供tag名称，则会自动在master打上Tag，并默认删除hotfix分支，可以更改默认行为；

## Visual Studio有一个Git Flow插件

通过Tools > Extensions and Updates > Online > Search gitflow 安装Git Flow插件

![vsgitflow](/images/vs_git_flow.png)

装好插件之后，Team Explorer会多一个GitFlow

![vsgitflow](/images/vs_te_git_flow.png)

点击GitFlow后，如果是首次点击，则会提示初始化操作

![vsgitflow](/images/vs_git_flow_init.png)

初始化之后，每次进入GitFlow，则会根据状态提供创建或结束feature/release/hotfix分支

![vsgitflow](/images/vs_git_flow_usage.png)

**再次强调：** 我们需要一个工具帮我们自动化遵循规范，这就是GitFlow插件。

# Git提交正确姿势：Commit message编写指南

Git 每次提交代码，都要写 Commit message（提交说明），否则就不允许提交，基本上，你写什么都行，但是，一般来说，commit message 应该清晰明了，说明本次提交的目的。目前，社区有多种 Commit message 的写法规范。本文介绍Angular规范，这是目前使用最广的写法，比较合理和系统化，并且有配套的工具。

## Commit message 的作用

格式化的Commit message，有几个好处。

1. 提供更多的历史信息，方便快速浏览；
2. 可以过滤某些commit（比如文档改动），便于快速查找信息；
3. 可以直接从commit生成Change log；

## Commit message 的格式

每次提交，Commit message 都包括三个部分：Header，Body 和 Footer。

```
<type>(<scope>): <subject>
// 空一行
<body>
// 空一行
<footer>
```

其中，Header 是必需的，Body 和 Footer 可以省略。不管是哪一个部分，任何一行都不得超过72个字符（或100个字符）。这是为了避免自动换行影响美观。

### Header

Header部分只有一行，包括三个字段：type（必需）、scope（可选）和subject（必需）。

1. type用于说明 commit 的类别，只允许使用下面7个标识。

    - feat：新功能（feature）
    - fix：修补bug
    - docs：文档（documentation）
    - style： 格式（不影响代码运行的变动）
    - refactor：重构（即不是新增功能，也不是修改bug的代码变动）
    - test：增加测试
    - chore：构建过程或辅助工具的变动

2. scope用于说明 commit 影响的范围，比如数据层、控制层、视图层等等，视项目不同而不同。
3. subject是 commit 目的的简短描述，不超过50个字符。

    - 以动词开头，使用第一人称现在时，比如change，而不是changed或changes
    - 第一个字母小写
    - 结尾不加句号（.）

### Body

Body 部分是对本次 commit 的详细描述，可以分成多行, 有两个注意点:

- 使用第一人称现在时，比如使用change而不是changed或changes;
- 应该说明代码变动的动机，以及与以前行为的对比;

### Footer

Footer 部分只用于两种情况:

- 如果当前代码与上一个版本不兼容，则 Footer 部分以BREAKING CHANGE开头，后面是对变动的描述、以及变动理由和迁移方法;
- 如果当前 commit 针对某个issue，那么可以在 Footer 部分关闭这个 issue (Closes #123, #245, #992), GitHub这个功能很好用；

### Revert

还有一种特殊情况，如果当前 commit 用于撤销以前的 commit，则必须以revert:开头，后面跟着被撤销 Commit 的 Header。

# 使用GitLab进行团队内Code Review

Code Review的工具很多，Facebook非常有名的Phabricator已经开源。对于经常玩GitHub的人，应该很喜欢GitHub的PR功能，很多公司使用GitLab或者Gogs搭建自家的Git服务，GitLab的Merge Request功能同样可以用于团队内Code Review。如果团队内部需要强制进行Code Review, 那么拥有GitLab管理权限的开发人员，可以把Repo设置成只有develop和master分支，并把develop，master分支都保护起来。

![gitlab_protect](/images/gitlab_protect.png)

协作开发的同事，只能通过把Repo **FORK** 成自己的Repo，之后从自己Repo clone到本地，然后使用Git Flow开发，一旦开发到一个需要Review的点，通过**Merge Request**向主Repo请求合并

![gitlab_new_pr](/images/gitlab_new_pr.png)

一旦Merge Request创建成功之后，主Repo拥有Code Review权限的人就会收到通知，Code Review的时候， 打开**Open**的Merge Request，会看到Commits， Changes，打开Changes，可以提交自己的Review建议，被Review的人继续根据这些建议，在自己的Repo里修改，修改好之后提交，这是会在自己的Repo里及主Repo的**Open** Merge Request里看到更改，继续Review流程即可，知道Merge Request被合并，如下图：

![gitlab_pr_rv](/images/gitlab_pr_rv.png)