/* jshint globalstrict: true */
'use strict';

/**
 * @description
 * 创建作用域的构造器
 *             Scope: <constructor>
 *        $$watchers: 监听的作用域集合
 *  $$lastDirtyWatch: 记录最后一个脏(有变化)的监听对象
 *      $$asyncQueue: 执行$evalAsync的异步队列
 * $$applyAsyncQueue: 执行$applyAsync的异步队列
 *    $$applyAsyncId: 执行$applyAsync时的timeid,防重复
 * $$postDigestQueue: 执行$postDigest的异步队列
 *             $root: 根作用域
 *        $$children: 子作用域
 *           $$phase: 执行状态,null,$apply,$digest
 */
function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
    this.$root = this;
    this.$$children = [];
    this.$$phase = null;
}

/**
 * @description
 * 创建子作用域,继承父作用域,拥有自己的$$watchers,$$children
 * 
 * @param {boolean} isolated true为隔离作用域
 * @param {parent scope} parent parent的$$children包含当前新作用域
 */
Scope.prototype.$new = function (isolated, parent) {
    // return Object.create(this);
    var child;
    parent = parent || this;
    if (isolated) {
        child = new Scope();
        child.$root = parent.$root;
        child.$$asyncQueue = parent.$$asyncQueue;
        child.$$postDigestQueue = parent.$$postDigestQueue;
        child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
    } else {
        var ChildScope = function () { };
        ChildScope.prototype = this;
        child = new ChildScope();
    }
    parent.$$children.push(child);
    child.$parent = parent;
    child.$$watchers = [];
    child.$$children = [];
    return child;
};

/**
 * @description
 * 递归子集作用域,在没有变化时会结束
 * 
 * @param {function} fn 执行digest的主要部分
 */
Scope.prototype.$$everyScope = function (fn) {
    if (fn(this)) {
        return this.$$children.every(function (child) {
            return child.$$everyScope(fn);
        });
    } else {
        return false;
    }
};

/**
 * @description
 * 创建监听的事件,用$$watchers存储他们
 * 这里的$$watchers采用unshift()是为了在销毁监听事件时不影响其他的监听
 * initWatchVal为设置默认的初始值,在第一次监听使用oldValue = newValue返回
 * 
 * @param {function} watchFn 
 * function(scope){ return scope.aValue; },aValue为监听的值,监听时会被封装为一个函数,返回监听的值
 * @param {function} listenerFn 
 * function(newValue, oldValue, scope) { expr(); },检测到变化执行的事件
 * @param {boolean} valueEq true为值比较，false为 === 全等比较
 * 
 * @returns {function} 用于销毁监听对象,将该对象从当前scope的$$watchers列表中删除
 */
Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
    var self = this;
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function () { },
        valueEq: !!valueEq,
        last: initWatchVal
    };
    this.$$watchers.unshift(watcher);
    this.$root.$$lastDirtyWatch = null;
    return function () {
        var index = self.$$watchers.indexOf(watcher);
        if (index >= 0) {
            self.$$watchers.splice(index, 1);
        }
        self.$root.$$lastDirtyWatch = null;
    };
};

/**
 * 新旧值的比较 NaN!==NaN ==与===处理
 */
Scope.prototype.$areEqual = function (newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue)) ?
            true : newValue === oldValue;
    }
};

/**
 * @description
 * 检测当前作用域的变化,遍历$$watchers直到不在变化(dirty为false),一般有变化会执行2遍
 * ttl为最大遍历的次数,防止无限的变化造成堵塞卡死,一般超过10次抛出错误
 * $$lastDirtyWatch记录最后一个脏值,这会在下次遍历到这里的时候切断遍历来优化性能
 */
Scope.prototype.$digest = function () {
    this.$beginPhase('$digest');
    var ttl = 10;
    var dirty;
    var asyncTask;
    this.$root.$$lastDirtyWatch = null;
    if (this.$root.$$applyAsyncId) {
        clearTimeout(this.$root.$$applyAsyncId);
        this.$$flushApplyAsync();
    }
    do {
        while (this.$$asyncQueue.length) {
            try {
                asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            } catch (e) {
                console.log(e);
            }
        }
        dirty = this.$$digestOnce();
        if ((dirty || this.$$asyncQueue.length) && !(ttl--)) {
            this.$clearPhase();
            throw "10 digest iterations reached.";
        }
    } while (dirty || this.$$asyncQueue.length);

    this.$clearPhase();

    while (this.$$postDigestQueue.length) {
        try {
            this.$$postDigestQueue.shift()();
        } catch (e) {
            console.log(e);
        }
    }
};

/**
 * $digest执行一次,everyScope循环了它的子集
 */
Scope.prototype.$$digestOnce = function () {
    var dirty;
    var continueLoop = true;
    this.$$everyScope(function (scope) {
        var newValue, oldValue;
        _.forEachRight(scope.$$watchers, function (watcher) {
            try {
                // 判断是否是被销毁的watch
                if (watcher) {
                    newValue = watcher.watchFn(scope);
                    oldValue = watcher.last;
                    if (!scope.$areEqual(newValue, oldValue, watcher.valueEq)) {
                        scope.$root.$$lastDirtyWatch = watcher;
                        watcher.listenerFn(newValue,
                            (oldValue === initWatchVal ? newValue : oldValue),
                            scope);
                        watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
                        dirty = true;
                    } else if (scope.$root.$$lastDirtyWatch === watcher) {
                        continueLoop = false;
                        return false;
                    }
                }
            } catch (e) {
                console.log(e);
            }
        });
        return continueLoop;
    });
    return dirty;
};

