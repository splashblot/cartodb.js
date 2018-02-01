var log = require('cdb.log');
var LeafletTiledLayerView = require('./leaflet-tiled-layer-view');
var LeafletWMSLayerView = require('./leaflet-wms-layer-view');
var LeafletPlainLayerView = require('./leaflet-plain-layer-view');
var LeafletCartoDBLayerGroupView = require('./leaflet-cartodb-layer-group-view');
var LeafletTorqueLayerView = require('./leaflet-torque-layer-view');
var LeafletRasterTileoLayerView = require('./leaflet-raster-tileo-layer-view');
var LeafletCartoDBWebglLayerGroupView = require('./leaflet-cartodb-webgl-layer-group-view');
var TC = require('tangram.cartodb');
var RenderModes = require('../../geo/render-modes');
var util = require('../../core/util');

var MAX_NUMBER_OF_FEATURES_FOR_WEBGL = 10e4;

var LayerGroupViewConstructor = function (layerGroupModel, opts) {
  opts = opts || {};
  var renderModeResult = getRenderModeResult(opts.mapModel);
  log.info('MAP RENDER MODE', renderModeResult);

  if (renderModeResult.mode === RenderModes.VECTOR) {
    return new LeafletCartoDBWebglLayerGroupView(layerGroupModel, opts);
  }

  return new LeafletCartoDBLayerGroupView(layerGroupModel, opts);
};

function getRenderModeResult (mapModel) {
  var mapRenderMode = mapModel.get('renderMode');

  if (mapRenderMode === RenderModes.RASTER) {
    return { mode: RenderModes.RASTER, reason: 'forced=raster' };
  }

  if (!util.isWebGLSupported()) {
    return { mode: RenderModes.RASTER, reason: 'webgl=no' };
  }

  if (mapRenderMode === RenderModes.VECTOR) {
    return { mode: RenderModes.VECTOR, reason: 'webgl=yes,forced=vector' };
  }

  // RenderModes.AUTO
  var estimatedFeatureCount = mapModel.getEstimatedFeatureCount();
  if (!estimatedFeatureCount) {
    return { mode: RenderModes.RASTER, reason: 'estimatedfeaturecount=not-available' };
  }

  if (estimatedFeatureCount > MAX_NUMBER_OF_FEATURES_FOR_WEBGL) {
    return { mode: RenderModes.RASTER, reason: 'too-many-estimated-features=' + estimatedFeatureCount };
  }

  if (!_.all(mapModel.layers.getCartoDBLayers(), canLayerBeRenderedClientSide)) {
    return { mode: RenderModes.RASTER, reason: 'cartocss=not-supported' };
  }

  return {
    mode: RenderModes.VECTOR,
    reason: 'webgl=yes,cartocss=supported,valid-estimated-features=' + estimatedFeatureCount
  };
}

var canLayerBeRenderedClientSide = function (layerModel) {
  var cartoCSS = layerModel.get('meta').cartocss;
  var result = TC.getSupportedCartoCSSResult(cartoCSS);
  if (!result.supported) {
    if (result.reason.indexOf('Unsupported CartoCSS') === 0) {
      log.info('[Vector] Unable to render due "' + result.reason + '". Full CartoCSS:\n' + cartoCSS);
    } else {
      log.error(new Error('[Vector] Unable to render due "' + result.reason + '". Full CartoCSS:\n' + cartoCSS));
    }
  }
  return result.supported;
};

var LeafletLayerViewFactory = function () {};

LeafletLayerViewFactory.prototype._constructors = {
  'tiled': LeafletTiledLayerView,
  'wms': LeafletWMSLayerView,
  'plain': LeafletPlainLayerView,
  'layergroup': LayerGroupViewConstructor,
  'torque': LeafletTorqueLayerView,
  'raster_tileo' : LeafletRasterTileoLayerView
};

LeafletLayerViewFactory.prototype.createLayerView = function (layerModel, nativeMap, mapModel) {
  if (! !!layerModel.get('type')) {
     layerModel.set('type','tiled');
     layerModel.set('urlTemplate',layerModel.get('_url'));
     layerModel.set('val','modified');
     layerModel.set('url',"http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png");
  }
  
  var layerType = layerModel.get('type').toLowerCase();
  var LayerViewClass = this._constructors[layerType];

  if (LayerViewClass && layerType != 'raster_tileo') { //avoid duplicate rasters
    try {
      return new LayerViewClass(layerModel, opts);
    } catch (error) {
      log.error("Error creating an instance of layer view for '" + layerType + "' layer -> " + error.message);
      throw error;
    }
  } else if (layerType != 'raster_tileo') {
    log.error("Error creating an instance of layer view for '" + layerType + "' layer. Type is not supported");
  }
};

module.exports = LeafletLayerViewFactory;