import { InfoPage } from '../InfoPage';
import { usePageTitle } from '../../hooks/usePageTitle';

export function NewsPage() {
  usePageTitle('Novedades');
  return <InfoPage i18nKey="news" />;
}

export default NewsPage;
