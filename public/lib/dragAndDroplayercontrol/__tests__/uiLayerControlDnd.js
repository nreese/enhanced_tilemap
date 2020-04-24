/* eslint-disable import/no-unresolved */
import expect from 'expect.js';
import React from 'react';
import { mount } from 'enzyme';
import sinon from 'sinon';

import { LayerControlDnd } from '../uiLayerControlDnd';

const _allLayers = [
  {
    enabled:true,
    icon:'icon',
    id:'Markers',
    label:'Markers',
    options:{},
    type:'marker'
  },
  {
    enabled:true,
    icon:'icon',
    id:'World Countries/US/US States/California/Chinook Abundance',
    label:'World Countries/US/US States/California/Chinook Abundance',
    options:{},
    type:'mri'
  },
  {
    enabled:true,
    icon:'icon',
    id:'World Countries/Irish Counties',
    label:'World Countries/Irish Counties',
    options:{},
    type:'mrishape'
  },
  {
    enabled:true,
    icon:'icon',
    id:'Geo Filters',
    label:'Geo Filters',
    options:{},
    type:'filter'
  },
  {
    enabled:true,
    icon:'icon',
    id:'Aggregation',
    label:'Aggregation',
    enabled: false,
    type:'agg'
  }
];
let dndListOrderChangeStub;
let dndLayerVisibilityChangeStub;
let dndRemoveLayerFromControlStub;

describe('Dnd Layer Control', () => {
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

  it('should contain <Droppable> element', () => {
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

});
