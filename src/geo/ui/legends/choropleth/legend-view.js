var DynamicLegendViewBase = require('../base/dynamic-legend-view-base');
var template = require('./legend-template.tpl');

var ChoroplethLegendView = DynamicLegendViewBase.extend({
  _getCompiledTemplate: function () {
    return template({
      colors: this.model.get('colors'),
      avg: this.model.get('avg'),
      prefix: this.model.get('prefix'),
      suffix: this.model.get('suffix')
    });
  }
});

module.exports = ChoroplethLegendView;
