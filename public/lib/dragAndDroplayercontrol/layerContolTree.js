import React from 'react';
// import { ReactDOM } from 'react-dom';

import ReactDOM from 'react-dom';
import {
  EuiTreeView,
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiToken,
  EuiButtonEmpty,
  EuiHealth,
  EuiCallOut,
  EuiSpacer,
  EuiCodeBlock,
  EuiTitle,
  EuiSwitch,
  EuiBasicTable,
  EuiSearchBar,
} from '@elastic/eui';

import { modalWithForm } from './../../vislib/modals/genericModal';
import { getStoredLayers } from './getStoredLayers';
export class AddMapLayersModal extends React.Component {
  constructor(props) {
    super(props);
  }



  _getLayers = () => {
    return [
      {
        label: 'Item One',
        id: 'item_one',
        icon: <EuiIcon type="eyeClosed" />,
        iconWhenExpanded: <EuiIcon type="eyeClosed" />,
        isExpanded: true,
        children: [
          {
            label: 'Item A',
            id: 'item_a',
            icon: <EuiIcon type="document" />,
          },
          {
            label: 'Item B',
            id: 'item_b',
            icon: <EuiIcon type="arrowRight" />,
            iconWhenExpanded: <EuiIcon type="arrowDown" />,
            children: [
              {
                label: 'A Cloud',
                id: 'item_cloud',
                icon: <EuiToken iconType="tokenConstant" />,
              },
              {
                label: 'Im a Bug',
                id: 'item_bug',
                icon: <EuiToken iconType="tokenEnum" />,
                // callback: this.showAlert,
              },
            ],
          },
          {
            label: 'Item C',
            id: 'item_c',
            icon: <EuiIcon type="arrowRight" />,
            iconWhenExpanded: <EuiIcon type="arrowDown" />,
            children: [
              {
                label: 'Another Cloud',
                id: 'item_cloud2',
                icon: <EuiToken iconType="tokenConstant" />,
              },
              {
                label:
                  'This one is a really long string that we will check truncates correctly',
                id: 'item_bug2',
                icon: <EuiToken iconType="tokenEnum" />,
                // callback: this.showAlert,
              },
            ],
          },
        ],
      },
      {
        label: 'Item Two',
        id: 'item_two',
      },
    ];
  }

  _addLayersNotEnabled = () => {
    console.log('adding Layers Not Enabled');
  }

  _addLayersEnabled = () => {
    console.log('adding Layers Enabled');
  }

  onClose = function () {
    this.setState({ isModalVisible: false });
    if (this.props.container) {
      ReactDOM.unmountComponentAtNode(this.props.container);
    }
  };
  render() {
    const title = 'Add Layers';
    const form = 'ui tree component goes here';
    // (
    //   <div style={{ width: '20rem' }}>
    //     <EuiTreeView
    //       items={this._getLayers()}
    //       display="compressed"
    //       expandByDefault
    //       showExpansionArrows
    //       aria-label="Document Outline"
    //     />
    //   </div>
    // );


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
  getStoredLayers(esClient);

  const container = document.createElement('div');
  const element = (
    <AddMapLayersModal
      container={container}
    />
  );
  ReactDOM.render(element, container);
}


