describe('Parse', function() {
    it('将解析数字', function() {
        var fn = parse('42');
        expect(fn()).toBe(42);
    });
});