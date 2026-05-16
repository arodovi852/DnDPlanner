import { InfoPage } from '../InfoPage';
import { usePageTitle } from '../../hooks/usePageTitle';

export function AboutPage() {
  usePageTitle('Acerca de');
  return <InfoPage i18nKey="about" />;
}

export default AboutPage;
