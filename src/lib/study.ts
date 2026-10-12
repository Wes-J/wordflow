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
  { id: 'ielts-academic', name: '雅思学术核心', root: 'NAWL', color: '#DDEBFF' },
  { id: 'morphemes', name: '高频词根词缀', root: '构词法', color: '#E5E0FF' },
];

const openCoreWords: [string, string, string, string, string][] = [
  ['nawl-access','access','使用；接触；通道','Students need access to reliable information.','ac-/cess'],
  ['nawl-accurate','accurate','准确的；精确的','Accurate data is essential for the study.','-ate'],
  ['nawl-achieve','achieve','实现；达到；取得','The policy aims to achieve better outcomes.',''],
  ['nawl-adapt','adapt','适应；改编','Plants adapt to changes in their environment.',''],
  ['nawl-adequate','adequate','足够的；适当的','The sample size was adequate for comparison.',''],
  ['nawl-affect','affect','影响；使改变','Several factors can affect learning outcomes.',''],
  ['nawl-alternative','alternative','可替代的选择；替代方案','Researchers considered an alternative explanation.','alter'],
  ['nawl-analysis','analysis','分析；解析','The analysis reveals a clear pattern.','ana-/lysis'],
  ['nawl-approach','approach','方法；途径；接近','A different approach may solve the problem.',''],
  ['nawl-appropriate','appropriate','合适的；恰当的','Choose an appropriate method for collecting data.',''],
  ['nawl-assess','assess','评估；评价','The study assesses the impact of public transport.',''],
  ['nawl-assume','assume','假定；承担','We should not assume that the results apply to everyone.',''],
  ['nawl-benefit','benefit','益处；使受益','Regular feedback can benefit both teachers and students.','bene-/fit'],
  ['nawl-capacity','capacity','能力；容量；职位','The course develops students’ capacity for independent research.','cap'],
  ['nawl-challenge','challenge','挑战；质疑','Limited funding remains a major challenge.',''],
  ['nawl-conclude','conclude','得出结论；结束','The authors conclude that further research is needed.','con-/clude'],
  ['nawl-consequence','consequence','结果；后果','One consequence of urban growth is increased traffic.','con-/sequ'],
  ['nawl-consistent','consistent','一致的；持续的','The results are consistent with earlier studies.','con-/sist'],
  ['nawl-constitute','constitute','构成；组成；设立','These three elements constitute the main framework.','con-/stitut'],
  ['nawl-context','context','背景；语境','The word has a different meaning in this context.','con-/text'],
  ['nawl-contribute','contribute','贡献；促成；投稿','Many factors contribute to the rise in costs.','con-/tribut'],
  ['nawl-create','create','创造；创建','The project created new opportunities for local businesses.','cre'],
  ['nawl-define','define','定义；界定','The report defines poverty in economic terms.','de-/fin'],
  ['nawl-derive','derive','获得；源自','The name derives from an ancient language.','de-/riv'],
  ['nawl-distribute','distribute','分发；分布','The questionnaire was distributed to all participants.','dis-/tribut'],
  ['nawl-economic','economic','经济的；经济学的','Economic growth can improve access to education.','eco-/nom'],
  ['nawl-environment','environment','环境；周围状况','A healthy environment supports children’s development.','en-/viron'],
  ['nawl-establish','establish','建立；证实','The research establishes a link between sleep and memory.',''],
  ['nawl-estimate','estimate','估计；估算','Experts estimate that demand will continue to rise.',''],
  ['nawl-evidence','evidence','证据；迹象','There is strong evidence for the proposed explanation.','e-/vid'],
  ['nawl-factor','factor','因素；要素','Age is an important factor in the analysis.','fact'],
  ['nawl-function','function','功能；起作用','The report explains how the system functions.','func'],
  ['nawl-identify','identify','识别；确定；认出','The survey identifies several barriers to employment.','ident'],
  ['nawl-indicate','indicate','表明；指出；象征','The results indicate a gradual change in behaviour.','-ate'],
  ['nawl-individual','individual','个人；个别的','Each individual completed the task independently.','in-/divid'],
  ['nawl-interpret','interpret','解释；诠释；口译','The findings must be interpreted with caution.','inter-/pret'],
  ['nawl-issue','issue','问题；议题；发布','Air pollution is a serious public health issue.',''],
  ['nawl-method','method','方法；办法','The researchers used a new method to measure change.',''],
  ['nawl-occur','occur','发生；出现','Similar problems occur in many large cities.','oc-/curr'],
  ['nawl-process','process','过程；处理','Learning is a gradual process.','pro-/cess'],
  ['nawl-require','require','需要；要求','The position requires strong communication skills.','re-/quire'],
  ['nawl-research','research','研究；调查','More research is needed to confirm the results.','re-/search'],
  ['nawl-significant','significant','显著的；重要的','The study found a significant difference between the groups.','sign'],
  ['nawl-source','source','来源；根源','The article cites several reliable sources.',''],
  ['nawl-structure','structure','结构；构造','The essay has a clear and logical structure.','struct'],
  ['nawl-theory','theory','理论；学说','The evidence supports the theory of gradual change.','theor'],
  ['nawl-vary','vary','变化；不同','Results may vary between regions.','vari'],
  ['nawl-available','available','可获得的；有空的','Affordable housing is not available to everyone.','-able'],
  ['nawl-complex','complex','复杂的；综合建筑群','The causes of migration are complex.','plex'],
  ['nawl-contrast','contrast','对比；形成对照','The contrast between the two approaches is clear.','contra-'],
  ['nawl-develop','develop','发展；开发；形成','The city developed rapidly during the twentieth century.','de-/velop'],
  ['nawl-effect','effect','影响；效果','The new rule had little effect on attendance.',''],
  ['nawl-essential','essential','必不可少的；本质的','Clean water is essential for public health.','-ial'],
  ['nawl-evaluate','evaluate','评估；评价','The programme will be evaluated next year.','e-/valu'],
  ['nawl-impact','impact','影响；冲击','Tourism has a significant impact on the local economy.','im-/pact'],
  ['nawl-include','include','包括；包含','The final cost includes transport and accommodation.','in-/clude'],
  ['nawl-maintain','maintain','维持；保养；主张','It is difficult to maintain a healthy work-life balance.','main/ten'],
  ['nawl-policy','policy','政策；方针','The government introduced a new education policy.','pol'],
  ['nawl-principle','principle','原则；原理','The design follows the principle of energy efficiency.','prin-/cip'],
  ['nawl-range','range','范围；一系列；变化','The study covers a wide range of topics.',''],
  ['nawl-relevant','relevant','相关的；切题的','Please provide relevant information in your application.','re-'],
  ['nawl-respond','respond','回应；作出反应','Local residents responded positively to the proposal.','re-/spond'],
  ['nawl-select','select','选择；挑选','Participants were selected at random.','-lect'],
  ['nawl-strategy','strategy','策略；行动计划','The strategy focuses on reducing waste.','strat'],
  ['nawl-transfer','transfer','转移；调动；换乘','The technology can transfer data securely.','trans-/fer'],
  ['nawl-valid','valid','有效的；有根据的','The researchers used a valid method of measurement.','-id'],
];

