/* jshint globalstrict: true */
/* global Scope: false */
'use strict';

describe("Scope", function() {

    it("可以被构建并用作对象", function() {
        var scope = new Scope();
        scope.aProperty = 1;

        expect(scope.aProperty).toBe(1);
    });

});