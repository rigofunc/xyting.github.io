---
layout: default
title: 深入理解Async/Await
---

C# 5 **Async/Await** 语法特性，极大地简化了异步编程，但我们知道，**异步编程**的基本原理并没有发生根本改变。也就是说，当一些复杂的东西看起来很简单时，它通常意味着有一些有趣的事情在背后发生。在计算机程序设计语言领域，我们把这些本身很复杂但看起来很简单的语言特性称为*语法糖*，通常情况下，我们并不需要深入理解*语法糖*是怎么被一层一层包裹起来的，但是，最近我在使用.NET Core实现MySQL协议过程中，需要实现一个*Awaitable Socket*，所以我需要知道**Async/Await**背后到底发上了什么？

## 编译器重写

我们通过写一个非常简单的控制台应用程序，一层一层地剥开C#编译器实现的 **Async/Await** 语法糖。

```csharp
namespace AsyncAwaitInDepth
{
    class Program
    {
        static void Main(string[] args){ }

        static async int Method()
        {
            return 1;
        }
    }
}
```

编译上面的C#代码，会出现`CS1983 The return type of an async method must be void, Task or Task<T>`错误，即编译器告诉我们，异步方法仅限于三个不同的返回类型︰

- `void`
- `Task`
- `Task<T>`

再修改一下代码，让编译器编译通过：

```csharp
namespace AsyncAwaitInDepth
{
    class Program
    {
        static void Main(string[] args) { }

        static async void VoidAsync()
        {
            Console.WriteLine("before awaiting.");
            await Task.Delay(5);
            Console.WriteLine("after awaiting.");
        }

        static async Task TaskAsync()
        {
            Console.WriteLine("before awaiting.");
            await Task.Delay(5);
            Console.WriteLine("after awaiting.");
        }

        static async Task<int> GenericTaskAsync()
        {
            Console.WriteLine("before awaiting.");
            await Task.Delay(5);
            Console.WriteLine("after awaiting.");

            return 1;
        }
    }
}
```

使用ILSpy或者Reflector看看编译器干了什么：

```csharp
[AsyncStateMachine(typeof(<VoidAsync>d__1)), DebuggerStepThrough]
private static void VoidAsync()
{
    <VoidAsync>d__1 stateMachine = new <VoidAsync>d__1 {
        <>t__builder = AsyncVoidMethodBuilder.Create(),
        <>1__state = -1
    };
    stateMachine.<>t__builder.Start<<VoidAsync>d__1>(ref stateMachine);
}
[AsyncStateMachine(typeof(<TaskAsync>d__2)), DebuggerStepThrough]
private static Task TaskAsync()
{
    <TaskAsync>d__2 stateMachine = new <TaskAsync>d__2 {
        <>t__builder = AsyncTaskMethodBuilder.Create(),
        <>1__state = -1
    };
    stateMachine.<>t__builder.Start<<TaskAsync>d__2>(ref stateMachine);
    return stateMachine.<>t__builder.Task;
}
[AsyncStateMachine(typeof(<GenericTaskAsync>d__3)), DebuggerStepThrough]
private static Task<int> GenericTaskAsync()
{
    <GenericTaskAsync>d__3 stateMachine = new <GenericTaskAsync>d__3 {
        <>t__builder = AsyncTaskMethodBuilder<int>.Create(),
        <>1__state = -1
    };
    stateMachine.<>t__builder.Start<<GenericTaskAsync>d__3>(ref stateMachine);
    return stateMachine.<>t__builder.Task;
}

// 省略掉两个状态机 

[CompilerGenerated]
private sealed class <GenericTaskAsync>d__3 : IAsyncStateMachine
{
    public int <>1__state;
    public AsyncTaskMethodBuilder<int> <>t__builder;
    private TaskAwaiter <>u__1;

    private void MoveNext()
    {
        int num2;
        int num = this.<>1__state;
        try
        {
            TaskAwaiter awaiter;
            if (num != 0)
            {
                Console.WriteLine("before awaiting.");
                awaiter = Task.Delay(5).GetAwaiter();
                if (!awaiter.IsCompleted)
                {
                    this.<>1__state = num = 0;
                    this.<>u__1 = awaiter;
                    Program.<GenericTaskAsync>d__3 stateMachine = this;
                    this.<>t__builder.AwaitUnsafeOnCompleted<TaskAwaiter, Program.<GenericTaskAsync>d__3>(ref awaiter, ref stateMachine);
                    return;
                }
            }
            else
            {
                awaiter = this.<>u__1;
                this.<>u__1 = new TaskAwaiter();
                this.<>1__state = num = -1;
            }
            awaiter.GetResult();
            awaiter = new TaskAwaiter();
            Console.WriteLine("after awaiting.");
            num2 = 1;
        }
        catch (Exception exception)
        {
            this.<>1__state = -2;
            this.<>t__builder.SetException(exception);
            return;
        }
        this.<>1__state = -2;
        this.<>t__builder.SetResult(num2);
    }

    [DebuggerHidden]
    private void SetStateMachine(IAsyncStateMachine stateMachine)
    {
    }
}
```