/**
 * @param {function} expr 在当前作用域执行的函数
 * @param {*} locals
 */
Scope.prototype.$eval = function (expr, locals) {
    return expr(this, locals);
};

/**
 * @description
 * 延迟执行,在没有digest或apply在执行的时候会触发全局的digest
 * 在有digest在执行的情况下,将事件加入当前的执行队列
 * evalAsync队列会在DOM变化之前执行,提高性能
 * 一般是在监听事件的内部发出,对后续产生影响
 * @param {function} expr 
 */
Scope.prototype.$evalAsync = function (expr) {
    var self = this;
    // 这里第二个判断是判断是否有异步的事件还没开始运行,异步事件运行后
    if (!self.$$phase && !self.$$asyncQueue.length) {
        setTimeout(function () {
            if (self.$$asyncQueue.length) {
                self.$root.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({ scope: this, expression: expr });
};

/**
 * @description
 * 执行外部函数,无论成功,最后执行全局的digest
 * 
 * @param {function} expr 
 */
Scope.prototype.$apply = function (expr) {
    this.$beginPhase('$apply');
    try {
        this.$eval(expr);
    } finally {
        this.$clearPhase();
        this.$root.$digest();
    }
};

/**
 * @description
 * 延迟执行,在没有digest执行时,会触发$apply全局的digest
 * 在digest执行开始时,如果有applyAsync事件队列,则首先将该队列执行完
 * 如果在digest执行期间,则会等到digest执行完毕再触发$apply
 * 一般是用于http请求
 * 
 * @param {function} expr 
 */
Scope.prototype.$applyAsync = function (expr) {
    var self = this;
    self.$$applyAsyncQueue.push(function () {
        self.$eval(expr);
    });
    if (this.$root.$$applyAsyncId === null) {
        this.$root.$$applyAsyncId = setTimeout(function () {
            self.$apply(_.bind(self.$$flushApplyAsync, self));
        }, 0);
    }
};

/**
 * $applyAsync的循环执行体,在digest中也有使用
 */
Scope.prototype.$$flushApplyAsync = function () {
    while (this.$$applyAsyncQueue.length) {
        try {
            this.$$applyAsyncQueue.shift()();
        } catch (e) {
            console.log(e);
        }
    }
    this.$$applyAsyncId = null;
};

/**
 * @description
 * scope的执行状态的更新
 * 
 * @param {$apply/$digest/null} phase 
 */
Scope.prototype.$beginPhase = function (phase) {
    if (this.$$phase) {
        throw this.$$phase + ' already in progress!';
    }
    this.$$phase = phase;
};
Scope.prototype.$clearPhase = function () {
    this.$$phase = null;
};

/**
 * @description
 * 最后执行的异步队列,在digest完之后运行
 * 
 * @param {function} fn 
 */
Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};

/**
 * @description
 * 对多项的监听,循环遍历watchFns数组,对每一项添加$watch,listenerFn相同
 * watchFns为空时会有闭包产生
 * 
 * @param {array} watchFns 
 * @param {function} listenerFn 
 */
Scope.prototype.$watchGroup = function (watchFns, listenerFn) {
    var self = this;
    var newValues = new Array(watchFns.length);
    var oldValues = new Array(watchFns.length);

    var changeReactionScheduled = false;

    var firstRun = true;

    if (watchFns.length === 0) {
        var shouldCall = true;
        self.$evalAsync(function () {
            if (shouldCall) {
                listenerFn(newValues, newValues, self);
            }
        });
        return function () {
            shouldCall = false;
        };
    }

    function watchGroupListener() {
        if (firstRun) {
            listenerFn(newValues, newValues, self);
            firstRun = false;
        } else {
            listenerFn(newValues, oldValues, self);
        }
        changeReactionScheduled = false;
    }
    var destroyGroup = _.map(watchFns, function (watchFn, i) {
        return self.$watch(watchFn, function (newValue, oldValue) {
            newValues[i] = newValue;
            oldValues[i] = oldValue;
            if (!changeReactionScheduled) {
                changeReactionScheduled = true;
                self.$evalAsync(watchGroupListener);
            }
        });
    });

    return function () {
        _.forEach(destroyGroup, function (destroy) {
            destroy();
        });
    };
};

/**
 * 在页面中该作用不存在了,删除它在scope树中的对象,取消监听
 * 这里在$new的时候添加了child.$parent = parent的对父级的索引
 */
Scope.prototype.$destroy = function() {
    var siblings = this.$parent.$$children;
    var indexOfThis = siblings.indexOf(this);
    if(indexOfThis >= 0) {
        siblings.splice(indexOfThis, 1);
    }
    this.$$watchers = null;
};

/**
 * 监听者的初始旧值,用一个对象索引
 */
function initWatchVal() { }