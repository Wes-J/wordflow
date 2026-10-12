export type ModuleKind = 'recognize' | 'recall' | 'listen' | 'spell' | 'example' | 'retry' | 'branch';
export type FlowModule = { id: string; kind: ModuleKind; title: string; subtitle: string; color: string; enabled: boolean; seconds: number };
export type Deck = { id: string; name: string; root: string; color: string };
export type WordEntry = { id: string; term: string; phonetic: string; meaning: string; example: string; root: string; deckId: string; stage: number; dueAt: number; lapses: number; createdAt: number };
export type StudyRecord = { id: string; wordId: string; moduleKind: ModuleKind; known: boolean; at: number };

export const STORAGE_KEY = 'wordflow-v2';
export const getNow = () => Date.now();
export const palette = { ink: '#17243A', muted: '#718096', line: '#E8EDF3', canvas: '#F6F8FB', blue: '#4361EE', green: '#169B72', white: '#FFFFFF' };

export const initialDecks: Deck[] = [
  { id: 'tion', name: '-tion 名词', root: '-tion', color: '#E5E0FF' },
  { id: 'able', name: '-able 形容词', root: '-able', color: '#D9F3E8' },
  { id: 'pre', name: 'pre- 前缀', root: 'pre-', color: '#DDEBFF' },
  { id: 'personal', name: '我的摘词', root: '', color: '#FFE6C7' },
];

const now = Date.now();
export const initialWords: WordEntry[] = [
  { id: 'w1', term: 'action', phonetic: '/ˈækʃn/', meaning: '行动；行为', example: 'We need to take action now.', root: '-tion', deckId: 'tion', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
  { id: 'w2', term: 'creation', phonetic: '/kriˈeɪʃn/', meaning: '创造；作品', example: 'The creation of the garden took months.', root: '-tion', deckId: 'tion', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
  { id: 'w3', term: 'selection', phonetic: '/sɪˈlekʃn/', meaning: '选择；精选品', example: 'The shop has a wide selection of books.', root: '-tion', deckId: 'tion', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
  { id: 'w4', term: 'education', phonetic: '/ˌedʒuˈkeɪʃn/', meaning: '教育；培养', example: 'Education opens many doors.', root: '-tion', deckId: 'tion', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
  { id: 'w5', term: 'adaptable', phonetic: '/əˈdæptəbl/', meaning: '能适应的；适应性强的', example: 'An adaptable team can handle change.', root: '-able', deckId: 'able', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
  { id: 'w6', term: 'readable', phonetic: '/ˈriːdəbl/', meaning: '易读的；清晰易懂的', example: 'The report is clear and readable.', root: '-able', deckId: 'able', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
  { id: 'w7', term: 'preview', phonetic: '/ˈpriːvjuː/', meaning: '预览；预告', example: 'You can preview the lesson first.', root: 'pre-', deckId: 'pre', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
  { id: 'w8', term: 'predict', phonetic: '/prɪˈdɪkt/', meaning: '预测；预言', example: 'It is difficult to predict the result.', root: 'pre-', deckId: 'pre', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
  { id: 'w9', term: 'resilient', phonetic: '/rɪˈzɪliənt/', meaning: '有韧性的；能迅速恢复的', example: 'She remained resilient through every challenge.', root: '', deckId: 'personal', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
  { id: 'w10', term: 'curious', phonetic: '/ˈkjʊriəs/', meaning: '好奇的；求知欲强的', example: 'A curious mind keeps asking why.', root: '', deckId: 'personal', stage: 0, dueAt: 0, lapses: 0, createdAt: now },
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
