import type { ButtonHTMLAttributes } from 'react';

/**
 * Props del componente Button.
 *
 * Acepta todas las propiedades nativas de `<button>`. La variante
 * visual se controla con `size`.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tamaño del botón: "default" (grande) o "small" (usado en el header). */
  size?: 'default' | 'small';
}

/**
 * Botón principal con degradado rosa → oscuro.
 * En hover/focus se aclara el degradado.
 */
export function Button({
  size = 'default',
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = ['button'];
  if (size === 'small') classes.push('button--small');
  if (className) classes.push(className);

  return (
    <button type={type} className={classes.join(' ')} {...rest}>
      {children}
    </button>
  );
}

export default Button;
