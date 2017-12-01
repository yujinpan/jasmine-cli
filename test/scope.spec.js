/* jshint globalstrict: true */
/* global Scope: false */
'use strict';

describe("Scope", function () {

    var scope;

    beforeEach(function () {
        scope = new Scope();
    });

    it("可以被构建并用作对象", function () {
        scope.aProperty = 1;

        expect(scope.aProperty).toBe(1);
    });

    describe("Digest", function () {

        it("在$digest时能调用监听器函数", function () {
            var watchFn = function () { return 'wat'; };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it("以scope作为参数调用watch函数", function() {
            var watchFn = jasmine.createSpy();
            var listenerFn = function() {};
            scope.$watch(watchFn, listenerFn);

            scope.$digest();
            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it("当观察值改变时调用监听器功能", function() {
            scope.someValue = '1';
            scope.counter = 0;
            scope.$watch(
                function(scope) { return scope.someValue; },
                function(newValue, oldValue, scope){ scope.counter ++; }
            );

            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = '2';
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

    });

});