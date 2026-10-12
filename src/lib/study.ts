import { openAffixes, openRoots } from './open-roots';

export type ModuleKind = 'recognize' | 'recall' | 'listen' | 'spell' | 'example' | 'retry' | 'branch' | 'morphology';
export type FlowModule = { id: string; kind: ModuleKind; title: string; subtitle: string; color: string; enabled: boolean; seconds: number };
export type Deck = { id: string; name: string; root: string; color: string };
export type WordEntry = { id: string; term: string; phonetic: string; meaning: string; example: string; root: string; deckId: string; stage: number; dueAt: number; lapses: number; createdAt: number };
export type StudyRecord = { id: string; wordId: string; moduleKind: ModuleKind; known: boolean; at: number };

export const STORAGE_KEY = 'wordflow-v2';
export const getNow = () => Date.now();
export const palette = { ink: '#17243A', muted: '#718096', line: '#E8EDF3', canvas: '#F6F8FB', blue: '#4361EE', green: '#169B72', white: '#FFFFFF' };

export const initialDecks: Deck[] = [
  { id: 'ielts-academic', name: '雅思学术核心', root: 'NAWL', color: '#DDEBFF' },
  { id: 'morphemes', name: '开源词根词缀', root: '构词法', color: '#E5E0FF' },
  { id: 'personal', name: '我的摘词', root: '', color: '#FFE6C7' },
];

const openCoreWords: [string, string, string][] = [
  ['accumulation','积累；积聚','The accumulation of evidence changed the researchers’ view.'],
  ['aggregate','总计；集合体；聚合的','The aggregate results showed a steady increase.'],
  ['allocate','分配；拨给','The council allocated more funds to public transport.'],
  ['approximate','近似的；大约的','The approximate cost was listed in the report.'],
  ['arbitrary','任意的；武断的','The boundary was not chosen arbitrarily.'],
  ['aspect','方面；层面','The study examines one aspect of urban growth.'],
  ['authority','权威；当局；授权','Local authorities introduced new safety rules.'],
  ['clarify','澄清；阐明','The second interview helped clarify the results.'],
  ['coherent','连贯的；一致的','The report presents a coherent argument.'],
  ['compensate','补偿；弥补','The payment compensates workers for additional costs.'],
  ['conceive','构想；设想；怀孕','The project was conceived as a long-term study.'],
  ['confine','限制；局限','The analysis is confined to adult participants.'],
  ['consent','同意；许可','Participants gave consent before the interview.'],
  ['constrain','限制；约束','A shortage of time constrained the research.'],
  ['contradict','反驳；与……矛盾','The new evidence appears to contradict the earlier claim.'],
  ['contrary','相反的；相反情况','Contrary to expectations, the number continued to rise.'],
  ['coordinate','协调；使配合','Several agencies coordinate their efforts.'],
  ['definite','明确的；确定的','The report found no definite link between the two factors.'],
  ['denote','表示；指示','In this chart, the blue line denotes annual demand.'],
  ['discrete','分离的；各不相同的','The data were divided into three discrete groups.'],
  ['diverse','多样的；不同的','The region has a diverse population.'],
  ['duration','持续时间；期间','The average duration of the course is six months.'],
  ['empirical','以观察或实验为依据的','The theory is supported by empirical evidence.'],
  ['entity','实体；独立存在','The two organisations operate as a single entity.'],
  ['evident','明显的；显而易见的','A clear difference was evident in the final results.'],
  ['explicit','明确的；直截了当的','The instructions provide explicit guidance.'],
  ['exploit','利用；开发；剥削','The study explores how communities exploit local resources.'],
  ['facilitate','促进；使便利','Digital tools can facilitate communication.'],
  ['finite','有限的','The project was completed with finite resources.'],
  ['hierarchy','等级制度；层次结构','The organisation has a clear management hierarchy.'],
  ['ideology','意识形态；思想体系','The policy reflects a particular economic ideology.'],
  ['impact','影响；冲击','The policy had a measurable impact on employment.'],
  ['implicit','含蓄的；不明言的','The argument relies on an implicit assumption.'],
  ['incidence','发生率；影响范围','The incidence of the disease fell over time.'],
  ['incline','倾向；斜坡','Participants may incline towards the safer option.'],
  ['induce','引起；诱导','The treatment may induce a temporary response.'],
  ['inhibit','抑制；阻止','High costs can inhibit access to education.'],
  ['initiate','开始；发起','The university initiated a new research programme.'],
  ['insert','插入；嵌入','The author inserted a short explanation into the text.'],
  ['integral','不可或缺的；整体的','Public transport is an integral part of city planning.'],
  ['interact','相互作用；交流','Children interact with their environment in different ways.'],
  ['interval','间隔；间歇','Measurements were taken at regular intervals.'],
  ['intervene','干预；介入','The government intervened to stabilise prices.'],
  ['manipulate','操纵；操作；巧妙处理','Researchers must not manipulate the data.'],
  ['manual','手工的；手册','The device can be operated manually.'],
  ['maximize','使最大化','The design aims to maximize energy efficiency.'],
  ['media','媒体；媒介','Social media can influence public opinion.'],
  ['mediate','调解；促成','The organisation helped mediate the dispute.'],
  ['migrate','迁移；移居','Many families migrate to cities for work.'],
  ['minimize','使最小化；尽量减少','The new system minimizes the risk of error.'],
  ['motive','动机；目的','The research examines the motives behind this choice.'],
  ['neutral','中立的；中性的','The interviewer tried to remain neutral.'],
  ['obtain','获得；取得','Researchers obtained permission to use the records.'],
  ['orient','使适应；确定方向','The course is oriented towards practical skills.'],
  ['overlap','重叠；部分相同','The two categories overlap in several areas.'],
  ['parameter','参数；界限','The model uses age and income as key parameters.'],
  ['preliminary','初步的；预备的','Preliminary findings suggest a different explanation.'],
  ['presume','推测；假定','The authors presume that the sample is representative.'],
  ['protocol','规程；议定书','All participants followed the same research protocol.'],
  ['qualitative','定性的','The project combines qualitative and quantitative methods.'],
  ['reinforce','加强；巩固','The findings reinforce the need for further research.'],
  ['tense','紧张的；时态','The political situation remained tense.'],
  ['thesis','论文；论点','Her thesis focuses on language and identity.'],
  ['ultimate','最终的；根本的','The ultimate goal is to reduce waste.'],
  ['valid','有效的；有根据的','The researchers used a valid method of measurement.'],
  ['widespread','广泛的；普遍的','The change received widespread public support.'],
];

