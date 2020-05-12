import expect from 'expect.js';
import React from 'react';
import { mount } from 'enzyme';
import sinon from 'sinon';

import { LayerControlDnd } from '../uiLayerControlDnd';

const _allLayers = [
  {
    enabled: true,
    icon: 'icon',
    id: 'Markers',
    label: 'Markers',
    options: {},
    close: true,
    type: 'marker'
  },
  {
    enabled: true,
    icon: 'icon',
    id: 'World Countries/US/US States/California/Chinook Abundance',
    label: 'World Countries/US/US States/California/Chinook Abundance',
    options: {},
    close: true,
    type: 'mri'
  },
  {
    enabled: true,
    icon: 'icon',
    id: 'World Countries/Irish Counties',
    label: 'World Countries/Irish Counties',
    options: {},
    close: true,
    type: 'es_ref_shape'
  },
  {
    enabled: true,
    icon: 'icon',
    id: 'Geo Filters',
    label: 'Geo Filters',
    options: {},
    type: 'filter'
  },
  {
    enabled: true,
    icon: 'icon',
    id: 'Aggregation',
    label: 'Aggregation',
    enabled: false,
    type: 'agg'
  }
];
let dndListOrderChangeStub;
let dndLayerVisibilityChangeStub;
let dndRemoveLayerFromControlStub;

describe('Kibi Enhanced Tilemap', () => {
  describe('uiLayerControlDnd', () => {
    let layerControlDnd;
    function getMountedComponent({
      _allLayers = [],
      dndListOrderChange = dndListOrderChangeStub,
      dndLayerVisibilityChange = dndLayerVisibilityChangeStub,
      dndRemoveLayerFromControl = dndRemoveLayerFromControlStub
    } = {}) {
      layerControlDnd = mount(
        <LayerControlDnd
          dndCurrentListOrder={_allLayers}
          dndListOrderChange={dndListOrderChange}
          dndLayerVisibilityChange={dndLayerVisibilityChange}
          dndRemoveLayerFromControl={dndRemoveLayerFromControl}
        >
        </LayerControlDnd >
      );

      layerControlDnd.update();

      return layerControlDnd;
    }
    beforeEach(() => {
      dndListOrderChangeStub = sinon.stub();
      dndLayerVisibilityChangeStub = sinon.stub();
      dndRemoveLayerFromControlStub = sinon.stub();
    });

    afterEach(() => {
      if (layerControlDnd) {
        layerControlDnd.unmount();
        layerControlDnd = undefined;
      }
      sinon.restore();
    });

    it('should contain Drag and Drop control', () => {
      const component = getMountedComponent();
      expect(component.find('Droppable')).to.have.length(1);
    });

    it('should contain rows of checkboxes with which are checked based on property enabled ', () => {
      const component = getMountedComponent({ _allLayers });

      expect(component.find('.layer-control-row')).to.have.length(_allLayers.length);
      expect(component
        .find('EuiCheckbox')
        .getElements()
        .filter(checkbox => !checkbox.props.checked)
      ).to.have.length(1);
    });

    it('should change visibility of layers', () => {
      const _allLayersClone = [..._allLayers];
      const component = getMountedComponent({ _allLayers: _allLayersClone });
      const event = { target: { checked: false } };

      component.instance().changeVisibility(event, _allLayersClone[0], 0);
      component.update().render();

      expect(component
        .find('EuiCheckbox')
        .getElements()
        .filter(checkbox => !checkbox.props.checked)
      ).to.have.length(2);
      sinon.assert.calledOnce(dndLayerVisibilityChangeStub);
    });

    it('should be able to remove layers', () => {
      const _allLayersClone = [..._allLayers];
      const originalLength = _allLayersClone.length;
      const component = getMountedComponent({ _allLayers: _allLayersClone });
      dndRemoveLayerFromControlStub
        .callsFake(newLayers => component.setProps({ dndCurrentListOrder: newLayers }));

      expect(component
        .find('.panel-remove')
        .getElements()
      ).to.have.length(_allLayersClone.filter(item => item.close).length);

      component.instance().removeListItem(0, _allLayers[0].id);

      sinon.assert.calledOnce(dndRemoveLayerFromControlStub);
      expect(component
        .update()
        .find('EuiCheckbox')
        .getElements()
      ).to.have.length(originalLength - 1);
    });

    it('should reorder on drag end', () => {
      const _allLayersClone = [..._allLayers];
      const component = getMountedComponent({ _allLayers: _allLayersClone });
      const event = {
        source: {
          index: 1
        },
        destination: {
          index: 3
        }
      };

      dndListOrderChangeStub.callsFake(newLayers => component.setProps({ dndCurrentListOrder: newLayers }));
      component.instance().onDragEnd(event);

      sinon.assert.calledOnce(dndListOrderChangeStub);
      expect(component.state('dndCurrentListOrder')[3]).to.be(_allLayersClone[1]);
    });

  });
});