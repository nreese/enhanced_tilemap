
const defaultStoredLayerConfig = () => {
  return JSON.stringify([{
    icon: 'fas fa-arrow-alt-circle-down',
    color: '#7CBFFA',
    popupFields: [],
    minZoom: 0,
    maxZoom: 18
  }]);
};

export {
  defaultStoredLayerConfig
};