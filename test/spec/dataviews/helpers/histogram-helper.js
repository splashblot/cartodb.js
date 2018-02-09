var helper = require('../../../../src/dataviews/helpers/histogram-helper');

describe('dataview/helpers/histogram-helper', function () {
  describe('add', function () {
    it('should add seconds properly', function () {
      var actual = helper.add(12341234, 3, 'second');
      var expected = 12341237;
      expect(actual).toBe(expected);
    });
    it('should add minutes properly', function () {
      var actual = helper.add(12341234, 21, 'minute');
      var expected = 12342494;
      expect(actual).toBe(expected);
    });
    it('should add hours properly', function () {
      var actual = helper.add(12341234, 37, 'hour');
      var expected = 12474434;
      expect(actual).toBe(expected);
    });
    it('should add days properly', function () {
      var actual = helper.add(12341234, 23, 'day');
      var expected = 14328434;
      expect(actual).toBe(expected);
    });
    it('should add weeks properly', function () {
      var actual = helper.add(12341234, 11, 'week');
      var expected = 18994034;
      expect(actual).toBe(expected);
    });
    it('should add months properly', function () {
      var actual = helper.add(12341234, 192, 'month');
      var expected = 517262834;
      expect(actual).toBe(expected);
    });
    it('should add quarters properly', function () {
      var actual = helper.add(12341234, 17, 'quarter');
      var expected = 146520434;
      expect(actual).toBe(expected);
    });
    it('should add years properly', function () {
      var actual = helper.add(12341234, 5, 'year');
      var expected = 170107634;
      expect(actual).toBe(expected);
    });
    it('should throw an error for a wrong aggregation', function () {
      expect(function () {
        helper.add(12341234, 1, 'wrong');
      }).toThrowError('aggregation "wrong" is not defined');
    });
  });
});
