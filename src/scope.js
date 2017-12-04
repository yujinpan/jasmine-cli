/* jshint globalstrict: true */
'use strict';

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
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
        if(dirty && !(ttl--)){
            throw "10 digest iterations reached.";
        }
    }while(dirty);

    /* while method
    dirty = this.$$digestOnce();
    while(dirty){
        dirty = this.$$digestOnce();
    }
    */
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
    this.$$asyncQueue.push({scope:this,expression:expr});
};

Scope.prototype.$apply = function(expr){
    try{
        this.$eval(expr);
    }finally{
        this.$digest();
    }
};

function initWatchVal(){}