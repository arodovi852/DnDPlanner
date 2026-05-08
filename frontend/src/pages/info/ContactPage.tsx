import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/shared/Button';
import { InfoPage } from '../InfoPage';

/**
 * /contact — además del bloque informativo común, incluye un formulario
 * de contacto. Sin backend conectado el formulario solo simula el envío
 * y muestra un mensaje de confirmación al usuario.
 */
export function ContactPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <InfoPage
      i18nKey="contact"
      extra={
        <article className="info-page__section info-page__contact-form">
          <h2 className="info-page__section-title">
            {t('infoPages.contact.formHeading')}
          </h2>

          {submitted ? (
            <p className="info-page__body" role="status">
              {t('infoPages.contact.thanks')}
            </p>
          ) : (
            <form className="info-page__form" onSubmit={handleSubmit}>
              <label className="info-page__field">
                <span className="info-page__field-label">
                  {t('infoPages.contact.formName')}
                </span>
                <input
                  type="text"
                  className="info-page__field-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="info-page__field">
                <span className="info-page__field-label">
                  {t('infoPages.contact.formEmail')}
                </span>
                <input
                  type="email"
                  className="info-page__field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="info-page__field">
                <span className="info-page__field-label">
                  {t('infoPages.contact.formMessage')}
                </span>
                <textarea
                  className="info-page__field-input info-page__field-input--textarea"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </label>
              <div className="info-page__form-actions">
                <Button onClick={() => undefined}>
                  {t('infoPages.contact.formSubmit')}
                </Button>
              </div>
            </form>
          )}
        </article>
      }
    />
  );
}

export default ContactPage;
