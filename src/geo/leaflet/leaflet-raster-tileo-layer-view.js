var _ = require('underscore');
var L = require('leaflet');
var LeafletLayerView = require('./leaflet-layer-view');

var LeafletRasterTileoLayerView = function (layerModel, leafletMap) {
  LeafletLayerView.apply(this, arguments);
}

LeafletRasterTileoLayerView.prototype = _.extend(
  {},
  LeafletLayerView.prototype,
  {
    //TODO
  }
);

module.exports = LeafletRasterTileoLayerView;
