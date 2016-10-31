var L = require('leaflet');
var PathViewBase = require('./path-view-base');

var PolygonView = PathViewBase.extend({
  _createGeometry: function () {
    return L.polygon(this.model.getLatLngs(), { color: this.model.get('color') });
  }
});

module.exports = PolygonView;