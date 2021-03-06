/* global L */
var LayersCollection = require('../../../../src/geo/map/layers');
var CartoDBLayer = require('../../../../src/geo/map/cartodb-layer');
var CartoDBLayerGroup = require('../../../../src/geo/cartodb-layer-group');
var LeafletCartoDBWebGLLayerGroupView = require('../../../../src/geo/leaflet/leaflet-cartodb-webgl-layer-group-view');
var MockFactory = require('../../../helpers/mockFactory');

describe('src/geo/leaflet/leaflet-cartodb-webgl-layer-group-view.js', function () {
  beforeEach(function () {
    var container = document.createElement('div');
    container.id = 'map';
    document.body.appendChild(container);

    this.leafletMap = L.map('map');
    this.layersCollection = new LayersCollection();
    this.layerGroupModel = new CartoDBLayerGroup({}, {
      layersCollection: this.layersCollection
    });

    this.layerGroupModel.set('urls', { tiles: 'http://0.ashbu.cartocdn.com/documentation/api/v1/map/90e64f1b9145961af7ba36d71b887dd2:0/{layerIndexes}/{z}/{x}/{y}.{format}', subdomains: ['a', 'b', 'c'] });

    var engineMock = MockFactory.createEngine();

    this.layer1 = new CartoDBLayer({ id: 'layer1', meta: {cartocss: '#layer {polygon-fill: black;}'} }, { engine: engineMock });
    this.layer2 = new CartoDBLayer({ id: 'layer2', meta: {cartocss: '#layer {polygon-fill: black;}'} }, { engine: engineMock });

    this.layersCollection.reset([ this.layer1, this.layer2 ]);

    this.view = new LeafletCartoDBWebGLLayerGroupView(this.layerGroupModel, {
      nativeMap: this.leafletMap
    }); // eslint-disable-line
    this.view.tangram = {
      addLayer: function () {},
      addDataSource: function () {},
      layer: {
        setSelectionEvents: function () {}
      },
      scene: {
        subscribe: function (opts) {
          this.tileError = opts.tileError;
        }.bind(this)
      }
    };

    spyOn(this.view.tangram.scene, 'subscribe').and.callThrough();

    this.view.initConfig(this.layerGroupModel);
  });

  afterEach(function () {
    document.getElementById('map').remove();
  });

  it('should set the styles options when meta changes', function () {
    spyOn(this.view.tangram, 'addLayer');
    var self = this;

    self.layer1.set('meta', {cartocss: '#layer {polygon-fill: red;}'});
    expect(this.view.tangram.addLayer).toHaveBeenCalled();
  });

  it('should set the visibility options when visibility changes', function () {
    spyOn(this.view.tangram, 'addLayer');
    var self = this;

    self.layer1.set('visible', false);
    expect(this.view.tangram.addLayer).toHaveBeenCalled();
  });

  it('should set a new tile template URL when urls change', function () {
    spyOn(this.view.tangram, 'addDataSource');

    this.layerGroupModel.set('urls', { tiles: 'http://0.ashbu.cartocdn.com/documentation/api/v1/map/90e64f1b9145961af7bas36d71b887dd2:0/{layerIndexes}/{z}/{x}/{y}.{format}', subdomains: ['a', 'b', 'c'] });

    expect(this.view.tangram.addDataSource).toHaveBeenCalledWith('http://0.ashbu.cartocdn.com/documentation/api/v1/map/90e64f1b9145961af7bas36d71b887dd2:0/mapnik/{z}/{x}/{y}.mvt', ['a', 'b', 'c']);
  });

  it('should set a new tile with token when URL changes', function () {
    this.layerGroupModel.set('authToken', 'hahskdfasd');

    spyOn(this.view.tangram, 'addDataSource');

    this.layerGroupModel.set('urls', { tiles: 'http://0.ashbu.cartocdn.com/documentation/api/v1/map/90e64f1b9145961af7ba36d71sd87dd2:0/{layerIndexes}/{z}/{x}/{y}.{format}', subdomains: ['a', 'b', 'c'] });

    expect(this.view.tangram.addDataSource).toHaveBeenCalledWith('http://0.ashbu.cartocdn.com/documentation/api/v1/map/90e64f1b9145961af7ba36d71sd87dd2:0/mapnik/{z}/{x}/{y}.mvt?auth_token=hahskdfasd', ['a', 'b', 'c']);
  });

  describe('._addErrorsEvents', function () {
    it('should subscribe tileError to the scene', function () {
      var subscribe = this.view.tangram.scene.subscribe;
      expect(subscribe).toHaveBeenCalled();
      expect(subscribe.calls.mostRecent().args[0].tileError).not.toBeUndefined();
    });

    it('should add a limit error to layerGroupModel if status is 429', function () {
      spyOn(this.layerGroupModel, 'addError');
      this.view._addErrorsEvents();
      this.tileError({ statusCode: 429 });

      expect(this.layerGroupModel.addError).toHaveBeenCalledWith({
        type: 'limit'
      });
    });
  });
});
