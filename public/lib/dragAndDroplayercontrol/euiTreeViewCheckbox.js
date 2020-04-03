
import React, { createContext } from 'react';
import classNames from 'classnames';

import {
  // classNames,
  EuiTreeView,
  EuiI18n,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiText
} from '@elastic/eui';

const EuiTreeViewContext = createContext('');

const displayToClassNameMap = {
  default: null,
  compressed: 'euiTreeView--compressed',
};

function hasAriaLabel(x) {
  return x.hasOwnProperty('aria-label');
}

class EuiTreeViewCheckbox extends EuiTreeView {
  componentWillReceiveProps(newProps) {
    const { expandByDefault, items } = newProps;
    if (expandByDefault) {
      this.setState({
        openItems: items
          .map(item => item.children ? item.id : null)
          .filter(id => id !== null)
      });
    }
  }

  render() {
    const {
      children,
      className,
      items,
      display = 'default',
      expandByDefault,
      showExpansionArrows,
      ...rest
    } = this.props;
    // Computed classNames
    const classes = classNames(
      'euiTreeView',
      display ? displayToClassNameMap[display] : null,
      { 'euiTreeView--withArrows': showExpansionArrows },
      className
    );
    const instructionsId = `${this.state.treeID}--instruction`;
    return (
      <EuiTreeViewContext.Provider value={this.state.treeID}>
        <EuiText
          size={display === 'compressed' ? 's' : 'm'}
          className="euiTreeView__wrapper">
          {!this.isNested && (
            <EuiI18n
              token="euiTreeView.listNavigationInstructions"
              default="You can quickly navigate this list using arrow keys.">
              {(listNavigationInstructions) => (
                <EuiScreenReaderOnly>
                  <p id={instructionsId}>{listNavigationInstructions}</p>
                </EuiScreenReaderOnly>
              )}
            </EuiI18n>
          )}
          <ul
            className={classes}
            id={this.state.treeID}
            aria-describedby={!this.isNested ? instructionsId : undefined}
            {...rest}>
            {items.map((node, index) => {
              const buttonId = `${this.state.treeID}--${index}--node`;
              return (
                <EuiI18n
                  key={node.label + index}
                  token="euiTreeView.ariaLabel"
                  default="{nodeLabel} child of {ariaLabel}"
                  values={{
                    nodeLabel: node.label,
                    ariaLabel: hasAriaLabel(rest) ? rest['aria-label'] : '',
                  }}>
                  {(ariaLabel) => {
                    const label = hasAriaLabel(rest)
                      ? {
                        'aria-label': ariaLabel,
                      }
                      : {
                        'aria-labelledby': `${buttonId} ${
                          rest['aria-labelledby']}`,
                      };
                    const nodeClasses = classNames(
                      'euiTreeView__node',
                      display ? displayToClassNameMap[display] : null,
                      { 'euiTreeView__node--expanded': this.isNodeOpen(node) }
                    );
                    const nodeButtonClasses = classNames(
                      'euiTreeView__nodeInner',
                      showExpansionArrows && node.children
                        ? 'euiTreeView__nodeInner--withArrows'
                        : null,
                      this.state.activeItem === node.id
                        ? 'euiTreeView__node--active'
                        : null,
                      node.className ? node.className : null
                    );
                    return (
                      <React.Fragment>
                        {!node.filtered && <li style={{ listStyleType: 'none' }}>

                          {<input type='checkbox'
                            data-test-subj='layer-tree-checkbox'
                            id={node.id}
                            name={node.id}
                            onChange={() => {
                              this.props.onChange({
                                id: node.id,
                                checked: !node.checked,
                                isGroup: node.group,
                                isParentItem: node.isParentItem
                              });
                            }}
                            ref={el => el && (el.indeterminate = node.indeterminate)}
                            checked={node.checked}
                            style={{ paddingLeft: '10px' }}
                          ></input>}

                          <button
                            id={buttonId}
                            aria-controls={`euiNestedTreeView-${
                              this.state.treeID}`}
                            aria-expanded={this.isNodeOpen(node)}
                            ref={ref => this.setButtonRef(ref, index)}
                            data-test-subj={`euiTreeViewButton-${
                              this.state.treeID}`}
                            onKeyDown={(event) =>
                              this.onKeyDown(event, node)
                            }
                            onClick={() => this.handleNodeClick(node)}
                            className={nodeButtonClasses}
                            style={{ paddingLeft: '10px' }}
                          >
                            {showExpansionArrows && (node.children && node.children.length >= 1) ? (
                              <EuiIcon
                                className="euiTreeView__expansionArrow"
                                size={display === 'compressed' ? 's' : 'm'}
                                type={
                                  this.isNodeOpen(node)
                                    ? 'arrowDown'
                                    : 'arrowRight'
                                }
                              />
                            ) : null}
                            {node.icon && !node.useEmptyIcon ? (
                              <span className="euiTreeView__iconWrapper">
                                {this.isNodeOpen(node) && node.iconWhenExpanded
                                  ? node.iconWhenExpanded
                                  : node.icon}
                              </span>
                            ) : null}
                            {node.useEmptyIcon && !node.icon ? (
                              <span className="euiTreeView__iconPlaceholder" />
                            ) : null}
                            <span className="euiTreeView__nodeLabel">
                              {` ${node.label} (${node.count})`}
                            </span>

                          </button>
                          <div
                            id={`euiNestedTreeView-${this.state.treeID}`}
                            onKeyDown={(event) =>
                              this.onChildrenKeydown(event, index)
                            }>
                            {node.children && this.isNodeOpen(node) ? (
                              <EuiTreeViewCheckbox
                                onChange={this.props.onChange}
                                items={node.children}
                                display={display}
                                showExpansionArrows={showExpansionArrows}
                                expandByDefault={this.props.expandByDefault}
                                {...label}
                              />
                            ) : null}
                          </div>
                        </li>
                        }
                      </React.Fragment>
                    );
                  }}
                </EuiI18n>
              );
            })}
          </ul>
        </EuiText>
      </EuiTreeViewContext.Provider >
    );
  }
}

export { EuiTreeViewCheckbox };

