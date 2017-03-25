---
layout: default
title: 使用EntityFrameworkCore实现Repository<TEntity>, UnitOfWork<TContext>，支持MySQL分库分表
---

昨天（星期五）下班，19：00左右回到家，洗个澡，然后20：30左右开始写代码，写完代码之后，上床看了《生活大爆炸10季》17、18两集，发现没有更新到19集，瞄了一眼手机，竟然已经是凌晨02：00多了，关掉电视睡觉，10：30左右被老婆电话吵醒，洗漱完毕，去麦当劳吃了一个早餐，然后屁颠屁颠地坐地铁到很远的地方去爬山。爬山回来之后，闲来无事，写篇文章记录一下昨晚所花的几个小时干的事情——使用EntityFrameworkCore实现`Repository<TEntity>`, `UnitOfWork<TContext>`，支持MySQL分库分表。

由于是使用业余时间写来玩的，时间也有限，所以，全部代码做了一个基本假设：**`Repository<TEntity>`, `UnitOfWork<TContext>`只支持同一个IP上的MySQL分库分表，不同IP上的MySQL分库分表，需要使用不同的`Repository<TEntity>`, `UnitOfWork<TContext>`对象**。以下示例代码，假设数据库是按年分库按月分表。

![git-flow-hostory-branch](/images/database_sharding.PNG)

`EntityFrameworkCore`默认并不支持分库分表，我们看一眼`EntityFrameworkCore`默认生成的SQL:

```sql
Executed DbCommand [Parameters=[@p2='?', @p4='?' (Size = 8000), @p6='?' (Size = 8000)], CommandType='Text', CommandTimeout='0']
INSERT INTO `t_user_201703` (`Fis_deleted`, `Fpassword`, `Fname`)
VALUES (@p2, @p4, @p6);
SELECT LAST_INSERT_ID();
```

默认生成的SQL并没有带上库名，而想要让`EntityFrameworkCore`支持MySQL分库分表，首要条件是必须能做到*可以动态地改变库名表名*。软件界有一句老话叫：**凡是做不到的就多抽象一层**，所以，想要让`EntityFrameworkCore`支持MySQL分库分表，我抽象了以下两个接口， `IRepository<TEntity>`和`IUnitOfWork`

