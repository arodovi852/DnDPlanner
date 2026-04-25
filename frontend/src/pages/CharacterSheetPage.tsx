import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/shared/Button';
import { SpoilerText, SpoilerTextarea } from '../components/shared/Spoiler';
import { AnnotationThread } from '../components/shared/AnnotationThread';
import {
  abilityModifier,
  isDungeonMaster,
  useCampaigns,
  type Character,
  type CharacterStats,
} from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { useUndoableState } from '../hooks/useUndoableState';
import { useDndClasses } from '../hooks/useDndClasses';

const HOMEBREW_VALUE = '__homebrew__';

/**
 * Página /character/:characterId — ficha de personaje al estilo DnD 5e.
 *
 * Mejoras de layout (basado en la imagen de diseño):
 *   · Ancho máximo 52rem centrado (no ocupa toda la pantalla).
 *   · Retrato y stats apretados arriba, con borde grueso y fondo
 *     más oscuro que el fondo de la página (`--color-chrome-strong`).
 *   · Stats y modificadores en una sola línea por atributo, sin
 *     flexgap que los separe — las columnas son `auto auto auto`.
 *   · Combat badges (ARM / HP / Movement / Damage dice / Initiative)
 *     al lado de los stats en una lista vertical compacta.
 *
 * Integración API DnD 5e:
 *   · El campo "Class" muestra un dropdown con las clases obtenidas
 *     de https://www.dnd5eapi.co/api/classes.
 *   · Al seleccionar una clase se auto-rellenan `damageDice` (dado de
 *     golpe de la clase) y `savingThrows`.
 *   · Opción "Homebrew" en TODOS los dropdowns relevantes → permite
 *     escribir a mano en vez de usar la lista.
 */
