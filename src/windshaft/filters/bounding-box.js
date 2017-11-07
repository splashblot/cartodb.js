var _ = require('underscore');
var Model = require('../../core/model');
var BOUNDING_BOX_FILTER_WAIT = 300;

module.exports = Model.extend({
  initialize: function (mapAdapter) {
    if (!mapAdapter) {
      throw new TypeError('Bounding box filter needs a map to get instantiated.');
    }

    this._bounds = {};
    this._mapAdapter = mapAdapter;
    this.setBounds(this._mapAdapter.getBounds());
    this._initBinds();
  },

  _initBinds: function () {
    this.listenTo(this._mapAdapter, 'boundsChanged', _.debounce(this._boundsChanged, BOUNDING_BOX_FILTER_WAIT));
  },

  _stopBinds: function () {
    this.stopListening(this._mapAdapter, 'boundsChanged');
  },

  _boundsChanged: function (bounds) {
    this.setBounds(bounds);
  },

  setBounds: function (bounds) {
    this._bounds = bounds;
    this.trigger('boundsChanged', bounds);
  },

  areBoundsAvailable: function () {
    return _.isFinite(this._bounds.west);
  },

  serialize: function () {
    return this._getBounds().join(',');
  },

  _getBounds: function () {
    return [
      this._bounds.west,
      this._bounds.south,
      this._bounds.east,
      this._bounds.north
    ];
  },

  clean: function () {
    this._stopBinds();
  }
});
