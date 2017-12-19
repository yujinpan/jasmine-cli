/* jshint globalstrict: true */
/* global Scope: false */
'use strict';

xdescribe("Scope", function () {

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

        it("以scope作为参数调用watch函数", function () {
            var watchFn = jasmine.createSpy();
            var listenerFn = function () { };
            scope.$watch(watchFn, listenerFn);

            scope.$digest();
            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it("当观察值改变时调用监听器功能", function () {
            scope.someValue = '1';
            scope.counter = 0;
            scope.$watch(
                function (scope) { return scope.someValue; },
                function (newValue, oldValue, scope) { scope.counter++; }
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

        it("当watch的值为undefined的时候调用监听器", function () {

            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.someValue; },
                function (newValue, oldValue, scope) { scope.counter++; }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

        });

        it("第一次调用具有新值的监听器作为旧值", function () {
            scope.someValue = 123;
            var oldValueGiven;

            scope.$watch(
                function (scope) { return scope.someValue; },
                function (newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        it("可能有观察者省略了监听功能", function () {

            var watchFn = jasmine.createSpy().and.returnValue('something');
            scope.$watch(watchFn);

            scope.$digest();
            expect(watchFn).toHaveBeenCalled();
        });

        it("在相同的digest中触发链接的观察者", function () {

            scope.name = 'Jane';

            scope.$watch(
                function (scope) { return scope.nameUpper; },
                function (newValue, oldValue, scope) {
                    if (newValue) {
                        scope.initial = newValue.substring(0, 1) + '.';
                    }
                }
            );

            scope.$watch(
                function (scope) { return scope.name; },
                function (newValue, oldValue, scope) {
                    if (newValue) {
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

        it("10次迭代后台放弃watch", function () {

            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(
                function (scope) { return scope.counterA; },
                function (newValue, oldValue, scope) {
                    scope.counterB++;
                }
            );

            scope.$watch(
                function (scope) { return scope.counterB; },
                function (newValue, oldValue, scope) {
                    scope.counterA++;
                }
            );

            expect((function () { scope.$digest(); })).toThrow();
        });

        it("当最后的watch干净时结束digest", function () {

            scope.array = _.range(100);
            var watchExecutions = 0;

            _.times(100, function (i) {

                scope.$watch(
                    function (scope) {
                        watchExecutions++;
                        return scope.array[i];
                    },
                    function (newValue, oldValue, scope) { }
                );
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        });

        it("如果启用，则根据值进行比较", function () {

            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
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

        it("正确的处理NaN", function () {
            scope.number = 0 / 0;
            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.number; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("执行$eval'ed函数并返回结果", function () {
            scope.aValue = 42;

            var result = scope.$eval(function (scope) {
                return scope.aValue;
            });

            expect(result).toBe(42);
        });

        it("直接转递第二个$eval参数", function () {
            scope.aValue = 42;

            var result = scope.$eval(function (scope, arg) {
                return scope.aValue + arg;
            }, 2);

            expect(result).toBe(44);
        });

        it("执行$apply'ed函数并启动$digest", function () {
            scope.aValue = 'someValue';
            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$apply(function (scope) {
                scope.aValue = 'anotherValue';
            });
            expect(scope.counter).toBe(2);
        });

        it("稍后在同一周期内执行$evalAsync函数", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.$evalAsync(function (scope) {
                        scope.asyncEvaluated = true;
                    });
                    scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
                }
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        });

        it("执行有watch函数添加的$evalAsync函数", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;

            scope.$watch(
                function (scope) {
                    if (!scope.asyncEvaluated) {
                        scope.$evalAsync(function (scope) {
                            scope.asyncEvaluated = true;
                        });
                    }
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) { }
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
        });

        it("执行$evalAsync的功能,即使不脏", function () {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;
            scope.$watch(
                function (scope) {
                    if (scope.asyncEvaluatedTimes < 2) {
                        scope.$evalAsync(function (scope) {
                            scope.asyncEvaluatedTimes++;
                        });
                    }
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) { }
            );

            scope.$digest();

            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        it("最终会暂停watcher添加的$evalAsyncs", function () {
            scope.aValue = [1, 2, 3];

            scope.$watch(
                function (scope) {
                    scope.$evalAsync(function (scope) { });
                    return scope.aValue;
                },
                function (newValu, oldValue, scope) { }
            );

            expect(function () { scope.$digest(); }).toThrow();
        });

        it("有一个$$phase字段，其值就是当前digest阶段名称", function () {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(
                function (scope) {
                    scope.phaseInWatchFunction = scope.$$phase;
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );

            scope.$apply(function (scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        });

        it("在$evalAsync中安排一个digest", function (done) {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$evalAsync(function (scope) {

            });

            expect(scope.counter).toBe(0);
            setTimeout(function () {
                expect(scope.counter).toBe(1);
                done();
            }, 50);

        });

        it("allows async $apply with $applyAsync", function (done) {
            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);
            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it("never executes $applyAsync'ed function in the same cycle", function (done) {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.$applyAsync(function (scope) {
                        scope.asyncApplied = true;
                    });
                }
            );

            scope.$digest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(function () {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });

        it("将许多调用合并到$applyAsync", function (done) {
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) { }
            );

            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it("如果先digest,则取消并应用$applyAsync", function (done) {
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) { }
            );

            scope.$applyAsync(function (scope) {
                scope.aValue = 'abc';
            });
            scope.$applyAsync(function (scope) {
                scope.aValue = 'def';
            });

            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toEqual('def');

            setTimeout(function () {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it("在digest中不包括$$postDigest", function () {
            scope.aValue = 'original value';
            scope.$$postDigest(function () {
                scope.aValue = 'changed value';
            });
            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.watchedValue = newValue;
                }
            );

            scope.$digest();
            expect(scope.watchedValue).toBe('original value');

            scope.$digest();
            expect(scope.watchedValue).toBe('changed value');
        });

        it("捕获watch中的异常", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) { throw "Error"; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("捕获listener中的异常", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    throw "Error";
                }
            );

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("在$evalAsync中捕获异常", function (done) {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$evalAsync(function (scope) {
                throw "Error";
            });

            setTimeout(function () {
                expect(scope.counter).toBe(1);
                done();
            });
        });

        it("在$applyAsync中捕获异常", function (done) {
            // $apply中的try捕获
            scope.$applyAsync(function (scope) {
                throw "Error";
            });
            // $digest中的try捕获
            scope.$applyAsync(function (scope) {
                throw "Error";
            });
            // 测试
            scope.$applyAsync(function (scope) {
                scope.applied = true;
            });

            setTimeout(function () {
                expect(scope.applied).toBe(true);
                done();
            }, 50);
        });

        it("在$$postDigest中捕获异常", function () {
            var didRun = false;

            scope.$$postDigest(function () {
                throw "Error";
            });

            scope.$$postDigest(function () {
                didRun = true;
            });

            scope.$digest();
            expect(didRun).toBe(true);
        });

        it("允许使用销毁$watch", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch = scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
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

        it("允许在digest期间销毁$watch", function () {
            scope.aValue = 'abc';
            var watchCalls = [];

            scope.$watch(
                function (scope) {
                    watchCalls.push('first');
                    return scope.aValue;
                }
            );

            var destoryWatch = scope.$watch(
                function (scope) {
                    watchCalls.push('second');
                    destoryWatch();
                }
            );

            scope.$watch(
                function (scope) {
                    watchCalls.push('third');
                    return scope.aValue;
                }
            );

            scope.$digest();
            expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
        });

        it("允许$watch在digest期间销毁另一个", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    destroyWatch();
                }
            );

            var destroyWatch = scope.$watch(
                function (scope) { }
            );

            scope.$watch(
                function (scope) {
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it("允许在digest期间摧毁几块$watch", function () {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch1 = scope.$watch(
                function (scope) {
                    destroyWatch1();
                    destroyWatch2();
                }
            );
            var destroyWatch2 = scope.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(0);
        });

    });

    describe("$watchGroup", function () {

        it("以watch作为数组，并用数组调用监听器", function () {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([
                function (scope) { return scope.aValue; },
                function (scope) { return scope.anotherValue; }
            ], function (newValue, oldValue, scope) {
                gotNewValues = newValue;
                gotOldValues = oldValue;
            });
            scope.$digest();

            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it("每个digest调用一次监听器", function () {
            var counter = 0;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                function (scope) { return scope.aValue; },
                function (scope) { return scope.anotherValue; }
            ], function (newValues, oldValues, scope) {
                counter++;
            });

            scope.$digest();
            expect(counter).toEqual(1);
        });

        it("首次运行时使用相同的旧数值和新数值", function () {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([
                function (scope) { return scope.aValue; },
                function (scope) { return scope.anotherValue; }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        });

        it("在后续运行中对旧值和新值使用不用的数组", function () {
            scope.aValue = 1;
            scope.anotherValue = 2;

            var gotNewValues, gotOldValues;

            scope.$watchGroup([
                function (scope) { return scope.aValue; },
                function (scope) { return scope.anotherValue; }
            ], function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);

            scope.anotherValue = 3;
            scope.$digest();
            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it("当watch数组为空时,调用监听器一次", function () {
            var watchArray = [];
            var gotNewValues, gotOldValues;

            scope.$watchGroup(watchArray, function (newValues, oldValues, scope) {
                gotNewValues = newValues;
                gotOldValues = oldValues;
            });

            scope.$digest();

            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        });

        it("可以注销", function () {
            scope.aValue = 1;
            scope.anotherValue = 2;

            var counter = 0;

            var destroyWatchs = scope.$watchGroup([
                function (scope) { return scope.aValue; },
                function (scope) { return scope.anotherValue; }
            ], function (newValues, oldValues, scope) {
                counter++;
            });

            scope.$digest();
            expect(counter).toBe(1);

            destroyWatchs();
            scope.aValue = 3;
            scope.$digest();
            expect(counter).toBe(1);

        });

        it("当首次注销时不会触发监听", function () {
            var counter = 0;

            var destroyGroup = scope.$watchGroup([], function (newValues, oldValues, scope) {
                counter++;
            });

            destroyGroup();

            scope.$digest();
            expect(counter).toBe(0);
        });

    });

    describe("Inheritance", function () {

        it("inherits the parent's properties", function () {
            var parent = new Scope();
            parent.aValue = [1, 2, 3];

            var child = parent.$new();

            expect(child.aValue).toEqual([1, 2, 3]);
        });

        it("不会导致父级继承其属性", function () {
            var parent = new Scope();

            var child = parent.$new();
            child.aValue = [1, 2, 3];

            expect(parent.aValue).toBeUndefined();
        });

        it("再定义的时候继承父类的属性", function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = [1, 2, 3];

            expect(child.aValue).toEqual([1, 2, 3]);
        });

        it("可以操纵父scope的属性", function () {
            var parent = new Scope();
            var child = parent.$new();
            parent.aValue = [1, 2, 3];

            child.aValue.push(4);

            expect(parent.aValue).toEqual([1, 2, 3, 4]);
        });

        it("不digest其父母", function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = 'abc';
            parent.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        it("保留其子女的记录", function () {
            var parent = new Scope();
            var child1 = parent.$new();
            var child2 = parent.$new();
            var child2_1 = child2.$new();

            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);

            expect(child1.$$children.length).toBe(0);
            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });

        it("digests its children", function () {
            var parent = new Scope();
            var child = parent.$new();

            parent.aValue = 'abc';
            child.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it("digests from root on $apply", function () {
            var parent = new Scope();
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$apply(function (scope) { });

            expect(parent.counter).toBe(1);
        });

        it("从$evalAsync的根目录安排一个$digest", function (done) {
            var parent = new Scope();
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$evalAsync(function (scope) { });

            setTimeout(function () {
                expect(parent.counter).toBe(1);
                done();
            });
        });

        it("隔离时无法访问父级属性", function () {
            var parent = new Scope();
            var child = parent.$new(true);

            parent.aValue = 'abc';

            expect(child.aValue).toBeUndefined();
        });

        it("隔离时不能监视其父母的属性", function () {
            var parent = new Scope();
            var child = parent.$new(true);

            parent.aValue = 'abc';
            child.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        it("digest其隔离的子集", function () {
            var parent = new Scope();
            var child = parent.$new(true);

            child.aValue = 'abc';
            child.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it("$apply在root scope中执行digest", function () {
            var parent = new Scope();
            var child = parent.$new(true);
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$apply(function (scope) { });
            expect(parent.counter).toBe(1);
        });

        it("在隔离时从$evalAsync的root scope上执行digest", function (done) {
            var parent = new Scope();
            var child = parent.$new(true);
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            child2.$evalAsync(function (scope) { });
            setTimeout(function () {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it("在隔离的作用域上执行$evalAsync", function (done) {
            var parent = new Scope();
            var child = parent.$new(true);

            child.$evalAsync(function (scope) {
                scope.didEvalAsync = true;
            });

            setTimeout(function () {
                expect(child.didEvalAsync).toBe(true);
                done();
            });
        });

        it("在隔离的作用域上执行$$postDigest", function () {
            var parent = new Scope();
            var child = parent.$new(true);

            child.$$postDigest(function () {
                child.didPostDigest = true;
            });
            parent.$digest();

            expect(child.didPostDigest).toBe(true);
        });

        it("在隔离时执行root上的$applyAsync", function (done) {
            var parent = new Scope();
            var child = parent.$new(true);

            parent.counter = 0;
            parent.$watch(
                function (scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function (newValue, oldValue, scope) { }
            );
            child.aValue = [1];
            child.$watch(
                function (scope) { return scope.aValue; },
                function (newValue, oldValue, scope) {
                    scope.aValue.push(2);
                    setTimeout(function () {
                        scope.$applyAsync(function () {
                            scope.aValue.push(3);
                        });
                    }, 0);
                }
            );

            child.$digest();
            expect(child.aValue).toEqual([1, 2]);
            expect(parent.counter).toBe(0);
            setTimeout(function () {
                expect(child.aValue).toEqual([1, 2, 3]);
                expect(parent.counter).toBe(2);
                done();
            }, 50);
        });

        it("可以采取其他一些作为父级的作用域", function() {
            var prototypeParent = new Scope();
            var hierarchyParent = new Scope();
            var child = prototypeParent.$new(false, hierarchyParent);

            prototypeParent.a = 42;
            expect(child.a).toBe(42);

            child.counter = 0;
            child.$watch(
                function(scope) { scope.counter++; }
            );

            prototypeParent.$digest();
            expect(child.counter).toBe(0);

            hierarchyParent.$digest();
            expect(child.counter).toBe(2);
        });

        it("当$destroy被调用时不在被digest", function() {
            var parent = new Scope();
            var child = parent.$new();

            child.aValue = [1,2,3];
            child.counter = 0;
            child.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                },
                true
            );

            parent.$digest();
            expect(child.counter).toBe(1);

            child.aValue.push(4);
            parent.$digest();
            expect(child.counter).toBe(2);

            child.$destroy();
            child.aValue.push(5);
            parent.$digest();
            expect(child.counter).toBe(2);
        });

    });

    describe("$watchCollection", function() {

        // Detecing Non-Collection Changes:检测非集合变化
        it("像非正常watch一样工作", function() {
            var valueProvided;

            scope.aValue = 42;
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    valueProvided = newValue;
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            expect(valueProvided).toBe(scope.aValue);

            scope.aValue = 43;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);

        });

        it("像NaN的正常watch一样执行", function() {
            scope.aValue = 0/0;
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        // Detecting New Arrays:检测新数组
        it("当值变成数组时通知", function() {
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.arr; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr = [1,2,3];
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Detecting New Or Removed Items in Arrays:在数组中检测新的或删除的项目
        it("注意添加到数组的项目", function() {
            scope.arr = [1,2,3];
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.arr; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);

        });
        it("注意从数组中删除的项目", function() {
            scope.arr = [1,2,3];
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.arr; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.shift();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Detecting replaced or Reordered Items in Arrays:在数组中检测替换或重新排序的项目
        it("注意到一个数组中被替换的项目", function() {
            scope.arr = [1,2,3];
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.arr; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);

        });

        it("通知一个数组中重新排序的项目", function() {
            scope.arr = [2,1,3];
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.arr; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr.sort();
            scope.$digest();
            expect(scope.counter).toBe(2);
            
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it("在数组中的NaN上不会失败", function() {
            scope.arr = [2, NaN, 3];
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.arr; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        // Array-Like Ojbects:类似与数组的对象
        it("注意在参数对象中替换的项目", function() {
            (function(){
                scope.arrayLike = arguments;
            })(1,2,3);
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.arrayLike; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arrayLike[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it("注意在NodeList对象中替换的项目", function() {
            document.documentElement.appendChild(document.createElement('div'));
            scope.arrayLike = document.getElementsByTagName('div');

            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.arrayLike; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            document.documentElement.appendChild(document.createElement('div'));
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Detecting New Objects:检测新的对象
        it("通知值何时成为对象", function() {
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.obj; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj = {a:1};
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Detecting New Or Replaced Attributes in Objects:在对象中检测新的或替换的属性
        it("通知何时将属性添加到对象", function() {
            scope.counter = 0;
            scope.obj = {a:1};

            scope.$watchCollection(
                function(scope) {return scope.obj; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.obj.b = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);

        });
        it("不会再对象中的NaN属性上失败", function() {
            scope.counter = 0;
            scope.obj = {a:NaN};

            scope.$watchCollection(
                function(scope) { return scope.obj; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        // Detecting Removed Attributes in Objects:检测对象中已删除的属性
        it("注意何时从对象中删除属性", function() {
            scope.counter = 0;
            scope.obj = {a:1};

            scope.$watchCollection(
                function(scope) { return scope.obj; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            delete scope.obj.a;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        // Preventing Unnecessary Object Iteration:防止不必要的对象迭代

        // Dealing with Objects that Have A length:处理有长度的对象
        it("不考虑有长度属性的任何对象数组", function() {
            scope.obj = {length:42,otherKey:'abc'};
            scope.counter = 0;

            scope.$watchCollection(
                function(scope) { return scope.obj; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();

            scope.obj.newKey = 'def';
            scope.$digest();

            expect(scope.counter).toBe(2);
        });

        // Handing The Old Collection Value To Listeners:把旧的监听值交给监听者
        it("为监听者提供了旧的非集合值", function() {
            scope.aValue = 42;
            var oldValueGiven;

            scope.$watchCollection(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();
            scope.aValue = 43;
            scope.$digest();

            expect(oldValueGiven).toBe(42);
        });

    });

    // Events
    describe("Events", function() {
        var parent;
        var scope;
        var child;
        var isolatedChild;

        beforeEach(function() {
            parent = new Scope();
            scope = parent.$new();
            child = scope.$new();
            isolatedChild = scope.$new(true);
        });
        // allows registering listeners
        it("允许注册监听器", function() {
            var listener1 = function() {};
            var listener2 = function() {};
            var listener3 = function() {};

            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);
            scope.$on('someOtherEvent', listener3);

            expect(scope.$$listeners).toEqual({
                someEvent: [listener1, listener2],
                someOtherEvent: [listener3]
            });
        });
        // registers differnet listeners for every scope
        it("给所有scope注册不同的监听者",function() {
            var listener1 = function() {};
            var listener2 = function() {};
            var listener3 = function() {};

            scope.$on('someEvent', listener1);
            child.$on('someEvent', listener2);
            isolatedChild.$on('someEvent', listener3);

            expect(scope.$$listeners).toEqual({someEvent: [listener1]});
            expect(child.$$listeners).toEqual({someEvent: [listener2]});
            expect(isolatedChild.$$listeners).toEqual({someEvent: [listener3]});
        });
        // calls the listeners of the matching event on $emit
        it("调用$emit的匹配事件的监听器", function() {
            var listener1 = jasmine.createSpy();
            var listener2 = jasmine.createSpy();
            
            scope.$on('someEvent', listener1);
            scope.$on('someOtherEvent', listener2);

            scope.$emit('someEvent');

            expect(listener1).toHaveBeenCalled();
            expect(listener2).not.toHaveBeenCalled();
        });
        // calls the listeners of the matching event on $broadcast
        it("调用$broadcase上的匹配事件的监听器", function() {
            var listener1 = jasmine.createSpy();
            var listener2 = jasmine.createSpy();
            
            scope.$on('someEvent', listener1);
            scope.$on('someOtherEvent', listener2);

            scope.$broadcast('someEvent');

            expect(listener1).toHaveBeenCalled();
            expect(listener2).not.toHaveBeenCalled();
        });
        
        // Dealing with Duplication 处理重复
        _.forEach(['$emit', '$broadcast'], function(method){
            it("调用注册匹配事件的监听器 "+method, function() {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();
                scope.$on('someEvent', listener1);
                scope.$on('someOtherEvent', listener2);

                scope[method]('someEvent');

                expect(listener1).toHaveBeenCalled();
                expect(listener2).not.toHaveBeenCalled();
            });
        });

        // Event Objects
        _.forEach(['$emit', '$broadcast'], function(method){
            it("将名称的事件对象传递给监听器 "+method, function() {
                var listener = jasmine.createSpy();
                scope.$on('someEvent', listener);

                scope[method]('someEvent');

                expect(listener).toHaveBeenCalled();
                expect(listener.calls.mostRecent().args[0].name).toEqual('someEvent');
            });
            it("将相同的事件对象传递给每个监听器 "+method, function() {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();
                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);

                scope[method]('someEvent');

                var event1 = listener1.calls.mostRecent().args[0];
                var event2 = listener2.calls.mostRecent().args[0];

                expect(event1).toBe(event2);
            });
            // Additional Listener Arguments: 额外的监听器参数
            it("将附加参数传递给监听器"+method, function() {
                var listener = jasmine.createSpy();
                scope.$on('someEvent', listener);

                scope[method]('someEvent', 'and', ['additional', 'arguments'], '...');

                expect(listener.calls.mostRecent().args[1]).toEqual('and');
                expect(listener.calls.mostRecent().args[2]).toEqual(['additional', 'arguments']);
                expect(listener.calls.mostRecent().args[3]).toEqual('...');
            });
            // Returning The Event Object 返回事件对象
            it("返回事件对象"+method, function() {
                var returnedEvent = scope[method]('someEvent');

                expect(returnedEvent).toBeDefined();
                expect(returnedEvent.name).toEqual('someEvent');
            });
            // Deregistering Event Listeners 注销事件监听器
            it("能被销毁"+method, function() {
                var listener = jasmine.createSpy();
                var deregister = scope.$on('someEvent', listener);

                deregister();
                scope[method]('someEvent');

                expect(listener).not.toHaveBeenCalled();
            });
            it("在被移除时不会跳过下一个监听器"+method, function() {
                var deregister;
                var listener = function() {
                    deregister();
                };
                var nextListener = jasmine.createSpy();

                deregister = scope.$on('someEvent', listener);
                scope.$on('someEvent', nextListener);

                scope[method]('someEvent');
                expect(nextListener).toHaveBeenCalled();
            });
        });
        // Emitting Up The Scope Hierarchy 发布范围层次结构
        it("在$emit上传播范围层次结构", function() {
            var parentListener = jasmine.createSpy();
            var scopeListener = jasmine.createSpy();

            parent.$on('someEvent', parentListener);
            scope.$on('someEvent', scopeListener);

            scope.$emit('someEvent');

            expect(scopeListener).toHaveBeenCalled();
            expect(parentListener).toHaveBeenCalled();
        });
        it("在$emit上传播相同的事件", function() {
            var parentListener = jasmine.createSpy();
            var scopeListener = jasmine.createSpy();

            parent.$on('someEvent', parentListener);
            scope.$on('someEvent', scopeListener);

            scope.$emit('someEvent');

            var scopeEvent = scopeListener.calls.mostRecent().args[0];
            var parentEvent = parentListener.calls.mostRecent().args[0];
            expect(scopeEvent).toBe(parentEvent);
        });
        // Broadcasting Down The Scope Hierarchy
        it("在$broadcast上传播scope层次结构", function() {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();
            var isolatedChildListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            isolatedChild.$on('someEvent', isolatedChildListener);

            scope.$broadcast('someEvent');

            expect(scopeListener).toHaveBeenCalled();
            expect(childListener).toHaveBeenCalled();
            expect(isolatedChildListener).toHaveBeenCalled();
        });
        it("在$broadcast上传播相同的事件", function() {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            var scopeEvent = scopeListener.calls.mostRecent().args[0];
            var childEvent = childListener.calls.mostRecent().args[0];
            expect(scopeEvent).toBe(childEvent);
        });
        // Including The Current And Target Scopes In The Event Object 在事件对象中包含当前和目标范围
        it("在$emit上附加targetScope", function() {
            var scopeListener = jasmine.createSpy();
            var parentListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope);
            expect(parentListener.calls.mostRecent().args[0].targetScope).toBe(scope);
        });
        it("在$broadcast上附加targetScope", function() {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope);
            expect(childListener.calls.mostRecent().args[0].targetScope).toBe(scope);
        });
        it("在$emit上附加currentScope", function() {
            var currentScopeOnScope, currentScopeOnParent;
            var scopeListener = function(event) {
                currentScopeOnScope = event.currentScope;
            };
            var parentListener = function(event) {
                currentScopeOnParent = event.currentScope;
            };

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(currentScopeOnScope).toBe(scope);
            expect(currentScopeOnParent).toBe(parent);
        });
        it("在$broad上附加currentScope", function() {
            var currentScopeOnScope, currentScopeOnChild;
            var scopeListener = function(event) {
                currentScopeOnScope = event.currentScope;
            };
            var childListener = function(event) {
                currentScopeOnChild = event.currentScope;
            };

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            expect(currentScopeOnScope).toBe(scope);
            expect(currentScopeOnChild).toBe(child);
        });
        it("在$emit传播之后将currentScope设置为null", function() {
            var event;
            var scopeListener = function(evt) {
                event = evt;
            };
            scope.$on('someEvent', scopeListener);
            scope.$emit('someEvent');

            expect(event.currentScope).toBe(null);
        });
        it("在$broad传播之后将currentScope设置为null", function() {
            var event;
            var scopeListener = function(evt) {
                event = evt;
            };
            scope.$on('someEvent', scopeListener);
            scope.$broadcast('someEvent');

            expect(event.currentScope).toBe(null);
        });
        // Stopping Event Propagation
        it("停止时不能传播给父母", function() {
            var scopeListener = function(event) {
                event.stopPropagation();
            };
            var parentListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(parentListener).not.toHaveBeenCalled();
        });
        it("被当前范围的监听器收到后停止", function() {
            var listener1 = function(event) {
                event.stopPropagation();
            };
            var listener2 = jasmine.createSpy();

            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);

            scope.$emit('someEvent');

            expect(listener2).toHaveBeenCalled();
        });
        // Preventing Default Event Behavior 防止默认的事件行为
        _.forEach(['$emit', '$broadcast'], function(method) {
            it("当preventDefault被调用时，设置defaultPrevented"+method, function() {
                var listener = function(event) {
                    event.preventDefault();
                };
                scope.$on('someEvent', listener);

                var event = scope[method]('someEvent');

                expect(event.defaultPrevented).toBe(true);
            });
        });
        // Broadcasting Scope Removal
        it("销毁时$destroy", function() {
            var listener = jasmine.createSpy();
            scope.$on('$destroy', listener);

            scope.$destroy();
            expect(listener).toHaveBeenCalled();
        });
        // Broadcasting Scope Removal
        it("对被销毁的子集进行销毁", function() {
            var listener = jasmine.createSpy();
            child.$on('$destroy', listener);

            scope.$destroy();
            expect(listener).toHaveBeenCalled();
        });
        // Disabling Listeners On Destroyed Scopes 在销毁的范围上禁止监听器
        it("不再再销毁后调用监听器", function() {
            var listener = jasmine.createSpy();
            scope.$on('myEvent', listener);

            scope.$destroy();

            scope.$emit('myEvent');
            expect(listener).not.toHaveBeenCalled();
        });
        // Handling Exceptions
        _.forEach(['$emit', '$broadcast'],function(method){
            it("不停止异常"+method, function(){
                var listener1 = function(event) {
                    throw 'listener1 throwing an exception';
                };
                var listener2 = jasmine.createSpy();

                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);

                scope[method]('someEvent');

                expect(listener2).toHaveBeenCalled();
            });
        });

    });

});