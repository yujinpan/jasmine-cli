 - Build Your Own Angularjs

### $watch & $digest

 - Angular的脏检查的两面过程：$watch和$digest。
 - 脏检查回路(当最后的watch干净时提前结束digest)，TTL机制将其短路($digest超过10次，抛出错误)。
 - 基于参考的和基于值的比较之前的区别（Object,NaN）。
 - 以不同的方式在digest循环中执行函数：立即使用$eval。
 - $apply和$evalAsync，$applyAsync和$$postDigest。
 - Angular $digest中异常处理。
 - 销毁watch，时期不会再执行。
 - 使用$watchGroup函数观察单个效果的几件事。

### Scope Tree

 - 如何创建子作用域。（child = Object.create(this)）
 - 范围继承与JavaScript原生原型链继承之间的关系。
 - 属性阴影及其影响。（Array和Object在上下作用域之间是共享的）
 - 从父级作用域到其子集作用域的递归digest。（递归树结构）
 - digest中$digest,$apply的区别。（$digest执行当前作用域的，$apply全局执行digest）
 - 隔离的作用域及他们与正常作用域的区别。（隔离的为 new Scope(),但是共享异步队列$evalAsync,$applyAsync,$$postDigest）
 - 如何销毁子集作用域。（将parent.$$children中当前scope删除，将当前scope的$$children删除，对象没有引用，内存回收）

### $watchCollection

 - 区分数组，对象与其他值，处理非集合。（交给$watch处理）
 - 处理数组，类数组。（1.判断旧值是否是类数组，区分有length属性的类数组对象，赋值空数组；2.判断length是否相等，使length相等；3.遍历数组每一项是否相等，使之相等；）
 - 处理对象，类数组对象。（1.声明newLength,oldLength记录新值与旧值的属性数量；2.判断是否是对象或类数组对象，赋值空对象；2.遍历对象，没有的加上新属性，有的更新新属性；3.判断新旧对象数量oldValue是否有废弃的旧值，有则遍历去掉旧值；）

### Scope Events

 - Angular的事件系统如何建立再经典的pub/sub模式上（作用域树上的三个事件，注册事件，向上发布事件，向下广播事件）
 - 如何在作用域上注册事件监听器（$on:function(eventName, listenerFn)）
 - 事件如何在作用域中触发（向上通过$emit:function(eventName)，利用$parent循环向上发布；向下通过$broadcast:function(eventName)，利用$$childrens循环向下广播；）
 - $emit和$boradcast之间的区别是什么（1.$emit沿着$parent向上循环，消耗性能小，$broadcast需要对所有的子集进行遍历，性能消耗巨大；2.$emit有stopPropagation()事件进行阻止向上发布；3.$emit和$broadcast需要的参数与返回的结果类似；）
 - 作用域事件对象的内容是什么（targetScope,currentScope,eventName）
 - 如何在DOM事件模型之后建立一些作用域属性（闭包返回scope）
 - 何时以及如何停止作用域事件（stopPropagation及preventDefault事件）

 ### Literal Expressions

 - Angular表达式解析器的实现（表达式解析管道Lexer -> AST Builder -> AST Compiler，语法分析器生成tokens，构建抽象语法树，编译语法树）
 - 解析过程最终的结果是生成JavaScript函数（new Function(expr)）
 - 解析整数：判断是否为数字类型。
 - 解析浮点数：判断点符号后面是否为数字类型。
 - 解析科学记数法：判断大小写字母e/E以及后面是否为数字类型。
 - 解析字符串：判断单引号与双引号在字符的开头与结尾。
 - 解析true，false，null：在变量名范围内判断是否是基本类型。
 - 解析空格：跳过该字符。
 - 解析数组和对象，采取递归的方式递归子内容。