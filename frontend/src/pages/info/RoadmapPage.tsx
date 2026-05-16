import { InfoPage } from '../InfoPage';
import { usePageTitle } from '../../hooks/usePageTitle';

export function RoadmapPage() {
  usePageTitle('Roadmap');
  return <InfoPage i18nKey="roadmap" />;
}

export default RoadmapPage;