const morphemeWords: [string, string, string, string, string][] = [
  ['morph-anti','anti-','反对；抗；防止','antibiotic（抗生素）, anti-social（反社会的）','前缀'],
  ['morph-auto','auto-','自己；自动','autonomous（自治的）, automatic（自动的）','前缀'],
  ['morph-bio','bio-','生命；生物','biology（生物学）, biodiversity（生物多样性）','词根'],
  ['morph-co','co-','共同；一起','cooperate（合作）, coordinate（协调）','前缀'],
  ['morph-con','con-','共同；一起','contribute（贡献）, construct（建造）','前缀'],
  ['morph-counter','counter-','反向；相反','counteract（抵消）, counterproductive（适得其反的）','前缀'],
  ['morph-de','de-','去除；向下；反转','decline（下降）, derive（引出）','前缀'],
  ['morph-dis','dis-','分开；否定','distribute（分配）, disagree（不同意）','前缀'],
  ['morph-en','en-','使成为；置于','enable（使能够）, enforce（实施）','前缀'],
  ['morph-equi','equi-','相等；相同','equivalent（等价的）, equilibrium（平衡）','词根'],
  ['morph-ex','ex-','向外；前任','exclude（排除）, expand（扩展）','前缀'],
  ['morph-fore','fore-','在前；预先','forecast（预测）, foreword（前言）','前缀'],
  ['morph-hyper','hyper-','过度；在上方','hypothesis（假设）, hyperactive（过度活跃的）','前缀'],
  ['morph-in','in-','进入；不；向内','include（包括）, inaccurate（不准确的）','前缀'],
  ['morph-inter','inter-','在……之间；相互','interact（互动）, international（国际的）','前缀'],
  ['morph-micro','micro-','微小；微观','microorganism（微生物）, microscope（显微镜）','前缀'],
  ['morph-mis','mis-','错误；不当','misinterpret（误解）, mislead（误导）','前缀'],
  ['morph-multi','multi-','许多；多个','multicultural（多元文化的）, multiple（多个的）','前缀'],
  ['morph-non','non-','非；不','non-profit（非营利的）, non-verbal（非语言的）','前缀'],
  ['morph-over','over-','过度；在上方','overall（总体的）, overcome（克服）','前缀'],
  ['morph-post','post-','之后；后置','post-war（战后的）, postgraduate（研究生）','前缀'],
  ['morph-pre','pre-','在前；预先','predict（预测）, preliminary（初步的）','前缀'],
  ['morph-re','re-','再次；回到','research（研究）, recover（恢复）','前缀'],
  ['morph-sub','sub-','在下；次级','subsequent（随后的）, submarine（潜水艇）','前缀'],
  ['morph-super','super-','在上；超越','superior（更优的）, supervise（监督）','前缀'],
  ['morph-trans','trans-','穿过；转变','transfer（转移）, transform（改变）','前缀'],
  ['morph-un','un-','不；相反；去除','unusual（不寻常的）, uncover（揭开）','前缀'],
  ['morph-under','under-','在下；不足','underlie（构成基础）, underestimate（低估）','前缀'],
  ['morph-ology','-ology','学科；研究','biology（生物学）, psychology（心理学）','后缀'],
  ['morph-tion','-tion','动作；过程；结果','education（教育）, distribution（分配）','后缀'],
  ['morph-sion','-sion','动作；状态；结果','decision（决定）, expansion（扩张）','后缀'],
  ['morph-ment','-ment','行为；过程；结果','development（发展）, environment（环境）','后缀'],
  ['morph-ity','-ity','性质；状态','capacity（能力）, identity（身份）','后缀'],
  ['morph-ness','-ness','状态；性质','awareness（意识）, effectiveness（有效性）','后缀'],
  ['morph-ance','-ance','状态；行为；结果','importance（重要性）, performance（表现）','后缀'],
  ['morph-ence','-ence','状态；行为；结果','evidence（证据）, difference（差异）','后缀'],
  ['morph-ive','-ive','具有……性质的','effective（有效的）, informative（信息丰富的）','后缀'],
  ['morph-ous','-ous','具有……性质的；充满……的','various（各种各样的）, continuous（连续的）','后缀'],
  ['morph-ful','-ful','充满；具有','useful（有用的）, successful（成功的）','后缀'],
  ['morph-less','-less','缺少；没有','countless（无数的）, harmless（无害的）','后缀'],
  ['morph-able','-able','能够……的；可……的','available（可获得的）, reliable（可靠的）','后缀'],
  ['morph-ible','-ible','能够……的；可……的','accessible（可进入的）, flexible（灵活的）','后缀'],
  ['morph-ize','-ize','使成为；使……化','modernize（现代化）, specialize（专门化）','后缀'],
  ['morph-ise','-ise','使成为；使……化','organise（组织）, recognise（识别）','后缀'],
  ['morph-ify','-ify','使成为；使……化','identify（识别）, simplify（简化）','后缀'],
  ['morph-ate','-ate','使成为；具有……功能','generate（产生）, indicate（表明）','后缀'],
  ['morph-al','-al','与……有关的','cultural（文化的）, environmental（环境的）','后缀'],
  ['morph-ic','-ic','与……有关的；具有……特征的','economic（经济的）, scientific（科学的）','后缀'],
  ['morph-ly','-ly','以……方式；具有……特征','rapidly（迅速地）, usually（通常地）','后缀'],
  ['morph-graph','graph','写；记录；图示','paragraph（段落）, photograph（照片）','词根'],
  ['morph-ject','ject','投；抛','project（项目；投射）, reject（拒绝）','词根'],
  ['morph-tract','tract','拉；引','attract（吸引）, contract（收缩；合同）','词根'],
  ['morph-struct','struct','建造；构成','structure（结构）, construct（建造）','词根'],
  ['morph-duc','duc','引导；带领','produce（生产）, conduct（实施）','词根'],
  ['morph-ducere','duce','引导；带来','reduce（减少）, introduce（介绍；引入）','词根'],
  ['morph-spect','spect','看；观察','inspect（检查）, perspective（视角）','词根'],
  ['morph-vid','vid','看；观察','evident（明显的）, provide（提供）','词根'],
  ['morph-port','port','携带；运送','transport（运输）, support（支持）','词根'],
  ['morph-cred','cred','相信；信任','credible（可信的）, credit（信用）','词根'],
  ['morph-form','form','形状；形成','transform（转变）, formula（公式）','词根'],
  ['morph-ducat','duct','引导；带领','conduct（实施）, product（产品）','词根'],
  ['morph-vari','vari','变化；不同','vary（变化）, variable（变量；易变的）','词根'],
  ['morph-structural','structural','构造；组织','structure（结构）, infrastructure（基础设施）','词根'],
  ['morph-chron','chron','时间','chronic（长期的）, chronology（年表）','词根'],
  ['morph-geo','geo','地球；土地','geography（地理）, geology（地质学）','词根'],
  ['morph-phon','phon','声音','telephone（电话）, phonetic（语音的）','词根'],
  ['morph-therm','therm','热；温度','thermal（热的）, thermometer（温度计）','词根'],
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
  ...openCoreWords.map(([id, term, meaning, example, root]) => ({ id, term, phonetic: '', meaning, example, root, deckId: 'ielts-academic', stage: 0, dueAt: 0, lapses: 0, createdAt: now })),
  ...morphemeWords.map(([id, term, meaning, example, root]) => ({ id, term, phonetic: '', meaning, example, root, deckId: 'morphemes', stage: 0, dueAt: 0, lapses: 0, createdAt: now })),
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
