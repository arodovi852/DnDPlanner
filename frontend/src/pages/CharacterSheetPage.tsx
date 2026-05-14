import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
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
  type CharacterAttack,
  type CharacterStats,
} from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { useUndoableState } from '../hooks/useUndoableState';
import { useDndClasses } from '../hooks/useDndClasses';
import { useDndMonsters } from '../hooks/useDndMonsters';

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
  const { monsters, fetchMonsterDetail } = useDndMonsters();

  const real = activeCampaign?.characters.find((c) => c.id === characterId);

  // --- Permisos ---------------------------------------------------------
  // El DM y el Co-DM pueden editar cualquier personaje.
  // El jugador sólo puede editar el personaje que tenga asignado.
  // Si no hay sesión iniciada o el usuario es el propietario de la campaña,
  // permitimos editar (modo local sin autenticación / dueño de la campaña).
  const isDM = isDungeonMaster(activeCampaign, user?.id ?? null);
  const ownerMember = activeCampaign?.members.find(
    (m) => m.characterId === characterId
  );
  const isMyCharacter = !!user && ownerMember?.userId === user.id;
  const isCampaignOwner =
    !!user && !!activeCampaign && activeCampaign.ownerId === user.id;
  const noAuth = !user;
  const canEdit = isDM || isMyCharacter || isCampaignOwner || noAuth;

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
  const [croppingSrc, setCroppingSrc] = useState<string | null>(null);

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
    if (!canEdit) return;
    setDraft((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  const patchStat = (key: keyof CharacterStats, value: number) => {
    if (!canEdit) return;
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

  /** Vincula un enemigo con un monstruo del API y auto-rellena todo. */
  const handleMonsterChange = async (value: string) => {
    if (!value) {
      patch({ apiIndex: undefined });
      return;
    }
    const detail = await fetchMonsterDetail(value);
    if (!detail) {
      patch({ apiIndex: value });
      return;
    }
    patch({
      apiIndex: detail.index,
      name: detail.name,
      image: detail.image,
      armor: detail.armorClass,
      hp: detail.hitPoints,
      maxHp: detail.hitPoints,
      damageDice: detail.hitPointsRoll ?? draft.damageDice,
      movement: detail.speed,
      stats: detail.stats,
      attacks: detail.attacks,
      level: Math.max(1, Math.round(detail.challengeRating || 1)),
    });
  };

  const handleSave = () => {
    if (!activeCampaign || !draft) return;
    updateCharacter(activeCampaign.id, draft.id, draft);
    navigate(-1);
  };

  const handleImagePick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reseteamos el input para que volver a elegir el mismo fichero
    // dispare onChange (de lo contrario el crop modal no se reabre).
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Abrimos el cropper en lugar de guardar la imagen completa.
        setCroppingSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (dataUrl: string) => {
    patch({ image: dataUrl });
    setCroppingSrc(null);
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
    <section
      className={'character-sheet' + (canEdit ? '' : ' character-sheet--readonly')}
      aria-labelledby="character-sheet-heading"
      data-readonly={!canEdit ? 'true' : undefined}
    >
      <h1 id="character-sheet-heading" className="visually-hidden">
        {t('characterSheet.character')}
      </h1>

      {!canEdit && (
        <p className="character-sheet__readonly-banner" role="note">
          {t('characterSheet.readOnlyNotice')}
        </p>
      )}

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
        {draft.kind === 'enemy' && (
          <div className="character-sheet__field">
            <span className="character-sheet__field-label">
              {t('characterSheet.monster')}
            </span>
            <select
              className="character-sheet__field-input"
              value={draft.apiIndex ?? ''}
              onChange={(e) => handleMonsterChange(e.target.value)}
              aria-label={t('characterSheet.monster')}
            >
              <option value="">—</option>
              {monsters.map((m) => (
                <option key={m.index} value={m.index}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
        <AttacksField
          label={t('characterSheet.attacks')}
          values={draft.attacks}
          onChange={(next) => patch({ attacks: next })}
        />
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
            rows={14}
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
          <Button onClick={handleSave}>
            {t('characterSheet.saveToCampaign')}
          </Button>
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

      {croppingSrc && (
        <ImageCropModal
          src={croppingSrc}
          onCancel={() => setCroppingSrc(null)}
          onConfirm={handleCropComplete}
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

interface AttacksFieldProps {
  label: string;
  values: CharacterAttack[];
  onChange: (next: CharacterAttack[]) => void;
}

function AttacksField({ label, values, onChange }: AttacksFieldProps) {
  // Usamos un Set para que se puedan tener varios ataques desplegados
  // a la vez. Click sobre un ataque ya abierto lo cierra (toggle).
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [draftEntry, setDraftEntry] = useState('');

  const toggleOpen = (index: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
    setOpen((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  };

  const addBlank = () => {
    const name = draftEntry.trim();
    if (!name) return;
    onChange([...values, { name, description: '' }]);
    setDraftEntry('');
  };

  const update = (index: number, patchAttack: Partial<CharacterAttack>) => {
    onChange(values.map((a, i) => (i === index ? { ...a, ...patchAttack } : a)));
  };

  return (
    <div className="character-sheet__list character-sheet__list--attacks">
      <span className="character-sheet__list-label">{label}</span>
      <ul className="character-sheet__list-items">
        {values.map((attack, i) => (
          <li
            key={`${attack.name}-${i}`}
            className="character-sheet__attack"
          >
            <button
              type="button"
              className="character-sheet__attack-summary"
              onClick={() => toggleOpen(i)}
              aria-expanded={open.has(i)}
            >
              <span className="character-sheet__attack-name">{attack.name}</span>
              {attack.attackBonus !== undefined && (
                <span className="character-sheet__attack-bonus">
                  {attack.attackBonus >= 0 ? `+${attack.attackBonus}` : attack.attackBonus}
                </span>
              )}
              {attack.damage && (
                <span className="character-sheet__attack-damage">{attack.damage}</span>
              )}
            </button>
            {open.has(i) && (
              <div className="character-sheet__attack-detail">
                <input
                  className="character-sheet__attack-edit"
                  value={attack.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  aria-label="name"
                />
                <AutoGrowTextarea
                  className="character-sheet__attack-edit"
                  value={attack.description}
                  onChange={(value) => update(i, { description: value })}
                  minRows={3}
                />
                <div className="character-sheet__attack-edit-row">
                  <input
                    type="number"
                    placeholder="+0"
                    value={attack.attackBonus ?? ''}
                    onChange={(e) =>
                      update(i, {
                        attackBonus: e.target.value === '' ? undefined : parseInt(e.target.value),
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="2d8 piercing"
                    value={attack.damage ?? ''}
                    onChange={(e) =>
                      update(i, { damage: e.target.value || undefined })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="character-sheet__list-remove"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${attack.name}`}
                >
                  ×
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="character-sheet__list-add">
        <input
          value={draftEntry}
          onChange={(e) => setDraftEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addBlank();
            }
          }}
          placeholder="+"
          aria-label={`Add to ${label}`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de recorte de imagen
// ---------------------------------------------------------------------------
//
// Presenta la imagen subida en un viewport cuadrado. El usuario puede:
//   · Arrastrar la imagen para reposicionarla.
//   · Hacer scroll / +/- para hacer zoom.
// Al confirmar se exporta la región visible como PNG (data URL) y se
// guarda como `image` del personaje.

interface ImageCropModalProps {
  src: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

// Display size of the crop viewport. Adapts to narrow screens so the modal
// stays inside the viewport (320px phones cannot fit a fixed 320px square
// plus the panel chrome). The output PNG always exports at the larger
// `EXPORT_SIZE` for quality regardless of how small the on-screen square is.
const EXPORT_SIZE = 320;

function pickCropSize(): number {
  if (typeof window === 'undefined') return EXPORT_SIZE;
  // Reserve ~3rem for the panel padding + border so the square never
  // touches the modal edges.
  return Math.min(EXPORT_SIZE, Math.max(180, window.innerWidth - 64));
}

function ImageCropModal({ src, onCancel, onConfirm }: ImageCropModalProps) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement>(null);
  // The crop viewport is sized once on mount based on the available viewport
  // so a 320px phone gets ~256px, while a desktop still gets the full 320px.
  const [cropSize] = useState<number>(() => pickCropSize());

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  // Cuando cargamos la imagen calculamos el zoom mínimo (cover).
  const handleImgLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setNaturalSize({ w, h });
    const minScale = cropSize / Math.min(w, h);
    setScale(minScale);
    setOffset({
      x: (cropSize - w * minScale) / 2,
      y: (cropSize - h * minScale) / 2,
    });
  };

  const minScale = naturalSize
    ? cropSize / Math.min(naturalSize.w, naturalSize.h)
    : 0.1;
  const maxScale = minScale * 6;

  const clampOffset = (x: number, y: number, s: number) => {
    if (!naturalSize) return { x, y };
    const w = naturalSize.w * s;
    const h = naturalSize.h * s;
    const minX = cropSize - w;
    const minY = cropSize - h;
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = {
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const nextX = drag.startOffsetX + (event.clientX - drag.startPointerX);
    const nextY = drag.startOffsetY + (event.clientY - drag.startPointerY);
    setOffset(clampOffset(nextX, nextY, scale));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!naturalSize) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    applyZoomAt(scale * factor, cropSize / 2, cropSize / 2);
  };

  const applyZoomAt = (nextScale: number, anchorX: number, anchorY: number) => {
    const clamped = Math.max(minScale, Math.min(maxScale, nextScale));
    if (clamped === scale) return;
    // Mantén el punto bajo `anchor` estable cambiando el offset.
    const ratio = clamped / scale;
    const nextX = anchorX - (anchorX - offset.x) * ratio;
    const nextY = anchorY - (anchorY - offset.y) * ratio;
    setScale(clamped);
    setOffset(clampOffset(nextX, nextY, clamped));
  };

  const handleConfirm = () => {
    if (!naturalSize) return;
    const canvas = document.createElement('canvas');
    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = imgRef.current;
    if (!img) return;
    ctx.drawImage(
      img,
      0,
      0,
      naturalSize.w,
      naturalSize.h,
      offset.x,
      offset.y,
      naturalSize.w * scale,
      naturalSize.h * scale
    );
    onConfirm(canvas.toDataURL('image/png'));
  };

  return (
    <div
      className="image-crop-modal"
      role="dialog"
      aria-label={t('characterSheet.cropTitle')}
      onClick={onCancel}
    >
      <div
        className="image-crop-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="image-crop-modal__title">{t('characterSheet.cropTitle')}</h2>
        <p className="image-crop-modal__hint">{t('characterSheet.cropHint')}</p>

        <div
          className="image-crop-modal__viewport"
          style={{ width: cropSize, height: cropSize }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={handleImgLoad}
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              userSelect: 'none',
              pointerEvents: 'none',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          />
        </div>

        <div className="image-crop-modal__zoom">
          <span>{t('characterSheet.cropZoom')}</span>
          <input
            type="range"
            min={minScale}
            max={maxScale}
            step={(maxScale - minScale) / 100 || 0.01}
            value={scale}
            onChange={(e) =>
              applyZoomAt(parseFloat(e.target.value), cropSize / 2, cropSize / 2)
            }
            aria-label={t('characterSheet.cropZoom')}
          />
        </div>

        <div className="image-crop-modal__actions">
          <button
            type="button"
            className="image-crop-modal__cancel"
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="image-crop-modal__confirm"
            onClick={handleConfirm}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Textarea que ajusta su altura al contenido en cada cambio. Lo usamos en
 * la descripción de los ataques para que un ataque con muchas líneas
 * (típico en monstruos del SRD) se vea entero sin recortes.
 */
interface AutoGrowTextareaProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  minRows?: number;
  ariaLabel?: string;
}

function AutoGrowTextarea({
  value,
  onChange,
  className,
  minRows = 2,
  ariaLabel,
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      rows={minRows}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      onInput={(e) => {
        const t = e.currentTarget;
        t.style.height = 'auto';
        t.style.height = `${t.scrollHeight}px`;
      }}
    />
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
