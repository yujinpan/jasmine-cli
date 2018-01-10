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

    // can parse a string in single quotes
    it("可以用单引号解析一个字符串", function() {
        var fn = parse("'abc'");
        expect(fn()).toEqual('abc');
    });
    // can parse a tring in double quotes
    it("can parse a string in double quotes", function() {
        var fn = parse('"abc"');
        expect(fn()).toEqual('abc');
    });
    // will not parse a string with mismatching quotes
    it("不会使用不匹配的引号解析字符串", function() {
        expect(function() { parse('"abc\'');}).toThrow();
    });
    // can parse a string with single quotes inside
    it("可以解析一个单引号的字符串", function() {
        var fn = parse("'a\\\'b'");
        expect(fn()).toEqual('a\'b');
    });
    // can parse a string with double quotes inside
    it("可以用里面的双引号解析一个字符串", function() {
        var fn = parse('"a\\\"b"');
        expect(fn()).toEqual('a\"b');
    });
    // will parse a string with unicode escapes
    it("将用unicode转义解析一个字符串", function() {
        var fn = parse('"\\u00A0"');
        expect(fn()).toEqual('\u00A0');
    });
    // will not pare a string with invalid unicode escapes
    it("不会用无效的Unicode转义解析字符串", function() {
        expect(function(){parse('"\\u00T0"');}).toThrow();
    });

    // Parseing true,false,and null
    // will parse null
    it("will parse null", function() {
        var fn = parse('null');
        expect(fn()).toBe(null);
    });
    // will parse true
    it("will parse true", function() {
        var fn = parse('true');
        expect(fn()).toBe(true);
    });
    // will parse false
    it("will parse false", function() {
        var fn = parse('false');
        expect(fn()).toBe(false);
    });

    // Parsing Whitespace
    // ignores whitespace
    it("忽略空白", function() {
        var fn = parse('\n42');
        expect(fn()).toEqual(42);
    });

    // Parsing Arrays
    

});