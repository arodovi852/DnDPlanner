import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { useUsers } from '../../../context/UsersContext';

export interface FollowButtonProps {
  userId: string;
  className?: string;
}

/**
 * Toggle "Seguir / Dejar de seguir" al usuario indicado.
 * Se desactiva si el usuario no está autenticado o si intenta seguirse
 * a sí mismo.
 */
export function FollowButton({ userId, className }: FollowButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isFollowing, followUser, unfollowUser } = useUsers();

  if (!user || user.id === userId) return null;

  const following = isFollowing(userId);

  return (
    <button
      type="button"
      className={
        'follow-button' +
        (following ? ' follow-button--following' : '') +
        (className ? ` ${className}` : '')
      }
      onClick={() => (following ? unfollowUser(userId) : followUser(userId))}
      aria-pressed={following}
    >
      {following ? t('social.unfollow') : t('social.follow')}
    </button>
  );
}

export default FollowButton;
