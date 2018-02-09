[TOC]

# Testem-cli

 - 搭建基于`Grunt + Jasmine`框架的单元测试基础脚手架
 - 使用了`Grunt`前端构建工具，[Grunt官网API地址](http://www.gruntjs.net/)
 - 使用了`Jasmine`测试框架，[Jasmine官网API地址](https://jasmine.github.io/index.html)
 - 使用了`lodash.js`，方便处理数据，[Lodash官网API地址](https://lodash.com/)
 - *编辑器使用了`JShint`校验，所以`Grunt`中没有配置*

# Directory

```
src     // 待测试代码；
test    // 单元测试，文件名与src的待测试代码对应；
```

# Get Started

```
# 安装npm包
cnpm install

# 开始单元测试
grunt testem
```

# Simple Example

> 测试代码与待测试代码在同一作用域

```
// 待测试代码
// src/hello.js
function sayHello(to){
    return _.template("Hello, <%= name %>!")({name:to});
}


// 测试用例
// 测试的项目，Hello为描述名
describe("Hello", function() {

    // 测试项目里面的细节测试，sayHello为该测试项的描述
    it("sayhello", function() {

        # 测试执行
        # 我们期望sayHello("Richard")的结果为"Hello, Richard!"
        expect(sayHello("Richard")).toBe("Hello, Richard!");
        
    });
});
```