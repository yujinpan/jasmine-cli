 - 用于搭建单元测试的脚手架

 - 编辑器使用了jshint,所以grunt中没有配置

 - PS.你只是捅了一下代码，直到看起来似乎都对齐了

 #### 第一部分总结

 - Angular的脏检查的两面过程：$watch和$digest。
 - 脏检查回路(当最后的watch干净时提前结束digest)，TTL机制将其短路($digest超过10次，抛出错误)。
 - 基于参考的和基于值的比较之前的区别（Object,NaN）。
 - 以不同的方式在digest循环中执行函数：立即使用$eval。
 - $apply和$evalAsync，$applyAsync和$$postDigest。
 - Angular $digest中异常处理。
 - 销毁watch，时期不会再执行。
 - 使用$watchGroup函数观察单个效果的几件事。