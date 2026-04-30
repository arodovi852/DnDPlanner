import { Fragment, type ReactNode } from 'react';
import {
  SPOILER_REGEX,
  spoilerHash,
  useCampaigns,
} from '../../../context/CampaignContext';
import { useAuth } from '../../../context/AuthContext';

/**
 * Renderiza un texto aplicando la sintaxis de spoiler: `||secreto||`.
 *
 * Reglas:
 *   · DM / Co-DM siempre ven el texto. Los fragmentos marcados se pintan
 *     con fondo oscuro y subrayado para indicar que son secretos.
 *   · Jugadores sólo ven el texto si el spoiler está revelado (el hash
 *     aparece en `campaign.revealedSpoilers`). En caso contrario se
 *     muestra una barra negra censurada.
 *   · El DM puede clicar un spoiler para revelar / ocultar a los jugadores.
 */
export interface SpoilerTextProps {
  text: string;
  /** Por defecto se usa la campaña activa. Útil para override en tests. */
  campaignId?: string;
  className?: string;
}

export function SpoilerText({ text, campaignId, className }: SpoilerTextProps) {
  const { user } = useAuth();
  const { activeCampaign, campaigns, getRole, toggleSpoiler } = useCampaigns();

  const campaign = campaignId
    ? campaigns.find((c) => c.id === campaignId) ?? null
    : activeCampaign;

  const role = user && campaign ? getRole(campaign.id, user.id) : null;
  const isDM = role === 'dm' || role === 'co-dm';
  const revealedSet = new Set(campaign?.revealedSpoilers ?? []);

  const parts = splitSpoilers(text);

  return (
    <span className={className ?? 'spoiler-text'}>
      {parts.map((part, i) => {
        if (part.kind === 'plain') {
          return <Fragment key={i}>{part.value}</Fragment>;
        }
        const hash = spoilerHash(part.value);
        const revealed = revealedSet.has(hash);
        const canRead = isDM || revealed;

        if (isDM) {
          return (
            <button
              type="button"
              key={i}
              className={
                'spoiler-chunk spoiler-chunk--dm' +
                (revealed ? ' spoiler-chunk--revealed' : '')
              }
              onClick={() => campaign && toggleSpoiler(campaign.id, hash)}
              title={
                revealed
                  ? 'Revelado a los jugadores (clic para ocultar)'
                  : 'Oculto a los jugadores (clic para revelar)'
              }
              aria-pressed={revealed}
            >
              {part.value}
            </button>
          );
        }

        if (!canRead) {
          return (
            <span
              key={i}
              className="spoiler-chunk spoiler-chunk--redacted"
              aria-label="[REDACTED]"
            >
              {/* Mostramos un bloque negro del ancho aproximado del texto. */}
              {redactedPlaceholder(part.value)}
            </span>
          );
        }

        return (
          <span key={i} className="spoiler-chunk spoiler-chunk--revealed-player">
            {part.value}
          </span>
        );
      })}
    </span>
  );
}

/** Convierte el texto visible en bloques opacos del mismo ancho aproximado. */
function redactedPlaceholder(text: string): ReactNode {
  // Reemplaza cualquier carácter imprimible por "█" para conservar el ancho,
  // y mantiene los espacios para que el wrap natural siga funcionando.
  return text.replace(/\S/g, '█');
}

interface TextPart {
  kind: 'plain' | 'spoiler';
  value: string;
}

export function splitSpoilers(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const re = new RegExp(SPOILER_REGEX.source, 'g');
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ kind: 'plain', value: text.slice(lastIndex, m.index) });
    }
    parts.push({ kind: 'spoiler', value: m[1] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: 'plain', value: text.slice(lastIndex) });
  }
  return parts;
}

export default SpoilerText;
