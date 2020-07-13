import { cloneDeep } from 'lodash';
import { onDashboardPage } from 'ui/kibi/utils/on_page';

export default class SirenSessionState {
  // A temporary fix is to use siren session to store uiState. This is pending an overall uistate improvement.
  // See comment on - https://sirensolutions.atlassian.net/browse/INVE-11900
  constructor() {
    this._sessionState;
  }
  register = (uiState, sirenSession, rootId, visId) => {
    this._sessionState;
    const sirenSessionId = rootId + visId;
    const sirenSessionData = sirenSession.getData();
    if (sirenSessionData.map && sirenSessionData.map[sirenSessionId]) {
      this._sessionState = sirenSessionData.map[sirenSessionId];
    } else {
      // create new state for this dashboard/vis combination
      if (!sirenSessionData.map) {
        sirenSessionData.map = {};
      }
      if (onDashboardPage()) {
        if (typeof uiState._parent._changedState[uiState._path] === 'object') {
          // use the dashboard specific state if there is one
          this._sessionState = sirenSessionData.map[sirenSessionId] = cloneDeep(uiState._parent._changedState[uiState._path]);
        } else {
          // otherwise use the state that is saved with the visualization
          this._sessionState = sirenSessionData.map[sirenSessionId] = cloneDeep(uiState._defaultState[uiState._path]);
        }
      } else {
        // if in vis edit mode
        this._sessionState = sirenSessionData.map[sirenSessionId] = cloneDeep(uiState._mergedState);
      }
    }
  }

  get = (key) => {
    return this._sessionState[key];
  };
  set = (key, value) => {
    this._sessionState[key] = value;
  };
}