```csharp
/// <summary>
/// Defines the interfaces for generic repository.
/// </summary>
/// <typeparam name="TEntity">The type of the entity.</typeparam>
public interface IRepository<TEntity> where TEntity : class
{
    /// <summary>
    /// Changes the table name. This require the tables in the same database.
    /// </summary>
    /// <param name="table"></param>
    /// <remarks>
    /// This only been used for supporting multiple tables in the same model. This require the tables in the same database.
    /// </remarks>
    void ChangeTable(string table);

    /// <summary>
    /// Filters a sequence of values based on a predicate. This method default no-tracking query.
    /// </summary>
    /// <param name="predicate">A function to test each element for a condition.</param>
    /// <param name="disableTracking"><c>True</c> to disable changing tracking; otherwise, <c>false</c>. Default to <c>true</c>.</param>
    /// <returns>An <see cref="IQueryable{TEntity}"/> that contains elements that satisfy the condition specified by <paramref name="predicate"/>.</returns>
    /// <remarks>This method default no-tracking query.</remarks>
    IQueryable<TEntity> Query(Expression<Func<TEntity, bool>> predicate, bool disableTracking = true);

    /// <summary>
    /// Uses raw SQL queries to fetch the specified <typeparamref name="TEntity" /> data.
    /// </summary>
    /// <param name="sql">The raw SQL.</param>
    /// <param name="parameters">The parameters.</param>
    /// <returns>An <see cref="IQueryable{TEntity}" /> that contains elements that satisfy the condition specified by raw SQL.</returns>
    IQueryable<TEntity> FromSql(string sql, params object[] parameters);

    /// <summary>
    /// Finds an entity with the given primary key values. If found, is attached to the context and returned. If no entity is found, then null is returned.
    /// </summary>
    /// <param name="keyValues">The values of the primary key for the entity to be found.</param>
    /// <returns>The found entity or null.</returns>
    TEntity Find(params object[] keyValues);

    /// <summary>
    /// Finds an entity with the given primary key values. If found, is attached to the context and returned. If no entity is found, then null is returned.
    /// </summary>
    /// <param name="keyValues">The values of the primary key for the entity to be found.</param>
    /// <returns>A <see cref="Task{TEntity}"/> that represents the asynchronous find operation. The task result contains the found entity or null.</returns>
    Task<TEntity> FindAsync(params object[] keyValues);

    /// <summary>
    /// Finds an entity with the given primary key values. If found, is attached to the context and returned. If no entity is found, then null is returned.
    /// </summary>
    /// <param name="keyValues">The values of the primary key for the entity to be found.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> to observe while waiting for the task to complete.</param>
    /// <returns>A <see cref="Task{TEntity}"/> that represents the asynchronous find operation. The task result contains the found entity or null.</returns>
    Task<TEntity> FindAsync(object[] keyValues, CancellationToken cancellationToken);

    /// <summary>
    /// Inserts a new entity synchronously.
    /// </summary>
    /// <param name="entity">The entity to insert.</param>
    void Insert(TEntity entity);

    /// <summary>
    /// Inserts a range of entities synchronously.
    /// </summary>
    /// <param name="entities">The entities to insert.</param>
    void Insert(params TEntity[] entities);

    /// <summary>
    /// Inserts a range of entities synchronously.
    /// </summary>
    /// <param name="entities">The entities to insert.</param>
    void Insert(IEnumerable<TEntity> entities);

    /// <summary>
    /// Inserts a new entity asynchronously.
    /// </summary>
    /// <param name="entity">The entity to insert.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> to observe while waiting for the task to complete.</param>
    /// <returns>A <see cref="Task"/> that represents the asynchronous insert operation.</returns>
    Task InsertAsync(TEntity entity, CancellationToken cancellationToken = default(CancellationToken));

    /// <summary>
    /// Inserts a range of entities asynchronously.
    /// </summary>
    /// <param name="entities">The entities to insert.</param>
    /// <returns>A <see cref="Task"/> that represents the asynchronous insert operation.</returns>
    Task InsertAsync(params TEntity[] entities);

    /// <summary>
    /// Inserts a range of entities asynchronously.
    /// </summary>
    /// <param name="entities">The entities to insert.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> to observe while waiting for the task to complete.</param>
    /// <returns>A <see cref="Task"/> that represents the asynchronous insert operation.</returns>
    Task InsertAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default(CancellationToken));

    /// <summary>
    /// Updates the specified entity.
    /// </summary>
    /// <param name="entity">The entity.</param>
    void Update(TEntity entity);

    /// <summary>
    /// Updates the specified entities.
    /// </summary>
    /// <param name="entities">The entities.</param>
    void Update(params TEntity[] entities);

    /// <summary>
    /// Updates the specified entities.
    /// </summary>
    /// <param name="entities">The entities.</param>
    void Update(IEnumerable<TEntity> entities);

    /// <summary>
    /// Deletes the entity by the specified primary key.
    /// </summary>
    /// <param name="id">The primary key value.</param>
    void Delete(object id);

    /// <summary>
    /// Deletes the specified entity.
    /// </summary>
    /// <param name="entity">The entity to delete.</param>
    void Delete(TEntity entity);

    /// <summary>
    /// Deletes the specified entities.
    /// </summary>
    /// <param name="entities">The entities.</param>
    void Delete(params TEntity[] entities);

    /// <summary>
    /// Deletes the specified entities.
    /// </summary>
    /// <param name="entities">The entities.</param>
    void Delete(IEnumerable<TEntity> entities);
}

/// <summary>
/// Defines the interfaces for unit of work.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    /// <summary>
    /// Changes the database name. This require the databases in the same machine.
    /// </summary>
    /// <param name="database">The database name.</param>
    /// <remarks>
    /// This only been used for supporting multiple databases in the same model. This require the databases in the same machine.
    /// </remarks>
    void ChangeDatabase(string database);

    /// <summary>
    /// Saves all changes made in this context to the database.
    /// </summary>
    /// <returns>The number of state entries written to the database.</returns>
    int SaveChanges();

    /// <summary>
    /// Asynchronously saves all changes made in this unit of work to the database.
    /// </summary>
    /// <returns>A <see cref="Task{Int32}"/> that represents the asynchronous save operation. The task result contains the number of state entities written to database.</returns>
    Task<int> SaveChangesAsync();

    /// <summary>
    /// Executes the specified raw SQL command.
    /// </summary>
    /// <param name="sql">The raw SQL.</param>
    /// <param name="parameters">The parameters.</param>
    /// <returns>The number of state entities written to database.</returns>
    int ExecuteSqlCommand(string sql, params object[] parameters);

    /// <summary>
    /// Uses raw SQL queries to fetch the specified <typeparamref name="TEntity"/> data.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="sql">The raw SQL.</param>
    /// <param name="parameters">The parameters.</param>
    /// <returns>An <see cref="IQueryable{TEntity}"/> that contains elements that satisfy the condition specified by raw SQL.</returns>
    IQueryable<TEntity> FromSql<TEntity>(string sql, params object[] parameters) where TEntity : class;
}
```

