import React from 'react';
import PropTypes from 'prop-types';
// import { filter, find, forOwn } from 'lodash';
import EllipsisWithTooltip from 'react-ellipsis-with-tooltip';

import {
  EuiCheckbox,
  // EuiComboBox,
  // EuiFormRow
} from '@elastic/eui';

import {
  DragDropContext,
  Droppable,
  Draggable
} from 'react-beautiful-dnd';

const getItemStyle = (isDragging, draggableStyle) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: 'none',
  padding: `0 6px 0 10px`,
  borderBottom: '1px solid lightgrey',
  display: 'flex',
  // change background colour if dragging
  background: isDragging ? '#e6e6e6' : 'none',
  margin: 0,
  height: '28px',
  lineHeight: '28px',

  // styles we need to apply on draggables
  ...draggableStyle
});

const getListStyle = () => ({
  padding: `6px 0`
});

// a little function to help us with reordering the result
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};


export class LayerControlDnd extends React.Component {

  constructor(props) {
    super(props);

    this.onDragEnd = this.onDragEnd.bind(this);
    // this.listItems = this.listItems.bind(this);
    this.state = {
      dndCurrentListOrder: props.dndCurrentListOrder
    };
  }

  onDragEnd(result) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    console.log('Dragged to:', result.destination);

    let newDndCurrentListOrder = {};
    this.setState(({ dndCurrentListOrder }) => {
      newDndCurrentListOrder = reorder(
        dndCurrentListOrder,
        result.source.index,
        result.destination.index
      );
      this.props.dndListOrderChange(newDndCurrentListOrder, result.source.index, result.destination.index);
      return { dndCurrentListOrder: newDndCurrentListOrder };
    });

  }

  removeListItem(index, id, layer) {
    //const currentListOrder = filter(this.props.currentListOrder, item => item.id !== itemId);
    console.log('remove list item: ', layer.id, layer.label);
    this.setState(prevState => {
      const newListOrder = [...prevState.dndCurrentListOrder];
      delete newListOrder[index];
      this.props.dndRemoveLayerFromControl(index, id, layer);
      return { dndCurrentListOrder: newListOrder };
    });
  }

  changeVisibility(e, layer, index) {
    //const layerIndex = this.props.currentListOrder;
    // const card = find(currentListOrder, { id: itemId });
    console.log(e);
    e.stopPropagation();
    const target = e.target;
    if (target) {
      this.setState(prevState => {
        const newListOrder = [...prevState.dndCurrentListOrder];
        newListOrder[index].enabled = target.checked;
        this.props.dndLayerVisibilityChange(target.checked, layer, index);
        return { dndCurrentListOrder: newListOrder };
      });
    }
  }

  render() {
    return (
      <React.Fragment>
        <DragDropContext onDragEnd={this.onDragEnd}>
          <Droppable droppableId="DROPPABLE_AREA_BARE">

            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={getListStyle(snapshot.isDraggingOver)}
              >
                {this.state.dndCurrentListOrder.map((layer, index) => (
                  <Draggable key={layer.id} draggableId={layer.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={getItemStyle(
                          snapshot.isDragging,
                          provided.draggableProps.style
                        )}
                      >
                        <span {...provided.dragHandleProps} className="panel-drag-handler">
                          <span className={'far fa-grip-lines'}
                          />
                        </span>

                        <span className="panel-checkbox">
                          <EuiCheckbox
                            id={layer.id}
                            checked={layer.enabled}
                            onChange={e => this.changeVisibility(e, layer, index)}

                          />
                        </span>

                        <span className="panel-label">
                          <EllipsisWithTooltip placement="left"
                          >
                            {layer.label}
                          </EllipsisWithTooltip>
                        </span>

                        {/* <span className="panel-actions"> */}
                        <button
                          className="btn panel-remove"
                          onClick={() => this.removeListItem(layer)}
                        >
                          <i className="far fa-trash" />
                        </button>
                        {/* </span> */}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </React.Fragment>
    );
  }
}


LayerControlDnd.propTypes = {
  dndCurrentListOrder: PropTypes.array.isRequired,
  dndRemoveLayerFromControl: PropTypes.func.isRequired,
  dndListOrderChange: PropTypes.func.isRequired,
  dndLayerVisibilityChange: PropTypes.func.isRequired
};

