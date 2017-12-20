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
    // 解析浮点数
    it("can parse a floating point number", function() {
        var fn = parse( '4.2' );
        expect(fn()).toBe(4.2);
    });
    // 解析没有整数部分的浮点数
    it("can parse a floating point number without an integer part", function() {
        var fn = parse('.42');
        expect(fn()).toBe(0.42);
    });

});