export function CharacterSheetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { characterId } = useParams<{ characterId: string }>();
  const { user } = useAuth();
  const { activeCampaign, updateCharacter } = useCampaigns();
  const { classes, fetchClassDetail } = useDndClasses();

  const real = activeCampaign?.characters.find((c) => c.id === characterId);

  // --- Permisos ---------------------------------------------------------
  // El DM y el Co-DM pueden editar cualquier personaje.
  // El jugador sólo puede editar el personaje que tenga asignado.
  const isDM = isDungeonMaster(activeCampaign, user?.id ?? null);
  const ownerMember = activeCampaign?.members.find(
    (m) => m.characterId === characterId
  );
  const isMyCharacter = !!user && ownerMember?.userId === user.id;
  const canEdit = isDM || isMyCharacter;

  const [draft, setDraft, history] = useUndoableState<Character | null>(
    real ?? null
  );

  // Si se está escribiendo una clase homebrew, la guardamos aparte del
  // valor del dropdown (el dropdown cambia a HOMEBREW_VALUE).
  const [classMode, setClassMode] = useState<'dropdown' | 'homebrew'>(
    real?.className && !classes.some((c) => c.name === real.className)
      ? 'homebrew'
      : 'dropdown'
  );

  useEffect(() => {
    history.reset(real ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  // Cuando las clases terminan de cargar (o al cambiar de personaje),
  // recalcular si el modo actual es dropdown o homebrew.
  useEffect(() => {
    if (classes.length === 0) return;
    const name = real?.className ?? '';
    setClassMode(
      name && !classes.some((c) => c.name === name) ? 'homebrew' : 'dropdown'
    );
  }, [classes.length, real?.className]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const mods = useMemo<CharacterStats>(() => {
    const s = draft?.stats ?? {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    };
    return {
      str: abilityModifier(s.str),
      dex: abilityModifier(s.dex),
      con: abilityModifier(s.con),
      int: abilityModifier(s.int),
      wis: abilityModifier(s.wis),
      cha: abilityModifier(s.cha),
    };
  }, [draft?.stats]);

  const proficiencyBonus = useMemo(() => {
    const lvl = draft?.level ?? 1;
    return Math.floor((lvl - 1) / 4) + 2;
  }, [draft?.level]);

  if (!draft) {
    return (
      <section className="character-sheet" aria-labelledby="character-missing">
        <h1 id="character-missing">—</h1>
        <p>{t('common.untitled')}</p>
      </section>
    );
  }

  // ------------------------------------------------------------------
  // Updaters
  // ------------------------------------------------------------------

  const patch = (fields: Partial<Character>) => {
    setDraft((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  const patchStat = (key: keyof CharacterStats, value: number) => {
    setDraft((prev) =>
      prev ? { ...prev, stats: { ...prev.stats, [key]: value } } : prev
    );
  };

  const handleClassChange = async (value: string) => {
    if (value === HOMEBREW_VALUE) {
      setClassMode('homebrew');
      patch({ className: '' });
      return;
    }
    setClassMode('dropdown');
    const picked = classes.find((c) => c.index === value);
    if (!picked) {
      patch({ className: '' });
      return;
    }
    patch({ className: picked.name });
    // Auto-rellena con los datos que devuelve la API.
    const detail = await fetchClassDetail(value);
    if (!detail) return;
    patch({
      damageDice: `1d${detail.hitDie}`,
      hp: detail.hitDie,
      maxHp: detail.hitDie,
      savingThrows: detail.savingThrows,
      skills: detail.proficiencies,
      inventory: detail.startingEquipment.map((name) => ({ name })),
    });
  };

  const handleSave = () => {
    if (!activeCampaign || !draft) return;
    updateCharacter(activeCampaign.id, draft.id, draft);
    navigate(-1);
  };

  const handleImagePick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        patch({ image: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const statKeys: Array<keyof CharacterStats> = [
    'str',
    'dex',
    'con',
    'int',
    'wis',
    'cha',
  ];

  // El valor actual del <select> depende del modo.
  const classDropdownValue =
    classMode === 'homebrew'
      ? HOMEBREW_VALUE
      : (classes.find((c) => c.name === draft.className)?.index ?? '');

  return (
    <section className="character-sheet" aria-labelledby="character-sheet-heading">
      <h1 id="character-sheet-heading" className="visually-hidden">
        {t('characterSheet.character')}
      </h1>

      <div className="character-sheet__top">
        {/* Retrato: imagen + nombre + ✏︎ */}
        <div className="character-sheet__portrait">
          <div className="character-sheet__portrait-image">
            {draft.image ? (
              <img src={draft.image} alt={draft.name || t('common.untitled')} />
            ) : (
              <div className="character-sheet__portrait-placeholder" aria-hidden="true" />
            )}
          </div>

          <div className="character-sheet__portrait-name-row">
            <input
              className="character-sheet__portrait-name"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder={t('characterSheet.character')}
              aria-label={t('characterSheet.character')}
            />
            <button
              type="button"
              className="character-sheet__portrait-edit"
              aria-label={t('characterSheet.changeImage')}
              onClick={() => fileInputRef.current?.click()}
            >
              <PencilIcon />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Stats y combat badges */}
        <div className="character-sheet__stats-panel">
          <ul className="character-sheet__stats">
            {statKeys.map((key) => (
              <li key={key} className="character-sheet__stat">
                <span className="character-sheet__stat-label">
                  {t(`characterSheet.${key}`)}
                </span>
                <input
                  type="number"
                  className="character-sheet__stat-value"
                  value={draft.stats[key]}
                  onChange={(e) => patchStat(key, parseInt(e.target.value) || 0)}
                  aria-label={t(`characterSheet.${key}`)}
                />
                <span className="character-sheet__stat-mod">
                  ({mods[key] >= 0 ? '+' : ''}
                  {mods[key]})
                </span>
              </li>
            ))}
          </ul>

          <div className="character-sheet__combat">
            <CombatBadge
              label={t('characterSheet.armor')}
              value={draft.armor}
              onChange={(n) => patch({ armor: n })}
            />
            <CombatBadge
              label={t('characterSheet.hp')}
              value={draft.hp}
              onChange={(n) => patch({ hp: n })}
            />
            <CombatBadge
              label={t('characterSheet.movement')}
              value={draft.movement}
              unit="ft"
              onChange={(n) => patch({ movement: n })}
            />
            <CombatBadgeText
              label={t('characterSheet.damageDice')}
              value={draft.damageDice}
              onChange={(v) => patch({ damageDice: v })}
            />
            <CombatBadge
              label={t('characterSheet.initiative')}
              value={draft.initiative}
              onChange={(n) => patch({ initiative: n })}
              showSign
            />
          </div>
        </div>
      </div>

      {/* Identity traits */}
      <div className="character-sheet__traits">
        <div className="character-sheet__field">
          <span className="character-sheet__field-label">
            {t('characterSheet.class')}
          </span>
          {classMode === 'dropdown' ? (
            <select
              className="character-sheet__field-input"
              value={classDropdownValue}
              onChange={(e) => handleClassChange(e.target.value)}
              aria-label={t('characterSheet.class')}
            >
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.index} value={c.index}>
                  {c.name}
                </option>
              ))}
              <option value={HOMEBREW_VALUE}>Homebrew</option>
            </select>
          ) : (
            <div className="character-sheet__homebrew-row">
              <input
                className="character-sheet__field-input"
                value={draft.className ?? ''}
                onChange={(e) => patch({ className: e.target.value })}
                placeholder="Homebrew class"
                aria-label={t('characterSheet.class')}
              />
              <button
                type="button"
                className="character-sheet__homebrew-cancel"
                onClick={() => {
                  setClassMode('dropdown');
                  patch({ className: '' });
                }}
                aria-label={t('common.cancel')}
              >
                ↩
              </button>
            </div>
          )}
        </div>

        <LabeledField
          label={t('characterSheet.level')}
          value={String(draft.level)}
          onChange={(v) => patch({ level: parseInt(v) || 1 })}
          inputMode="numeric"
        />
        <LabeledField
          label={t('characterSheet.race')}
          value={draft.race ?? ''}
          onChange={(v) => patch({ race: v })}
        />
        <LabeledField
          label={t('characterSheet.alignment')}
          value={draft.alignment ?? ''}
          onChange={(v) => patch({ alignment: v })}
        />
        <LabeledField
          label={t('characterSheet.background')}
          value={draft.background ?? ''}
          onChange={(v) => patch({ background: v })}
        />
        <LabeledField
          label={t('characterSheet.proficiencyBonus')}
          value={`+${proficiencyBonus}`}
          readOnly
        />
      </div>

      <div className="character-sheet__lists">
        <StringListField
          label={t('characterSheet.savingThrows')}
          values={draft.savingThrows}
          onChange={(next) => patch({ savingThrows: next })}
        />
        <StringListField
          label={t('characterSheet.skills')}
          values={draft.skills}
          onChange={(next) => patch({ skills: next })}
        />
        <StringListField
          label={t('characterSheet.spells')}
          values={draft.spells}
          onChange={(next) => patch({ spells: next })}
        />
        <StringListField
          label={t('characterSheet.features')}
          values={draft.features}
          onChange={(next) => patch({ features: next })}
        />
        <InventoryField
          label={t('characterSheet.inventory')}
          slots={draft.inventorySlots}
          values={draft.inventory.map((i) => i.name)}
          onSlotsChange={(n) => patch({ inventorySlots: n })}
          onChange={(next) =>
            patch({ inventory: next.map((name) => ({ name })) })
          }
        />
      </div>

      <div className="character-sheet__description-wrapper">
        <label className="character-sheet__description-label">
          {t('characterSheet.description')}
        </label>
        {canEdit ? (
          <SpoilerTextarea
            value={draft.description}
            onChange={(next) => patch({ description: next })}
            rows={6}
            className="character-sheet__description"
            ariaLabel={t('characterSheet.description')}
            readOnlyMarker={!isDM}
            markLabel={t('spoiler.mark')}
          />
        ) : (
          <div className="character-sheet__description character-sheet__description--readonly">
            <SpoilerText text={draft.description} />
          </div>
        )}
      </div>

      {canEdit && (
        <div className="character-sheet__actions">
          <Button onClick={handleSave}>{t('characterSheet.saveChanges')}</Button>
        </div>
      )}

      {activeCampaign && characterId && (
        <AnnotationThread
          campaignId={activeCampaign.id}
          targetType="character"
          targetId={characterId}
          title={t('annotations.characterHeading')}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

interface CombatBadgeProps {
  label: string;
  value: number;
  unit?: string;
  showSign?: boolean;
  onChange: (next: number) => void;
}

function CombatBadge({ label, value, unit, showSign, onChange }: CombatBadgeProps) {
  const display = showSign && value >= 0 ? `+${value}` : String(value);
  return (
    <label className="character-sheet__combat-badge">
      <span className="character-sheet__combat-label">{label}</span>
      <input
        className="character-sheet__combat-value"
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        aria-label={label}
        data-display={display}
      />
      {unit && <span className="character-sheet__combat-unit">{unit}</span>}
    </label>
  );
}

interface CombatBadgeTextProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
}

function CombatBadgeText({ label, value, onChange }: CombatBadgeTextProps) {
  return (
    <label className="character-sheet__combat-badge">
      <span className="character-sheet__combat-label">{label}</span>
      <input
        className="character-sheet__combat-value"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </label>
  );
}

interface LabeledFieldProps {
  label: string;
  value: string;
  onChange?: (next: string) => void;
  inputMode?: 'numeric';
  readOnly?: boolean;
}

function LabeledField({ label, value, onChange, inputMode, readOnly }: LabeledFieldProps) {
  return (
    <label className="character-sheet__field">
      <span className="character-sheet__field-label">{label}</span>
      <input
        className="character-sheet__field-input"
        value={value}
        readOnly={readOnly}
        inputMode={inputMode}
        onChange={(e) => onChange?.(e.target.value)}
        aria-label={label}
      />
    </label>
  );
}

interface StringListFieldProps {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}

function StringListField({ label, values, onChange }: StringListFieldProps) {
  const [entry, setEntry] = useState('');

  const add = () => {
    const v = entry.trim();
    if (!v) return;
    onChange([...values, v]);
    setEntry('');
  };

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="character-sheet__list">
      <span className="character-sheet__list-label">{label}</span>
      <ul className="character-sheet__list-items">
        {values.map((v, i) => (
          <li key={`${v}-${i}`} className="character-sheet__list-item">
            <span>{v}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${v}`}
              className="character-sheet__list-remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="character-sheet__list-add">
        <input
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="+"
          aria-label={`Add to ${label}`}
        />
      </div>
    </div>
  );
}

interface InventoryFieldProps {
  label: string;
  values: string[];
  slots: number;
  onChange: (next: string[]) => void;
  onSlotsChange: (next: number) => void;
}

function InventoryField({ label, values, slots, onChange, onSlotsChange }: InventoryFieldProps) {
  const { t } = useTranslation();
  const [entry, setEntry] = useState('');

  const add = () => {
    const v = entry.trim();
    if (!v || values.length >= slots) return;
    onChange([...values, v]);
    setEntry('');
  };

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="character-sheet__list">
      <div className="character-sheet__list-header">
        <span className="character-sheet__list-label">{label}</span>
        <label className="character-sheet__slots">
          {t('characterSheet.inventorySlots')}
          <input
            type="number"
            min={1}
            max={40}
            value={slots}
            onChange={(e) => onSlotsChange(parseInt(e.target.value) || 1)}
          />
        </label>
      </div>
      <ul className="character-sheet__list-items">
        {values.map((v, i) => (
          <li key={`${v}-${i}`} className="character-sheet__list-item">
            <span>{v}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${v}`}
              className="character-sheet__list-remove"
            >
              ×
            </button>
          </li>
        ))}
        {Array.from({ length: Math.max(0, slots - values.length) }).map((_, i) => (
          <li
            key={`slot-${i}`}
            className="character-sheet__list-item character-sheet__list-item--empty"
            aria-hidden="true"
          >
            —
          </li>
        ))}
      </ul>
      <div className="character-sheet__list-add">
        <input
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="+"
          aria-label={`Add to ${label}`}
        />
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1.25rem"
      height="1.25rem"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

export default CharacterSheetPage;
