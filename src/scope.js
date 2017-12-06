/* jshint globalstrict: true */
'use strict';

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
    this.$$phase = null;
}

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
    var self = this;
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() {},
        valueEq: !!valueEq,
        last:initWatchVal
    };
    this.$$watchers.unshift(watcher);
    return function(){
        var index = self.$$watchers.indexOf(watcher);
        if(index >= 0){
            self.$$watchers.splice(index,1);
        }
        self.$$lastDirtyWatch = null;
    };
};

Scope.prototype.$areEqual = function(newValue, oldValue, valueEq){
    if(valueEq){
        return _.isEqual(newValue, oldValue);
    }else{
        return (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue)) ? 
        true : newValue === oldValue;
    }
};

Scope.prototype.$digest = function() {
    this.$beginPhase('$digest');
    var ttl = 10;
    var dirty;
    var asyncTask;
    this.$$lastDirtyWatch = null;
    if(this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
        this.$$flushApplyAsync();
    }
    do{
        while(this.$$asyncQueue.length){
            try{
                asyncTask = this.$$asyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            }catch(e){
                console.log(e);
            }
        }
        dirty = this.$$digestOnce();
        if((dirty || this.$$asyncQueue.length) && !(ttl--)){
            this.$clearPhase();
            throw "10 digest iterations reached.";
        }
    }while(dirty || this.$$asyncQueue.length);

    this.$clearPhase();

    while(this.$$postDigestQueue.length){
        try{
            this.$$postDigestQueue.shift()();
        }catch(e){
            console.log(e);
        }
    }
};

Scope.prototype.$$digestOnce = function () {
    var self = this;
    var newValue, oldValue, dirty;
    _.forEachRight(this.$$watchers, function (watcher) {
        try{
            // 判断是否是被销毁的watch
            if(watcher){
                newValue = watcher.watchFn(self);
                oldValue = watcher.last;
                if(!self.$areEqual(newValue, oldValue, watcher.valueEq)){
                    self.$$lastDirtyWatch = watcher;
                    watcher.listenerFn(newValue, 
                        (oldValue === initWatchVal ? newValue : oldValue), 
                        self);
                    watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
                    dirty = true;
                }else if(self.$$lastDirtyWatch === watcher){
                    return false;
                }
            }
        }catch(e){
            console.log(e);
        }
    });
    return dirty;
};

Scope.prototype.$eval = function(expr, locals){
    return expr(this, locals);
};

Scope.prototype.$evalAsync = function(expr) {
    var self = this;
    // 这里第二个判断是判断是否有异步的事件还没开始运行,异步事件运行后
    if(!self.$$phase && !self.$$asyncQueue.length){
        setTimeout(function(){
            if(self.$$asyncQueue.length){
                self.$digest();
            }
        }, 0);
    }
    this.$$asyncQueue.push({scope:this,expression:expr});
};

Scope.prototype.$apply = function(expr){
    this.$beginPhase('$apply');
    try{
        this.$eval(expr);
    }finally{
        this.$clearPhase();
        this.$digest();
    }
};

Scope.prototype.$applyAsync = function(expr) {
    var self = this;
    self.$$applyAsyncQueue.push(function() {
        self.$eval(expr);
    });
    if(this.$$applyAsyncId === null){
        this.$$applyAsyncId = setTimeout(function(){
            self.$apply(_.bind(self.$$flushApplyAsync, self));
        }, 0);
    }
};

Scope.prototype.$$flushApplyAsync = function(){
    while(this.$$applyAsyncQueue.length) {
        try{
            this.$$applyAsyncQueue.shift()();
        }catch(e){
            console.log(e);
        }
    }
    this.$$applyAsyncId = null;
};

Scope.prototype.$beginPhase = function(phase){
    if(this.$$phase){
        throw this.$$phase + ' already in progress!';
    }
    this.$$phase = phase;
};

Scope.prototype.$clearPhase = function(){
    this.$$phase = null;
};

Scope.prototype.$$postDigest = function(fn) {
    this.$$postDigestQueue.push(fn);
};

function initWatchVal(){}