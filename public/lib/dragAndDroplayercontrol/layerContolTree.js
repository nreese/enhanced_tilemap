import React from 'react';
import { cloneDeep, get, findIndex } from 'lodash';

import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {
  EuiFieldSearch,
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,

} from '@elastic/eui';
import { EuiTreeViewCheckbox } from './euiTreeViewCheckbox';
import { modalWithForm } from './../../vislib/modals/genericModal';

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export class AddMapLayersModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      value: ''
    };
  }

  componentDidMount() {
    this.getItems(this.props.esClient);
  }

  _changeCheckboxStatus = (id) => {
    // const item = this._getItem(id, this.state.items);
    this.setState(prevState => {
      const list = [...prevState.items];
      const item = this._getItem(id, list);
      item.checked = !item.checked;
      return { items: list };
    });
  }

  _getParent = (id, list) => {
    const parentArray = id.split('/');
    parentArray.pop();
    if (parentArray.length === 0) {
      return false;
    }
    const parentPath = parentArray.join('/');
    return this._getItem(parentPath, list);
  }

  _getItem = (id, list) => {
    let parent = list;
    while (parent != null) {
      for (let i = 0; i <= parent.length - 1; i++) {
        if (parent[i].id === id || id === '') {
          return parent[i];
        } else if (id.includes(parent[i].id)) {
          parent = parent[0].children;
          break;
        }
      }
    }
  }

  _makeUiTreeStructure = (aggs) => {
    const storedLayersList = [];
    aggs.forEach(layer => {
      const itemTemplate = {
        label: '',
        id: '',
        checked: true,
        filtered: false,
        children: []
      };

      const item = cloneDeep(itemTemplate);
      item.label = capitalizeFirstLetter(layer.key.split('/')[layer.key.split('/').length - 1]);
      item.id = layer.key;
      const parent = this._getParent(item.id, storedLayersList);
      if (parent) {
        parent.children.push(item);
      } else {
        storedLayersList.push(item);
      }
    });
    return storedLayersList;
  }

  getItems = async () => {
    const resp = await this.props.esClient.search({
      index: '.map__*',
      body: {
        query: { 'match_all': {} },
        aggs: {
          2: {
            terms: {
              field: 'spatial_path',
              order: { _key: 'asc' }
            }
          }
        },
        size: 0
      }
    });

    const aggs = resp.aggregations[2].buckets;
    this.setState({
      items: this._makeUiTreeStructure(aggs)
    });
  }

  _recursivelyDrawItems(list, enabled) {
    list.forEach(async item => {
      if (item.checked) {
        const layer = await this.props.getMriLayer(item.id, enabled);
        this.props.addOverlay(layer);

        const itemOnMapIndex = findIndex(this.props.mrisOnMap, itemOnMap => itemOnMap.id === item.id);

        item.enabled = enabled;
        if (itemOnMapIndex !== -1) {
          this.props.mrisOnMap[itemOnMapIndex] = item;
        } else {
          this.props.mrisOnMap.push(item);
        }
      }
      if (item.children && item.children.length >= 1) {
        this._recursivelyDrawItems(item.children, enabled);
      }
    });
  }

  _addLayersNotEnabled = async () => {
    const enabled = false;
    this._recursivelyDrawItems(this.state.items, enabled);
  }

  _addLayersEnabled = () => {
    const enabled = true;
    this._recursivelyDrawItems(this.state.items, enabled);
  }

  onClose = () => {
    if (this.props.container) {
      ReactDOM.unmountComponentAtNode(this.props.container);
    }
  };

  _filterList = (searchEntry) => {
    function recursivelyFilterList(parent) {
      parent.forEach(item => {
        const lowercase = item.label.toLowerCase();
        if (!lowercase.includes(searchEntry) && item.children.length === 0) {
          item.filtered = true;
        } else {
          item.filtered = false;
        }
        if (item.children && item.children.length >= 1) {
          recursivelyFilterList(item.children);
        }
      });
    }
    this.setState(prevState => {
      const list = [...prevState.items];
      recursivelyFilterList(list);
      return {
        value: searchEntry,
        items: list
      };
    });
  }

  render() {
    const title = 'Add Layers';
    const form = (
      <div style={{ width: '24rem' }}>
        <div>
          <EuiFieldSearch
            placeholder="It would be delightful to help with your search..."
            value={this.state.value}
            onChange={(e) => this._filterList(e.target.value.toLowerCase())}
            isClearable={true}
            aria-label="Use aria labels when no actual label is in use"
            fullWidth={true}
          />
        </div>
        <div style={{ overflowY: 'scroll', border: '1px solid lightgrey' }}>
          <EuiTreeViewCheckbox
            items={this.state.items}
            display={'default'}
            expandByDefault={true}
            showExpansionArrows={true}
            style={{
              height: '300px'
            }}
          />
        </div>
      </div>
    );


    const footer = (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={() => {
              this.onClose();
            }}
          >
            Cancel
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="plusInCircle"
            onClick={() => {
              this._addLayersNotEnabled();
              this.onClose();
            }}
          >
            Add
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            size="s"
            iconType="plusInCircle"
            onClick={() => {
              this._addLayersEnabled();
              this.onClose();
            }}
          >
            Add and Enable
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      modalWithForm(title, form, footer, this.onClose)
    );
  }
}
AddMapLayersModal.propTypes = {
  addOverlay: PropTypes.func.isRequired,
  mrisOnMap: PropTypes.array.isRequired,
  getMriLayer: PropTypes.func.isRequired
  // esClient: PropTypes.func.isRequired,
  // container: PropTypes.element.isRequired
};

export function showAddLayerTreeModal(esClient, addOverlay, mrisOnMap, getMriLayer) {
  const container = document.createElement('div');
  const element = (
    <AddMapLayersModal
      getMriLayer={getMriLayer}
      mrisOnMap={mrisOnMap}
      addOverlay={addOverlay}
      esClient={esClient}
      container={container}
    />
  );
  ReactDOM.render(element, container);
}


