import type { ReactNode } from 'react';

/**
 * Props del componente TranslucidTextBox.
 */
export interface TranslucidTextBoxProps {
  /** Contenido que se renderiza siempre con opacidad 100%. */
  children: ReactNode;
  /** Clase extra para casos donde se necesite una variante (`--dark`,
   *  `--tall`…). */
  className?: string;
}

/**
 * Recuadro translúcido cuyo fondo se vuelve opaco en hover.
 * El texto permanece al 100% de opacidad para garantizar contraste
 * y cumplir con WCAG 2.1 AA.
 */
export function TranslucidTextBox({ children, className }: TranslucidTextBoxProps) {
  const classes = ['translucid-text-box'];
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')} tabIndex={0}>
      <span className="translucid-text-box__content">{children}</span>
    </div>
  );
}

export default TranslucidTextBox;