const now = Date.now();
export const initialWords: WordEntry[] = [
  ...openCoreWords.map(([term, meaning, example], index) => ({ id: `nawl-${index}`, term, phonetic: '', meaning, example, root: '', deckId: 'ielts-academic', stage: 0, dueAt: 0, lapses: 0, createdAt: now })),
  ...openRoots.map((item, index) => ({ id: `morph-${index}`, term: item.root, phonetic: '', meaning: item.meaning, example: item.examples.join(', '), root: item.kind, deckId: 'morphemes', stage: 0, dueAt: 0, lapses: 0, createdAt: now })),
  ...openAffixes.map((item, index) => ({ id: `affix-${index}`, term: item.root, phonetic: '', meaning: item.meaning, example: item.examples.join(', '), root: item.kind, deckId: 'morphemes', stage: 0, dueAt: 0, lapses: 0, createdAt: now })),
];

export const initialModules: FlowModule[] = [
  { id: 'm1', kind: 'recognize', title: '看词回忆', subtitle: '先看英文单词，尝试回忆含义', color: '#DDEBFF', enabled: true, seconds: 8 },
  { id: 'm2', kind: 'recall', title: '自测释义', subtitle: '主动回忆后自我评分', color: '#E5E0FF', enabled: true, seconds: 12 },
  { id: 'm3', kind: 'branch', title: '判断掌握程度', subtitle: '答错进入强化；答对继续学习', color: '#FFE6C7', enabled: true, seconds: 0 },
  { id: 'm4', kind: 'retry', title: '错词重练', subtitle: '对不熟悉的词再回忆一次', color: '#FFDCD3', enabled: true, seconds: 10 },
  { id: 'm5', kind: 'listen', title: '听发音', subtitle: '播放单词发音，熟悉读音', color: '#D9F3E8', enabled: true, seconds: 6 },
  { id: 'm6', kind: 'example', title: '例句填空', subtitle: '在语境中巩固单词用法', color: '#FFE0E8', enabled: false, seconds: 15 },
];

export const moduleCatalog: Omit<FlowModule, 'id' | 'enabled'>[] = initialModules.map(({ id: _id, enabled: _enabled, ...item }) => item).concat([
  { kind: 'spell', title: '拼写练习', subtitle: '根据释义拼写单词', color: '#FFF0C7', seconds: 18 },
  { kind: 'morphology', title: '词根拆词记忆', subtitle: '由一组例词归纳词根含义和构词规律', color: '#E5E0FF', seconds: 15 },
]);

export function parseCsv(input: string): { rows: (Omit<WordEntry, 'id' | 'stage' | 'dueAt' | 'lapses' | 'createdAt' | 'deckId'> & { deckName: string })[]; errors: string[] } {
  const lines: string[][] = [];
  let row: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"' && quoted && input[i + 1] === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field.trim()); field = '';
      if (row.some(Boolean)) lines.push(row);
      row = [];
    } else field += char;
  }
  row.push(field.trim()); if (row.some(Boolean)) lines.push(row);
  if (lines.length < 2) return { rows: [], errors: ['CSV至少需要一行表头和一行单词数据。'] };
  const headers = lines[0].map((h) => h.toLowerCase().replace(/[\s_-]/g, ''));
  const index = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const termIndex = index(['word', 'term', '单词', '英文']); const meaningIndex = index(['meaning', 'definition', '释义', '中文']);
  if (termIndex < 0 || meaningIndex < 0) return { rows: [], errors: ['表头必须包含 word/单词 和 meaning/释义 两列。'] };
  const get = (values: string[], names: string[]) => { const i = index(names); return i < 0 ? '' : (values[i] ?? '').trim(); };
  const rows = lines.slice(1).flatMap((values, lineIndex) => {
    const term = (values[termIndex] ?? '').trim(); const meaning = (values[meaningIndex] ?? '').trim();
    if (!term || !meaning) return [];
    const root = get(values, ['root', 'affix', '词根', '词缀']);
    return [{ term, meaning, root, phonetic: get(values, ['phonetic', '音标']), example: get(values, ['example', '例句']), deckName: get(values, ['deck', 'category', '词库', '分类']) || root || '我的摘词' }];
  });
  return { rows, errors: rows.length ? [] : ['没有找到同时包含单词和释义的数据行。'] };
}

export function scheduleReview(word: WordEntry, known: boolean, at = Date.now()): WordEntry {
  const stage = known ? Math.min(word.stage + 1, 6) : 0;
  const days = known ? [1, 2, 4, 7, 14, 30][stage - 1] : 0;
  const delay = known ? days * 24 * 60 * 60 * 1000 : 10 * 60 * 1000;
  return { ...word, stage, dueAt: at + delay, lapses: word.lapses + (known ? 0 : 1) };
}
