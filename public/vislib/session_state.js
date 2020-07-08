import { cloneDeep } from 'lodash';
import { onDashboardPage } from 'ui/kibi/utils/on_page';

export default class SirenSessionState {
  // Note - true, false, se (saved and enabled on map), sne (saved but not enabled on map) and undefined (new to uistate) are all possible states
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
      //create new state for this dashboard/vis combination
      if (!sirenSessionData.map) {
        sirenSessionData.map = {};
      }
      if (onDashboardPage()) {
        this._sessionState = sirenSessionData.map[sirenSessionId] = cloneDeep(uiState._defaultState[uiState._path]);
      } else {
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

