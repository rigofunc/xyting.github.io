---
layout: default
title: 深入理解Async/Await
---

我们用得很爽的C# 5 **Async/Await**语法特性，极大地简化了异步编程，但我们都很清楚**异步编程**的基础理论并没有变，其复杂度仍然在哪里。也就是说，当一些复杂的东西看起来很简单时，它通常意味着有一些有趣的事情在背后发生。我们把这些本身很复杂但看起来很简单的东西称为*语法糖*，通常情况下，我们并不需要深入理解*语法糖*是怎么被一层一层包裹起来的，但在这里，我们需要知道**Async/Await**背后到底发上了什么？

## 三种返回类型， 三种Builder

为了弄清楚**Async/Await**背后到底发上了什么，我们写一个非常简单的控制台应用程序：

```csharp
namespace AsyncAwaitInDepth
{
    class Program
    {
        static void Main(string[] args)
        {
        }

        static async int Method()
        {
            return 1;
        }
    }
}
```

编译上面的代码，看看C#编译器告诉我们什么：

`CS1983	The return type of an async method must be void, Task or Task<T>`

编译器告诉我们，异步方法仅限于三个不同的返回类型︰

- void
- Task
- Task<T>

再修改一下代码，让编译器编译通过，然后使用ILSpy或者Reflector看看编译器都干了什么：

```csharp
namespace AsyncAwaitInDepth
{
    class Program
    {
        static void Main(string[] args)
        {
        }

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

被编译器重写之后的代码：

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
```

从被重写之后的代码可以看出，C#编译器在编译这些异步方法时，还需要三个Builder：

- AsyncVoidMethodBuilder
- AsyncTaskMethodBuilder
- AsyncTaskMethodBuilder<T>

撇开这三个Builder的内部实现，从接口角度讲，他们长得很像，我们看看`AsyncTaskMethodBuilder<T>`：

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
    }

    public void SetException(Exception e) { }
    public void SetResult(T result) { }
    public Task<T> Task { get; }
}
```

## 动态生成状态机

上面的代码，C#编译器在编译的时候会进行重写，把代码转换成实现`IAsyncStateMachine`接口的状态机：

```csharp
public interface IAsyncStateMachine
{
    void MoveNext();
    void SetStateMachine(IAsyncStateMachine stateMachine);
}

[CompilerGenerated]
private sealed class <GenericTaskAsync>d__3 : IAsyncStateMachine
{
    // Fields
    public int <>1__state;
    public AsyncTaskMethodBuilder<int> <>t__builder;
    private TaskAwaiter <>u__1;

    // Methods
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

C#编译器把原方法内部替换成Builder和StateMachine, 被替换的内容移到状态机的`void MoveNext()`方法内部，通过Builder的`public void Start<TStateMachine>(ref TStateMachine stateMachine)`方法内部调用StateMachine的`void MoveNext()`方法。

## Awaitables and Awaiters

在.NET中，我们知道***table**和***ter**是一个一对的概念，比如`IEnumerable<T>`和`IEnumerator<T>`，上面的代码，我们发现**Tasks**是可以被**awaited**的，因为他是*awaitable*的，我们可以通过`Task<TResult>`的`GetAwaiter()`得到：

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

因此，我们可以实现自己的**awaitable**和**awaiter**对象：

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

被C#编译器重写之后的结果：

```csharp
internal class Program
{
    private static void Main(string[] args)
    {
    }

    [AsyncStateMachine(typeof(<MyAwaitable>d__1)), DebuggerStepThrough]
    private static void MyAwaitable()
    {
        <MyAwaitable>d__1 stateMachine = new <MyAwaitable>d__1 {
            <>t__builder = AsyncVoidMethodBuilder.Create(),
            <>1__state = -1
        };
        stateMachine.<>t__builder.Start<<MyAwaitable>d__1>(ref stateMachine);
    }

    [CompilerGenerated]
    private sealed class <MyAwaitable>d__1 : IAsyncStateMachine
    {
        // Fields
        public int <>1__state;
        public AsyncVoidMethodBuilder <>t__builder;
        private object <>u__1;
        private Awaitable<int> <awaitable>5__1;

        // Methods
        private void MoveNext()
        {
            int num = this.<>1__state;
            try
            {
                Awaiter<int> awaiter;
                if (num != 0)
                {
                    Console.WriteLine("before awaiting");
                    this.<awaitable>5__1 = new Awaitable<int>();
                    awaiter = this.<awaitable>5__1.GetAwaiter();
                    if (!awaiter.IsCompleted)
                    {
                        this.<>1__state = num = 0;
                        this.<>u__1 = awaiter;
                        Program.<MyAwaitable>d__1 stateMachine = this;
                        this.<>t__builder.AwaitOnCompleted<Awaiter<int>, Program.<MyAwaitable>d__1>(ref awaiter, ref stateMachine);
                        return;
                    }
                }
                else
                {
                    awaiter = (Awaiter<int>) this.<>u__1;
                    this.<>u__1 = null;
                    this.<>1__state = num = -1;
                }
                awaiter.GetResult();
                awaiter = null;
                Console.WriteLine("after awaiting");
            }
            catch (Exception exception)
            {
                this.<>1__state = -2;
                this.<>t__builder.SetException(exception);
                return;
            }
            this.<>1__state = -2;
            this.<>t__builder.SetResult();
        }

        [DebuggerHidden]
        private void SetStateMachine(IAsyncStateMachine stateMachine)
        {
        }
    }
}
```