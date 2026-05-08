import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

/**
 * Página estática reutilizable para los enlaces del footer.
 *
 * Cada página de información (about, contact, news, terms, privacy, api,
 * roadmap) usa este componente con su propia clave i18n. La estructura
 * visual replica el patrón de "panel + secciones" que usan otras páginas
 * (perfil, campañas) — fondo cromo oscuro, panel cremoso translúcido,
 * tipografía heading + base.
 */
export interface InfoPageProps {
  /** Clave bajo `infoPages` en los locales. P. ej. "about", "terms"… */
  i18nKey: string;
  /** Bloque adicional que puede inyectar contenido específico (formulario
   *  de contacto, embeds, listas dinámicas…). Renderizado al final. */
  extra?: ReactNode;
}

interface InfoSection {
  heading: string;
  body: string | string[];
}

export function InfoPage({ i18nKey, extra }: InfoPageProps) {
  const { t } = useTranslation();
  // i18next devuelve directamente el array si la clave apunta a un array.
  const raw = t(`infoPages.${i18nKey}.sections`, {
    returnObjects: true,
  }) as unknown;
  const sections: InfoSection[] = Array.isArray(raw) ? (raw as InfoSection[]) : [];

  return (
    <section
      className="info-page"
      aria-labelledby={`info-page-${i18nKey}-heading`}
    >
      <header className="info-page__header">
        <h1
          id={`info-page-${i18nKey}-heading`}
          className="info-page__title"
        >
          {t(`infoPages.${i18nKey}.title`)}
        </h1>
        <p className="info-page__lead">{t(`infoPages.${i18nKey}.lead`)}</p>
      </header>

      <div className="info-page__panel">
        {sections.map((section, idx) => (
          <article key={idx} className="info-page__section">
            <h2 className="info-page__section-title">{section.heading}</h2>
            {Array.isArray(section.body) ? (
              <ul className="info-page__list">
                {section.body.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="info-page__body">{section.body}</p>
            )}
          </article>
        ))}

        {extra}
      </div>
    </section>
  );
}

export default InfoPage;
