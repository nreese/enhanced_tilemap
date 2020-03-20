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
  EuiButtonEmpty
} from '@elastic/eui';

import { modalWithForm } from './../../vislib/modals/genericModal.js';

class AddMapLayersModal extends React.Component {
  constructor(props) {
    super(props);
  }


  _getLayers = () => {
    //return [
    //   {
    //     label: 'Item One',
    //     id: 'item_one',
    //     icon: <EuiIcon type="eyeClosed" />,
    //     iconWhenExpanded: <EuiIcon type="eyeClosed" />,
    //     isExpanded: true,
    //     children: [
    //       {
    //         label: 'Item A',
    //         id: 'item_a',
    //         icon: <EuiIcon type="document" />,
    //       },
    //       {
    //         label: 'Item B',
    //         id: 'item_b',
    //         icon: <EuiIcon type="arrowRight" />,
    //         iconWhenExpanded: <EuiIcon type="arrowDown" />,
    //         children: [
    //           {
    //             label: 'A Cloud',
    //             id: 'item_cloud',
    //             icon: <EuiToken iconType="tokenConstant" />,
    //           },
    //           {
    //             label: 'Im a Bug',
    //             id: 'item_bug',
    //             icon: <EuiToken iconType="tokenEnum" />,
    //             // callback: this.showAlert,
    //           },
    //         ],
    //       },
    //       {
    //         label: 'Item C',
    //         id: 'item_c',
    //         icon: <EuiIcon type="arrowRight" />,
    //         iconWhenExpanded: <EuiIcon type="arrowDown" />,
    //         children: [
    //           {
    //             label: 'Another Cloud',
    //             id: 'item_cloud2',
    //             icon: <EuiToken iconType="tokenConstant" />,
    //           },
    //           {
    //             label:
    //               'This one is a really long string that we will check truncates correctly',
    //             id: 'item_bug2',
    //             icon: <EuiToken iconType="tokenEnum" />,
    //             // callback: this.showAlert,
    //           },
    //         ],
    //       },
    //     ],
    //   },
    //   {
    //     label: 'Item Two',
    //     id: 'item_two',
    //   },
    // ];

    return [
      {
        label: 'Item One',
        id: 'item_one',
        icon: <EuiIcon type="eyeClosed" />,
        iconWhenExpanded: <EuiIcon type="eye" />,
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
                label: "I'm a Bug",
                id: 'item_bug',
                icon: <EuiToken iconType="tokenEnum" />,
                callback: this.showAlert,
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
                callback: this.showAlert,
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

  render() {
    const title = 'Add Layers';
    const form = (
      // <EuiTreeView
      //   items={this._getLayers()}
      //   display="compressed"
      //   expandByDefault
      //   showExpansionArrows
      //   aria-label="Document Outline"
      // />
      <div style={{ width: '20rem' }}>
        <EuiTreeView items={this._getLayers()} aria-label="Sample Folder Tree" />
      </div>
    );
    const onClose = function () {
      this.setState({ isModalVisible: false });
      if (this.props.container) {
        ReactDOM.unmountComponentAtNode(this.props.container);
      }
    };

    const footer = (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={() => {
              onClose();
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
              onClose();
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
              onClose();
            }}
          >
            Add and Enable
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      modalWithForm(title, form, footer, onClose)
    );
  }
}


function showAddLayerTreeModal() {
  const container = document.createElement('div');
  const element = (

    <EuiTreeView items={[
      {
        label: 'Item One',
        id: 'item_one',
        icon: <EuiIcon type="eyeClosed" />,
        iconWhenExpanded: <EuiIcon type="eye" />,
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
                label: "I'm a Bug",
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
    ]
    } aria-label="Sample Folder Tree" />



    // <AddMapLayersModal
    //   container={container}
    // />
  );
  ReactDOM.render(element, container);
}

export {
  showAddLayerTreeModal
};

