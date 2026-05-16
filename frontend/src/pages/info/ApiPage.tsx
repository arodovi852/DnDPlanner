import { InfoPage } from '../InfoPage';
import { usePageTitle } from '../../hooks/usePageTitle';

export function ApiPage() {
  usePageTitle('API');
  return <InfoPage i18nKey="api" />;
}

export default ApiPage;
