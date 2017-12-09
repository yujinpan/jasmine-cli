/* jshint globalstrict: true */
'use strict';

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
    child.$$watchers = [];
    child.$$children = [];
    return child;
};

Scope.prototype.$$everyScope = function (fn) {
    if (fn(this)) {
        return this.$$children.every(function (child) {
            return child.$$everyScope(fn);
        });
    } else {
        return false;
    }
};

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

Scope.prototype.$areEqual = function (newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } else {
        return (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue)) ?
            true : newValue === oldValue;
    }
};

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

Scope.prototype.$eval = function (expr, locals) {
    return expr(this, locals);
};

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

Scope.prototype.$apply = function (expr) {
    this.$beginPhase('$apply');
    try {
        this.$eval(expr);
    } finally {
        this.$clearPhase();
        this.$root.$digest();
    }
};

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

Scope.prototype.$beginPhase = function (phase) {
    if (this.$$phase) {
        throw this.$$phase + ' already in progress!';
    }
    this.$$phase = phase;
};

Scope.prototype.$clearPhase = function () {
    this.$$phase = null;
};

Scope.prototype.$$postDigest = function (fn) {
    this.$$postDigestQueue.push(fn);
};

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

function initWatchVal() { }