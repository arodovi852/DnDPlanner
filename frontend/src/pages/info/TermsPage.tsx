import { InfoPage } from '../InfoPage';
import { usePageTitle } from '../../hooks/usePageTitle';

export function TermsPage() {
  usePageTitle('Términos');
  return <InfoPage i18nKey="terms" />;
}

export default TermsPage;
