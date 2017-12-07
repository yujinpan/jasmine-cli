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

        it("当watch的值为undefined的时候调用监听器", function() {

            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.someValue; },
                function(newValue, oldValue, scope) { scope.counter++; }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

        });

        it("第一次调用具有新值的监听器作为旧值", function() {
            scope.someValue = 123;
            var oldValueGiven;

            scope.$watch(
                function(scope) { return scope.someValue; },
                function(newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        it("可能有观察者省略了监听功能", function() {

            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);

            scope.$digest();
            expect(watchFn).toHaveBeenCalled();
        });

        it("在相同的digest中触发链接的观察者", function() {

            scope.name = 'Jane';

            scope.$watch(
                function(scope) { return scope.nameUpper; },
                function(newValue, oldValue, scope){
                    if(newValue){
                        scope.initial = newValue.substring(0,1) + '.';
                    }
                }
            );

            scope.$watch(
                function(scope) { return scope.name; },
                function(newValue, oldValue, scope){
                    if(newValue){
                        scope.nameUpper = newValue.toUpperCase();
                    }
                }
            );

            scope.$digest();
            expect(scope.initial).toBe('J.');

            scope.name = 'Bob';
            scope.$digest();
            expect(scope.nameUpper).toBe('BOB');
            expect(scope.initial).toBe('B.');
        });

        it("10次迭代后台放弃watch", function() {

            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(
                function(scope) { return scope.counterA; },
                function(newValue, oldValue, scope){
                    scope.counterB++;
                }
            );

            scope.$watch(
                function(scope) { return scope.counterB; },
                function(newValue, oldValue, scope){
                    scope.counterA++;
                }
            );

            expect((function(){scope.$digest();})).toThrow();
        });

        it("当最后的watch干净时结束digest", function() {

            scope.array = _.range(100);
            var watchExecutions = 0;

            _.times(100, function(i) {

                scope.$watch(
                    function(scope){
                        watchExecutions++;
                        return scope.array[i];
                    },
                    function(newValue, oldValue, scope){}
                );
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        });

        it("如果启用，则根据值进行比较", function() {

            scope.aValue = [1,2,3];
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope){
                    scope.counter++;
                },
                true
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);

        });

        it("正确的处理NaN", function() {
            scope.number = 0/0;
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.number; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("执行$eval'ed函数并返回结果", function() {
            scope.aValue = 42;

            var result = scope.$eval(function(scope){
                return scope.aValue;
            });

            expect(result).toBe(42);
        });

        it("直接转递第二个$eval参数", function() {
            scope.aValue = 42;

            var result = scope.$eval(function(scope, arg) {
                return scope.aValue + arg;
            }, 2);

            expect(result).toBe(44);
        });

        it("执行$apply'ed函数并启动$digest", function (){
            scope.aValue = 'someValue';
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope){
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$apply(function(scope){
                scope.aValue = 'anotherValue';
            });
            expect(scope.counter).toBe(2);
        });

        it("稍后在同一周期内执行$evalAsync函数", function() {
            scope.aValue = [1,2,3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.$evalAsync(function(scope){
                        scope.asyncEvaluated = true;
                    });
                    scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
                }
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        });

        it("执行有watch函数添加的$evalAsync函数", function() {
            scope.aValue = [1,2,3];
            scope.asyncEvaluated = false;

            scope.$watch(
                function(scope){
                    if(!scope.asyncEvaluated){
                        scope.$evalAsync(function(scope){
                            scope.asyncEvaluated = true;
                        });
                    }
                    return scope.aValue;
                },
                function(newValue, oldValue, scope){}
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
        });

        it("执行$evalAsync的功能,即使不脏", function() {
            scope.aValue = [1,2,3];
            scope.asyncEvaluatedTimes = 0;
            scope.$watch(
                function(scope){
                    if(scope.asyncEvaluatedTimes < 2){
                        scope.$evalAsync(function(scope){
                            scope.asyncEvaluatedTimes++;
                        });
                    }
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {}
            );

            scope.$digest();

            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        it("最终会暂停watcher添加的$evalAsyncs", function() {
            scope.aValue = [1,2,3];
            
            scope.$watch(
                function(scope){
                    scope.$evalAsync(function(scope){});
                    return scope.aValue;
                },
                function(newValu, oldValue, scope){}
            );

            expect(function() {scope.$digest();}).toThrow();
        });

        it("有一个$$phase字段，其值就是当前digest阶段名称", function() {
            scope.aValue = [1,2,3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(
                function(scope) {
                    scope.phaseInWatchFunction = scope.$$phase;
                    return scope.aValue;
                },
                function(newValue, oldValue, scope){
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );

            scope.$apply(function(scope){
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        });

        it("在$evalAsync中安排一个digest", function(done) {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope){
                    scope.counter++;
                }
            );

            scope.$evalAsync(function(scope) {

            });

            expect(scope.counter).toBe(0);
            setTimeout(function(){
                expect(scope.counter).toBe(1);
                done();
            }, 50);
            
        });

        it("allows async $apply with $applyAsync", function(done) {
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);
            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it("never executes $applyAsync'ed function in the same cycle", function(done) {
            scope.aValue = [1,2,3];
            scope.asyncApplied = false;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.$applyAsync(function(scope){
                        scope.asyncApplied = true;
                    });
                }
            );

            scope.$digest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(function(){
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });

        it("将许多调用合并到$applyAsync", function(done) {
            scope.counter = 0;

            scope.$watch(
                function(scope){
                    scope.counter++;
                    return scope.aValue;
                },
                function(newValue, oldValue, scope){}
            );

            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function(scope) {
                scope.aValue = 'def';
            });

            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it("如果先digest,则取消并应用$applyAsync", function(done) {
            scope.counter = 0;

            scope.$watch(
                function(scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function(newValue, oldValue, scope){}
            );

            scope.$applyAsync(function(scope){
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function(scope){
                scope.aValue = 'def';
            });

            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toEqual('def');

            setTimeout(function(){
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it("在digest中不包括$$postDigest", function() {
            scope.aValue = 'original value';
            scope.$$postDigest(function() {
                scope.aValue = 'changed value';
            });
            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.watchedValue = newValue;
                }
            );

            scope.$digest();
            expect(scope.watchedValue).toBe('original value');

            scope.$digest();
            expect(scope.watchedValue).toBe('changed value');
        });

        it("捕获watch中的异常", function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            
            scope.$watch(
                function(scope){ throw "Error"; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$watch(
                function(scope){ return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("捕获listener中的异常", function(){
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    throw "Error";
                }
            );

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("在$evalAsync中捕获异常", function(done) {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$evalAsync(function(scope){
                throw "Error";
            });

            setTimeout(function(){
                expect(scope.counter).toBe(1);
                done();
            }); 
        });

        it("在$applyAsync中捕获异常", function(done) {
            // $apply中的try捕获
            scope.$applyAsync(function(scope){
                throw "Error";
            });
            // $digest中的try捕获
            scope.$applyAsync(function(scope){
                throw "Error";
            });
            // 测试
            scope.$applyAsync(function(scope){
                scope.applied = true;
            });

            setTimeout(function() {
                expect(scope.applied).toBe(true);
                done();
            }, 50);
        });

        it("在$$postDigest中捕获异常", function(){
            var didRun = false;

            scope.$$postDigest(function(){
                throw "Error";
            });

            scope.$$postDigest(function(){
                didRun = true;
            });

            scope.$digest();
            expect(didRun).toBe(true);
        });

        it("允许使用销毁$watch", function() {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch = scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);

            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it("允许在digest期间销毁$watch", function(){
            scope.aValue = 'abc';
            var watchCalls = [];

            scope.$watch(
                function(scope){
                    watchCalls.push('first');
                    return scope.aValue;
                }
            );
            
            var destoryWatch = scope.$watch(
                function(scope) {
                    watchCalls.push('second');
                    destoryWatch();
                }
            );

            scope.$watch(
                function(scope) {
                    watchCalls.push('third');
                    return scope.aValue;
                }
            );

            scope.$digest();
            expect(watchCalls).toEqual(['first','second','third','first','third']);
        });

        it("允许$watch在digest期间销毁另一个", function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            
            scope.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    destroyWatch();
                }
            );

            var destroyWatch = scope.$watch(
                function(scope) {}
            );

            scope.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("允许在digest期间摧毁几块$watch", function() {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch1 = scope.$watch(
                function(scope) {
                    destroyWatch1();
                    destroyWatch2();
                }
            );
            var destroyWatch2 = scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(0);
        });

    });

    describe("$watchGroup", function() {

        it("以watch作为数组，并用数组调用监听器", function() {
            var gotNewValues,gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([
                function(scope) { return scope.aValue; },
                function(scope) { return scope.anotherValue; }
            ],function(newValue, oldValue, scope) {
                gotNewValues = newValue;
                gotOldValues = oldValue;
            });
            scope.$digest();

            expect(gotNewValues).toEqual([1,2]);
            expect(gotOldValues).toEqual([1,2]);
        });

        it("每个digest调用一次监听器", function() {
            var counter = 0;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                function(scope) { return scope.aValue; },
                function(scope) { return scope.anotherValue; }
            ], function(newValues, oldValues, scope) {
                counter++;
            });

            scope.$digest();
            expect(counter).toEqual(1);
        });

        it("首次运行时使用相同的旧数值和新数值", function() {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                function(scope) { return scope.aValue; },
                function(scope) { return scope.anotherValue; }
            ], function(newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        });

        it("在后续运行中对旧值和新值使用不用的数组", function() {
            scope.aValue = 1;
            scope.anotherValue = 2;

            var gotNewValues, gotOldValues;

            scope.$watchGroup([
                function(scope) { return scope.aValue; },
                function(scope) { return scope.anotherValue; }
            ], function(newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);

            scope.anotherValue = 3;
            scope.$digest();
            expect(gotNewValues).toEqual([1,3]);
            expect(gotOldValues).toEqual([1,2]);
        });

        it("当watch数组为空时,调用监听器一次", function() {
            var watchArray = [];
            var gotNewValues, gotOldValues;

            scope.$watchGroup(watchArray, function(newValues, oldValues, scope){
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();

            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        });

        it("可以注销", function() {
            scope.aValue = 1;
            scope.anotherValue = 2;

            var counter = 0;

            var destroyWatchs = scope.$watchGroup([
                function(scope) { return scope.aValue; },
                function(scope) { return scope.anotherValue; }
            ], function(newValues, oldValues, scope) {
                counter++;
            });

            scope.$digest();
            expect(counter).toBe(1);

            destroyWatchs();
            scope.aValue = 3;
            scope.$digest();
            expect(counter).toBe(1);

        });

        it("当首次注销时不会触发监听", function() {
            var counter = 0;

            var destroyGroup = scope.$watchGroup([],function(newValues, oldValues, scope) {
                counter++;
            });

            destroyGroup();

            scope.$digest();
            expect(counter).toBe(0);
        });

    });

});