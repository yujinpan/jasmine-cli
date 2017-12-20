/* jshint globalstrict: true */
/* global parse: false */
'use strict';

describe("parse 解析", function() {
    // can parse an integer
    it("解析整数", function() {
        var fn = parse('42');
        expect(fn).toBeDefined();
        expect(fn()).toBe(42);
    });
    // can parse a floating point number
    it("解析浮点数", function() {
        var fn = parse( '4.2' );
        expect(fn()).toBe(4.2);
    });
    // can parse a floating point number without an integer part
    it("解析没有整数部分的浮点数", function() {
        var fn = parse('.42');
        expect(fn()).toBe(0.42);
    });
    // can parse a number in scientific notation
    it("可以用科学记数法解析一个数字", function() {
        var fn = parse('42e3');
        expect(fn()).toBe(42000);
    });
    // can parse scientific notation with a float coefficient
    it("可以用浮点系数来解析科学记数法", function() {
        var fn = parse('.42e2');
        expect(fn()).toBe(42);
    });
    // can parse scientific notation with negative exponents
    it("可以用负指数来解析科学记数法", function() {
        var fn = parse('4200e-2');
        expect(fn()).toBe(42);
    });
    // can parse scientific notation with the + sign
    it("可以用+符号解析科学记数法", function() {
        var fn = parse('.42e+2');
        expect(fn()).toBe(42);
    });
    // can parse upper case scientific notation
    it("可以解析大写的科学记数法", function() {
        var fn = parse('.42E2');
        expect(fn()).toBe(42);
    });
    // will not parse invalid scientific notation
    it("不会解析无效的科学记数法", function() {
        expect(function() {parse('42e-');}).toThrow();
        expect(function() {parse('42e-a');}).toThrow();
    });

});