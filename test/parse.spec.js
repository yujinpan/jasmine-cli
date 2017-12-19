/* jshint globalstrict: true */
/* global parse: false */
'use strict';

describe("parse 解析", function() {
    // 解析整数
    it("can parse an integer", function() {

        var fn = parse('42');
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);

    });

});