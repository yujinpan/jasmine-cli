/* jshint globalstrict: true */
'use strict';

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$phase = null;
}

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() {},
        valueEq: !!valueEq,
        last:initWatchVal
    };
    this.$$watchers.push(watcher);
};

Scope.prototype.$areEqual = function(newValue, oldValue, valueEq){
    if(valueEq){
        return _.isEqual(newValue, oldValue);
    }else{
        return (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue)) ? 
        true : newValue === oldValue;
    }
}

Scope.prototype.$digest = function() {
    this.$beginPhase('$digest');
    var ttl = 10;
    var dirty;
    var asyncTask;
    this.$$lastDirtyWatch = null;
    do{
        while(this.$$asyncQueue.length){
            asyncTask = this.$$asyncQueue.shift();
            asyncTask.scope.$eval(asyncTask.expression);
        }
        dirty = this.$$digestOnce();
        if((dirty || this.$$asyncQueue.length) && !(ttl--)){
            this.$clearPhase();
            throw "10 digest iterations reached.";
        }
    }while(dirty || this.$$asyncQueue.length);

    this.$clearPhase();
};

Scope.prototype.$$digestOnce = function () {
    var self = this;
    var newValue, oldValue, dirty;
    _.forEach(this.$$watchers, function (watcher) {
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
    setTimeout(function(){
        self.$apply(function() {
            while(self.$$applyAsyncQueue.length) {
                self.$$applyAsyncQueue.shift()();
            }
        });
    }, 0);
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

function initWatchVal(){}