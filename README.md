 - 用于搭建单元测试的脚手架

 - 编辑器使用了jshint,所以grunt中没有配置

 - PS.你只是捅了一下代码，直到看起来似乎都对齐了

 #### 第一部分

 - Angular的脏检查的两面过程：$watch和$digest。
 - 脏检查回路(当最后的watch干净时提前结束digest)，TTL机制将其短路($digest超过10次，抛出错误)。
 - 基于参考的和基于值的比较之前的区别（Object,NaN）。
 - 以不同的方式在digest循环中执行函数：立即使用$eval。
 - $apply和$evalAsync，$applyAsync和$$postDigest。
 - Angular $digest中异常处理。
 - 销毁watch，时期不会再执行。
 - 使用$watchGroup函数观察单个效果的几件事。

 #### 第二部分

 - 如何创建子作用域。（child = Object.create(this)）
 - 范围继承与JavaScript原生原型链继承之间的关系。
 - 属性阴影及其影响。（Array和Object在上下作用域之间是共享的）
 - 从父级作用域到其子集作用域的递归digest。（递归树结构）
 - digest中$digest,$apply的区别。（$digest执行当前作用域的，$apply全局执行digest）
 - 隔离的作用域及他们与正常作用域的区别。（隔离的为 new Scope(),但是共享异步队列$evalAsync,$applyAsync,$$postDigest）
 - 如何销毁子集作用域。（将parent.$$children中当前scope删除，将当前scope的$$children删除，对象没有引用，内存回收）