import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
} from '@elastic/eui';
import React from 'react';

const modalWithForm = (title, form, footer, onClose) => {
  return (
    <EuiOverlayMask>
      <EuiModal
        onClose={onClose}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle >
            {title}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {form}
        </EuiModalBody>

        <EuiModalFooter>
          {footer}
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
}

export {
  modalWithForm
};
