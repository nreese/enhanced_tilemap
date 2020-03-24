import React from 'react';
import { cloneDeep } from 'lodash';

import ReactDOM from 'react-dom';
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
      console.log('On click change: ', list[0].checked);
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


  _addLayersNotEnabled = () => {
    console.log('adding Layers Not Enabled');
  }

  _addLayersEnabled = () => {
    console.log('adding Layers Enabled');
    console.log(this.state.items);
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
    if (this.state && this.state.items && this.state.items.length >= 1) {
      console.log('render: ', this.state.items[0].checked);
    }
    const title = 'Add Layers';
    const form = (
      <div style={{ width: '24rem' }}>
        <div>
          <EuiFieldSearch
            placeholder="Find yo mapzzz..."
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

export function showAddLayerTreeModal(esClient) {
  const container = document.createElement('div');
  const element = (
    <AddMapLayersModal
      esClient={esClient}
      container={container}
    />
  );
  ReactDOM.render(element, container);
}


