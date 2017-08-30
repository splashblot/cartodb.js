var log = require('cdb.log');
var LeafletTiledLayerView = require('./leaflet-tiled-layer-view');
var LeafletWMSLayerView = require('./leaflet-wms-layer-view');
var LeafletPlainLayerView = require('./leaflet-plain-layer-view');
var LeafletCartoDBLayerGroupView = require('./leaflet-cartodb-layer-group-view');
var LeafletTorqueLayerView = require('./leaflet-torque-layer-view');
var LeafletCartoDBWebglLayerGroupView = require('./leaflet-cartodb-webgl-layer-group-view');
var TC = require('tangram.cartodb');
var RenderModes = require('../../geo/render-modes');
var util = require('../../core/util');

var MAX_NUMBER_OF_FEATURES_FOR_WEBGL = 10e4;

var LayerGroupViewConstructor = function (layerGroupModel, nativeMap, mapModel) {
  var renderModeResult = getRenderModeResult(mapModel);
  log.info('MAP RENDER MODE', renderModeResult);

  if (renderModeResult.mode === RenderModes.VECTOR) {
    return new LeafletCartoDBWebglLayerGroupView(layerGroupModel, nativeMap);
  }

  return new LeafletCartoDBLayerGroupView(layerGroupModel, nativeMap);
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
    log.info('[Vector] Unable to render due "' + result.reason + '". Full CartoCSS:\n' + cartoCSS);
  }
  return result.supported;
};

LeafletLayerViewFactory.prototype._constructors = {
  'tiled': LeafletTiledLayerView,
  'wms': LeafletWMSLayerView,
  'plain': LeafletPlainLayerView,
  'layergroup': LayerGroupViewConstructor,
  'torque': LeafletTorqueLayerView
};

LeafletLayerViewFactory.prototype.createLayerView = function (layerModel, mapModel) {
 if (! !!layerModel.get('type')) {
     layerModel.set('type','tiled');
     layerModel.set('urlTemplate',layerModel.get('_url'));
     layerModel.set('val','modified');
     layerModel.set('url',"http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png");
  }
  var layerType = layerModel.get('type').toLowerCase();
  var LayerViewClass = this._constructors[layerType];

  if (LayerViewClass) {
    try {
      return new LayerViewClass(layerModel, mapModel, {
        vector: this._vector
      });
    } catch (e) {
      log.error("Error creating an instance of layer view for '" + layerType + "' layer -> " + e.message);
      throw e;
    }
  } else if( layerType != 'raster') {
    log.error("Error creating an instance of layer view for '" + layerType + "' layer. Type is not supported");
  }
};

module.exports = LeafletLayerViewFactory;
