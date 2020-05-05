import expect from 'expect.js';
import React from 'react';
import { mount } from 'enzyme';
import sinon from 'sinon';

import { AddMapLayersModal } from '../layerContolTree';

const fakeAggs = [
  {
    key: 'universe',
    doc_count: 34
  },
  {
    key: 'universe/countries',
    doc_count: 12
  },
  {
    key: 'universe/planets',
    doc_count: 22
  },
  {
    key: 'universe/planets/countries',
    doc_count: 12
  }
];

describe('Map layer tree modal', () => {
  let addMapLayersModal;

  const fakeEsClient = {
    search: sinon.stub().resolves({
      aggregations: {
        2: {
          buckets: []
        }
      }
    }),
    //TODO WRITE TESTS BASED ON THIS MSEARCH RESPONSE FOR _getGeometryTypeOfSpatialPaths FUNCTION
    msearch: sinon.stub().resolves({
      responses: [
        {
          hits: {
            hits: [
              {
                _source: {
                  geometry: {
                    type: 'MultiPolygon'
                  },
                  spatial_path: 'universe'
                }
              }
            ]
          }
        },
        {
          hits: {
            hits: [
              {
                _source: {
                  geometry: {
                    type: 'Point'
                  },
                  spatial_path: 'universe/planets'
                }
              }
            ]
          }
        },
        {
          hits: {
            hits: [
              {
                _source: {
                  geometry: {
                    type: 'Polygon'
                  },
                  spatial_path: 'universe/planets/countries'
                }
              }
            ]
          }
        },
        {
          hits: {
            hits: [
              {
                _source: {
                  geometry: {
                    type: 'MultiPolygon'
                  },
                  spatial_path: 'universe/countries'
                }
              }
            ]
          }
        }
      ]
    })
  };

  function getMountedComponent({
    addLayersFromLayerConrol = () => { },
    esClient = fakeEsClient
  } = {}) {
    addMapLayersModal = mount(
      <AddMapLayersModal
        addLayersFromLayerConrol={addLayersFromLayerConrol}
        esClient={esClient}
      />
    );

    addMapLayersModal.update();

    return addMapLayersModal;
  }


  afterEach(() => {
    if (addMapLayersModal) {
      addMapLayersModal.unmount();
      addMapLayersModal = undefined;
    }
  });



  it('should call the fake Es Client and create an empty modal', done => {
    const component = getMountedComponent();
    expect(fakeEsClient.search.called);
    expect(component.getElement('ul.euiTreeView'));
    done();
  });


  it('should populate correct stored layers list with given aggs.' +
   'This implicitly tests _calculateAllTypeCounts() and _getParent() and _getItems()', () => {

    const expectedStoredLayersList = [{
      label: 'Universe',
      id: 'universe',
      checked: true,
      filtered: false,
      group: true,
      count: 34,
      isParentItem: false,
      path: 'universe',
      itemInGroupChecked: true,
      hasLayerSelect: true,
      children: [
        {
          label: 'Countries',
          id: 'universe/countries',
          checked: true,
          filtered: false,
          children: [],
          group: false,
          count: 12,
          isParentItem: false,
          path: 'universe/countries'
        },
        {
          label: 'Planets',
          id: 'universe/planets',
          checked: true,
          filtered: false,
          children: [
            {
              label: 'Planets',
              id: 'alluniverse/planets',
              checked: true,
              filtered: false,
              children: [],
              group: false,
              count: 10,
              isParentItem: true,
              path: 'universe/planets'
            },
            {
              label: 'Countries',
              id: 'universe/planets/countries',
              checked: true,
              filtered: false,
              children: [],
              group: false,
              count: 12,
              isParentItem: false,
              path: 'universe/planets/countries'
            }
          ],
          group: true,
          count: 22,
          isParentItem: false,
          path: 'universe/planets',
          itemInGroupChecked: true,
          hasLayerSelect: true
        }
      ]
    }];






    function compareItems(item, fakeItem) {
      expect(item.checked).to.be(fakeItem.checked);
      expect(item.count).to.be(fakeItem.count);
      expect(item.filtered).to.be(fakeItem.filtered);
      expect(item.id).to.be(fakeItem.id);
      expect(item.label).to.be(fakeItem.label);
      expect(item.path).to.be(fakeItem.path);
      expect(item.isParentItem).to.be(fakeItem.isParentItem);
      expect(item.group).to.be(fakeItem.group);
      expect(item.hasLayerSelect).to.be(fakeItem.hasLayerSelect);
      if (item.group) {
        expect(item.children.length).to.be(fakeItem.children.length);
        for (let i = 0; i < item.children.length; i++) {
          compareItems(item.children[i], fakeItem.children[i]);
        }
      }
    }
    const componentInstance = getMountedComponent().instance();
    const storedLayersList = componentInstance._makeUiTreeStructure(fakeAggs);

    // to.eql does not work here, that is why the compareItems function is used instead
    compareItems(storedLayersList[0], expectedStoredLayersList[0]);
  });


  describe('_checkIfAnyItemInGroupAndSubGroupChecked', () => {

    it('should return false for both someItemsChecked and noItemsChecked as all items are checked', () => {

      const allItemsChecked = [{
        checked: true,
        group: true,
        children: [
          {
            checked: true,
            children: [],
            group: false,
          },
          {
            checked: true,
            children: [],
            group: false,
          }
        ]
      }];

      const componentInstance = getMountedComponent().instance();
      const check = componentInstance._checkIfAnyItemInGroupAndSubGroupChecked(allItemsChecked);

      expect(check.someItemsChecked).to.be(false);
      expect(check.noItemsChecked).to.be(false);
    });

    it('should return true for someItemsChecked and false for noitemschecked as only some items are checked', () => {

      const someItemsUnchecked = [{
        checked: true,
        group: true,
        children: [
          {
            checked: true,
            children: [],
            group: false,
          },
          {
            checked: false,
            children: [],
            group: false,
          }
        ]
      }];

      const componentInstance = getMountedComponent().instance();
      const check = componentInstance._checkIfAnyItemInGroupAndSubGroupChecked(someItemsUnchecked);

      expect(check.someItemsChecked).to.be(true);
      expect(check.noItemsChecked).to.be(false);
    });

    it('should return false for someItemsChecked and true for noItemsChecked as no items are checked', () => {

      const noItemsChecked = [{
        checked: true,
        group: true,
        children: [
          {
            checked: false,
            children: [],
            group: false,
          },
          {
            checked: false,
            children: [],
            group: false,
          }
        ]
      }];

      const componentInstance = getMountedComponent().instance();
      const check = componentInstance._checkIfAnyItemInGroupAndSubGroupChecked(noItemsChecked);

      expect(check.someItemsChecked).to.be(false);
      expect(check.noItemsChecked).to.be(true);
    });
  });
});
