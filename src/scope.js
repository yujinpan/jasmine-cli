/* jshint globalstrict: true */
'use strict';

function Scope() {
    this.$$watchers = [];
}

Scope.prototype.$watch = function (watchFn, listenerFn) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() {},
        last:initWatchVal
    };
    this.$$watchers.push(watcher);
};

Scope.prototype.$digest = function() {
    var dirty;
    do{
        dirty = this.$$digestOnce();
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
        if(newValue !== oldValue){
            watcher.listenerFn(newValue, 
                (oldValue === initWatchVal ? newValue : oldValue), 
                self);
            watcher.last = newValue;
            dirty = true;
        }
    });
    return dirty;
};

function initWatchVal(){}