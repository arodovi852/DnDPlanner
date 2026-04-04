import type { ReactNode } from 'react';

/**
 * Props del componente TextBox.
 */
export interface TextBoxProps {
  /** Contenido de texto o nodos hijos. */
  children: ReactNode;
  /** Variante visual: "dark" (rosa-marrón) o "light" (rosa claro). */
  variant?: 'dark' | 'light';
}

/**
 * Recuadro opaco con texto. Al hacer hover el fondo se aclara.
 */
export function TextBox({ children, variant = 'dark' }: TextBoxProps) {
  const className = variant === 'light' ? 'text-box text-box--light' : 'text-box';
  return <div className={className}>{children}</div>;
}

export default TextBox;
