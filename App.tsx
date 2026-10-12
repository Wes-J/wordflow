import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ModuleKind = 'recognize' | 'recall' | 'listen' | 'spell' | 'example' | 'retry' | 'branch';
type FlowModule = { id: string; kind: ModuleKind; title: string; subtitle: string; color: string; enabled: boolean; seconds: number };
type Tab = 'flow' | 'plan' | 'learn';
const STORAGE_KEY = 'wordflow-v1';

const initialModules: FlowModule[] = [
  { id: 'm1', kind: 'recognize', title: '看词回忆', subtitle: '先看英文单词，尝试回忆含义', color: '#DDEBFF', enabled: true, seconds: 8 },
  { id: 'm2', kind: 'recall', title: '自测释义', subtitle: '点击显示答案并进行自我评分', color: '#E5E0FF', enabled: true, seconds: 12 },
  { id: 'm3', kind: 'branch', title: '判断掌握程度', subtitle: '答错进入强化；答对继续学习', color: '#FFE6C7', enabled: true, seconds: 0 },
  { id: 'm4', kind: 'listen', title: '听发音', subtitle: '播放单词发音，熟悉读音', color: '#D9F3E8', enabled: true, seconds: 6 },
  { id: 'm5', kind: 'example', title: '例句填空', subtitle: '在语境中巩固单词用法', color: '#FFE0E8', enabled: false, seconds: 15 },
];

const catalog: Omit<FlowModule, 'id' | 'enabled'>[] = [
  { kind: 'recognize', title: '看词回忆', subtitle: '看单词，回忆词义', color: '#DDEBFF', seconds: 8 },
  { kind: 'recall', title: '自测释义', subtitle: '主动回忆并自我评分', color: '#E5E0FF', seconds: 12 },
  { kind: 'listen', title: '听发音', subtitle: '播放标准发音', color: '#D9F3E8', seconds: 6 },
  { kind: 'spell', title: '拼写练习', subtitle: '根据释义拼写单词', color: '#FFF0C7', seconds: 18 },
  { kind: 'example', title: '例句填空', subtitle: '在语境中练习用法', color: '#FFE0E8', seconds: 15 },
  { kind: 'retry', title: '错词重练', subtitle: '将答错单词加入强化队列', color: '#FFDCD3', seconds: 10 },
  { kind: 'branch', title: '条件分支', subtitle: '按答题结果进入不同步骤', color: '#FFE6C7', seconds: 0 },
];

const words = [
  { word: 'resilient', phonetic: '/rɪˈzɪliənt/', meaning: '有韧性的；能迅速恢复的', example: 'She remained resilient through every challenge.' },
  { word: 'curious', phonetic: '/ˈkjʊriəs/', meaning: '好奇的；求知欲强的', example: 'A curious mind keeps asking why.' },
  { word: 'approach', phonetic: '/əˈproʊtʃ/', meaning: '方法；接近；着手处理', example: 'We need a new approach to learning.' },
];

const colors = {
  ink: '#17243A', muted: '#718096', line: '#E8EDF3', canvas: '#F6F8FB', blue: '#4361EE', green: '#169B72',
};

