/* jshint globalstrict: true */
'use strict';

function Scope() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
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
    var ttl = 10;
    var dirty;
    this.$$lastDirtyWatch = null;
    do{
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
        if(newValue !== oldValue){
            self.$$lastDirtyWatch = watcher;
            watcher.listenerFn(newValue, 
                (oldValue === initWatchVal ? newValue : oldValue), 
                self);
            watcher.last = newValue;
            dirty = true;
        }else if(self.$$lastDirtyWatch === watcher){
            return false;
        }
    });
    return dirty;
};

function initWatchVal(){}