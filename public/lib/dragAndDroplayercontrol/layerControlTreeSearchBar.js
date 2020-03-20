// import { EuiFieldSearch, EuiSwitch } from '@elastic/eui';
// import React, { Component } from 'react';

// import { DisplayToggles } from './display_toggles';

// export default class extends Component {
//   constructor(props) {
//     super(props);

//     this.state = {
//       isClearable: true,
//       value: '',
//     };
//   }

//   onChange = e => {
//     this.setState({
//       value: e.target.value,
//     });
//   };

//   render() {
//     return (
//       /* DisplayToggles wrapper for Docs only */
//       <DisplayToggles
//         canPrepend
//         canAppend
//         extras={[
//           <EuiSwitch
//             compressed
//             label={'clearable'}
//             checked={this.state.isClearable}
//             onChange={e => {
//               this.setState({ isClearable: e.target.checked });
//             }}
//           />,
//         ]}>
//         <EuiFieldSearch
//           placeholder="Search Layers ..."
//           value={this.state.value}
//           onChange={this.onChange}
//           isClearable={this.state.isClearable}
//           aria-label="Use aria labels when no actual label is in use"
//         />
//       </DisplayToggles>
//     );
//   }
// }