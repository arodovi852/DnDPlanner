import { InfoPage } from '../InfoPage';
import { usePageTitle } from '../../hooks/usePageTitle';

export function PrivacyPage() {
  usePageTitle('Privacidad');
  return <InfoPage i18nKey="privacy" />;
}

export default PrivacyPage;