上面的代码可以发现，**aynce/await** 代码被C#编译器重写了，编译器通过使用三个Builder和动态生成的*StateMachine*替换掉了我们的代码，而把我们的代码*整理*到StateMachine的`MoveNext()`方法内部，三个Builder是：

- AsyncVoidMethodBuilder
- AsyncTaskMethodBuilder
- AsyncTaskMethodBuilder<T>

撇开这三个Builder的内部实现，从接口角度看，他们长得很像，我们只看看`AsyncTaskMethodBuilder<T>`接口：

```csharp
public struct AsyncTaskMethodBuilder<T>
{
    public static AsyncTaskMethodBuilder<T> Create()
    {
        return new AsyncTaskMethodBuilder<T>();
    }

    public void AwaitOnCompleted<TAwaiter, TStateMachine>(ref TAwaiter awaiter, ref TStateMachine stateMachine)
        where TAwaiter : INotifyCompletion
        where TStateMachine : IAsyncStateMachine
    {
    }

    public void AwaitUnsafeOnCompleted<TAwaiter, TStateMachine>(ref TAwaiter awaiter, ref TStateMachine stateMachine)
        where TAwaiter : ICriticalNotifyCompletion
        where TStateMachine : IAsyncStateMachine
    {
    }

    public void SetStateMachine(IAsyncStateMachine stateMachine) { }

    public void Start<TStateMachine>(ref TStateMachine stateMachine) 
        where TStateMachine : IAsyncStateMachine
    {
        // ...
        stateMachine.MoveNext();
        // ...
    }

    public void SetException(Exception e) { }
    public void SetResult(T result) { }
    public Task<T> Task { get; }
}
```

C#编译器动态生成的**StateMachine**实现了`IAsyncStateMachine`接口：

```csharp
public interface IAsyncStateMachine
{
    void MoveNext();
    void SetStateMachine(IAsyncStateMachine stateMachine);
}
```

我们自己代码中的`await Task.Delay(5);`表达式，在StateMachine的`MoveNext()`方法内部被替换成`awaiter = Task.Delay(5).GetAwaiter();`，然后通过`IsCompleted`属性判断是否需要启动一个新的线程去执行，最后通过`awaiter.GetResult();`获取结果，或者是给Builder设置异常`builder.SetException(exception);`

## Awaitables and Awaiters

在.NET中，我们知道**Xtable**和**Xter**是一个一对的概念，比如`IEnumerable<T>`和`IEnumerator<T>`，上面的代码，我们发现`Task，Task<TResult>`是可以被**awaited**的，他们是*awaitable*，可以通过其`GetAwaiter()`方法得到**awaiter**:

```csharp
public struct TaskAwaiter<TResult>
{
  public bool IsCompleted { get; }
  public void OnCompleted(Action continuation);
  public TResult GetResult();
}
```

`awaitable`的`GetAwaiter()`可以是实例方法，也可以是扩展方法。该方法返回的是一个**awaiter**，该**awaiter**必须实现`INotifyCompletion`接口，可选实现`ICriticalNotifyCompletion`接口，同时，必须提供一个名为`IsCompleted` *bool* 属性， 必须提供`public TResult GetResult()`方法。

```csharp
public interface INotifyCompletion
{
    void OnCompleted(Action continuation);
}
public interface ICriticalNotifyCompletion : INotifyCompletion
{
    [SecurityCritical]
    void UnsafeOnCompleted(Action continuation);
}
```

## 自定义**awaitable**和**awaiter**对象

我们费了那么大的劲，终于弄清楚了 **Async/Await** 背后到底发上了什么，做到了知其然知其所以然，因此，我们可以实现自己的**awaitable**和**awaiter**对象：

```csharp
namespace AsyncAwaitInDepth
{
    public class Awaitable<T>
    {
        public Awaiter<T> GetAwaiter()
        {
            return new Awaiter<T>();
        }
    }
    public class Awaiter<T> : INotifyCompletion
    {
        public void OnCompleted(Action continuation)
        {
            continuation?.Invoke();
        }

        public bool IsCompleted { get; set; }

        public T GetResult()
        {
            return default(T);
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
        }

        static async void MyAwaitable()
        {
            Console.WriteLine("before awaiting");

            var awaitable = new Awaitable<int>();

            await awaitable;

            Console.WriteLine("after awaiting");
        }
    }
}
```

最后，借用《C# in Depth》作者Job Skeet的一句话与大家共勉： 

> I like knowing how a feature works before I go too far using it
