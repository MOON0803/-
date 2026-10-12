import { parseScn, type SceneDef } from '../../systems/scene';
import { templateScenes } from '../sceneTemplates';

const files = import.meta.glob('./*.scn', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
// 성인 씬 본문은 adult/ 폴더에 두고 성인 빌드에서만 번들에 넣는다 (GDD §6.4)
const adultFiles = (
  import.meta.env.VITE_ADULT === 'true'
    ? import.meta.glob('./adult/*.scn', { query: '?raw', import: 'default', eager: true })
    : {}
) as Record<string, string>;

function build(): Record<string, SceneDef> {
  const out: Record<string, SceneDef> = {};
  for (const sc of parseScn(templateScenes())) out[sc.id] = sc;
  // 직접 쓴 .scn 이 템플릿보다 우선
  for (const src of [...Object.values(files), ...Object.values(adultFiles)]) for (const sc of parseScn(src)) out[sc.id] = sc;
  return out;
}

export const SCENES: Record<string, SceneDef> = build();

export function getScene(id: string): SceneDef {
  return (
    SCENES[id] ?? {
      id,
      rating: 'all',
      body: [{ t: 'say', who: null, text: `[미작성 씬: ${id}]`, line: 0 }],
    }
  );
}