export default function App() {
  const [tab, setTab] = useState<Tab>('flow');
  const [modules, setModules] = useState(initialModules);
  const [selected, setSelected] = useState('m1');
  const [dailyCount, setDailyCount] = useState('20');
  const [planName, setPlanName] = useState('轻量日常复习');
  const [reminder, setReminder] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [showCatalog, setShowCatalog] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const nextModuleId = useRef(100);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) {
        const saved = JSON.parse(value) as { modules?: FlowModule[]; dailyCount?: string; planName?: string; reminder?: boolean };
        if (saved.modules) setModules(saved.modules);
        if (saved.dailyCount) setDailyCount(saved.dailyCount);
        if (saved.planName) setPlanName(saved.planName);
        if (typeof saved.reminder === 'boolean') setReminder(saved.reminder);
      }
    }).catch(() => undefined).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ modules, dailyCount, planName, reminder })).catch(() => undefined);
  }, [hydrated, modules, dailyCount, planName, reminder]);

  const activeCount = modules.filter((item) => item.enabled).length;
  const totalSeconds = useMemo(() => modules.filter((item) => item.enabled).reduce((sum, item) => sum + item.seconds, 0), [modules]);
  const currentWord = words[wordIndex % words.length];

  const updateModule = (id: string, patch: Partial<FlowModule>) => setModules((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const moveModule = (id: string, direction: -1 | 1) => setModules((items) => {
    const from = items.findIndex((item) => item.id === id);
    const to = from + direction;
    if (to < 0 || to >= items.length) return items;
    const copy = [...items]; [copy[from], copy[to]] = [copy[to], copy[from]]; return copy;
  });
  const addModule = (item: Omit<FlowModule, 'id' | 'enabled'>) => {
    nextModuleId.current += 1;
    const id = `m${nextModuleId.current}`;
    setModules((items) => [...items, { ...item, id, enabled: true }]);
    setSelected(id); setShowCatalog(false);
  };
  const removeModule = (id: string) => setModules((items) => items.filter((item) => item.id !== id));

  const finishWord = (knew: boolean) => {
    if (knew) setCompleted((n) => n + 1);
    setShowMeaning(false); setWordIndex((n) => n + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <View style={styles.topBar}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>W</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.brand}>词流 Wordflow</Text><Text style={styles.brandSub}>把复习流程，编成自己的节奏</Text></View>
        <TouchableOpacity style={styles.avatar} onPress={() => Alert.alert('学习者', '你的学习数据保存在本机。')}><Text style={styles.avatarText}>学</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'flow' && <>
          <View style={styles.eyebrowRow}><Text style={styles.eyebrow}>我的学习流程</Text><View style={styles.savedPill}><View style={styles.savedDot} /><Text style={styles.savedText}>已保存</Text></View></View>
          <View style={styles.titleRow}><View style={{ flex: 1 }}><Text style={styles.pageTitle}>搭建你的复习节奏</Text><Text style={styles.pageSubtitle}>像搭积木一样，把练习拼成适合自己的流程。</Text></View><TouchableOpacity style={styles.moreButton} onPress={() => Alert.alert('流程选项', '复制、重命名和分享功能即将加入。')}><Text style={styles.moreText}>•••</Text></TouchableOpacity></View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}><View style={styles.summaryIcon}><Text style={styles.summaryIconText}>✦</Text></View><View style={{ flex: 1 }}><Text style={styles.summaryLabel}>当前流程</Text><Text style={styles.summaryName}>轻量日常复习</Text></View><TouchableOpacity onPress={() => setTab('plan')}><Text style={styles.editLink}>计划设置 ›</Text></TouchableOpacity></View>
            <View style={styles.summaryDivider} />
            <View style={styles.metricsRow}><Metric value={`${activeCount}`} label="个练习模块" /><View style={styles.metricDivider} /><Metric value={`约 ${Math.max(1, Math.ceil(totalSeconds / 60))} 分钟`} label="每词用时" /><View style={styles.metricDivider} /><Metric value="每日 20 词" label="学习目标" /></View>
          </View>

          <View style={styles.sectionHeading}><View><Text style={styles.sectionTitle}>流程编排</Text><Text style={styles.sectionHint}>点击模块可编辑，使用箭头调整顺序</Text></View><TouchableOpacity style={styles.addButton} onPress={() => setShowCatalog((v) => !v)}><Text style={styles.addButtonText}>{showCatalog ? '收起' : '+ 添加模块'}</Text></TouchableOpacity></View>
          {showCatalog && <View style={styles.catalogCard}><Text style={styles.catalogTitle}>选择一个练习模块</Text><View style={styles.catalogGrid}>{catalog.map((item) => <TouchableOpacity key={item.kind} style={styles.catalogItem} onPress={() => addModule(item)}><View style={[styles.catalogIcon, { backgroundColor: item.color }]}><Text style={styles.moduleGlyph}>{glyph(item.kind)}</Text></View><Text style={styles.catalogItemText}>{item.title}</Text></TouchableOpacity>)}</View></View>}

          <View style={styles.flowList}>{modules.map((item, index) => <React.Fragment key={item.id}>
            {index > 0 && <View style={styles.connector}><View style={styles.connectorLine} /><View style={styles.connectorArrow}><Text style={styles.connectorArrowText}>⌄</Text></View></View>}
            <TouchableOpacity activeOpacity={0.88} onPress={() => setSelected(item.id)} style={[styles.moduleCard, selected === item.id && styles.moduleCardSelected, !item.enabled && styles.moduleCardDisabled]}>
              <View style={[styles.moduleIcon, { backgroundColor: item.color }]}><Text style={styles.moduleGlyph}>{glyph(item.kind)}</Text></View>
              <View style={styles.moduleCopy}><View style={styles.moduleTitleRow}><Text style={[styles.moduleTitle, !item.enabled && styles.disabledText]}>{index + 1}. {item.title}</Text>{item.kind === 'branch' && <View style={styles.branchTag}><Text style={styles.branchTagText}>分支</Text></View>}</View><Text style={styles.moduleSubtitle}>{item.subtitle}</Text>{item.enabled && item.seconds > 0 && <Text style={styles.duration}>◷ 约 {item.seconds} 秒</Text>}</View>
              <View style={styles.moduleActions}><TouchableOpacity style={styles.moveButton} onPress={() => moveModule(item.id, -1)} disabled={index === 0}><Text style={[styles.moveText, index === 0 && styles.faint]}>↑</Text></TouchableOpacity><TouchableOpacity style={styles.moveButton} onPress={() => moveModule(item.id, 1)} disabled={index === modules.length - 1}><Text style={[styles.moveText, index === modules.length - 1 && styles.faint]}>↓</Text></TouchableOpacity></View>
            </TouchableOpacity>
            {selected === item.id && <View style={styles.editorCard}><View style={styles.editorTop}><View style={{ flex: 1 }}><Text style={styles.editorTitle}>模块设置</Text><Text style={styles.editorSubtitle}>调整练习方式与预计时长</Text></View><Switch value={item.enabled} onValueChange={(enabled) => updateModule(item.id, { enabled })} trackColor={{ false: '#D7DEE8', true: '#9DADF9' }} thumbColor={item.enabled ? colors.blue : '#fff'} /></View><View style={styles.editorDivider} /><Text style={styles.inputLabel}>模块名称</Text><TextInput value={item.title} onChangeText={(title) => updateModule(item.id, { title })} style={styles.textInput} /><View style={styles.editorBottom}><Text style={styles.inputLabel}>单词停留时间（秒）</Text><View style={styles.stepper}><TouchableOpacity onPress={() => updateModule(item.id, { seconds: Math.max(0, item.seconds - 2) })} style={styles.stepButton}><Text style={styles.stepText}>−</Text></TouchableOpacity><Text style={styles.stepValue}>{item.seconds}</Text><TouchableOpacity onPress={() => updateModule(item.id, { seconds: item.seconds + 2 })} style={styles.stepButton}><Text style={styles.stepText}>＋</Text></TouchableOpacity></View></View><TouchableOpacity style={styles.deleteLink} onPress={() => removeModule(item.id)}><Text style={styles.deleteText}>移除此模块</Text></TouchableOpacity></View>}
          </React.Fragment>)}</View>
          <TouchableOpacity style={styles.branchAdd} onPress={() => addModule(catalog[6])}><Text style={styles.branchAddPlus}>＋</Text><Text style={styles.branchAddText}>添加条件分支</Text><Text style={styles.branchAddHint}>答对、答错或超时后执行不同练习</Text></TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setTab('learn')}><Text style={styles.primaryButtonText}>▶  预览学习流程</Text></TouchableOpacity>
          <View style={styles.tipCard}><Text style={styles.tipIcon}>✦</Text><View style={{ flex: 1 }}><Text style={styles.tipTitle}>给你一个小建议</Text><Text style={styles.tipText}>可以添加“错词重练”模块，并把它放在流程末尾，集中巩固今天不熟悉的词。</Text></View></View>
        </>}

        {tab === 'plan' && <>
          <Text style={styles.eyebrow}>学习计划</Text><Text style={styles.pageTitle}>安排适合你的节奏</Text><Text style={styles.pageSubtitle}>把流程和词库组合成每天可执行的计划。</Text>
          <View style={styles.planCard}><Text style={styles.inputLabel}>计划名称</Text><TextInput value={planName} onChangeText={setPlanName} style={styles.textInput} /><Text style={[styles.inputLabel, { marginTop: 20 }]}>选择学习流程</Text><TouchableOpacity style={styles.selectRow} onPress={() => setTab('flow')}><Text style={styles.selectValue}>轻量日常复习</Text><Text style={styles.selectArrow}>›</Text></TouchableOpacity><Text style={[styles.inputLabel, { marginTop: 20 }]}>每日新词与复习量</Text><View style={styles.countControl}><TouchableOpacity onPress={() => setDailyCount(String(Math.max(5, Number(dailyCount) - 5)))} style={styles.countButton}><Text style={styles.countButtonText}>−</Text></TouchableOpacity><Text style={styles.countValue}>{dailyCount}<Text style={styles.countUnit}> 词 / 天</Text></Text><TouchableOpacity onPress={() => setDailyCount(String(Number(dailyCount) + 5))} style={styles.countButton}><Text style={styles.countButtonText}>＋</Text></TouchableOpacity></View><View style={styles.planDivider} /><View style={styles.reminderRow}><View style={{ flex: 1 }}><Text style={styles.reminderTitle}>每日学习提醒</Text><Text style={styles.reminderHint}>在你选定的时间提醒复习</Text></View><Switch value={reminder} onValueChange={setReminder} trackColor={{ false: '#D7DEE8', true: '#9DADF9' }} thumbColor={reminder ? colors.blue : '#fff'} /></View><View style={styles.reminderRow}><View style={{ flex: 1 }}><Text style={styles.reminderTitle}>答错后加入错词本</Text><Text style={styles.reminderHint}>下次复习优先出现</Text></View><Switch value trackColor={{ false: '#D7DEE8', true: '#9DADF9' }} thumbColor={colors.blue} /></View></View>
          <View style={styles.weekCard}><Text style={styles.sectionTitle}>本周学习安排</Text><Text style={styles.moduleSubtitle}>每天完成约 {dailyCount} 个单词，系统按记忆情况安排复习。</Text><View style={styles.weekRow}>{['一','二','三','四','五','六','日'].map((day, i) => <View key={day} style={styles.dayColumn}><View style={[styles.dayDot, i < 5 && styles.dayDotActive]}><Text style={[styles.dayCheck, i < 5 && styles.dayCheckActive]}>{i < 5 ? '✓' : ''}</Text></View><Text style={styles.dayLabel}>{day}</Text></View>)}</View><View style={styles.weekLegend}><View style={styles.legendDot} /><Text style={styles.legendText}>计划学习</Text><View style={[styles.legendDot, { backgroundColor: '#E7EBF1', marginLeft: 14 }]} /><Text style={styles.legendText}>休息日</Text></View></View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => Alert.alert('计划已保存', `「${planName}」已保存到当前设备。`)}><Text style={styles.primaryButtonText}>保存学习计划</Text></TouchableOpacity>
        </>}

        {tab === 'learn' && <>
          <View style={styles.learnTop}><TouchableOpacity onPress={() => setTab('flow')} style={styles.backButton}><Text style={styles.backText}>‹  流程编辑</Text></TouchableOpacity><View style={styles.sessionPill}><View style={styles.sessionDot} /><Text style={styles.sessionText}>流程运行中</Text></View></View>
          <Text style={styles.eyebrow}>今日学习 · {completed}/{dailyCount} 词</Text><Text style={styles.pageTitle}>按你的流程开始复习</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, (completed / Number(dailyCount)) * 100)}%` }]} /></View>
          <View style={styles.stepStrip}>{modules.filter((item) => item.enabled).map((item, i) => <View key={item.id} style={styles.stepMini}><View style={[styles.stepMiniDot, i === 0 && styles.stepMiniActive]} /><Text style={[styles.stepMiniLabel, i === 0 && styles.stepMiniLabelActive]} numberOfLines={1}>{item.title}</Text></View>)}</View>
          <View style={styles.wordCard}><View style={styles.wordCardTop}><View style={styles.wordTag}><Text style={styles.wordTagText}>今日词汇</Text></View><Text style={styles.wordCounter}>词卡 {completed + 1}</Text></View><Text style={styles.wordText}>{currentWord.word}</Text><Text style={styles.phonetic}>{currentWord.phonetic}</Text><View style={styles.wordDivider} />{showMeaning ? <View style={styles.meaningArea}><Text style={styles.meaningText}>{currentWord.meaning}</Text><Text style={styles.exampleText}>{currentWord.example}</Text></View> : <TouchableOpacity style={styles.revealButton} onPress={() => setShowMeaning(true)}><Text style={styles.revealText}>轻触查看释义</Text></TouchableOpacity>}<View style={styles.wordCardFooter}><Text style={styles.moduleSubtitle}>当前步骤：看词回忆</Text><Text style={styles.duration}>◷ 8 秒</Text></View></View>
          {!showMeaning ? <TouchableOpacity style={styles.primaryButton} onPress={() => setShowMeaning(true)}><Text style={styles.primaryButtonText}>显示释义</Text></TouchableOpacity> : <View style={styles.ratingRow}><TouchableOpacity style={styles.ratingButton} onPress={() => finishWord(false)}><Text style={styles.ratingIcon}>↻</Text><Text style={styles.ratingLabel}>没记住</Text><Text style={styles.ratingTime}>稍后再练</Text></TouchableOpacity><TouchableOpacity style={[styles.ratingButton, styles.ratingGood]} onPress={() => finishWord(true)}><Text style={styles.ratingIcon}>✓</Text><Text style={styles.ratingLabel}>记住了</Text><Text style={styles.ratingTime}>继续下一词</Text></TouchableOpacity></View>}
          <View style={styles.learnNote}><Text style={styles.tipIcon}>✦</Text><Text style={styles.tipText}>本流程包含 {activeCount} 个练习模块。答题结果会影响后续复习安排。</Text></View>
        </>}
      </ScrollView>
      <View style={styles.bottomNav}>{([['flow','流程'],['plan','计划'],['learn','学习']] as [Tab,string][]).map(([key, label]) => <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.navItem}><Text style={[styles.navIcon, tab === key && styles.navIconActive]}>{key === 'flow' ? '▤' : key === 'plan' ? '▦' : '◉'}</Text><Text style={[styles.navLabel, tab === key && styles.navLabelActive]}>{label}</Text></TouchableOpacity>)}</View>
    </SafeAreaView>
  );
}

function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function glyph(kind: ModuleKind) { return ({ recognize: 'Aa', recall: '✓', listen: '♫', spell: '✎', example: '文', retry: '↻', branch: '⑂' } as Record<ModuleKind, string>)[kind]; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: colors.canvas }, brandMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, brandMarkText: { color: '#fff', fontSize: 21, fontWeight: '800' }, brand: { color: colors.ink, fontWeight: '800', fontSize: 16, letterSpacing: -0.3 }, brandSub: { color: colors.muted, fontSize: 10, marginTop: 2 }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E6EAF3', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#55637A', fontWeight: '700', fontSize: 12 }, scrollContent: { paddingHorizontal: 20, paddingBottom: 34 }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }, eyebrow: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 7 }, savedPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6F6F0', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }, savedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green, marginRight: 5 }, savedText: { color: colors.green, fontSize: 10, fontWeight: '700' }, titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 }, pageTitle: { color: colors.ink, fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 5 }, pageSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, moreButton: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 10 }, moreText: { color: colors.muted, fontWeight: '800', letterSpacing: 2 }, summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginTop: 18, shadowColor: '#26344A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 13, elevation: 2 }, summaryTop: { flexDirection: 'row', alignItems: 'center' }, summaryIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#EEF0FF', alignItems: 'center', justifyContent: 'center', marginRight: 11 }, summaryIconText: { color: colors.blue, fontSize: 19 }, summaryLabel: { color: colors.muted, fontSize: 10 }, summaryName: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 2 }, editLink: { color: colors.blue, fontSize: 10, fontWeight: '700' }, summaryDivider: { height: 1, backgroundColor: colors.line, marginVertical: 14 }, metricsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, metric: { flex: 1, alignItems: 'center' }, metricValue: { color: colors.ink, fontSize: 12, fontWeight: '800' }, metricLabel: { color: colors.muted, fontSize: 9, marginTop: 5 }, metricDivider: { width: 1, height: 25, backgroundColor: colors.line }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 11 }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' }, sectionHint: { color: colors.muted, fontSize: 10, marginTop: 4 }, addButton: { borderWidth: 1, borderColor: '#DCE3F0', backgroundColor: '#fff', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11 }, addButtonText: { color: colors.blue, fontSize: 10, fontWeight: '800' }, catalogCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12 }, catalogTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 12 }, catalogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, catalogItem: { width: '22%', alignItems: 'center', paddingVertical: 6 }, catalogIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, catalogItemText: { color: '#4F5E73', fontSize: 9, marginTop: 5, textAlign: 'center' }, flowList: { paddingBottom: 1 }, moduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: 'transparent' }, moduleCardSelected: { borderColor: '#AAB8FF', shadowColor: '#5367CE', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 1 }, moduleCardDisabled: { opacity: 0.58 }, moduleIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, moduleGlyph: { color: '#33425B', fontSize: 17, fontWeight: '800' }, moduleCopy: { flex: 1 }, moduleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, moduleTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, disabledText: { color: colors.muted }, branchTag: { backgroundColor: '#FFF1DE', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 }, branchTagText: { color: '#B97524', fontSize: 8, fontWeight: '800' }, moduleSubtitle: { color: colors.muted, fontSize: 9, marginTop: 4, lineHeight: 14 }, duration: { color: '#8A96A8', fontSize: 9, marginTop: 5 }, moduleActions: { marginLeft: 7, flexDirection: 'column', alignItems: 'center' }, moveButton: { width: 26, height: 24, alignItems: 'center', justifyContent: 'center' }, moveText: { color: '#65738A', fontSize: 15, fontWeight: '800' }, faint: { color: '#DCE2EA' }, connector: { height: 20, marginLeft: 33, alignItems: 'flex-start', justifyContent: 'center' }, connectorLine: { height: 20, width: 1.5, backgroundColor: '#CBD4E1', position: 'absolute', left: 0 }, connectorArrow: { position: 'absolute', left: -5, bottom: -1, width: 11, height: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }, connectorArrowText: { color: '#A1ADBC', fontSize: 12, lineHeight: 12, fontWeight: '700' }, editorCard: { backgroundColor: '#F0F3FF', borderRadius: 15, padding: 13, marginTop: 8, marginBottom: 4, marginLeft: 13, borderWidth: 1, borderColor: '#E2E7FF' }, editorTop: { flexDirection: 'row', alignItems: 'center' }, editorTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, editorSubtitle: { color: colors.muted, fontSize: 9, marginTop: 3 }, editorDivider: { height: 1, backgroundColor: '#DDE3F3', marginVertical: 11 }, inputLabel: { color: '#647188', fontSize: 10, fontWeight: '700', marginBottom: 6 }, textInput: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5EAF2', paddingHorizontal: 11, paddingVertical: 9, color: colors.ink, fontSize: 12 }, editorBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }, stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 9, borderWidth: 1, borderColor: '#E5EAF2' }, stepButton: { width: 32, height: 29, alignItems: 'center', justifyContent: 'center' }, stepText: { color: colors.blue, fontSize: 17, fontWeight: '700' }, stepValue: { minWidth: 27, textAlign: 'center', color: colors.ink, fontSize: 11, fontWeight: '800' }, deleteLink: { alignSelf: 'flex-end', marginTop: 9, padding: 3 }, deleteText: { color: '#C85A61', fontSize: 9, fontWeight: '700' }, branchAdd: { borderWidth: 1, borderColor: '#D8E0EC', borderStyle: 'dashed', borderRadius: 15, marginTop: 17, padding: 13, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBFCFE' }, branchAddPlus: { fontSize: 18, color: colors.blue, marginRight: 9 }, branchAddText: { color: colors.ink, fontSize: 10, fontWeight: '800', marginRight: 8 }, branchAddHint: { color: colors.muted, fontSize: 8, flex: 1 }, primaryButton: { backgroundColor: colors.blue, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 18, shadowColor: colors.blue, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 3 }, primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 12 }, tipCard: { flexDirection: 'row', backgroundColor: '#EFF7F3', padding: 13, borderRadius: 14, marginTop: 16, gap: 9 }, tipIcon: { color: '#23A276', fontSize: 15, fontWeight: '800' }, tipTitle: { color: '#327A63', fontSize: 10, fontWeight: '800' }, tipText: { color: '#68867C', fontSize: 9, lineHeight: 15, marginTop: 4 }, bottomNav: { height: 63, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingBottom: 4 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { color: '#A5AFBD', fontSize: 17, fontWeight: '700' }, navIconActive: { color: colors.blue }, navLabel: { color: '#9BA6B5', fontSize: 9, fontWeight: '600', marginTop: 2 }, navLabelActive: { color: colors.blue, fontWeight: '800' }, planCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 19 }, selectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E5EAF2', padding: 12 }, selectValue: { color: colors.ink, fontSize: 12, fontWeight: '600' }, selectArrow: { color: colors.muted, fontSize: 20 }, countControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 13, backgroundColor: colors.canvas, padding: 9 }, countButton: { width: 39, height: 39, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, countButtonText: { color: colors.blue, fontSize: 19, fontWeight: '600' }, countValue: { color: colors.ink, fontSize: 22, fontWeight: '800' }, countUnit: { color: colors.muted, fontSize: 12, fontWeight: '500' }, planDivider: { height: 1, backgroundColor: colors.line, marginVertical: 8 }, reminderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }, reminderTitle: { color: colors.ink, fontSize: 11, fontWeight: '700' }, reminderHint: { color: colors.muted, fontSize: 9, marginTop: 3 }, weekCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 15 }, weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }, dayColumn: { alignItems: 'center', gap: 7 }, dayDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center' }, dayDotActive: { backgroundColor: '#E1F4EC' }, dayCheck: { color: 'transparent', fontSize: 12 }, dayCheckActive: { color: colors.green, fontWeight: '800' }, dayLabel: { color: colors.muted, fontSize: 9 }, weekLegend: { flexDirection: 'row', alignItems: 'center', marginTop: 18 }, legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green, marginRight: 5 }, legendText: { color: colors.muted, fontSize: 9 }, learnTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3, marginBottom: 19 }, backButton: { paddingVertical: 8, paddingRight: 8 }, backText: { color: colors.blue, fontSize: 11, fontWeight: '800' }, sessionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E9F7F1', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12 }, sessionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green, marginRight: 5 }, sessionText: { color: colors.green, fontSize: 9, fontWeight: '800' }, progressTrack: { height: 6, backgroundColor: '#E5E9F0', borderRadius: 4, marginTop: 15, overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: colors.blue, borderRadius: 4 }, stepStrip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 9 }, stepMini: { flex: 1, alignItems: 'center', paddingHorizontal: 2 }, stepMiniDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D7DDE7', marginBottom: 5 }, stepMiniActive: { backgroundColor: colors.blue }, stepMiniLabel: { color: '#9BA6B5', fontSize: 7, textAlign: 'center' }, stepMiniLabelActive: { color: colors.blue, fontWeight: '800' }, wordCard: { minHeight: 325, backgroundColor: '#fff', borderRadius: 23, padding: 21, marginTop: 14, shadowColor: '#26344A', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 3 }, wordCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, wordTag: { backgroundColor: '#EEF0FF', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 }, wordTagText: { color: colors.blue, fontSize: 9, fontWeight: '800' }, wordCounter: { color: colors.muted, fontSize: 9 }, wordText: { color: colors.ink, fontSize: 36, fontWeight: '800', textAlign: 'center', marginTop: 56, letterSpacing: -1 }, phonetic: { color: '#9AA5B5', fontSize: 13, textAlign: 'center', marginTop: 8 }, wordDivider: { height: 1, backgroundColor: colors.line, marginTop: 30 }, revealButton: { alignSelf: 'center', backgroundColor: '#F7F8FA', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, marginTop: 22 }, revealText: { color: colors.muted, fontSize: 10 }, meaningArea: { alignItems: 'center', marginTop: 20 }, meaningText: { color: colors.ink, fontSize: 16, fontWeight: '800' }, exampleText: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 18, marginTop: 9 }, wordCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.line }, ratingRow: { flexDirection: 'row', gap: 11, marginTop: 16 }, ratingButton: { flex: 1, alignItems: 'center', backgroundColor: '#FFF0EC', borderRadius: 15, paddingVertical: 12 }, ratingGood: { backgroundColor: '#E8F7F1' }, ratingIcon: { color: colors.blue, fontSize: 18, fontWeight: '800' }, ratingLabel: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 4 }, ratingTime: { color: colors.muted, fontSize: 8, marginTop: 3 }, learnNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, backgroundColor: '#EEF1FF', borderRadius: 13, marginTop: 15 },
});
