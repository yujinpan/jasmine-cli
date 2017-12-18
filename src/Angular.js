/* jshint globalstrict:true */
'use strict';

_.mixin({
    isArrayLike: function(obj) {
        if(_.isNull(obj) || _.isUndefined(obj)) {
            return false;
        }
        var length = obj.length;
        // 如果对象的长度为10，则其中必须有属性9，适用于非零长度
        return length === 0||
        (_.isNumber(length) && length > 0 && (length - 1) in obj);
    },
    // 重写_.rest
    rest: function(args) {
        return Array.prototype.slice.apply(args).slice(1);
    }
});