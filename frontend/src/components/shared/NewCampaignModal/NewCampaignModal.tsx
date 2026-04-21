import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button';
import { useCampaigns, CAMPAIGN_TEMPLATES } from '../../../context/CampaignContext';
import { useAuth } from '../../../context/AuthContext';

/**
 * Modal "Nueva campaña" que aparece al pulsar el "+" de /main.
 *
 * Permite:
 *   · Introducir un nombre.
 *   · (Opcional) Partir desde una plantilla existente.
 *
 * Al crear la campaña, se activa como `activeCampaign` y el modal
 * llama a `onCreated(campaign)` para que quien lo abrió decida a
 * dónde navegar.
 */
export interface NewCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (campaignId: string) => void;
  /** Si se fija, el modal se abre con la plantilla pre-seleccionada. */
  initialTemplateId?: string;
}

export function NewCampaignModal({
  open,
  onClose,
  onCreated,
  initialTemplateId,
}: NewCampaignModalProps) {
  const { t } = useTranslation();
  const { createCampaign } = useCampaigns();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<string>('blank');

  useEffect(() => {
    if (open) {
      setName('');
      setTemplateId(initialTemplateId ?? 'blank');
    }
  }, [open, initialTemplateId]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const campaign = createCampaign({
      name: name.trim(),
      templateId: templateId === 'blank' ? undefined : templateId,
      ownerId: user?.id ?? 'user-anon',
    });
    onCreated?.(campaign.id);
    onClose();
  };

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="auth-modal new-campaign-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-campaign-title"
      >
        <button
          type="button"
          className="auth-modal__close"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          ×
        </button>

        <h2 id="new-campaign-title" className="auth-modal__title">
          {t('newCampaign.title')}
        </h2>

        <form className="auth-modal__form" onSubmit={handleSubmit}>
          <input
            className="auth-modal__field"
            type="text"
            placeholder={t('newCampaign.namePlaceholder')}
            aria-label={t('newCampaign.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <label className="new-campaign-modal__template-label">
            {t('newCampaign.createFromTemplate')}
          </label>
          <select
            className="new-campaign-modal__select"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            aria-label={t('newCampaign.useTemplate')}
          >
            {CAMPAIGN_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>

          <div className="auth-modal__actions">
            <Button type="submit" size="small">
              {t('common.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewCampaignModal;