很多人都自己动手实现过`Repository`和`UnitOfWork`，虽然各自实现不尽相同，但是其实现本身并没有难度，但在这里，我们需要特别关注两个方法：`void ChangeTable(string table)`和`void ChangeDatabase(string database)`

```csharp
    /// <summary>
    /// Changes the table name. This require the tables in the same database.
    /// </summary>
    /// <param name="table"></param>
    /// <remarks>
    /// This only been used for supporting multiple tables in the same model. This require the tables in the same database.
    /// </remarks>
    void ChangeTable(string table);
    /// <summary>
    /// Changes the database name. This require the databases in the same machine.
    /// </summary>
    /// <param name="database">The database name.</param>
    /// <remarks>
    /// This only been used for supporting multiple databases in the same model. This require the databases in the same machine.
    /// </remarks>
    void ChangeDatabase(string database);
```

怎么实现这两个方法，就需要一定的技术功底了，我以前在一家创业公司的时候，因为看不惯架构师自以为是的样子，自己动手写了一个轻量级的ORM框架，如果以后有时间，我打算写一篇《如何基于Dapper实现一个轻量级的ORM框架》的文章。ORM框架背后的动机很单纯，就是*数据库*与*Domain*之间的一种双向映射，真正把这种单纯的动机搞复杂是的那些性能优化，各种缓存实现。而从Domain到数据库这一单方向上的映射，在.NET领域借助了一种**代码即数据**的思想，再细化到C#语言**代码即数据**就是表达式树。所以，我们有理由相信：SQL是根据表达式树生成的。现在我们已经找准了方向，那么我们看看`EntityFrameworkCore`在什么地方生成表名的，也就是说，我们只需要修改一下生成表名的代码，就可以做到动态生成`database`.`table` SQL。`EntityFrameworkCore`是通过`TableExpression`来生成表名的：

```csharp
public class TableExpression
{
    public virtual string Table { get; }
    public virtual string Schema { get; }
}
```

