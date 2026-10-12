import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import {
  Alert, Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import {
  Deck, FlowModule, initialDecks, initialModules, initialWords, ModuleKind, moduleCatalog, palette,
  getNow, parseCsv, scheduleReview, STORAGE_KEY, StudyRecord, WordEntry,
} from '../lib/study';

type Tab = 'library' | 'flow' | 'plan' | 'learn' | 'stats';
type SavedState = { decks: Deck[]; words: WordEntry[]; modules: FlowModule[]; selectedDeckIds: string[]; records: StudyRecord[]; planName: string; dailyCount: string; reminder: boolean; seedVersion: number };
const SEED_VERSION = 4;
const defaultState: SavedState = { decks: initialDecks, words: initialWords, modules: initialModules, selectedDeckIds: ['ielts-academic', 'morphemes'], records: [], planName: '词根精学计划', dailyCount: '20', reminder: false, seedVersion: SEED_VERSION };

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('library');
  const [data, setData] = useState<SavedState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [clockNow, setClockNow] = useState(0);
  const [query, setQuery] = useState('');
  const [rootFilter, setRootFilter] = useState('全部');
  const [wordLimit, setWordLimit] = useState(100);
  const [detailWord, setDetailWord] = useState<WordEntry | null>(null);
  const [menuWordId, setMenuWordId] = useState<string | null>(null);
  const [showWordForm, setShowWordForm] = useState(false);
  const [showDeckForm, setShowDeckForm] = useState(false);
  const [showCsvForm, setShowCsvForm] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<ReturnType<typeof parseCsv> | null>(null);
  const [wordForm, setWordForm] = useState({ term: '', meaning: '', root: '', phonetic: '', example: '' });
  const [deckName, setDeckName] = useState('');
  const [selectedModule, setSelectedModule] = useState('m1');
  const [showModuleCatalog, setShowModuleCatalog] = useState(false);
  const nextId = useRef(100);

  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [moduleIndex, setModuleIndex] = useState(0);
  const [knownSoFar, setKnownSoFar] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [spellInput, setSpellInput] = useState('');
  const [spellChecked, setSpellChecked] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [studyMode, setStudyMode] = useState<'plan' | 'morphology'>('plan');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<SavedState>;
      const storedIds = [...(saved.words ?? []), ...(saved.decks ?? []), ...(saved.modules ?? []), ...(saved.records ?? [])].map((item) => Number(item.id.match(/\d+$/)?.[0] ?? 0));
      nextId.current = Math.max(nextId.current, ...storedIds);
      const storedVersion = saved.seedVersion ?? 0;
      if (storedVersion < SEED_VERSION) {
        // Reset the old demo words, decks, review history, and custom settings once.
        // Subsequent user additions/deletions are preserved by the current seed version.
        setData(defaultState);
      } else {
        setData({ ...defaultState, ...saved, seedVersion: SEED_VERSION });
      }
    }).catch(() => undefined).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => setClockNow(getNow()), 0);
    const timer = setInterval(() => setClockNow(getNow()), 60_000);
    return () => { clearTimeout(initialTimer); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => undefined);
  }, [data, hydrated]);

  const activeModules = useMemo(() => studyMode === 'morphology'
    ? [{ id: 'm-root-study', kind: 'morphology' as const, title: '词根拆词记忆', subtitle: '从一组例词归纳共同词根或词缀及其含义', color: '#E5E0FF', enabled: true, seconds: 15 }]
    : data.modules.filter((item) => item.enabled), [data.modules, studyMode]);
  const currentWord = data.words.find((word) => word.id === queueIds[queueIndex]);
  const currentModule = activeModules[moduleIndex];
  const activeDeckIds = data.selectedDeckIds.length ? data.selectedDeckIds : data.decks.map((deck) => deck.id);
  const selectedRoots = data.decks.filter((deck) => activeDeckIds.includes(deck.id));
  const dueCount = data.words.filter((word) => activeDeckIds.includes(word.deckId) && word.dueAt > 0 && word.dueAt <= clockNow).length;
  const mistakeCount = data.words.filter((word) => word.lapses > 0).length;
  const todayRecords = data.records.filter((record) => new Date(record.at).toDateString() === new Date(clockNow).toDateString());
  const visibleWords = data.words.filter((word) => {
    const matchesQuery = `${word.term} ${word.meaning} ${word.root}`.toLowerCase().includes(query.toLowerCase());
    const selectedDeck = data.decks.find((deck) => deck.root === rootFilter);
    const matchesRoot = rootFilter === '全部' || word.root === rootFilter || word.deckId === selectedDeck?.id;
    return matchesQuery && matchesRoot;
  });

  const updateData = (patch: Partial<SavedState>) => setData((prev) => ({ ...prev, ...patch }));
  const toggleHighlight = (id: string) => updateData({ words: data.words.map((word) => word.id === id ? { ...word, highlighted: !word.highlighted } : word) });
  const deleteWord = (id: string) => { updateData({ words: data.words.filter((word) => word.id !== id) }); setDetailWord(null); setMenuWordId(null); };
  const setWordField = (key: keyof typeof wordForm, value: string) => setWordForm((prev) => ({ ...prev, [key]: value }));
  const addWord = () => {
    const term = wordForm.term.trim(); const meaning = wordForm.meaning.trim();
    if (!term || !meaning) { Alert.alert('还差一点', '请至少填写单词和释义。'); return; }
    const root = wordForm.root.trim();
    let deck = data.decks.find((item) => item.root === root) ?? data.decks.find((item) => item.id === 'personal');
    let decks = data.decks;
    if (!deck && root) { deck = { id: `root-${nextId.current++}`, name: `${root} 词根词库`, root, color: '#E5E0FF' }; decks = [...decks, deck]; }
    const deckId = deck?.id ?? 'personal';
    const entry: WordEntry = { id: `w-${nextId.current++}`, term, meaning, root, phonetic: wordForm.phonetic.trim(), example: wordForm.example.trim(), deckId, stage: 0, dueAt: 0, lapses: 0, createdAt: getNow() };
    updateData({ decks, words: [entry, ...data.words], selectedDeckIds: Array.from(new Set([...data.selectedDeckIds, deckId])) }); setWordForm({ term: '', meaning: '', root: '', phonetic: '', example: '' }); setShowWordForm(false);
  };

  const addDeck = () => {
    const name = deckName.trim(); if (!name) return;
    const root = name.replace(/\s*词库$/, '');
    const deck: Deck = { id: `d-${nextId.current++}`, name, root, color: '#DDEBFF' };
    updateData({ decks: [...data.decks, deck] }); setDeckName(''); setShowDeckForm(false); setRootFilter(root);
  };

  const prepareCsv = () => {
    const result = parseCsv(csvText); setCsvPreview(result);
  };
  const importCsv = () => {
    if (!csvPreview?.rows.length) return;
    const decks = [...data.decks]; const existing = new Set(data.words.map((word) => word.term.toLowerCase()));
    const imported: WordEntry[] = [];
    for (const row of csvPreview.rows) {
      if (existing.has(row.term.toLowerCase())) continue;
      let deck = decks.find((item) => item.root === row.root && row.root) ?? decks.find((item) => item.name === row.deckName);
      if (!deck) { deck = { id: `d-${nextId.current++}`, name: row.deckName, root: row.root, color: '#E5E0FF' }; decks.push(deck); }
      existing.add(row.term.toLowerCase());
      imported.push({ id: `w-${nextId.current++}`, term: row.term, meaning: row.meaning, root: row.root, phonetic: row.phonetic, example: row.example, deckId: deck.id, stage: 0, dueAt: 0, lapses: 0, createdAt: getNow() });
    }
    updateData({ decks, words: [...imported, ...data.words] });
    Alert.alert('导入完成', `新增 ${imported.length} 个词条；重复词已跳过。`);
    setCsvText(''); setCsvPreview(null); setShowCsvForm(false);
  };

  const updateModule = (id: string, patch: Partial<FlowModule>) => updateData({ modules: data.modules.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const moveModule = (id: string, direction: -1 | 1) => {
    const from = data.modules.findIndex((item) => item.id === id); const to = from + direction;
    if (to < 0 || to >= data.modules.length) return;
    const modules = [...data.modules]; [modules[from], modules[to]] = [modules[to], modules[from]]; updateData({ modules });
  };
  const addModule = (item: Omit<FlowModule, 'id' | 'enabled'>) => {
    const id = `m-${nextId.current++}`; updateData({ modules: [...data.modules, { ...item, id, enabled: true }] }); setSelectedModule(id); setShowModuleCatalog(false);
  };

  const startSession = (mode: 'plan' | 'morphology' = 'plan') => {
    setStudyMode(mode);
    if (mode === 'plan' && !activeModules.length) { Alert.alert('流程为空', '请先在流程页启用至少一个练习模块。'); return; }
    const decks = mode === 'morphology' ? ['morphemes'] : data.selectedDeckIds.length ? data.selectedDeckIds : data.decks.map((deck) => deck.id);
    const sessionNow = getNow();
    const eligible = data.words.filter((word) => decks.includes(word.deckId) && ((word.stage === 0 && word.dueAt === 0) || (word.dueAt > 0 && word.dueAt <= sessionNow)));
    const due = eligible.filter((word) => word.dueAt > 0).sort((a, b) => a.dueAt - b.dueAt);
    const fresh = eligible.filter((word) => word.stage === 0 && word.dueAt === 0);
    if (mode === 'morphology') {
      for (let index = fresh.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [fresh[index], fresh[swapIndex]] = [fresh[swapIndex], fresh[index]];
      }
    } else fresh.sort((a, b) => a.createdAt - b.createdAt);
    const queue = [...due, ...fresh].slice(0, Math.max(1, Number(data.dailyCount) || 20));
    if (!queue.length) { Alert.alert('暂时没有可学习内容', mode === 'morphology' ? '词根词缀库中没有可学习条目。' : '当前计划没有到期复习或新词，可以调整计划词库。'); return; }
    setQueueIds(queue.map((word) => word.id)); setQueueIndex(0); setModuleIndex(0); setKnownSoFar(true); setShowAnswer(false); setSpellChecked(false); setSpellInput(''); setSessionDone(false); setSessionStarted(true); setTab('learn');
  };

  const completeCurrentWord = (known: boolean) => {
    if (!currentWord) return;
    const at = getNow();
    updateData({ words: data.words.map((word) => word.id === currentWord.id ? scheduleReview(word, known, at) : word) });
    setShowAnswer(false); setSpellChecked(false); setSpellInput(''); setKnownSoFar(true);
    if (queueIndex + 1 >= queueIds.length) setSessionDone(true); else { setQueueIndex((index) => index + 1); setModuleIndex(0); }
  };

  const rateAnswer = (known: boolean) => {
    if (!currentWord || !currentModule) return;
    const record: StudyRecord = { id: `r-${nextId.current++}`, wordId: currentWord.id, moduleKind: currentModule.kind, known, at: getNow() };
    updateData({ records: [...data.records, record] }); setKnownSoFar((wasKnown) => wasKnown && known);
    const nextIndex = moduleIndex + 1;
    if (nextIndex >= activeModules.length) completeCurrentWord(knownSoFar && known);
    else { setModuleIndex(nextIndex); setShowAnswer(false); setSpellChecked(false); setSpellInput(''); }
  };

  const continueBranch = () => {
    const retryIndex = activeModules.findIndex((item, index) => index > moduleIndex && item.kind === 'retry');
    if (!knownSoFar && retryIndex >= 0) setModuleIndex(retryIndex);
    else {
      const nextIndex = knownSoFar && retryIndex >= 0 ? retryIndex + 1 : moduleIndex + 1;
      if (nextIndex >= activeModules.length) completeCurrentWord(knownSoFar); else setModuleIndex(nextIndex);
    }
    setShowAnswer(false); setSpellInput(''); setSpellChecked(false);
  };

  const recordMastery = (known: boolean) => {
    if (currentModule?.kind === 'branch') { continueBranch(); return; }
    rateAnswer(known);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.canvas} />
      <View style={s.topBar}>
        <View style={s.brandMark}><Text style={s.brandMarkText}>W</Text></View>
        <View style={{ flex: 1 }}><Text style={s.brand}>词流 Wordflow</Text><Text style={s.brandSub}>词根建库 · 自由编排 · 主动复习</Text></View>
        <View style={s.localBadge}><View style={s.greenDot} /><Text style={s.localBadgeText}>本机保存</Text></View>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tab === 'library' && <>
          <Header eyebrow="词根词库" title="从想学的词开始" subtitle="内置雅思学术向核心词与高频词根词缀，也可以自己建库、补词和安排练习。" />
          <View style={s.statsRow}>
            <SmallStat value={`${data.words.length}`} label="已收录词条" /><SmallStat value={`${data.decks.length}`} label="我的词库" /><SmallStat value={`${dueCount}`} label="待复习" />
          </View>
          <View style={s.searchRow}><Text style={s.searchIcon}>⌕</Text><TextInput value={query} onChangeText={(value) => { setQuery(value); setWordLimit(100); }} placeholder="搜索单词、释义或词根" placeholderTextColor="#9AA5B5" style={s.searchInput} /></View>
          <Card><Text style={s.cardTitle}>内置开放词库</Text><Text style={s.body}>“雅思学术核心”参考 NAWL 1.2 学术词表，并非官方 IELTS 固定词表；构词库含 1061 个词根和 3758 条前缀/后缀记录。释义和例词保留开源数据原文。</Text><Text style={s.hint}>NAWL：CC BY-SA 4.0 · 词根/词缀：MIT 开源项目 · 完整来源见仓库 DATA_SOURCES.md</Text></Card>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsRow}>
            {['全部', ...Array.from(new Set(data.decks.map((deck) => deck.root).filter(Boolean)))].map((root) => <TouchableOpacity key={root} onPress={() => { setRootFilter(root); setWordLimit(100); }} style={[s.chip, rootFilter === root && s.chipActive]}><Text style={[s.chipText, rootFilter === root && s.chipTextActive]}>{root}</Text></TouchableOpacity>)}
            <TouchableOpacity onPress={() => setShowDeckForm((value) => !value)} style={s.addChip}><Text style={s.addChipText}>＋ 新词根</Text></TouchableOpacity>
          </ScrollView>
          {showDeckForm && <Card><Text style={s.label}>新词库名称或词根/词缀</Text><View style={s.inlineForm}><TextInput value={deckName} onChangeText={setDeckName} placeholder="例如 -ment 词库" style={[s.input, { flex: 1 }]} /><Button label="创建" onPress={addDeck} small /></View></Card>}
          <View style={s.sectionRow}><View><Text style={s.sectionTitle}>词条</Text><Text style={s.hint}>词库可按词根分组，也可以保存个人摘词</Text></View><View style={s.actionGroup}><TouchableOpacity style={s.secondaryButton} onPress={() => { setShowCsvForm((value) => !value); setCsvPreview(null); }}><Text style={s.secondaryButtonText}>导入 CSV</Text></TouchableOpacity><TouchableOpacity style={s.primarySmall} onPress={() => setShowWordForm((value) => !value)}><Text style={s.primarySmallText}>＋ 添加</Text></TouchableOpacity></View></View>
          {showCsvForm && <Card><Text style={s.cardTitle}>粘贴 CSV 内容</Text><Text style={s.hint}>支持表头：word, meaning, root, phonetic, example, deck。单词和释义为必填字段。</Text><TextInput multiline value={csvText} onChangeText={(value) => { setCsvText(value); setCsvPreview(null); }} placeholder={'word,meaning,root,phonetic,example,deck\naction,行动；行为,-tion,/ˈækʃn/,We need action now.,-tion 名词'} style={[s.input, s.csvInput]} textAlignVertical="top" />{csvPreview && <Text style={[s.hint, csvPreview.errors.length ? s.errorText : s.successText]}>{csvPreview.errors.length ? csvPreview.errors.join(' ') : `解析到 ${csvPreview.rows.length} 个词条，重复词导入时会跳过。`}</Text>}<View style={s.buttonRow}><Button label="解析预览" onPress={prepareCsv} small /><Button label="确认导入" onPress={importCsv} small disabled={!csvPreview?.rows.length} /></View></Card>}
          {showWordForm && <Card><Text style={s.cardTitle}>添加词条</Text><TextInput value={wordForm.term} onChangeText={(value) => setWordField('term', value)} placeholder="单词 *" style={s.input} autoCapitalize="none" /><TextInput value={wordForm.meaning} onChangeText={(value) => setWordField('meaning', value)} placeholder="释义 *" style={s.input} /><View style={s.formGrid}><TextInput value={wordForm.root} onChangeText={(value) => setWordField('root', value)} placeholder="词根/词缀" style={[s.input, s.formHalf]} /><TextInput value={wordForm.phonetic} onChangeText={(value) => setWordField('phonetic', value)} placeholder="音标" style={[s.input, s.formHalf]} /></View><TextInput value={wordForm.example} onChangeText={(value) => setWordField('example', value)} placeholder="例句（可选）" style={s.input} /><Button label="保存词条" onPress={addWord} /></Card>}
          {visibleWords.length === 0 ? <Empty title="还没有匹配词条" detail="手动添加单词，或粘贴 CSV 批量导入。" /> : visibleWords.slice(0, wordLimit).map((word) => {
            const deck = data.decks.find((item) => item.id === word.deckId);
            return <Card key={word.id} style={[s.wordRow, word.highlighted && s.wordHighlighted, menuWordId === word.id && s.wordCardOpen]}><TouchableOpacity style={s.wordDetailsTap} activeOpacity={0.75} onPress={() => { setDetailWord(word); setMenuWordId(null); }}><View style={[s.wordBadge, { backgroundColor: deck?.color ?? '#E7EBF1' }]}><Text style={s.wordBadgeText}>{word.root || '词'}</Text></View><View style={{ flex: 1 }}><View style={s.wordLine}><Text style={s.wordTerm}>{word.term}</Text>{word.phonetic ? <Text style={s.wordPhonetic}>{word.phonetic}</Text> : null}</View><Text style={s.wordMeaning}>{word.meaning}</Text>{word.example ? <Text style={s.wordExample} numberOfLines={1}>{word.example}</Text> : null}<Text style={s.wordMeta}>{deck?.name ?? '我的摘词'}{word.lapses ? ` · 错过 ${word.lapses} 次` : ''}</Text></View></TouchableOpacity><TouchableOpacity style={s.moreButton} accessibilityRole="button" accessibilityLabel={`${word.term} 更多操作`} onPress={() => setMenuWordId(menuWordId === word.id ? null : word.id)}><Text style={s.moreButtonText}>⋮</Text></TouchableOpacity>{menuWordId === word.id && <View style={s.wordMenu}><TouchableOpacity style={s.wordMenuItem} onPress={() => { toggleHighlight(word.id); setMenuWordId(null); }}><Text style={s.wordMenuText}>{word.highlighted ? '取消高亮' : '高亮词条'}</Text></TouchableOpacity><View style={s.menuDivider} /><TouchableOpacity style={s.wordMenuItem} onPress={() => deleteWord(word.id)}><Text style={s.wordMenuDelete}>删除词条</Text></TouchableOpacity></View>}</Card>;
          })}
          {visibleWords.length > wordLimit && <Button label={`继续显示 ${Math.min(100, visibleWords.length - wordLimit)} 条（共 ${visibleWords.length} 条）`} onPress={() => setWordLimit((limit) => limit + 100)} />}
        </>}

        {tab === 'flow' && <>
          <Header eyebrow="学习方式" title="把复习编成自己的节奏" subtitle="模块按顺序运行；答错会进入错词强化分支。" />
          <Card><View style={s.cardHeader}><View style={s.moduleMark}><Text style={s.moduleMarkText}>✦</Text></View><View style={{ flex: 1 }}><Text style={s.label}>当前流程</Text><Text style={s.cardTitle}>{data.planName}</Text></View><Text style={s.savedText}>自动保存</Text></View><View style={s.divider} /><View style={s.statsRow}><SmallStat value={`${activeModules.length}`} label="启用模块" /><SmallStat value={`${data.words.length}`} label="可学习词条" /><SmallStat value={`${data.dailyCount} 词/天`} label="计划目标" /></View></Card>
          <View style={s.sectionRow}><View><Text style={s.sectionTitle}>流程模块</Text><Text style={s.hint}>点卡片编辑，箭头调整步骤顺序</Text></View><TouchableOpacity style={s.primarySmall} onPress={() => setShowModuleCatalog((value) => !value)}><Text style={s.primarySmallText}>{showModuleCatalog ? '收起' : '＋ 添加模块'}</Text></TouchableOpacity></View>
          {showModuleCatalog && <Card><Text style={s.cardTitle}>选择练习模块</Text><View style={s.moduleCatalog}>{moduleCatalog.map((item, index) => <TouchableOpacity key={`${item.kind}-${index}`} style={s.catalogItem} onPress={() => addModule(item)}><View style={[s.moduleIcon, { backgroundColor: item.color }]}><Text style={s.moduleGlyph}>{glyph(item.kind)}</Text></View><Text style={s.catalogLabel}>{item.title}</Text></TouchableOpacity>)}</View></Card>}
          {data.modules.map((module, index) => <React.Fragment key={module.id}>{index > 0 && <View style={s.flowConnector} />}<TouchableOpacity onPress={() => setSelectedModule(module.id)} style={[s.moduleCard, selectedModule === module.id && s.moduleSelected, !module.enabled && s.moduleDisabled]}><View style={[s.moduleIcon, { backgroundColor: module.color }]}><Text style={s.moduleGlyph}>{glyph(module.kind)}</Text></View><View style={{ flex: 1 }}><Text style={s.moduleTitle}>{index + 1}. {module.title}{module.kind === 'branch' ? '  · 条件' : ''}</Text><Text style={s.hint}>{module.subtitle}</Text></View><View><TouchableOpacity onPress={() => moveModule(module.id, -1)} disabled={index === 0}><Text style={[s.reorder, index === 0 && s.faint]}>↑</Text></TouchableOpacity><TouchableOpacity onPress={() => moveModule(module.id, 1)} disabled={index === data.modules.length - 1}><Text style={[s.reorder, index === data.modules.length - 1 && s.faint]}>↓</Text></TouchableOpacity></View></TouchableOpacity>{selectedModule === module.id && <Card style={s.moduleEditor}><View style={s.cardHeader}><Text style={s.label}>参与学习流程</Text><Switch value={module.enabled} onValueChange={(enabled) => updateModule(module.id, { enabled })} /></View><TextInput value={module.title} onChangeText={(title) => updateModule(module.id, { title })} style={s.input} /><View style={s.cardHeader}><Text style={s.hint}>预计停留（秒）</Text><View style={s.stepper}><TouchableOpacity onPress={() => updateModule(module.id, { seconds: Math.max(0, module.seconds - 2) })}><Text style={s.stepperButton}>−</Text></TouchableOpacity><Text style={s.stepperValue}>{module.seconds}</Text><TouchableOpacity onPress={() => updateModule(module.id, { seconds: module.seconds + 2 })}><Text style={s.stepperButton}>＋</Text></TouchableOpacity></View></View><TouchableOpacity onPress={() => updateData({ modules: data.modules.filter((item) => item.id !== module.id) })}><Text style={s.deleteText}>移除此模块</Text></TouchableOpacity></Card>}</React.Fragment>)}
          <Card style={s.branchCard}><Text style={s.cardTitle}>条件分支规则</Text><Text style={s.body}>「判断掌握程度」后：答对跳过错词重练；答错先执行「错词重练」，再继续后续练习。调整模块顺序即可改变分支落点。</Text></Card>
          <Button label="用此流程开始学习" onPress={startSession} />
        </>}

        {tab === 'plan' && <>
          <Header eyebrow="学习计划" title="今天学哪些词？" subtitle="将词库、学习流程和每日目标组合成个人计划。" />
          <Card><Text style={s.label}>计划名称</Text><TextInput value={data.planName} onChangeText={(planName) => updateData({ planName })} style={s.input} /><Text style={[s.label, s.spaceTop]}>每日学习上限</Text><View style={s.countControl}><TouchableOpacity onPress={() => updateData({ dailyCount: String(Math.max(5, Number(data.dailyCount) - 5)) })} style={s.countButton}><Text style={s.countButtonText}>−</Text></TouchableOpacity><Text style={s.countValue}>{data.dailyCount}<Text style={s.countUnit}> 词 / 天</Text></Text><TouchableOpacity onPress={() => updateData({ dailyCount: String(Number(data.dailyCount) + 5) })} style={s.countButton}><Text style={s.countButtonText}>＋</Text></TouchableOpacity></View><View style={s.divider} /><Text style={s.label}>加入计划的词库</Text>{data.decks.map((deck) => { const checked = data.selectedDeckIds.includes(deck.id); const count = data.words.filter((word) => word.deckId === deck.id).length; return <TouchableOpacity key={deck.id} style={s.deckSelectRow} onPress={() => updateData({ selectedDeckIds: checked ? data.selectedDeckIds.filter((id) => id !== deck.id) : [...data.selectedDeckIds, deck.id] })}><View style={[s.checkBox, checked && s.checkBoxOn]}><Text style={s.checkMark}>{checked ? '✓' : ''}</Text></View><View style={{ flex: 1 }}><Text style={s.deckName}>{deck.name}</Text><Text style={s.hint}>{deck.root ? `词根/词缀 ${deck.root}` : '个人词条'}</Text></View><Text style={s.deckCount}>{count} 词</Text></TouchableOpacity>; })}<View style={s.divider} /><View style={s.cardHeader}><View style={{ flex: 1 }}><Text style={s.deckName}>每日提醒偏好</Text><Text style={s.hint}>当前仅保存设置，系统通知后续接入</Text></View><Switch value={data.reminder} onValueChange={(reminder) => updateData({ reminder })} /></View></Card>
          <Card style={s.planSummary}><Text style={s.cardTitle}>计划概览</Text><Text style={s.body}>将复习到期词优先排入，再加入新词；每天最多学习 {data.dailyCount} 个单词。</Text><Text style={s.body}>所选词库：{selectedRoots.map((deck) => deck.name).join('、') || '未选择（将使用全部词库）'}</Text><Text style={s.body}>当前流程：{activeModules.map((module) => module.title).join(' → ') || '尚未启用模块'}</Text><Text style={s.body}>今日到期：{dueCount} 词</Text></Card>
          <Button label="开始今日学习" onPress={startSession} />
        </>}

        {tab === 'learn' && <>
          {!sessionStarted ? <><Header eyebrow="学习执行" title="选择一种学习方式" subtitle="词汇背诵和词根词缀拆词学习可以分别进行，也可以在计划里组合。" /><Card><Text style={s.cardTitle}>普通词汇复习</Text><Text style={s.body}>到期复习 {dueCount} 词 · 新词 {data.words.filter((word) => activeDeckIds.includes(word.deckId) && word.stage === 0 && word.dueAt === 0).length} 词</Text><Text style={s.body}>按你的自定义模块流程学习所选词库。</Text><Button label="开始今日计划" onPress={() => startSession('plan')} /></Card><Card><Text style={s.cardTitle}>词根词缀学习</Text><Text style={s.body}>从一组派生词入手，先回忆共同构词成分，再揭晓其形式和含义。构词库含 1061 个词根和 3758 条前缀/后缀记录。</Text><Button label="开始词根拆词学习" onPress={() => startSession('morphology')} /></Card><TouchableOpacity style={s.centerLink} onPress={() => setTab('plan')}><Text style={s.linkText}>调整计划词库与每日数量</Text></TouchableOpacity></> : sessionDone || !currentWord || !currentModule ? <><Header eyebrow="本轮学习" title="这一轮完成了" subtitle={`完成 ${queueIndex + (sessionDone ? 1 : 0)} 个词条，结果已写入本机记录。`} /><Card><Text style={s.cardTitle}>继续下一步</Text><Text style={s.body}>错词会按较短间隔重新安排；答对的词会逐步延长复习间隔。</Text><Text style={s.body}>当前错词：{mistakeCount} · 今日练习记录：{todayRecords.length}</Text></Card><Button label="再开始一轮" onPress={() => startSession(studyMode)} /><TouchableOpacity style={s.centerLink} onPress={() => setTab('stats')}><Text style={s.linkText}>查看学习统计</Text></TouchableOpacity></> : <>
            <View style={s.sessionHeader}><TouchableOpacity onPress={() => setTab('flow')}><Text style={s.linkText}>‹ 流程</Text></TouchableOpacity><View style={s.runningPill}><View style={s.greenDot} /><Text style={s.runningText}>学习中</Text></View></View>
            <Text style={s.eyebrow}>今日学习 · {queueIndex + 1}/{queueIds.length} 词</Text><Text style={s.pageTitle}>{currentModule.title}</Text><Text style={s.hint}>{currentModule.subtitle}</Text>
            <View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.round(((queueIndex * activeModules.length + moduleIndex + 1) / (queueIds.length * activeModules.length)) * 100)}%` }]} /></View>
            <View style={s.flowProgress}>{activeModules.map((module, i) => <View key={module.id} style={s.flowProgressItem}><View style={[s.flowProgressDot, i < moduleIndex && s.flowProgressDone, i === moduleIndex && s.flowProgressCurrent]} /><Text style={[s.flowProgressLabel, i === moduleIndex && s.activeText]} numberOfLines={1}>{module.title}</Text></View>)}</View>
            {currentModule.kind === 'branch' ? <Card style={s.studyCard}><Text style={s.branchIcon}>⑂</Text><Text style={s.studyWord}>根据刚才的自评继续</Text><Text style={s.studyMeaning}>{knownSoFar ? '已掌握：跳过错词强化，继续下一模块。' : '尚未掌握：先进入错词重练，再继续学习。'}</Text><Button label="执行分支" onPress={continueBranch} /></Card> : <Card style={s.studyCard}>
              <View style={s.cardHeader}><Text style={s.tag}>{currentModule.kind === 'retry' ? '错词强化' : data.decks.find((deck) => deck.id === currentWord.deckId)?.name ?? '词条'}</Text><Text style={s.hint}>第 {queueIndex + 1} / {queueIds.length} 词</Text></View>
              {currentModule.kind === 'morphology' ? (
                <>
                  <Text style={s.promptLabel}>观察例词，回忆共同的词根或词缀</Text>
                  <Text style={s.contextText}>{currentWord.example || '暂无关联例词'}</Text>
                </>
              ) : currentModule.kind === 'spell' ? (
                <>
                  <Text style={s.promptLabel}>根据释义拼写</Text>
                  <Text style={s.studyMeaning}>{currentWord.meaning}</Text>
                  <TextInput value={spellInput} onChangeText={setSpellInput} placeholder="输入英文单词" autoCapitalize="none" autoCorrect={false} style={[s.input, s.spellInput]} onSubmitEditing={() => setSpellChecked(true)} />
                  {spellChecked && <Text style={spellInput.trim().toLowerCase() === currentWord.term.toLowerCase() ? s.successText : s.errorText}>正确答案：{currentWord.term}</Text>}
                </>
              ) : (
                <>
                  <Text style={s.studyWord}>{currentWord.term}</Text>
                  <Text style={s.studyPhonetic}>{currentWord.phonetic || currentWord.root}</Text>
                  {currentModule.kind === 'listen' && <TouchableOpacity style={s.speakButton} onPress={() => Speech.speak(currentWord.term, { language: 'en-US', rate: 0.85 })}><Text style={s.speakText}>♫  播放发音</Text></TouchableOpacity>}
                </>
              )}
              {currentModule.kind === 'example' && currentWord.example ? <Text style={s.contextText}>{currentWord.example.replace(new RegExp(currentWord.term, 'ig'), '_____')}</Text> : null}
              {!showAnswer && currentModule.kind !== 'spell' ? <TouchableOpacity style={s.revealButton} onPress={() => setShowAnswer(true)}><Text style={s.revealText}>{currentModule.kind === 'morphology' ? '揭晓词根/词缀和含义' : currentModule.kind === 'example' ? '显示例句和释义' : '显示释义'}</Text></TouchableOpacity> : null}
              {(showAnswer || spellChecked || currentModule.kind === 'spell' && spellChecked) && <View style={s.answerBox}>{currentModule.kind === 'morphology' && <Text style={s.studyWord}>{currentWord.term} · {currentWord.root}</Text>}<Text style={s.studyMeaning}>{currentWord.meaning}</Text>{currentModule.kind !== 'morphology' && currentWord.root ? <Text style={s.hint}>构词线索：{currentWord.root}</Text> : null}{currentWord.example ? <Text style={s.contextText}>{currentWord.example}</Text> : null}</View>}
              {showAnswer || spellChecked ? <View style={s.ratingRow}><TouchableOpacity style={[s.ratingButton, s.ratingMiss]} onPress={() => recordMastery(false)}><Text style={s.ratingEmoji}>↻</Text><Text style={s.ratingText}>没记住</Text></TouchableOpacity><TouchableOpacity style={[s.ratingButton, s.ratingKnown]} onPress={() => recordMastery(currentModule.kind === 'spell' ? spellInput.trim().toLowerCase() === currentWord.term.toLowerCase() : true)}><Text style={s.ratingEmoji}>✓</Text><Text style={s.ratingText}>{currentModule.kind === 'spell' ? '我拼对了' : '记住了'}</Text></TouchableOpacity></View> : currentModule.kind === 'spell' ? <Button label="检查拼写" onPress={() => setSpellChecked(true)} disabled={!spellInput.trim()} /> : null}
              <View style={s.wordFoot}><Text style={s.hint}>建议练习 {currentModule.seconds} 秒</Text><Text style={s.hint}>本词整体：{knownSoFar ? '暂未出错' : '待强化'}</Text></View>
            </Card>}
            <Text style={s.sessionFoot}>错词会进入复习队列；答对词的下次复习间隔将逐步延长。</Text>
          </>}
        </>}

        {tab === 'stats' && <>
          <Header eyebrow="学习复盘" title="看看自己的学习规律" subtitle="记录哪些词容易忘、哪些练习方式更适合你。" />
          <View style={s.statsGrid}><Card style={s.statCard}><Text style={s.bigStat}>{data.words.filter((word) => word.stage >= 2).length}</Text><Text style={s.hint}>逐步掌握</Text></Card><Card style={s.statCard}><Text style={s.bigStat}>{mistakeCount}</Text><Text style={s.hint}>有错词记录</Text></Card><Card style={s.statCard}><Text style={s.bigStat}>{dueCount}</Text><Text style={s.hint}>今日到期</Text></Card><Card style={s.statCard}><Text style={s.bigStat}>{todayRecords.length}</Text><Text style={s.hint}>今日模块练习</Text></Card></View>
          <Card><Text style={s.cardTitle}>练习模块表现</Text>{moduleCatalog.filter((module, index, all) => all.findIndex((item) => item.kind === module.kind) === index).map((module) => { const records = data.records.filter((record) => record.moduleKind === module.kind); const correct = records.filter((record) => record.known).length; const rate = records.length ? Math.round((correct / records.length) * 100) : 0; return <View key={module.kind} style={s.performanceRow}><Text style={s.performanceName}>{module.title}</Text><View style={s.performanceTrack}><View style={[s.performanceFill, { width: `${rate}%` }]} /></View><Text style={s.performanceValue}>{records.length ? `${rate}%` : '—'}</Text></View>; })}<Text style={[s.hint, s.spaceTop]}>模块正确率按每次自评和拼写检查统计，样本不足时仅显示横线。</Text></Card>
          <Card><Text style={s.cardTitle}>需要再练的词</Text>{data.words.filter((word) => word.lapses > 0).sort((a, b) => b.lapses - a.lapses).slice(0, 8).map((word) => <View key={word.id} style={s.mistakeRow}><Text style={s.mistakeTerm}>{word.term}</Text><Text style={s.hint}>{word.meaning}</Text><Text style={s.errorText}>×{word.lapses}</Text></View>)}{mistakeCount === 0 && <Text style={s.hint}>错词会显示在这里。继续学习后，系统会逐步总结个人易错规律。</Text>}</Card>
          <Card style={{ backgroundColor: '#EFF7F3' }}><Text style={s.cardTitle}>下一步可扩展</Text><Text style={s.body}>当前复习间隔为本地简化规则。后续可根据遗忘曲线、模块表现和用户反馈，给出可解释的个性化流程建议。</Text></Card>
        </>}
      </ScrollView>

      <Modal transparent visible={detailWord !== null} animationType="slide" onRequestClose={() => setDetailWord(null)}>
        <View style={s.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailWord(null)} /><View style={s.detailSheet}>{detailWord && (() => { const deck = data.decks.find((item) => item.id === detailWord.deckId); const isMorpheme = detailWord.deckId === 'morphemes' || deck?.name.includes('词根') || deck?.name.includes('词缀'); const relatedExamples = isMorpheme ? detailWord.example.split(/[,，、]/).map((item) => item.trim()).filter(Boolean) : []; return <><View style={s.detailHeader}><Text style={s.detailEyebrow}>{isMorpheme ? '词根 / 词缀详情' : '单词详情'}</Text><TouchableOpacity onPress={() => setDetailWord(null)} accessibilityLabel="关闭详情"><Text style={s.detailClose}>×</Text></TouchableOpacity></View><ScrollView showsVerticalScrollIndicator={false}><Text style={s.detailTitle}>{detailWord.term}</Text>{detailWord.phonetic ? <Text style={s.detailPhonetic}>{detailWord.phonetic}</Text> : null}<Text style={s.detailMeaning}>{detailWord.meaning}</Text><View style={s.detailDivider} /><Text style={s.detailLabel}>{isMorpheme ? '构词类型' : '所属词库'}</Text><Text style={s.detailBody}>{isMorpheme ? `${detailWord.root || '词根/词缀'} · ${deck?.name ?? '构词法'}` : deck?.name ?? '我的摘词'}</Text>{detailWord.root && !isMorpheme ? <><Text style={s.detailLabel}>构词线索</Text><Text style={s.detailBody}>{detailWord.root}</Text></> : null}{detailWord.example ? <><Text style={s.detailLabel}>{isMorpheme ? '关联例词' : '例句'}</Text>{isMorpheme && relatedExamples.length > 1 ? <View style={s.exampleChips}>{relatedExamples.map((example) => <Text key={example} style={s.exampleChip}>{example}</Text>)}</View> : <Text style={s.detailExample}>{detailWord.example}</Text>}</> : null}<Text style={s.detailLabel}>学习记录</Text><Text style={s.detailBody}>已复习 {detailWord.stage} 次 · 错过 {detailWord.lapses} 次</Text><View style={s.detailActions}><Button label={detailWord.highlighted ? '取消高亮' : '高亮词条'} onPress={() => { toggleHighlight(detailWord.id); setDetailWord((current) => current ? { ...current, highlighted: !current.highlighted } : current); }} small /><TouchableOpacity style={s.detailDelete} onPress={() => deleteWord(detailWord.id)}><Text style={s.detailDeleteText}>删除词条</Text></TouchableOpacity></View></ScrollView></>; })()}</View></View>
      </Modal>

      <View style={s.bottomNav}>{([['library','词库','▤'],['flow','流程','⑂'],['plan','计划','▦'],['learn','学习','▶'],['stats','复盘','◷']] as [Tab,string,string][]).map(([key, label, icon]) => <TouchableOpacity key={key} onPress={() => setTab(key)} style={s.navItem}><Text style={[s.navIcon, tab === key && s.navIconActive]}>{icon}</Text><Text style={[s.navLabel, tab === key && s.navLabelActive]}>{label}</Text></TouchableOpacity>)}</View>
    </SafeAreaView>
  );
}

function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <View style={s.header}><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.pageTitle}>{title}</Text><Text style={s.pageSubtitle}>{subtitle}</Text></View>; }
function Card({ children, style }: { children: React.ReactNode; style?: object }) { return <View style={[s.card, style]}>{children}</View>; }
function Button({ label, onPress, small = false, disabled = false }: { label: string; onPress: () => void; small?: boolean; disabled?: boolean }) { return <TouchableOpacity onPress={onPress} disabled={disabled} style={[small ? s.buttonSmall : s.button, disabled && s.buttonDisabled]}><Text style={s.buttonText}>{label}</Text></TouchableOpacity>; }
function SmallStat({ value, label }: { value: string; label: string }) { return <View style={s.smallStat}><Text style={s.smallStatValue}>{value}</Text><Text style={s.smallStatLabel}>{label}</Text></View>; }
function Empty({ title, detail }: { title: string; detail: string }) { return <Card style={s.empty}><Text style={s.cardTitle}>{title}</Text><Text style={s.hint}>{detail}</Text></Card>; }
function glyph(kind: ModuleKind) { return ({ recognize: 'Aa', recall: '✓', listen: '♫', spell: '✎', example: '文', retry: '↻', branch: '⑂', morphology: '根' } as Record<ModuleKind, string>)[kind]; }

const s = StyleSheet.create({
  wordHighlighted: { backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F4D477' }, wordCardOpen: { zIndex: 30, elevation: 12 }, wordDetailsTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, moreButton: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, moreButtonText: { color: '#64748B', fontSize: 23, fontWeight: '800', lineHeight: 26 }, wordMenu: { position: 'absolute', top: 48, right: 8, zIndex: 40, elevation: 15, width: 132, backgroundColor: '#fff', borderRadius: 12, padding: 5, shadowColor: '#14243A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 12 }, wordMenuItem: { paddingHorizontal: 10, paddingVertical: 10 }, wordMenuText: { color: palette.ink, fontSize: 10, fontWeight: '700' }, wordMenuDelete: { color: '#C65D63', fontSize: 10, fontWeight: '700' }, menuDivider: { height: 1, backgroundColor: '#EEF1F5' }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,32,50,0.42)' }, detailSheet: { maxHeight: '84%', backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24, borderTopLeftRadius: 22, borderTopRightRadius: 22 }, detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailEyebrow: { color: palette.blue, fontSize: 10, fontWeight: '800' }, detailClose: { color: '#8793A5', fontSize: 25, paddingHorizontal: 5 }, detailTitle: { color: palette.ink, fontSize: 27, fontWeight: '800', marginTop: 11 }, detailPhonetic: { color: '#8995A7', fontSize: 11, marginTop: 4 }, detailMeaning: { color: palette.ink, fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 14 }, detailDivider: { height: 1, backgroundColor: palette.line, marginTop: 18, marginBottom: 6 }, detailLabel: { color: '#8995A7', fontSize: 9, fontWeight: '800', marginTop: 15, marginBottom: 5 }, detailBody: { color: '#536178', fontSize: 11, lineHeight: 17 }, detailExample: { color: '#536178', fontSize: 11, lineHeight: 18 }, exampleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, exampleChip: { color: '#526078', backgroundColor: '#F1F3F8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 9 }, detailActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingBottom: 4 }, detailDelete: { backgroundColor: '#FFF0EE', paddingHorizontal: 13, minHeight: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, detailDeleteText: { color: '#C65D63', fontSize: 10, fontWeight: '800' },
  safe: { flex: 1, backgroundColor: palette.canvas }, topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 19, paddingTop: 8, paddingBottom: 12 }, brandMark: { width: 39, height: 39, borderRadius: 13, backgroundColor: palette.blue, justifyContent: 'center', alignItems: 'center', marginRight: 10 }, brandMarkText: { color: '#fff', fontSize: 21, fontWeight: '900' }, brand: { color: palette.ink, fontSize: 16, fontWeight: '800' }, brandSub: { color: palette.muted, fontSize: 9, marginTop: 3 }, localBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: '#E6F6F0' }, greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green, marginRight: 5 }, localBadgeText: { color: palette.green, fontSize: 9, fontWeight: '700' }, content: { paddingHorizontal: 19, paddingBottom: 28 }, header: { marginTop: 8, marginBottom: 14 }, eyebrow: { color: palette.blue, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginTop: 5 }, pageTitle: { color: palette.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.7, marginTop: 6 }, pageSubtitle: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 5 }, card: { backgroundColor: palette.white, borderRadius: 17, padding: 14, marginBottom: 11, shadowColor: '#26344A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.035, shadowRadius: 9, elevation: 1 }, statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 13, backgroundColor: '#fff', borderRadius: 15, marginBottom: 12 }, smallStat: { alignItems: 'center', flex: 1 }, smallStatValue: { color: palette.ink, fontSize: 16, fontWeight: '800' }, smallStatLabel: { color: palette.muted, fontSize: 9, marginTop: 3 }, searchRow: { height: 42, flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 12, marginBottom: 9 }, searchIcon: { color: '#9AA5B5', fontSize: 20, marginRight: 7 }, searchInput: { flex: 1, color: palette.ink, fontSize: 11 }, chipsScroll: { marginBottom: 12 }, chipsRow: { gap: 7, paddingRight: 10 }, chip: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 13 }, chipActive: { backgroundColor: '#E9EDFF' }, chipText: { color: '#69778B', fontSize: 10, fontWeight: '700' }, chipTextActive: { color: palette.blue }, addChip: { borderStyle: 'dashed', borderWidth: 1, borderColor: '#C7D0DE', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 13 }, addChipText: { color: palette.blue, fontSize: 10, fontWeight: '700' }, sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 }, sectionTitle: { color: palette.ink, fontSize: 14, fontWeight: '800' }, hint: { color: palette.muted, fontSize: 9, lineHeight: 14, marginTop: 3 }, actionGroup: { flexDirection: 'row', gap: 6 }, secondaryButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DFE5EE', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 }, secondaryButtonText: { color: '#65738A', fontSize: 9, fontWeight: '700' }, primarySmall: { backgroundColor: palette.blue, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }, primarySmallText: { color: '#fff', fontSize: 9, fontWeight: '800' }, label: { color: '#647188', fontSize: 10, fontWeight: '700', marginBottom: 6 }, cardTitle: { color: palette.ink, fontSize: 12, fontWeight: '800', marginBottom: 7 }, body: { color: '#65738A', fontSize: 10, lineHeight: 16, marginTop: 4 }, input: { color: palette.ink, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E6EAF0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 11, marginBottom: 7 }, inlineForm: { flexDirection: 'row', gap: 7, alignItems: 'center' }, button: { backgroundColor: palette.blue, minHeight: 45, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 13 }, buttonSmall: { backgroundColor: palette.blue, minHeight: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 13 }, buttonDisabled: { opacity: 0.45 }, buttonText: { color: '#fff', fontSize: 11, fontWeight: '800' }, formGrid: { flexDirection: 'row', gap: 7 }, formHalf: { flex: 1 }, csvInput: { minHeight: 120, marginTop: 10 }, buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }, successText: { color: palette.green, fontSize: 10, fontWeight: '700', marginTop: 6 }, errorText: { color: '#C65D63', fontSize: 10, fontWeight: '700', marginTop: 5 }, wordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }, wordBadge: { width: 41, minHeight: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }, wordBadgeText: { color: '#40516A', fontSize: 8, fontWeight: '800', textAlign: 'center' }, wordLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, wordTerm: { color: palette.ink, fontSize: 14, fontWeight: '800' }, wordPhonetic: { color: '#9AA5B5', fontSize: 9 }, wordMeaning: { color: '#536178', fontSize: 10, marginTop: 3 }, wordExample: { color: '#8A96A8', fontSize: 9, marginTop: 4 }, wordMeta: { color: '#9AA5B5', fontSize: 8, marginTop: 5 }, removeMark: { color: '#A5AFBD', fontSize: 21, paddingHorizontal: 5 }, cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, moduleMark: { width: 35, height: 35, borderRadius: 11, backgroundColor: '#EEF0FF', justifyContent: 'center', alignItems: 'center', marginRight: 9 }, moduleMarkText: { color: palette.blue, fontSize: 17 }, savedText: { color: palette.green, fontSize: 9, fontWeight: '700' }, divider: { height: 1, backgroundColor: palette.line, marginVertical: 12 }, moduleCatalog: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 7 }, catalogItem: { width: '24%', alignItems: 'center', paddingVertical: 7 }, moduleIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, moduleGlyph: { color: '#34445D', fontWeight: '800', fontSize: 15 }, catalogLabel: { color: '#55637A', fontSize: 8, marginTop: 4, textAlign: 'center' }, moduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 11, borderWidth: 1, borderColor: 'transparent' }, moduleSelected: { borderColor: '#AAB8FF' }, moduleDisabled: { opacity: 0.5 }, moduleTitle: { color: palette.ink, fontSize: 11, fontWeight: '800' }, flowConnector: { width: 1, height: 13, backgroundColor: '#CBD4E1', marginLeft: 30 }, reorder: { color: '#65738A', fontSize: 16, fontWeight: '800', paddingHorizontal: 5 }, faint: { color: '#DCE2EA' }, moduleEditor: { marginLeft: 12, backgroundColor: '#F0F3FF' }, stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#E3E8F0', borderRadius: 9, backgroundColor: '#fff', paddingHorizontal: 9 }, stepperButton: { color: palette.blue, fontSize: 17, fontWeight: '700', padding: 2 }, stepperValue: { color: palette.ink, fontSize: 10, fontWeight: '800' }, deleteText: { color: '#C65D63', fontSize: 9, textAlign: 'right', marginTop: 8, fontWeight: '700' }, branchCard: { backgroundColor: '#FFF9EF' }, spaceTop: { marginTop: 16 }, countControl: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.canvas, borderRadius: 12, padding: 8 }, countButton: { width: 35, height: 35, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }, countButtonText: { color: palette.blue, fontSize: 18 }, countValue: { color: palette.ink, fontSize: 21, fontWeight: '800' }, countUnit: { color: palette.muted, fontSize: 11, fontWeight: '500' }, deckSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F2F5', gap: 9 }, checkBox: { width: 20, height: 20, borderWidth: 1, borderColor: '#CBD4E1', borderRadius: 6 }, checkBoxOn: { backgroundColor: palette.blue, borderColor: palette.blue, alignItems: 'center', justifyContent: 'center' }, checkMark: { color: '#fff', fontSize: 12, fontWeight: '800' }, deckName: { color: palette.ink, fontSize: 10, fontWeight: '700' }, deckCount: { color: palette.muted, fontSize: 9 }, planSummary: { backgroundColor: '#EFF7F3' }, sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, marginBottom: 15 }, linkText: { color: palette.blue, fontSize: 10, fontWeight: '800' }, runningPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F6F0', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12 }, runningText: { color: palette.green, fontSize: 9, fontWeight: '700' }, progressTrack: { height: 5, backgroundColor: '#E3E8EF', overflow: 'hidden', borderRadius: 3, marginTop: 12 }, progressFill: { height: '100%', backgroundColor: palette.blue, borderRadius: 3 }, flowProgress: { flexDirection: 'row', marginVertical: 17 }, flowProgressItem: { flex: 1, alignItems: 'center', paddingHorizontal: 2 }, flowProgressDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D8DEE8', marginBottom: 5 }, flowProgressCurrent: { backgroundColor: palette.blue }, flowProgressDone: { backgroundColor: palette.green }, flowProgressLabel: { color: '#99A4B3', fontSize: 7, textAlign: 'center' }, activeText: { color: palette.blue, fontWeight: '800' }, studyCard: { padding: 18, marginTop: 4, minHeight: 300, justifyContent: 'center' }, tag: { color: palette.blue, backgroundColor: '#EDF0FF', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, fontSize: 8, fontWeight: '800', overflow: 'hidden' }, studyWord: { color: palette.ink, fontSize: 33, fontWeight: '800', textAlign: 'center', marginTop: 44 }, studyPhonetic: { color: '#9AA5B5', textAlign: 'center', fontSize: 12, marginTop: 8 }, studyMeaning: { color: palette.ink, fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 22, marginTop: 20 }, speakButton: { alignSelf: 'center', backgroundColor: '#EAF6F0', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 10, marginTop: 14 }, speakText: { color: palette.green, fontSize: 10, fontWeight: '800' }, promptLabel: { color: palette.muted, textAlign: 'center', fontSize: 10, marginTop: 35 }, spellInput: { marginTop: 16 }, contextText: { color: '#68758A', fontSize: 10, lineHeight: 18, textAlign: 'center', marginTop: 16 }, revealButton: { alignSelf: 'center', backgroundColor: '#F2F4F8', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 9, marginTop: 22 }, revealText: { color: '#66748A', fontSize: 9, fontWeight: '700' }, answerBox: { borderTopWidth: 1, borderTopColor: palette.line, marginTop: 18, paddingTop: 8 }, ratingRow: { flexDirection: 'row', gap: 9, marginTop: 17 }, ratingButton: { flex: 1, alignItems: 'center', borderRadius: 13, paddingVertical: 12 }, ratingMiss: { backgroundColor: '#FFF0EC' }, ratingKnown: { backgroundColor: '#E7F6EF' }, ratingEmoji: { color: palette.blue, fontSize: 16, fontWeight: '800' }, ratingText: { color: palette.ink, fontSize: 10, fontWeight: '800', marginTop: 4 }, wordFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 19, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10 }, branchIcon: { color: '#BB7A24', fontSize: 28, textAlign: 'center' }, sessionFoot: { color: palette.muted, fontSize: 9, lineHeight: 14, marginTop: 10, textAlign: 'center' }, centerLink: { alignItems: 'center', padding: 12 }, bottomNav: { minHeight: 60, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 7, paddingBottom: 4 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { color: '#A5AFBD', fontSize: 16, fontWeight: '700' }, navIconActive: { color: palette.blue }, navLabel: { color: '#9BA6B5', fontSize: 8, fontWeight: '600', marginTop: 2 }, navLabelActive: { color: palette.blue, fontWeight: '800' }, statCard: { width: '48%', marginBottom: 0 }, statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 11 }, bigStat: { color: palette.blue, fontSize: 25, fontWeight: '800' }, performanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13, gap: 8 }, performanceName: { width: 66, color: '#526078', fontSize: 9 }, performanceTrack: { flex: 1, height: 6, backgroundColor: '#E9EDF3', borderRadius: 3, overflow: 'hidden' }, performanceFill: { height: '100%', backgroundColor: '#54B78F' }, performanceValue: { width: 27, textAlign: 'right', color: palette.muted, fontSize: 8 }, mistakeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F3F6' }, mistakeTerm: { color: palette.ink, fontSize: 11, fontWeight: '800' }, empty: { alignItems: 'center', paddingVertical: 28 },
});
