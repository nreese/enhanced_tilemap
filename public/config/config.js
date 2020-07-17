
const spiderfyPlus = `<span class="fa stack" style="height: 0px;">
  <i class="fa fa-circle fa-stack-1x" style="color:#FFFFFF; width:72px;"></i>
  <i class="fa fa-plus-circle fa-stack-1x" style="color:#888888; width:72px;"></i>
</span>`;
// `<i class="fa fa-plus-circle" style="color:#888888; background-color:#FFFFFF; border-radius: 50%;"></i>`;

const tooManyDocsWarningIcon = `<i class="fa fa-exclamation-triangle text-color-warning doc-viewer-underscore"></i>`;

const defaultStoredLayerConfig = {
  icon: 'fas fa-arrow-alt-circle-down',
  color: '#7CBFFA',
  popupFields: [],
  minZoom: 0,
  maxZoom: 18
};

export {
  spiderfyPlus,
  tooManyDocsWarningIcon,
  defaultStoredLayerConfig
};