如果你MySQL知识至少跟我一样的水平的话，看到`TableExpression`表达式有一个`Schema`是不是立即就可以想到：哈哈，太好了，我压根就不用修改`EntityFrameworkCore`本身的代码就可以实现。为什么呢？好吧，看看MySQL官网怎么说[Schema](https://dev.mysql.com/doc/refman/5.7/en/create-database.html)的:

> In MySQL, physically, a schema is synonymous with a database. You can substitute the keyword  SCHEMA instead of DATABASE in MySQL SQL syntax, for example using CREATE SCHEMA instead of CREATE DATABASE. Some other database products draw a distinction. For example, in the Oracle Database product, a schema represents only a part of a database: the tables and other objects owned by a single user.

好吧，Schema就是Database，那么我们就用`Schema`.`Table`来表示`database`.`table`。现在事情就变得简单了，变成了我们如何动态地改变`Schema`和`Table`了，以下是我提供的简化实现：

```csharp
/// <summary>
/// Changes the database name. This require the databases in the same machine.
/// </summary>
/// <param name="database">The database name.</param>
/// <remarks>
/// This only been used for supporting multiple databases in the same model. This require the databases in the same machine.
/// </remarks>
public void ChangeDatabase(string database)
{
    if (_context.Model.Relational() is RelationalModelAnnotations relational)
    {
        relational.DatabaseName = database;
    }

    var connection = _context.Database.GetDbConnection();
    if (connection.State.HasFlag(ConnectionState.Open))
    {
        connection.ChangeDatabase(database);
    }

    var items = _context.Model.GetEntityTypes();
    foreach (var item in items)
    {
        if (item.Relational() is RelationalEntityTypeAnnotations extensions)
        {
            extensions.Schema = database;
        }
    }
}
/// <summary>
/// Changes the table name. This require the tables in the same database.
/// </summary>
/// <param name="table"></param>
/// <remarks>
/// This only been used for supporting multiple tables in the same model. This require the tables in the same database.
/// </remarks>
public void ChangeTable(string table)
{
    if (_dbContext.Model.FindEntityType(typeof(TEntity)).Relational() is RelationalEntityTypeAnnotations relational)
    {
        relational.TableName = table;
    }
}
```

OK, 虽然有点low，但是毕竟支持了MySQL分库分表，看看怎么用：

```csharp
namespace QuickStart.Controllers
{
    [Route("api/[controller]")]
    public class UserController : ApiController
    {
        private readonly IUnitOfWork _unitOfWork;

        // 1. IRepositoryFactory used for readonly scenario;
        // 2. IUnitOfWork used for read/write scenario;
        // 3. IUnitOfWork<TContext> used for multiple databases scenario;

        public UserController(IUnitOfWork unitOfWork)
        {
            _unitOfWork  = unitOfWork;

            unitOfWork.ChangeDatabase($"rigofunc_{DateTime.Now.Year}");

            var userRepo = unitOfWork.GetRepository<User>();
            var postRepo = unitOfWork.GetRepository<Post>();

            var ym = DateTime.Now.ToString("yyyyMM");

            userRepo.ChangeTable($"t_user_{ym}");
            postRepo.ChangeTable($"t_post_{ym}");

            var user = new User
            {
                //UserId = 123,
                UserName = "rigofunc",
                Password = "password"
            };

            userRepo.Insert(user);

            var post = new Post
            {
                //PostId = 123,
                UserId = user.UserId,
                Content = "What a piece of junk!"
            };

            postRepo.Insert(post);

            unitOfWork.SaveChanges();

            var find = userRepo.Find(user.UserId);

            find.Password = "p@ssword";

            unitOfWork.SaveChanges();
        }

        [HttpGet]
        public IPagedList<User> Get()
        {
            _unitOfWork.ChangeDatabase($"rigofunc_2018");

            var userRepo = _unitOfWork.GetRepository<User>();

            return userRepo.Query(u => true).OrderBy(u => u.UserId).ToPagedList(0, 20);
        }
    }
}
```

以下是生成的SQL：

```sql
      Executed DbCommand [Parameters=[@p2='?', @p4='?' (Size = 8000), @p6='?' (Size = 8000)], CommandType='Text', CommandTimeout='0']
      INSERT INTO `rigofunc_2017`.`t_user_201703` (`Fis_deleted`, `Fpassword`, `Fname`)
      VALUES (@p2, @p4, @p6);
      SELECT LAST_INSERT_ID();

      Executed DbCommand [Parameters=[@p10='?' (Size = 8000), @p12='?', @p14='?'], CommandType='Text', CommandTimeout='0']
      INSERT INTO `rigofunc_2017`.`t_post_201703` (`Fcontent`, `Fis_deleted`, `Fuser_id`)
      VALUES (@p10, @p12, @p14);
      SELECT LAST_INSERT_ID();

      Executed DbCommand [Parameters=[@p0='?', @p3='?', @p4='?' (Size = 8000)], CommandType='Text', CommandTimeout='0']
      UPDATE `rigofunc_2017`.`t_user_201703` SET `Fpassword` = @p4
      WHERE `Fid` = @p0 AND `Fis_deleted` = @p3;
      SELECT ROW_COUNT();

      Executed DbCommand (1ms) [Parameters=[], CommandType='Text', CommandTimeout='0']
      SELECT `u`.`Fid`, `u`.`Fis_deleted`, `u`.`Fpassword`, `u`.`Fname`
      FROM `rigofunc_2017`.`t_user_201703` AS `u`
      ORDER BY `u`.`Fid`

      Executed DbCommand (2ms) [Parameters=[], CommandType='Text', CommandTimeout='0']
      SELECT `u`.`Fid`, `u`.`Fis_deleted`, `u`.`Fpassword`, `u`.`Fname`
      FROM `rigofunc_2018`.`t_user_201703` AS `u`
      ORDER BY `u`.`Fid`
```


以下是我自己的定位（谁不装逼呢）：
> I'm a software architect, particularly love .NET Core, but I also embrace all the new stuff.