import React from 'react';
import { Modal } from './ui/Modal';
import { SettingsForm } from './SettingsForm';

export default function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      description="Manage your account and Roamly preferences."
      maxWidth="lg"
    >
      <SettingsForm
        isModal={true}
        onClose={onClose}
        settings={settings}
        onSaveSettings={onSaveSettings}
      />
    </Modal>
  );
}
