import React from 'react';
import 'react-sortable-tree/style.css'; // This only needs to be imported once
import { EuiTreeView } from '@elastic/eui';

// L.Control.SetView = L.Control.extend({
//   options: {
//     position: 'topleft'
//   },
//   initialize: function (options) {
//     this._toolbar = new Tree(options);
//   },
//   onAdd: function (map) {
//     const container = L.DomUtil.create('div', 'react-ui-tree');
//     container.appendChild(this._toolbar.addToolbar(map));
//     return container;
//   },
//   onRemove: function () {
//     this._toolbar.removeToolbar();
//   }
// });

// export default class Tree extends Component {
//   constructor(props) {
//     super(props);






// this.state = {
//   treeData: [
//     { title: 'Chicken', children: [{ title: 'Egg' }] },
//     { title: 'Fish', children: [{ title: 'fingerline' }] }
//   ],
// };
// }

// // render() {
// const layerControlTree = (treeData) => {
//   const onSelect = (selectedKeys, info) => {
//     console.log('selected', selectedKeys, info);
//   };

//   const onCheck = (checkedKeys, info) => {
//     console.log('onCheck', checkedKeys, info);
//   };
//   return (
//     <Tree
//       checkable
//       defaultExpandedKeys={['0-0-0', '0-0-1']}
//       defaultSelectedKeys={['0-0-0', '0-0-1']}
//       defaultCheckedKeys={['0-0-0', '0-0-1']}
//       onSelect={onSelect}
//       onCheck={onCheck}
//       treeData={treeData}
//     />
//   );
// };
// // };
// export {
//   layerControlTree
// };






const layerControlTree = function (treeItems) {
  const showAlert = () => {
    alert('You squashed a bug!');
  };
  return (
    <div style={{ width: '20rem' }}>
      <EuiTreeView
        items={treeItems}
        display="compressed"
        expandByDefault
        showExpansionArrows
        aria-label="Document Outline"
      />
    </div>
  );
};

export {
  layerControlTree
};

/* eslint-disable global-require, import/newline-after-import */
// render(require('./app').default);

// L.Control.SetView = L.Control.extend({
//   options: {
//     position: 'topleft'
//   },
//   initialize: function (options) {
//     this._toolbar = new Tree(options);
//   }
// });
