const EXTENSION_ID = 'story-outline-studio';
const METADATA_KEY = 'storyOutlineStudio';
const CHAT_WORLD_INFO_KEY = 'world_info';
const PROMPT_KEY = 'story-outline-studio-continuity';
const EMBEDDED_CHARACTER_BOOK_KEY = '__story_outline_character_book__';
const VERSION = 17;

// Load core modules after the extension script itself has been evaluated. This
// avoids the script.js <-> st-context.js cycle preventing the public API from
// being registered during startup.
let getContext;
let worldInfoModule;
let createWorldInfoEntry;
let loadWorldInfo;
let saveWorldInfo;
let updateWorldInfoList;
let getWorldInfoSettings;
let getCharaFilename;
let power_user;
let POPUP_TYPE;
let SlashCommandParser;
let SlashCommand;
let dependenciesReady = false;
let dependencyError = null;

const dependencyPromise = new Promise(resolve => setTimeout(resolve, 0)).then(() => Promise.all([
    import('../../../st-context.js'),
    import('../../../world-info.js'),
    import('../../../utils.js'),
    import('../../../power-user.js'),
    import('../../../popup.js'),
    import('../../../slash-commands/SlashCommandParser.js'),
    import('../../../slash-commands/SlashCommand.js'),
])).then(([contextModule, importedWorldInfoModule, utilsModule, powerUserModule, popupModule, parserModule, commandModule]) => {
    getContext = contextModule.getContext;
    worldInfoModule = importedWorldInfoModule;
    ({ createWorldInfoEntry, loadWorldInfo, saveWorldInfo, updateWorldInfoList, getWorldInfoSettings } = importedWorldInfoModule);
    ({ getCharaFilename } = utilsModule);
    ({ power_user } = powerUserModule);
    ({ POPUP_TYPE } = popupModule);
    ({ SlashCommandParser } = parserModule);
    ({ SlashCommand } = commandModule);
    dependenciesReady = true;
}).catch(error => {
    dependencyError = error;
    console.error(`[${EXTENSION_ID}] failed to load SillyTavern modules`, error);
    throw error;
});

const BACKGROUNDS = [
    '古代', '架空古代', '现代都市', '校园', '职场', '民国', '年代文', '高干', '豪门世家', '娱乐圈',
    '维多利亚时代', '大正时代', '江户时代', '中世纪', '大海盗时代', '武侠江湖', '仙侠修真', '东方玄幻',
    '西方奇幻', '异世界', '神话传说', '洪荒世界', '科幻未来', '星际时代', '星球殖民', '赛博朋克',
    '蒸汽朋克', '机甲时代', '末世废土', '丧尸危机', '灵气复苏', '无限流世界', '灵异恐怖', '克苏鲁世界',
    'ABO世界', '兽人世界', '虫族世界', '女尊世界', '男尊世界', '平行世界', '时间循环', '规则怪谈世界',
    '快穿世界', '网游世界', '电竞圈', '架空历史', '王朝争霸', '种田乡村', '经营建设', '宅斗宅院', '宫廷后宫',
    '官场朝堂', '刑侦都市', '悬疑推理', '法医破案', '末日求生', '随身空间', '系统世界', '穿书世界',
    '重生世界', '古穿今', '今穿古',
];

const RELATIONSHIPS = [
    '青梅竹马', '天降', '同事', '同学', '室友', '上下级', '前辈与后辈', '学长与学弟', '学长与学妹',
    '学姐与学弟', '学姐与学妹', '学霸与学渣', '欢喜冤家', '死对头', '情敌', '前任',
    '监禁者与被监禁者', '控制与反控制',
    '暗卫与主人', '君臣', '师尊与徒弟', '师兄弟', '师兄妹', '师姐弟', '师姐妹', '道士与妖怪',
    '魔尊与仙尊', '正道与邪道', '修士与凡人', '宗主与弟子', '王与臣', '公主与骑士', '贵族与平民',
    '契约恶魔与召唤者', '契约者与被契约者', '人外', '饲养者与被饲养生物', '研究人员与被研究生物',
    '炉鼎与采补对象', '猎人与猎物', '医生与患者', '心理咨询师与来访者', '警察与嫌疑人', '侦探与委托人',
    '老板与金丝雀', '包养', '小三', '兄弟', '兄妹', '姐弟', '姐妹', '父子（真）',
    '父子（伪）', '父女（真）', '父女（伪）', '母子（真）', '母子（伪）', '母女（真）', '母女（伪）',
    '主仆', '恋人', '协议婚姻', '联姻', '搭档', '战友', '网友', '玩家与NPC', '宿敌', '共犯',
    '债主与欠债人', '师徒反转', '神明与信徒', '信徒与异端', '人类与AI', '人类与仿生人', '人类与精灵',
    '人类与吸血鬼', '人类与狼人', '神明与凡人', '师徒', '同门', '同袍', '上下属', '盟友', '政敌',
    '竞争对手', '邻居', '房东与租客', '顾客与店主', '警察与线人', '侦探与助手', '委托人与受托人',
];

const TROPES = [
    '先婚后爱', '契约婚姻', '闪婚', '替嫁', '破镜重圆', '久别重逢', '追妻火葬场', '追夫火葬场',
    '情敌变情人', '暗恋成真', '双向暗恋', '双向救赎', '强制爱', '囚禁', '黑化', '替身', '白月光',
    '相爱相杀', '双强对抗', '金丝雀', 'NPC有白月光',
    'user有白月光', 'user是万人嫌', 'user是万人迷', 'user是劣质Alpha', 'user是劣质Omega', 'user是Beta',
    'user是顶级Alpha', 'user是顶级Omega', 'user信息素与NPC100%匹配', 'user信息素与NPC匹配度极低',
    '真假千金', '身份互换', '身份掉马', '马甲', '掉马', '带球跑', '先虐后甜', '追妻修罗场', '火葬场文学',
    '白月光回国', '误会梗', '强取豪夺', '一见钟情', '日久生情', '见色起意', '蓄谋已久', '替身文学',
    '宿命感', '天作之合', '势均力敌', '年下', '年上', '忠犬', '疯批', '清冷', '病娇', '傲娇',
    '偏执', '救赎', '甜宠', '虐恋', '追妻', '团宠', '万人迷', '万人嫌', '修罗场', '三角关系', '多角关系',
    '轻喜剧', '日常治愈', '成长蜕变', '女性成长', '群像', '多线叙事', '单元剧', '公路叙事', '慢热', '快节奏',
    '高甜', '玻璃渣里找糖', '悲剧结局', '开放式结局', '反转结局', '伏笔回收', '悬念推进',
    '扮猪吃虎', '扮弱', '扮演任务', '任务世界', '系统任务', '快穿任务', '穿书改命', '重生复仇', '升级打怪',
    '打脸逆袭', '复仇虐渣', '废柴逆袭', '天才流', '无敌流', '升级流', '凡人流', '召唤契约', '御兽养成',
    '炼丹炼器', '宗门试炼', '渡劫飞升', '神魔大战', '诸天万界', '洪荒量劫', '轮回转世', '因果宿命',
    '江湖恩仇', '门派纷争', '朝堂权谋', '权谋斗争', '科举入仕', '经商致富', '基建发展', '女帝成长',
    '悬疑解谜', '密室推理', '诡案追凶', '刑侦破案', '法医探案', '灵异调查', '民俗怪谈', '克苏鲁惊悚', '无限副本',
    '副本闯关', '规则怪谈', '生存挑战', '末日同行', '公路求生', '丧尸生存', '废土求生', '星际战争', '机甲战斗',
    '虫族战争', '哨向设定', '时间循环破局', '赛博阴谋', '电竞夺冠', '网游副本', '直播逆袭', '娱乐圈翻身',
    '职场晋升', '商战博弈', '校园竞赛', '种田日常', '宫斗宅斗',
];

const LENGTHS = {
    short: { label: '短篇', softTarget: 400, minTurns: 0 },
    medium: { label: '中篇', softTarget: 700, minTurns: 20 },
    long: { label: '长篇', softTarget: 1000, minTurns: 50 },
};

let ctx = null;
let state = null;
let activeStage = 'config';
let panel = null;
let generating = false;
let generatingLabel = '正在生成中...';
let generationEpoch = 0;
let continuationGenerationInProgress = false;
let structuredGenerationInProgress = false;
let activeChatKey = '';
let generationIntent = 'continue';
let rewriteMessageIndex = -1;
let pendingRewriteAfterDeletion = false;
let buttonRetryTimer = null;
let buttonRetryCount = 0;
let loadedReferenceWorldBooks = new Map();
let referenceCacheContextKey = '';
let worldBookListLoaded = false;
let worldBookListError = '';

function contextCacheKey(context) {
    const chatId = text(context?.chatId) || text(context?.getCurrentChatId?.());
    return `${context?.groupId || ''}:${chatId}:${context?.characterId ?? ''}`;
}

function refreshContext() {
    if (!dependenciesReady || typeof getContext !== 'function') {
        throw dependencyError || new Error('酒馆核心模块仍在加载，请稍后重试。');
    }
    ctx = getContext();
    const nextKey = contextCacheKey(ctx);
    if (referenceCacheContextKey && referenceCacheContextKey !== nextKey) {
        loadedReferenceWorldBooks = new Map();
        worldBookListLoaded = false;
        worldBookListError = '';
    }
    referenceCacheContextKey = nextKey;
    return ctx;
}

const clone = value => JSON.parse(JSON.stringify(value));
const asArray = value => Array.isArray(value) ? value.filter(Boolean).map(String) : [];

function worldBookEntryValue(entry, index = 0) {
    if (!entry || typeof entry !== 'object') throw new Error(`世界书条目 ${index + 1} 格式无效。`);
    const normalized = { ...entry };
    const uid = normalized.uid ?? normalized.id ?? index;
    normalized.uid = String(uid);
    if (normalized.key === undefined && normalized.keys !== undefined) normalized.key = normalized.keys;
    if (normalized.keysecondary === undefined && normalized.secondary_keys !== undefined) normalized.keysecondary = normalized.secondary_keys;
    normalized.key = Array.isArray(normalized.key) ? normalized.key : asList(normalized.key);
    normalized.keysecondary = Array.isArray(normalized.keysecondary) ? normalized.keysecondary : asList(normalized.keysecondary);
    normalized.content = text(normalized.content ?? normalized.description);
    return normalized;
}

function unwrapWorldBookData(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    if (value.entries !== undefined) return value;
    if (value.character_book && typeof value.character_book === 'object') return value.character_book;
    for (const key of ['data', 'result', 'response', 'originalData']) {
        if (value[key] !== undefined) {
            const nested = unwrapWorldBookData(value[key]);
            if (nested !== value[key] || nested?.entries !== undefined || nested?.character_book) return nested;
        }
    }
    return value;
}

function normalizeWorldBookEntries(value) {
    const source = unwrapWorldBookData(value);
    const rawEntries = source?.entries;
    if (rawEntries === undefined) {
        throw new Error('世界书格式无效：缺少 entries。');
    }
    if (Array.isArray(rawEntries)) {
        return Object.fromEntries(rawEntries.map((entry, index) => {
            const normalized = worldBookEntryValue(entry, index);
            return [normalized.uid, normalized];
        }));
    }
    if (!rawEntries || typeof rawEntries !== 'object') {
        throw new Error('世界书格式无效：entries 必须是数组或对象。');
    }
    return Object.fromEntries(Object.entries(rawEntries).map(([key, entry], index) => {
        const normalized = worldBookEntryValue(entry, index);
        const entryId = entry.uid ?? entry.id ?? key;
        normalized.uid = String(entryId);
        return [String(entryId), normalized];
    }));
}

function normalizeWorldBookData(value) {
    const source = unwrapWorldBookData(value);
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
        throw new Error('世界书格式无效：必须是对象。');
    }
    if (source.entries === undefined && Object.keys(source).length === 0) return { entries: {} };
    return { ...source, entries: normalizeWorldBookEntries(source) };
}

function worldBookEntriesObject(data) {
    return normalizeWorldBookData(data).entries;
}

function isWorldBookEntryEnabled(entry) {
    if (!entry || typeof entry !== 'object') return false;
    const extensions = entry.extensions && typeof entry.extensions === 'object' ? entry.extensions : {};
    return entry.disable !== true
        && entry.disabled !== true
        && entry.enabled !== false
        && extensions.disable !== true
        && extensions.disabled !== true
        && extensions.enabled !== false;
}

const asList = value => {
    if (Array.isArray(value)) return value.filter(Boolean).map(item => typeof item === 'object' ? text(item.name ?? item.label ?? item.value ?? item.text ?? item.content ?? item.quote ?? item.alias ?? item.key ?? JSON.stringify(item)) : String(item));
    const source = text(value);
    if (!source) return [];
    try {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed)) return asList(parsed);
    } catch { /* fall back to the loose localized list format below */ }
    return source.replace(/^\[|\]$/g, '').split(/[\n,，、]/).map(item => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
};
const unique = values => [...new Set(asArray(values))];
const text = value => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean).join('\n').trim();
    if (typeof value === 'object') {
        const nested = value.text ?? value.content ?? value.value ?? value.name ?? value.label;
        if (nested !== undefined) return text(nested);
        try {
            return JSON.stringify(value);
        } catch {
            return '';
        }
    }
    return String(value).trim();
};

const NPC_TEXT_FIELDS = ['name', 'gender', 'age', 'height', 'appearance', 'personality', 'identity', 'past', 'relationship', 'attitude', 'nsfw', 'body'];

function normalizeNpc(value) {
    const source = value && typeof value === 'object' ? value : {};
    const aliases = {
        name: ['name', '姓名', '名字', '角色名', '人物名', '角色姓名', '人物姓名'],
        gender: ['gender', '性别'],
        age: ['age', '年龄'],
        height: ['height', '身高'],
        appearance: ['appearance', '外貌', '外貌与辨识度特征', '外貌特征', '身材', '身体特征', '辨识度特征'],
        personality: ['personality', '性格'],
        identity: ['identity', '身份', '身份背景', '人物身份', '职业身份', '职业'],
        past: ['past', '经历', '过去经历', '经历与过去', '人物经历', '过去部分经历', '过去'],
        relationship: ['relationship', '关系', '与user的关系', '与 user 的关系', '用户关系'],
        attitude: ['attitude', '态度', '对user的态度', '对 user 的态度', '对用户态度'],
        nsfw: ['nsfw', 'NSFW', 'NSFW偏好与语言风格', 'NSFW 偏好 / 体位 / 语言风格', 'NSFW偏好姿势', '性癖', '性偏好'],
        body: ['body', '成年身体信息', '身体信息', '阴茎长度', '阴茎信息'],
    };
    const get = keys => keys.map(key => source?.[key]).find(value => value !== undefined && value !== null);
    const npc = Object.fromEntries(NPC_TEXT_FIELDS.map(field => [field, text(get(aliases[field] || [field]))]));
    npc.aliases = unique(asList(get(['aliases', '关键词', '称呼 / 关键词', '称呼/关键词', '别人对他的称呼', 'user对其特殊称呼'])));
    npc.quotes = unique(asList(get(['quotes', '典型语录', '经典台词'])));
    if (npc.name && !npc.aliases.includes(npc.name)) npc.aliases.unshift(npc.name);
    const nameParts = npc.name.split(/\s+/).filter(Boolean);
    const givenName = nameParts.length > 1 ? nameParts.at(-1) : npc.name.length > 1 ? npc.name.slice(1) : npc.name;
    if (givenName && !npc.aliases.includes(givenName)) npc.aliases.push(givenName);
    npc.enabled = value?.enabled !== false;
    return npc;
}

function currentUserPersonaText() {
    const persona = text(state?.userPersona) || (state?.userPersonaData && Object.values(state.userPersonaData).some(Boolean)
        ? personaToText(state.userPersonaData)
        : '');
    const name = currentUserName();
    return name && persona ? `${persona}\n当前聊天唯一姓名覆盖：${name}\n以上人设中的其他姓名均视为旧资料，不得使用。` : persona;
}

function currentUserName() {
    const chatName = text(ctx?.name1);
    if (chatName && !/^(?:user|用户|you|我|角色)$/i.test(chatName)) return chatName;
    return text(state?.userPersonaData?.name) || text(parseKeyValueBlock(state?.userPersona).name);
}

function externalUserPersonaText() {
    return text(power_user?.persona_description);
}

function hasExternalUserPersona() {
    return Boolean(externalUserPersonaText());
}

function historicalUserNames() {
    const current = canonicalText(currentUserName());
    return unique([
        state?.userPersonaData?.name,
        parseKeyValueBlock(state?.userPersona).name,
        parseKeyValueBlock(power_user?.persona_description).name,
    ]).filter(name => canonicalText(name) && canonicalText(name) !== current);
}

function outlineText(data) {
    return [
        data?.opening,
        data?.development,
        data?.turningPoint,
        data?.climax,
        data?.ending,
        ...asList(data?.characterNames),
        ...asList(data?.npcFunctions),
        ...asList(data?.nsfwNodes),
        ...asList(data?.hardRules),
    ].map(text).filter(Boolean).join('\n');
}

function containsAnyName(value, names) {
    const source = canonicalText(value);
    return names.some(name => {
        const candidate = canonicalText(name);
        return candidate && source.includes(candidate);
    });
}

function loadedStoryNpcNames() {
    const names = [];
    for (const data of loadedReferenceWorldBooks.values()) {
        for (const entry of Object.values(worldBookEntriesObject(data))) {
            const content = text(entry?.content);
            if (!isStoryNpcEntry(entry)) continue;
            const name = content.match(/(?:^|\n)姓名：([^\n]+)/)?.[1]
                || text(entry?.comment).match(/^SOS NPC\s*-[^-]+-\s*(.+)$/i)?.[1];
            if (name) names.push(name.trim());
        }
    }
    return unique(names);
}

function currentStoryNpcNames() {
    return unique([
        ...(state?.npcNameHistory || []),
        ...(state?.npcs || []).flatMap(npc => [npc.name, ...asArray(npc.aliases)]),
        ...loadedStoryNpcNames(),
    ]);
}

function explicitNamesFromText(value) {
    const names = [];
    const source = text(value);
    for (const match of source.matchAll(/(?:姓名|角色名|人物名|NPC(?:姓名|名称)?)\s*[：:]\s*([^\n，,；;]+)/giu)) {
        const name = text(match[1]).replace(/[。！？!?]+$/, '').trim();
        if (name) names.push(name);
    }
    return names;
}

function historicalOutlineNames() {
    return unique([
        ...(state?.outlineGenerationHistory || []).flatMap(item => [
            ...asList(item?.characterNames),
            ...explicitNamesFromText(outlineText(item)),
        ]),
        ...explicitNamesFromText(state?.outline),
        ...(state?.outlineRevisions || []).flatMap(item => [
            ...asList(item?.outlineData?.characterNames),
            ...explicitNamesFromText(item?.outline),
        ]),
    ]);
}

function replaceExactName(value, oldName, newName) {
    const source = text(value);
    if (!oldName || !newName || oldName === newName) return source;
    return source.split(oldName).join(newName);
}

function renameNpcAcrossState(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return;
    const renameValue = value => {
        if (typeof value === 'string') return replaceExactName(value, oldName, newName);
        if (Array.isArray(value)) return value.map(renameValue);
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, renameValue(item)]));
        }
        return value;
    };
    state.outlineData = renameValue(state.outlineData);
    state.outline = replaceExactName(state.outline, oldName, newName);
    state.outlineGenerationHistory = renameValue(state.outlineGenerationHistory);
    state.outlineRevisions = renameValue(state.outlineRevisions);
    state.npcs = renameValue(state.npcs);
    state.npcNameHistory = state.npcNameHistory.map(name => replaceExactName(name, oldName, newName));
}

function npcNameCollision(nextNpcs, previousNames = []) {
    const names = nextNpcs.map(npc => canonicalText(npc.name)).filter(Boolean);
    const known = previousNames.map(canonicalText).filter(Boolean);
    return names.length !== nextNpcs.length
        || new Set(names).size !== names.length
        || names.some(name => known.includes(name));
}

function ensureStoryId() {
    if (state?.storyId) return state.storyId;
    let random = '';
    try { random = globalThis.crypto?.randomUUID?.() || ''; } catch { /* embedded browsers may not expose crypto */ }
    state.storyId = random || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return state.storyId;
}

function isStoryNpcEntry(entry) {
    return text(entry?.content).includes('[剧情大纲工作台 NPC]')
        || /^SOS NPC\s*-/i.test(text(entry?.comment));
}

function npcMergeKey(npc) {
    const normalize = value => text(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
    if (normalize(npc.name)) return `name:${normalize(npc.name)}`;
    const identity = ['gender', 'age', 'height', 'appearance', 'personality', 'identity', 'past', 'relationship', 'attitude', 'body']
        .map(field => normalize(npc[field])).join('|');
    return identity ? `draft:${identity}` : '';
}

function mergeNpcRecord(previous, next) {
    const merged = { ...normalizeNpc(previous) };
    const candidate = normalizeNpc(next);
    for (const field of NPC_TEXT_FIELDS) if (candidate[field]) merged[field] = candidate[field];
    merged.aliases = unique([...merged.aliases, ...candidate.aliases]);
    merged.quotes = unique([...merged.quotes, ...candidate.quotes]);
    return normalizeNpc(merged);
}

function normalizeNpcCollection(values) {
    const result = [];
    const indexes = new Map();
    let namelessIndex = -1;
    for (const value of Array.isArray(values) ? values : []) {
        const npc = normalizeNpc(value);
        if (!Object.values(npc).some(item => Array.isArray(item) ? item.length : Boolean(item))) continue;
        // A response that omitted `name` is one incomplete draft, not a new
        // NPC for every field fragment or retry. Keep it as one editable card.
        // A confirmed name is required before this draft can be written to a
        // world book, so merging nameless records is preferable to inventing
        // several indistinguishable NPCs.
        if (!npc.name && namelessIndex >= 0) {
            result[namelessIndex] = mergeNpcRecord(result[namelessIndex], npc);
            continue;
        }
        const key = npcMergeKey(npc);
        const previousIndex = key ? indexes.get(key) : undefined;
        if (previousIndex === undefined) {
            if (key) indexes.set(key, result.length);
            if (!npc.name) namelessIndex = result.length;
            result.push(npc);
        } else {
            result[previousIndex] = mergeNpcRecord(result[previousIndex], npc);
        }
    }
    return result;
}

function ageNumber(value) {
    return extractAgeNumbers(value)[0] ?? null;
}

function chineseAgeNumber(value) {
    const source = text(value).replace(/两/g, '二');
    if (!source) return null;
    const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (/^[零〇一二三四五六七八九]+$/.test(source)) return Number([...source].map(character => digits[character]).join(''));
    let total = 0;
    let section = 0;
    let number = 0;
    const units = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
    for (const character of source) {
        if (digits[character] !== undefined) {
            number = digits[character];
        } else if (units[character]) {
            const unit = units[character];
            if (unit === 10000) {
                section = (section + number) * unit;
                total += section;
                section = 0;
            } else {
                section += (number || 1) * unit;
            }
            number = 0;
        } else {
            return null;
        }
    }
    return total + section + number || null;
}

function extractAgeNumbers(value) {
    const source = text(value);
    const numbers = [...source.matchAll(/(?:^|[^\d])(\d{1,4})(?:\s*(?:周岁|岁|years?|yo)(?![\p{L}\d])|(?=\s*(?:余|多)?\s*(?:年|岁)))/giu)]
        .map(match => Number(match[1]))
        .filter(Number.isFinite);
    const chinese = /([零〇一二两三四五六七八九十百千万]{1,10})(?:余|多|几)?\s*(?:周岁|岁|年)/gu;
    for (const match of source.matchAll(chinese)) {
        const valueText = match[1];
        const variants = valueText.match(/^(.*[零〇一二三四五六七八九])([七八九])$/);
        const parsed = chineseAgeNumber(variants ? variants[1] : valueText);
        if (parsed !== null) numbers.push(parsed);
    }
    return numbers;
}

function validateAdultNpc(npc) {
    return validateAdultText(npc.age);
}

function validateAdultText(value) {
    const source = text(value);
    const ages = extractAgeNumbers(source);
    // Do not reject words such as "少年" or "未成年" by themselves. They
    // commonly occur in boundaries, exclusions, or historical descriptions
    // and are not reliable evidence of the current character's age. An
    // explicit numeric age below 18 is still blocked for adult-only output.
    return !ages.some(age => age < 18);
}

function generationNonce(kind = 'generation', attempt = 0) {
    let random = '';
    try { random = globalThis.crypto?.randomUUID?.() || ''; } catch { /* older embedded browsers may not expose crypto */ }
    if (!random) random = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    return `sos-${kind}-${attempt + 1}-${random}`;
}

function canonicalText(value) {
    return text(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function outlineSignature(data) {
    const normalized = normalizeOutlineData(data);
    return canonicalText(['opening', 'development', 'turningPoint', 'climax', 'ending', 'characterNames', 'npcFunctions', 'nsfwNodes', 'hardRules']
        .map(key => Array.isArray(normalized[key]) ? normalized[key].join('|') : normalized[key]).join('|'));
}

function textSimilarity(first, second) {
    const a = canonicalText(first);
    const b = canonicalText(second);
    if (!a || !b) return 0;
    if (a === b) return 1;
    const grams = value => new Set([...value].map((_, index) => value.slice(index, index + 3)).filter(gram => gram.length === 3));
    const firstSet = grams(a);
    const secondSet = grams(b);
    if (!firstSet.size || !secondSet.size) return 0;
    let overlap = 0;
    for (const gram of firstSet) if (secondSet.has(gram)) overlap++;
    return overlap / (firstSet.size + secondSet.size - overlap);
}

function hasDuplicateOutline(next, history) {
    const signature = outlineSignature(next);
    return history.some(item => {
        if (signature && outlineSignature(item) === signature) return true;
        return hasSameOutlineCast(next, item) && textSimilarity(next, item) >= 0.72;
    });
}

function outlineNpcNames(data) {
    const userName = canonicalText(currentUserName());
    return unique(asList(data?.characterNames)).filter(name => {
        const normalized = canonicalText(name);
        return normalized && normalized !== userName;
    });
}

function outlineNpcConstraints(data) {
    const normalized = normalizeOutlineData(data);
    // `characterNames` is an outline display field and can contain prose
    // fragments when a model formats the outline loosely. Only the explicit
    // "主要 NPC 功能" rows are reliable enough for personality hints.
    const explicitNames = unique(normalized.npcFunctions.map(item => {
        const firstCell = text(item).split(/[|｜]/u)[0].trim();
        return firstCell.replace(/^(?:NPC|角色|人物)\s*(?:\d+|[一二三四五六七八九十]+)?\s*[：:：]?\s*/iu, '').trim();
    }).filter(name => name && !/^(?:user|用户|主要角色|NPC|角色|人物)$/iu.test(name)));
    const sections = [
        ...normalized.npcFunctions,
        ...normalized.hardRules,
        normalized.opening,
        normalized.development,
        normalized.turningPoint,
        normalized.climax,
        normalized.ending,
    ].map(text).filter(Boolean);
    return explicitNames.map(name => {
        const related = sections.filter(section => containsAnyName(section, [name]));
        let personality = '';
        for (const section of related) {
            const afterName = section.slice(Math.max(0, section.indexOf(name) + name.length));
            const match = afterName.match(/(?:核心)?性格\s*[：:为是]\s*([^|｜；;。\n]+)/u);
            if (match?.[1]) {
                personality = text(match[1]);
                break;
            }
        }
        return { name, personality, source: related.join('；') };
    });
}

function hasSameOutlineCast(first, second) {
    const firstNames = new Set(outlineNpcNames(first).map(canonicalText));
    const secondNames = new Set(outlineNpcNames(second).map(canonicalText));
    return firstNames.size === secondNames.size
        && [...firstNames].every(name => secondNames.has(name));
}

function worldBookSortKey(name) {
    const source = [...text(name)][0] || '';
    if (!source) return 0;
    // Group names for scanning: symbols/emoji first, numeric names second,
    // then names beginning with letters.
    if (!/^\p{L}/u.test(source) && !/^\p{N}/u.test(source)) return 0;
    if (/^\p{N}/u.test(source)) return 1;
    return 2;
}

function compareWorldBookNames(first, second) {
    const firstText = text(first);
    const secondText = text(second);
    const firstCategory = worldBookSortKey(firstText);
    const secondCategory = worldBookSortKey(secondText);
    const category = firstCategory - secondCategory;
    if (category) return category;
    if (firstCategory === 0) {
        const firstCodePoint = [...firstText][0]?.codePointAt(0) || 0;
        const secondCodePoint = [...secondText][0]?.codePointAt(0) || 0;
        if (firstCodePoint !== secondCodePoint) return firstCodePoint - secondCodePoint;
    }
    const collator = new Intl.Collator('zh-Hans-CN-u-co-pinyin', { sensitivity: 'base', numeric: true });
    return collator.compare(firstText, secondText) || firstText.localeCompare(secondText);
}

function validateNpc(npc) {
    const missing = ['name', 'age', 'appearance', 'personality', 'identity', 'relationship'].filter(field => !text(npc[field]));
    if (missing.length) return `NPC「${npc.name || '未命名'}」缺少：${missing.join('、')}`;
    if (!validateAdultNpc(npc)) return `NPC「${npc.name}」包含明确的未满 18 岁年龄，不能用于成人内容。`;
    return '';
}

function defaultState() {
    return {
        version: VERSION,
        config: {
            backgrounds: [],
            customBackground: '',
            userRole: '攻',
            orientation: 'BG',
            relationshipMode: '1V1',
            relationships: [],
            customRelationships: '',
            tone: '甜文',
            ending: 'HE',
            tropes: [],
            customTropes: '',
            detail: '',
            length: 'short',
            streamStructured: false,
        },
        userPersona: '',
        userPersonaData: {},
        userPersonaAccepted: false,
        outline: '',
        outlineData: {},
        outlineVersion: 0,
        outlineAccepted: false,
        outlineRevisions: [],
        outlineGenerationHistory: [],
        npcs: [],
        npcsAccepted: false,
        npcSource: 'generate',
        npcNameHistory: [],
        storyId: '',
        importedCharacterReferences: [],
        importedWorldBooks: [],
        currentTurn: 0,
        userTurnCount: 0,
        completedStorySnapshot: '',
        completedStoryMessages: 0,
        trackedStoryMessageKeys: [],
        trackedUserMessageKeys: [],
        worldBookName: '',
        npcWorldBookName: '',
        referenceWorldBookName: '',
        attachedWorldBookName: '',
        lastGeneratedAt: 0,
        zoom: 1,
        lastGeneration: {
            kind: '',
            rawPreview: '',
            repairedPreview: '',
            error: '',
            at: 0,
        },
        continuation: {
            kind: '',
            raw: '',
            prompt: '',
            schema: null,
            responseLength: 0,
            allowText: false,
            patchTag: '',
            mode: 'new',
            feedback: '',
            draftToken: '',
            draftIndex: -1,
            at: 0,
        },
    };
}

function getState() {
    const saved = ctx.chatMetadata?.[METADATA_KEY];
    const next = { ...defaultState(), ...(saved && typeof saved === 'object' ? clone(saved) : {}) };
    next.config = { ...defaultState().config, ...(next.config || {}) };
    next.config.backgrounds = unique(next.config.backgrounds);
    next.config.relationships = unique(next.config.relationships);
    next.config.tropes = unique(next.config.tropes);
    next.config.streamStructured = Boolean(next.config.streamStructured);
    next.zoom = Math.min(1.2, Math.max(0.8, Number(next.zoom) || 1));
    next.userPersonaData = next.userPersonaData && typeof next.userPersonaData === 'object' ? next.userPersonaData : {};
    next.outlineData = next.outlineData && typeof next.outlineData === 'object' ? next.outlineData : {};
    if (!Object.values(next.userPersonaData).some(Boolean) && next.userPersona) {
        next.userPersonaData = parseKeyValueBlock(next.userPersona);
    }
    if (!Object.values(next.outlineData).some(value => Array.isArray(value) ? value.length : value) && next.outline) {
        next.outlineData = normalizeOutlineData({ outline: next.outline }, next.outline);
    }
    next.outlineRevisions = Array.isArray(next.outlineRevisions) ? next.outlineRevisions : [];
    next.outlineGenerationHistory = Array.isArray(next.outlineGenerationHistory)
        ? next.outlineGenerationHistory.map(item => normalizeOutlineData(item)).filter(item => outlineSignature(item))
        : [];
    next.npcNameHistory = unique(next.npcNameHistory);
    next.npcSource = next.npcSource === 'worldbook' ? 'worldbook' : 'generate';
    next.trackedStoryMessageKeys = Array.isArray(next.trackedStoryMessageKeys)
        ? unique(next.trackedStoryMessageKeys).slice(-200)
        : [];
    next.trackedUserMessageKeys = Array.isArray(next.trackedUserMessageKeys)
        ? unique(next.trackedUserMessageKeys).slice(-200)
        : [];
    next.storyId = text(next.storyId);
    next.npcWorldBookName = text(next.npcWorldBookName);
    next.referenceWorldBookName = text(next.referenceWorldBookName);
    next.lastGeneration = next.lastGeneration && typeof next.lastGeneration === 'object'
        ? {
            kind: text(next.lastGeneration.kind),
            rawPreview: limitPromptText(next.lastGeneration.rawPreview, 1200),
            repairedPreview: limitPromptText(next.lastGeneration.repairedPreview, 1200),
            error: limitPromptText(next.lastGeneration.error, 600),
            at: Number(next.lastGeneration.at) || 0,
        }
        : defaultState().lastGeneration;
    next.continuation = next.continuation && typeof next.continuation === 'object'
        ? {
            kind: text(next.continuation.kind),
            raw: text(next.continuation.raw),
            prompt: text(next.continuation.prompt),
            schema: next.continuation.schema && typeof next.continuation.schema === 'object' ? clone(next.continuation.schema) : null,
            responseLength: Number(next.continuation.responseLength) || 0,
            allowText: Boolean(next.continuation.allowText),
            patchTag: text(next.continuation.patchTag),
            mode: text(next.continuation.mode) || 'new',
            feedback: text(next.continuation.feedback),
            draftToken: text(next.continuation.draftToken),
            draftIndex: Number.isInteger(Number(next.continuation.draftIndex)) ? Number(next.continuation.draftIndex) : -1,
            at: Number(next.continuation.at) || 0,
        }
        : defaultState().continuation;
    // Older versions could append the same partial response several times.
    // Collapse those drafts when loading metadata so one failed request cannot
    // produce a page full of identical "unnamed" validation warnings.
    next.npcs = normalizeNpcCollection(next.npcs);
    next.importedCharacterReferences = Array.isArray(next.importedCharacterReferences)
        ? next.importedCharacterReferences.map(reference => ({
            name: text(reference?.name) || '未命名参考角色',
            description: text(reference?.description),
            personality: text(reference?.personality),
            scenario: text(reference?.scenario),
            first_mes: text(reference?.first_mes),
            mes_example: text(reference?.mes_example),
            system_prompt: text(reference?.system_prompt),
            post_history_instructions: text(reference?.post_history_instructions),
            creator_notes: text(reference?.creator_notes),
            source: text(reference?.source) || '导入文件',
        })).filter(reference => reference.name || reference.description || reference.personality)
        : [];
    next.importedWorldBooks = Array.isArray(next.importedWorldBooks)
        ? next.importedWorldBooks.map(book => ({
            name: text(book?.name) || '未命名世界书',
            entries: Array.isArray(book?.entries) ? book.entries.map(entry => ({
                keys: unique([...asList(entry?.keys), ...asList(entry?.key)]),
                content: text(entry?.content),
                enabled: entry?.enabled !== false,
            })).filter(entry => entry.content) : [],
        })).filter(book => book.entries.length)
        : [];
    return next;
}

function saveState() {
    refreshContext();
    if (!ctx.chatMetadata) return;
    ctx.chatMetadata[METADATA_KEY] = clone(state);
    ctx.saveMetadataDebounced?.();
    updateContinuityPrompt();
}

function escapeHtml(value) {
    return text(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function trimText(value, limit, preserveEnd = false) {
    const source = text(value);
    if (source.length <= limit) return source;
    if (limit <= 12) return source.slice(0, limit);
    const head = preserveEnd ? Math.max(8, Math.floor(limit * 0.62)) : limit - 1;
    const tail = preserveEnd ? Math.max(4, limit - head - 1) : 0;
    return `${source.slice(0, head)}…${tail ? source.slice(-tail) : ''}`.trim();
}

function outlineSectionText(data, key, label, limit, preserveEnd = false) {
    const value = data?.[key] ?? data?.[label];
    return value ? `${label}：${trimText(value, limit, preserveEnd)}` : '';
}

function fitOutlineSections(data, limit) {
    const source = data && typeof data === 'object' ? data : {};
    const labels = [
        ['opening', '开端'],
        ['development', '发展'],
        ['turningPoint', '转折'],
        ['climax', '高潮'],
        ['ending', '结局'],
    ];
    // The selected short/medium/long mode controls pacing and minimum story
    // turns, but it must never cut a returned ending or an NSFW node locally.
    // `limit` remains in the signature for compatibility with saved callers.
    const sections = labels.map(([key, label]) => ({
        key,
        label,
        value: text(source[key] ?? source[label]),
    }));

    let result = sections.map(section => `${section.label}：${section.value || '（待补充）'}`).join('\n');
    const extras = [
        ['主要角色名', asList(source.characterNames).join('、')],
        ['主要 NPC 功能', asList(source.npcFunctions).slice(0, 8).join('；')],
        ['NSFW 节点', asList(source.nsfwNodes).slice(0, 8).join('；')],
        ['硬性规则', asList(source.hardRules).slice(0, 8).join('；')],
    ].filter(([, value]) => value);
    return result + extras.map(([label, value]) => `\n${label}：${value}`).join('');
}

function normalizePersonaData(value) {
    const source = value?.persona && typeof value.persona === 'object' ? value.persona : value;
    const aliases = {
        name: ['name', '姓名', '名字'],
        gender: ['gender', '性别'],
        age: ['age', '年龄'],
        appearance: ['appearance', '外貌', '外貌与辨识度特征'],
        personality: ['personality', '性格'],
        identity: ['identity', '身份', '身份背景', '身份设定', '人物身份', '职业身份'],
        past: ['past', '经历', '过去经历', '经历背景', '人物背景'],
        habits: ['habits', '习惯', '生活习惯'],
        boundaries: ['boundaries', '边界', '禁区', '底线', '雷点'],
    };
    const get = keys => keys.map(key => source?.[key]).find(value => value !== undefined && value !== null);
    return Object.fromEntries(Object.entries(aliases).map(([key, keys]) => [key, text(get(keys))]));
}

function mergePersonaData(previous, next) {
    const oldPersona = normalizePersonaData(previous);
    const newPersona = normalizePersonaData(next);
    return Object.fromEntries(Object.keys(oldPersona).map(key => [key, newPersona[key] || oldPersona[key]]));
}

function matchedRevisionFields(feedback, definitions) {
    const source = text(feedback).toLowerCase();
    const protectedWords = ['保留', '保持', '不改', '不修改', '不要改'];
    const isProtected = (index, label) => {
        const clauseStart = Math.max(
            source.lastIndexOf('，', index),
            source.lastIndexOf(',', index),
            source.lastIndexOf('。', index),
            source.lastIndexOf(';', index),
            source.lastIndexOf('；', index),
            source.lastIndexOf('\n', index),
        ) + 1;
        const clauseEndCandidates = [
            source.indexOf('，', index + label.length),
            source.indexOf(',', index + label.length),
            source.indexOf('。', index + label.length),
            source.indexOf(';', index + label.length),
            source.indexOf('；', index + label.length),
            source.indexOf('\n', index + label.length),
        ].filter(position => position >= 0);
        const clauseEnd = clauseEndCandidates.length ? Math.min(...clauseEndCandidates) : source.length;
        const before = source.slice(clauseStart, index);
        const after = source.slice(index + label.length, clauseEnd);
        return protectedWords.some(word => before.includes(word) || after.includes(word));
    };
    return new Set(Object.entries(definitions)
        .filter(([, labels]) => labels.some(label => {
            const normalizedLabel = label.toLowerCase();
            let offset = source.indexOf(normalizedLabel);
            while (offset >= 0) {
                if (!isProtected(offset, normalizedLabel)) return true;
                offset = source.indexOf(normalizedLabel, offset + normalizedLabel.length);
            }
            return false;
        }))
        .map(([field]) => field));
}

const PERSONA_REVISION_FIELDS = {
    name: ['姓名', '名字', '称呼', 'name'],
    gender: ['性别', 'gender'],
    age: ['年龄', '岁数', 'age'],
    appearance: ['外貌', '长相', '外形', '特征', '辨识度', 'appearance'],
    personality: ['性格', '脾气', '人格', 'personality'],
    identity: ['身份', '职业', '设定', 'identity'],
    past: ['过去', '经历', '背景', 'past'],
    habits: ['习惯', '爱好', 'habits'],
    boundaries: ['边界', '禁区', '底线', '雷点', 'boundaries'],
};

function restrictPersonaRevision(next, feedback) {
    const normalized = normalizePersonaData(next);
    const fields = matchedRevisionFields(feedback, PERSONA_REVISION_FIELDS);
    if (!fields.size) return {};
    return Object.fromEntries([...fields].map(field => [field, normalized[field]]).filter(([, value]) => value));
}

function diffPersonaFields(previous, next) {
    const oldPersona = normalizePersonaData(previous);
    const newPersona = normalizePersonaData(next);
    return Object.fromEntries(Object.keys(oldPersona)
        .filter(field => newPersona[field] && newPersona[field] !== oldPersona[field])
        .map(field => [field, newPersona[field]]));
}

const OUTLINE_REVISION_FIELDS = {
    opening: ['开端', '开场', '第一幕', 'opening'],
    development: ['发展', '第二幕', '中段', 'development'],
    turningPoint: ['转折', '反转', '第三幕', 'turning', 'turningpoint'],
    climax: ['高潮', '决战', '冲突顶点', 'climax'],
    ending: ['结局', '收束', '尾声', '终局', 'ending'],
    characterNames: ['主要角色名', '角色名', '人物名', 'characterNames', 'character_names'],
    npcFunctions: ['npc功能', 'npc 功能', '主要npc', '主要 npc'],
    nsfwNodes: ['nsfw', '亲密节点', '床戏', '性爱', '性描写'],
    hardRules: ['硬性规则', '硬规则', '必须保留'],
};

function restrictOutlineRevision(next, feedback) {
    const normalized = normalizeOutlineData(next);
    const fields = matchedRevisionFields(feedback, OUTLINE_REVISION_FIELDS);
    if (!fields.size) return {};
    return Object.fromEntries([...fields]
        .map(field => [field, normalized[field]])
        .filter(([, value]) => Array.isArray(value) ? value.length : Boolean(value)));
}

function diffOutlineFields(previous, next) {
    const oldOutline = normalizeOutlineData(previous);
    const newOutline = normalizeOutlineData(next);
    const changed = {};
    for (const key of ['opening', 'development', 'turningPoint', 'climax', 'ending']) {
        if (newOutline[key] && newOutline[key] !== oldOutline[key]) changed[key] = newOutline[key];
    }
    if (newOutline.characterNames.length && JSON.stringify(newOutline.characterNames) !== JSON.stringify(oldOutline.characterNames)) {
        changed.characterNames = newOutline.characterNames;
    }
    for (const key of ['npcFunctions', 'nsfwNodes', 'hardRules']) {
        if (newOutline[key].length && JSON.stringify(newOutline[key]) !== JSON.stringify(oldOutline[key])) changed[key] = newOutline[key];
    }
    return changed;
}

const NPC_REVISION_FIELDS = {
    name: ['姓名', '名字', '改名', '称呼', 'name'],
    aliases: ['昵称', '别名', '称呼', '关键词', 'aliases'],
    gender: ['性别', 'gender'],
    age: ['年龄', '岁数', 'age'],
    height: ['身高', 'height'],
    appearance: ['外貌', '长相', '特征', '辨识度', 'appearance'],
    personality: ['性格', '脾气', '人格', 'personality'],
    identity: ['身份', '职业', '背景', 'identity'],
    past: ['过去', '经历', 'past'],
    relationship: ['关系', 'relationship'],
    attitude: ['态度', '喜欢', '讨厌', '无感', 'attitude'],
    quotes: ['语录', '台词', '说话方式', 'quotes'],
    nsfw: ['nsfw', '性癖', '偏好', '体位', '语言风格'],
    body: ['身体', '阴茎', '尺寸', 'body'],
};

function restrictNpcRevision(next, feedback, previous) {
    const drafts = Array.isArray(next) ? next.map(normalizeNpc) : [];
    const oldNpcs = Array.isArray(previous) ? previous.map(normalizeNpc) : [];
    if (!drafts.length || !oldNpcs.length) return drafts;

    const source = text(feedback).toLowerCase();
    const targetIndexes = new Set(oldNpcs
        .map((npc, index) => {
            const names = [npc.name, ...npc.aliases].filter(Boolean);
            return names.some(name => source.includes(name.toLowerCase())) ? index : -1;
        })
        .filter(index => index >= 0));
    const ordinal = source.match(/第\s*([一二三四五六七八九十\d]+)\s*(?:名|个)?\s*(?:npc|角色|人物)/i);
    if (ordinal) {
        const ordinalValue = /^\d+$/.test(ordinal[1]) ? Number(ordinal[1]) : '一二三四五六七八九十'.indexOf(ordinal[1]) + 1;
        if (ordinalValue > 0 && ordinalValue <= oldNpcs.length) targetIndexes.add(ordinalValue - 1);
    }
    if (!targetIndexes.size && oldNpcs.length === 1) targetIndexes.add(0);
    if (/所有|全部|每个|每一名|全体/.test(source)) oldNpcs.forEach((_, index) => targetIndexes.add(index));

    const fields = matchedRevisionFields(feedback, NPC_REVISION_FIELDS);
    const selectedDrafts = drafts.filter((draft, index) => {
        const names = [draft.name, ...draft.aliases].filter(Boolean);
        const namedTarget = oldNpcs.findIndex(npc => [npc.name, ...npc.aliases].filter(Boolean).some(name => names.includes(name)));
        return !targetIndexes.size || namedTarget < 0 ? !targetIndexes.size : targetIndexes.has(namedTarget) || (!draft.name && targetIndexes.size === 1 && index === 0);
    });
    const candidates = selectedDrafts.length
        ? selectedDrafts
        : targetIndexes.size
            ? [...targetIndexes].sort((a, b) => a - b).map(index => drafts[index]).filter(Boolean)
            : [];
    if (!fields.size) return candidates;

    return candidates.map((draft, index) => {
        const limited = { name: draft.name };
        for (const field of fields) if (draft[field]) limited[field] = draft[field];
        // A nameless partial patch needs a stable target for mergeNpcDrafts.
        if (!limited.name && targetIndexes.size === 1) limited.name = oldNpcs[[...targetIndexes][0]].name;
        return limited;
    });
}

function diffNpcFields(previous, next, feedback = '') {
    const oldNpcs = Array.isArray(previous) ? previous.map(normalizeNpc) : [];
    const newNpcs = Array.isArray(next) ? next.map(normalizeNpc) : [];
    if (!newNpcs.length) return [];
    if (!oldNpcs.length) return newNpcs;

    const source = text(feedback).toLowerCase();
    const mentionedIndexes = oldNpcs.map((npc, index) => {
        const names = [npc.name, ...npc.aliases].filter(Boolean);
        return names.some(name => source.includes(name.toLowerCase())) ? index : -1;
    }).filter(index => index >= 0);
    const ordinal = source.match(/第\s*([一二三四五六七八九十\d]+)\s*(?:名|个)?\s*(?:npc|角色|人物)/i);
    if (ordinal) {
        const number = /^\d+$/.test(ordinal[1]) ? Number(ordinal[1]) : '一二三四五六七八九十'.indexOf(ordinal[1]) + 1;
        if (number > 0 && number <= oldNpcs.length) mentionedIndexes.push(number - 1);
    }
    const targetIndexes = unique(mentionedIndexes.map(String)).map(Number);
    const allTargets = /所有|全部|每个|每一名|全体/.test(source)
        ? oldNpcs.map((_, index) => index)
        : targetIndexes;
    const resolveOld = (draft, index) => {
        const names = [draft.name, ...draft.aliases].filter(Boolean);
        const byName = oldNpcs.findIndex(oldNpc => [oldNpc.name, ...oldNpc.aliases]
            .filter(Boolean)
            .some(name => names.includes(name)));
        if (byName >= 0) return byName;
        if (allTargets.length === 1 && newNpcs.length === 1) return allTargets[0];
        if (!allTargets.length && index < oldNpcs.length) return index;
        if (allTargets.includes(index)) return index;
        return -1;
    };

    return newNpcs.map((draft, index) => {
        const oldIndex = resolveOld(draft, index);
        if (oldIndex < 0) return draft;
        const oldNpc = oldNpcs[oldIndex];
        const patch = { name: oldNpc.name };
        for (const field of NPC_TEXT_FIELDS) {
            if (draft[field] && draft[field] !== oldNpc[field]) patch[field] = draft[field];
        }
        if (draft.aliases.some(alias => !oldNpc.aliases.includes(alias))) patch.aliases = draft.aliases;
        if (draft.quotes.length && JSON.stringify(draft.quotes) !== JSON.stringify(oldNpc.quotes)) patch.quotes = draft.quotes;
        return patch;
    }).filter(draft => Object.keys(draft).some(key => key !== 'name'));
}

function mergeNpcDrafts(previous, next, feedback = '') {
    const oldNpcs = Array.isArray(previous) ? previous.map(normalizeNpc) : [];
    const newNpcs = Array.isArray(next) ? next.map(normalizeNpc) : [];
    if (!oldNpcs.length) return newNpcs;
    if (!newNpcs.length) return oldNpcs;

    const used = new Set();
    const feedbackText = text(feedback).toLowerCase();
    const feedbackTargetIndex = oldNpcs.findIndex(oldNpc => [oldNpc.name, ...oldNpc.aliases]
        .filter(Boolean)
        .some(name => feedbackText.includes(name.toLowerCase())));
    const merged = oldNpcs.map((oldNpc, index) => {
        const oldNames = new Set([oldNpc.name, ...oldNpc.aliases].filter(Boolean));
        const mentioned = [...oldNames].some(name => name && feedbackText.includes(name.toLowerCase()));
        const exactIndex = newNpcs.findIndex((newNpc, candidateIndex) => {
            if (used.has(candidateIndex)) return false;
            return Boolean(newNpc.name && oldNames.has(newNpc.name));
        });
        const blankIndex = mentioned
            ? newNpcs.findIndex((newNpc, candidateIndex) => !used.has(candidateIndex) && !newNpc.name)
            : -1;
        const positionalIndex = feedbackTargetIndex >= 0 && feedbackTargetIndex !== index
            ? -1
            : newNpcs.findIndex((_, candidateIndex) => !used.has(candidateIndex) && candidateIndex === index);
        const matchIndex = exactIndex >= 0
            ? exactIndex
            : blankIndex >= 0 && (feedbackTargetIndex < 0 || feedbackTargetIndex === index)
                ? blankIndex
                : positionalIndex;
        if (matchIndex < 0) return oldNpc;
        used.add(matchIndex);
        const candidate = newNpcs[matchIndex];
        const mergedNpc = { ...oldNpc };
        for (const field of NPC_TEXT_FIELDS) if (candidate[field]) mergedNpc[field] = candidate[field];
        if (candidate.aliases.length) mergedNpc.aliases = unique([...oldNpc.aliases, ...candidate.aliases]);
        if (candidate.quotes.length) mergedNpc.quotes = unique(candidate.quotes);
        return normalizeNpc(mergedNpc);
    });
    // A revision may intentionally add a new NPC. Keep those returned extras.
    return [...merged, ...newNpcs.filter((_, index) => !used.has(index))];
}

function personaToText(persona) {
    return Object.entries(normalizePersonaData(persona))
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join('、') : value}`)
        .join('\n');
}

function extractTaggedBlocks(raw, tag) {
    const source = text(raw);
    const blocks = [];
    const matcher = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match;
    while ((match = matcher.exec(source))) blocks.push(match[1].trim());
    return blocks;
}

function extractTaggedObject(raw, tag) {
    const block = extractTaggedBlocks(raw, tag)[0];
    if (!block) return null;
    return extractJson(block) || block;
}

function extractTaggedNodes(raw, tag) {
    const source = text(raw);
    const nodes = [];
    const matcher = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match;
    while ((match = matcher.exec(source))) {
        const attributes = {};
        for (const attribute of match[1].matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) attributes[attribute[1].toLowerCase()] = attribute[2].trim();
        nodes.push({ attributes, content: match[2].trim() });
    }
    return nodes;
}

function parseKeyValueBlock(value) {
    const result = {};
    let currentKey = '';
    const aliases = {
        姓名: 'name', 名字: 'name', 用户姓名: 'name', user姓名: 'name', 角色姓名: 'name', 人物姓名: 'name', 角色名: 'name', 人物名: 'name', name: 'name',
        性别: 'gender', gender: 'gender',
        年龄: 'age', age: 'age',
        身高: 'height', height: 'height',
        外貌: 'appearance', 外貌与辨识度特征: 'appearance', 外貌特征: 'appearance', 外观: 'appearance', appearance: 'appearance',
        性格: 'personality', personality: 'personality',
        身份: 'identity', 身份背景: 'identity', 人物身份: 'identity', 角色设定: 'identity', 职业: 'identity', identity: 'identity',
        经历: 'past', 过去经历: 'past', 过去: 'past', 人物经历: 'past', 背景经历: 'past', past: 'past',
        习惯: 'habits', habits: 'habits',
        边界: 'boundaries', 禁区: 'boundaries', boundaries: 'boundaries',
        与user的关系: 'relationship', '与 user 的关系': 'relationship', '和user的关系': 'relationship', '和 user 的关系': 'relationship', '与用户的关系': 'relationship', relationship: 'relationship',
        对user的态度: 'attitude', '对 user 的态度': 'attitude', '对用户的态度': 'attitude', '对用户态度': 'attitude', attitude: 'attitude',
        典型语录: 'quotes', 经典语录: 'quotes', 典型台词: 'quotes', quotes: 'quotes',
        '称呼 / 关键词': 'aliases', '称呼/关键词': 'aliases', 称呼: 'aliases', 别名: 'aliases', 昵称: 'aliases', 关键词: 'aliases', aliases: 'aliases',
        'NSFW偏好与语言风格': 'nsfw', 'NSFW 偏好 / 体位 / 语言风格': 'nsfw', 'NSFW偏好/体位/语言风格': 'nsfw', 性癖: 'nsfw', 性偏好: 'nsfw', nsfw: 'nsfw',
        成年身体信息: 'body', 身体信息: 'body', 阴茎信息: 'body', body: 'body',
        开场: 'opening', 开端: 'opening', opening: 'opening',
        发展: 'development', development: 'development',
        转折: 'turningPoint', turningpoint: 'turningPoint', turning_point: 'turningPoint',
        高潮: 'climax', climax: 'climax',
        结局: 'ending', 结束: 'ending', ending: 'ending',
        '主要 NPC 功能': 'npcFunctions', '主要NPC功能': 'npcFunctions', 'NPC功能': 'npcFunctions', npcfunctions: 'npcFunctions',
        'NSFW 节点': 'nsfwNodes', 'NSFW节点': 'nsfwNodes', nsfwnodes: 'nsfwNodes',
        硬性规则: 'hardRules', hardrules: 'hardRules',
    };
    const normalizeLabel = label => text(label)
        .replace(/^\d+[.)、:]\s*/, '')
        .replace(/[\s_*`]/g, '')
        .replace(/[（(][^）)]*[）)]/g, '')
        .replace(/[：:]+$/, '')
        .toLowerCase();
    const normalizedAliases = Object.fromEntries(Object.entries(aliases).map(([key, value]) => [normalizeLabel(key), value]));
    const resolveKey = label => {
        const raw = text(label);
        const normalized = normalizeLabel(raw);
        const direct = aliases[raw] || aliases[normalized] || normalizedAliases[normalized];
        return direct || normalized;
    };
    const escapeRegExp = source => source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Some gateways remove newlines while serializing a tagged response:
    // `name: ... aliases: [...] gender: ...`. Split only at known field
    // labels so the value of a long field remains intact.
    const inlineLabels = Object.keys(aliases)
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|');
    const inlineMatcher = new RegExp(`(?:^|[\\s>])(${inlineLabels})\\s*[:：]`, 'gi');
    const inlineMatches = [...text(value).matchAll(inlineMatcher)];
    const inlineLines = inlineMatches.length > 1
        ? inlineMatches.map((match, index) => {
            const labelStart = match.index + match[0].indexOf(match[1]);
            const nextStart = inlineMatches[index + 1]?.index;
            const end = nextStart === undefined ? text(value).length : nextStart;
            return text(value).slice(labelStart, end).trim();
        }).join('\n')
        : text(value);
    for (const line of inlineLines.split(/\r?\n/)) {
        const cleanLine = line.trim()
            .replace(/^<\/?(?:persona|npcs?|npc|outline|outline_patch|persona_patch)[^>]*>\s*/i, '')
            .replace(/\s*<\/?(?:persona|npcs?|npc|outline|outline_patch|persona_patch)>\s*$/i, '')
            .replace(/^\[([^\]]+)\]\s*(?:(?:：|:)\s*)?/, '$1：')
            .replace(/^```(?:json|text|纯文本)?\s*/i, '')
            .replace(/^(?:[-*]\s+|#{1,6}\s+|\d+[.)、:]\s+)/, '')
            .replace(/^\*\*(.*?)\*\*\s*/, '$1')
            .replace(/^`(.*?)`\s*/, '$1');
        if (!cleanLine) continue;
        const tableCells = cleanLine.split('|').map(cell => cell.trim()).filter(Boolean);
        if (tableCells.length >= 2 && !/^[-: ]+$/.test(tableCells[0]) && !/^[-: ]+$/.test(tableCells[1])) {
            currentKey = resolveKey(tableCells[0]);
            result[currentKey] = result[currentKey] ? `${result[currentKey]}\n${tableCells.slice(1).join(' | ')}` : tableCells.slice(1).join(' | ');
            continue;
        }
        const match = cleanLine.match(/^([^：:|\-–—]{1,60}?)\s*(?:[：:|]|[-–—])\s*(.*)$/);
        if (match) {
            currentKey = resolveKey(match[1]);
            const nextValue = match[2].trim();
            if (nextValue) result[currentKey] = result[currentKey] ? `${result[currentKey]}\n${nextValue}` : nextValue;
            else if (result[currentKey] === undefined) result[currentKey] = '';
            continue;
        }
        // Heading-style output is common when a model follows Markdown
        // conventions but omits the colon, e.g. "年龄\n28岁".
        const heading = cleanLine.match(/^(姓名|名字|性别|年龄|身高|外貌(?:与辨识度特征)?|性格|身份(?:背景)?|过去经历|经历|习惯|边界|禁区|与\s*user\s*的关系|对\s*user\s*的态度|典型语录|称呼\s*[/／]?\s*关键词|关键词|NSFW(?:偏好与语言风格)?|成年身体信息|开端|发展|转折|高潮|结局|主要\s*NPC\s*功能|NSFW\s*节点|硬性规则|name|gender|age|height|appearance|personality|identity|past|habits|boundaries|relationship|attitude|quotes|aliases|nsfw|body|opening|development|turningPoint|climax|ending)\s*$/i);
        if (heading) {
            currentKey = resolveKey(heading[1]);
            if (result[currentKey] === undefined) result[currentKey] = '';
            continue;
        }
        // Models sometimes put a long field value on the following line.
        // Keep it attached to the last recognized field instead of dropping it.
        if (currentKey && result[currentKey] !== undefined) result[currentKey] = `${result[currentKey]}\n${cleanLine}`.trim();
    }
    if (result.aliases) result.aliases = asList(result.aliases);
    if (result.quotes) result.quotes = asList(result.quotes);
    for (const key of ['npcFunctions', 'nsfwNodes', 'hardRules']) {
        if (result[key]) result[key] = asList(result[key]);
    }
    return result;
}

function parsePlainNpcBlocks(value) {
    const source = text(value)
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
        .trim();
    if (!source) return [];
    const blocks = source
        .split(/(?=^(?:#{1,6}\s*)?(?:主要\s*)?(?:NPC|角色|人物)\s*(?:[#：:]?\s*\d+|[一二三四五六七八九十]+)?\s*[：:]?\s*)/im)
        .map(block => block.trim())
        .filter(Boolean);
    const candidates = blocks.length > 1 ? blocks : [source];
    return normalizeNpcCollection(candidates.map(block => {
        const cleaned = block
            .replace(/^(?:#{1,6}\s*)?(?:主要\s*)?(?:NPC|角色|人物)\s*(?:[#：:]?\s*\d+|[一二三四五六七八九十]+)?\s*[：:]?\s*/i, '')
            .replace(/^[-=]{3,}\s*$/gm, '')
            .trim();
        return parseKeyValueBlock(cleaned);
    }).filter(fields => Object.keys(fields).some(key => ['name', 'gender', 'age', 'height', 'appearance', 'personality', 'identity', 'past', 'relationship', 'attitude', 'nsfw', 'body'].includes(key))));
}

function stripReasoningBlocks(value) {
    return text(value)
        .replace(/<think(?:ing)?\b[^>]*>[\s\S]*?<\/(?:think|thinking)>/gi, '')
        .replace(/<analysis\b[^>]*>[\s\S]*?<\/analysis>/gi, '')
        .replace(/<reasoning\b[^>]*>[\s\S]*?<\/reasoning>/gi, '')
        .trim();
}

function taggedPersona(raw) {
    const block = extractTaggedBlocks(raw, 'persona')[0];
    return block ? (extractJson(block) || parseKeyValueBlock(block)) : null;
}

function taggedNpcs(raw) {
    const source = stripReasoningBlocks(raw);
    if (!source) return [];

    // Parse each opening <npc> independently. Models and gateways sometimes
    // stop at the output limit before writing </npc> or </npcs>; the fields
    // already returned are still useful as an editable draft.
    const regions = [...source.matchAll(/<npcs\b[^>]*>([\s\S]*?)(?:<\/npcs>|$)/gi)]
        .map(match => match[1]);
    const candidates = regions.length ? regions : [source];
    const blocks = candidates.flatMap(container => [...container.matchAll(/<npc\b[^>]*>([\s\S]*?)(?=<\/npc>|<npc\b|<\/npcs>|$)/gi)]
        .map(match => match[1].trim())
        .filter(Boolean));
    return normalizeNpcCollection(blocks
        .map(block => {
            const structured = extractJson(block);
            // A field-list NPC can contain an aliases JSON array. That array
            // is not the NPC object; fall back to the complete key/value block.
            return structured && typeof structured === 'object' && !Array.isArray(structured)
                ? structured
                : parseKeyValueBlock(block);
        })
        .filter(fields => fields && (fields.name || fields.姓名 || fields.appearance || fields.外貌 || fields.identity || fields.身份背景)));
}

function taggedPatches(raw, tag) {
    return extractTaggedNodes(raw, tag).map(node => extractJson(node.content) || parseKeyValueBlock(node.content));
}

function taggedNpcPatches(raw) {
    return extractTaggedNodes(raw, 'npc_patch').map(node => {
        const patch = extractJson(node.content) || parseKeyValueBlock(node.content);
        if (node.attributes.name && patch && typeof patch === 'object' && !patch.name) patch.name = node.attributes.name;
        return patch;
    }).filter(Boolean);
}

function lockNpcNames(npcs, lockedNames) {
    const names = unique(lockedNames);
    if (!names.length || !Array.isArray(npcs) || npcs.length !== names.length) return null;
    const remaining = [...names];
    const assignments = npcs.map(npc => {
        const normalized = normalizeNpc(npc);
        const candidateNames = [normalized.name, ...normalized.aliases].map(canonicalText).filter(Boolean);
        const matchedIndex = remaining.findIndex(name => candidateNames.includes(canonicalText(name)));
        const lockedName = matchedIndex >= 0 ? remaining.splice(matchedIndex, 1)[0] : remaining.shift();
        return {
            lockedName,
            npc: normalized,
        };
    });
    return names.map(name => {
        const assignment = assignments.find(item => canonicalText(item.lockedName) === canonicalText(name));
        return normalizeNpc({
            ...(assignment?.npc || {}),
            name,
            aliases: unique([name, ...(assignment?.npc?.aliases || [])]),
        });
    });
}

function personalityContradictsCore(core, candidate) {
    const source = canonicalText(core);
    const expansion = canonicalText(candidate);
    if (!source || !expansion) return false;
    const conflicts = [
        [/(?:冷酷|冷漠|寡言|寡淡|疏离|克制|沉着|理性|谨慎|沉稳)/u, /(?:热情奔放|极其热情|过分外向|鲁莽冲动|不计后果|放纵不羁)/u],
        [/(?:热情|热烈|活泼|外向|直率|爽朗|张扬)/u, /(?:冷酷无情|极度冷漠|拒人千里|寡言少语|沉默寡言|畏缩封闭)/u],
        [/(?:谨慎|理智|沉稳|冷静|克制)/u, /(?:鲁莽冲动|冲动行事|不计后果|莽撞冒进)/u],
        [/(?:善良|温柔|正直|仁慈)/u, /(?:残忍嗜血|冷血残酷|以伤人为乐|恶毒无情)/u],
        [/(?:忠诚|专一|守信)/u, /(?:见异思迁|反复背叛|背信弃义|四处留情)/u],
    ];
    return conflicts.some(([corePattern, conflictPattern]) => corePattern.test(source) && conflictPattern.test(expansion));
}

function expandNpcPersonality(core, candidate) {
    const lockedCore = text(core).trim();
    const generated = text(candidate).trim();
    if (!lockedCore) return generated;
    if (!generated) return lockedCore;
    if (personalityContradictsCore(lockedCore, generated)) return lockedCore;

    const normalizedCore = canonicalText(lockedCore);
    const normalizedGenerated = canonicalText(generated);
    if (normalizedGenerated.includes(normalizedCore)) return generated;
    // Keep the outline's exact core visible while retaining the model's
    // behavioral and motivational expansion. This avoids reducing a rich NPC
    // personality to the short label used in the outline.
    return `${lockedCore}；${generated}`;
}

function lockNpcsToOutline(npcs, outlineData, lockedNames = null) {
    const constraints = outlineNpcConstraints(outlineData);
    const names = unique(lockedNames || []);
    const locked = names.length ? lockNpcNames(npcs, names) : normalizeNpcCollection(npcs);
    if (!locked) return null;
    return locked.map(npc => {
        const constraint = constraints.find(item => canonicalText(item.name) === canonicalText(npc.name));
        return normalizeNpc({
            ...npc,
            name: constraint?.name || npc.name,
            personality: expandNpcPersonality(constraint?.personality, npc.personality),
        });
    });
}

function outlineCharacterNamesFromText(raw) {
    const names = [];
    const source = stripReasoningBlocks(raw);
    const labeled = /(?:^|\n)\s*(?:主要\s*)?(?:角色名|人物名|主要角色姓名|主要NPC|NPC名单|角色列表)\s*[：:]\s*([^\n<]+)/giu;
    for (const match of source.matchAll(labeled)) {
        names.push(...asList(match[1].replace(/[；;]/gu, '、')));
    }

    // Models occasionally follow the outline protocol but put names only in
    // the prose, e.g. "开端：艾琳是..." or "随后陆骁决定...". Extract only
    // short Han-character spans immediately before common person predicates;
    // this is deliberately conservative so a location or job title is not
    // turned into an NPC name just because it appears in the outline.
    const prose = source
        .replace(/<[^>]+>/g, '\n')
        .replace(/^(?:开端|发展|转折|高潮|结局)\s*[：:].*$/gim, line => line.replace(/^[^：:]+[：:]/, ''));
    const predicates = '(?:是|为|曾是|担任|身为|作为|来自|在|与|和|却|但|并|也|仍|突然|立刻|开始|决定|拒绝|发现|调查|追查|带着|拿出|转身|说道|开口|问道|回答|冷笑|低声)';
    const prosePattern = new RegExp(`(?:^|[。！？；，、\s])([\\p{Script=Han}]{2,4})(?=${predicates})`, 'gu');
    for (const match of prose.matchAll(prosePattern)) names.push(match[1]);

    const excluded = new Set([
        '开端', '发展', '转折', '高潮', '结局', '故事', '剧情', '事件', '三年前',
        '随后', '此时', '当天', '最终', '因此', '然而', '于是', '因为', '如果',
        '香港', '九龙', '重案组', '调查组', '警方', '现场', '案件', '镜像',
    ]);
    return unique(names.filter(name => !excluded.has(name) && !/^第[一二三四五六七八九十\d]+/.test(name)));
}

function normalizeOutlineData(value, raw = '') {
    const source = value && typeof value === 'object' ? value : {};
    const legacy = stripReasoningBlocks(text(source.outline ?? source['大纲'] ?? source['剧情大纲'] ?? source.content ?? raw))
        .replace(/^\s*\[\s*(开端|发展|转折|高潮|结局)\s*\]\s*$/gim, '$1：')
        .replace(/^\s*(?:#{1,6}\s*)?(开端|发展|转折|高潮|结局)\s*$/gim, '$1：');
    const sectionLabels = ['开端', '发展', '转折', '高潮', '结局', '主要角色名', '主要 NPC 功能', 'NSFW 节点', '硬性规则'];
    const sectionFromLegacy = (label, nextLabels) => {
        const pattern = new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextLabels.join('|')})[：:]|$)`, 'i');
        return legacy.match(pattern)?.[1]?.trim() || '';
    };
    const tagged = key => extractTaggedBlocks(raw, key)[0] || '';
    const get = (key, label, ...aliases) => {
        const direct = source[key] ?? aliases.map(alias => source[alias]).find(Boolean) ?? tagged(key);
        return text(direct || sectionFromLegacy(label, sectionLabels.filter(item => item !== label)));
    };
    const getList = (key, labels, tag) => {
        const direct = source[key] ?? labels.map(label => source[label]).find(Boolean) ?? tagged(tag);
        return asList(direct || labels.map(label => sectionFromLegacy(label, sectionLabels.filter(item => item !== label))).find(Boolean) || '');
    };
    return {
        opening: get('opening', '开端', '开场', 'opening', '开端'),
        development: get('development', '发展', 'development', '发展'),
        turningPoint: get('turningPoint', '转折', 'turning_point', 'turning', '转折'),
        climax: get('climax', '高潮', 'climax', '高潮'),
        ending: get('ending', '结局', 'end', 'ending', '结局'),
        characterNames: unique([
            ...getList('characterNames', ['主要角色名', '角色名'], 'character_names'),
            ...outlineCharacterNamesFromText(raw),
        ]),
        npcFunctions: getList('npcFunctions', ['主要 NPC 功能', '主要NPC功能'], 'npc_functions'),
        nsfwNodes: getList('nsfwNodes', ['NSFW 节点', 'NSFW节点'], 'nsfw_nodes'),
        hardRules: getList('hardRules', ['硬性规则'], 'hard_rules'),
    };
}

function mergeOutlineData(previous, next) {
    const oldOutline = normalizeOutlineData(previous);
    const newOutline = normalizeOutlineData(next);
    const merged = {};
    for (const key of ['opening', 'development', 'turningPoint', 'climax', 'ending']) {
        merged[key] = newOutline[key] || oldOutline[key];
    }
    merged.characterNames = newOutline.characterNames.length
        ? newOutline.characterNames
        : oldOutline.characterNames;
    for (const key of ['npcFunctions', 'nsfwNodes', 'hardRules']) {
        merged[key] = newOutline[key].length ? newOutline[key] : oldOutline[key];
    }
    return merged;
}

function hasCompleteOutline(data) {
    const normalized = normalizeOutlineData(data);
    return ['opening', 'development', 'turningPoint', 'climax', 'ending'].every(field => Boolean(normalized[field]));
}

function validatePersona(persona) {
    const normalized = normalizePersonaData(persona);
    const missing = ['name', 'gender', 'age', 'appearance', 'personality', 'identity', 'past', 'habits', 'boundaries']
        .filter(field => !normalized[field]);
    if (missing.length) return `user 人设缺少：${missing.join('、')}`;
    if (!validateAdultText(normalized.age)) return 'user 人设包含明确的未满 18 岁年龄，不能用于成人内容';
    return '';
}

function selectedChips(category, values) {
    const sorted = [...values].sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN-u-co-pinyin', { sensitivity: 'base' }));
    return sorted.map(value => `<button type="button" class="sos-chip ${category} ${state.config[category]?.includes(value) ? 'selected' : ''}" data-category="${category}" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('');
}

function customValues(category) {
    const value = category === 'backgrounds' ? state.config.customBackground : category === 'relationships' ? state.config.customRelationships : state.config.customTropes;
    return text(value).split(/[\n,，、]/).map(item => item.trim()).filter(Boolean);
}

function configMarkup() {
    const c = state.config;
    const availableWorldBooks = getAvailableWorldBookNames();
    const selectedWorldBook = selectedReferenceWorldBookName();
    return `
        <div class="sos-section-intro"><span class="sos-kicker">01 / CONFIGURE</span><h2>先定义你想读的故事</h2><p>标签可以叠加，未列出的内容直接写进自定义栏。大纲和 NPC 使用酒馆当前选中的 API、模型、生成预设及世界信息流程；工作台配置作为额外约束发送，不会把预设 JSON 文本重复拼接。</p></div>
        ${generationDiagnosticsMarkup()}
        <section class="sos-config-grid">
            <div class="sos-field sos-field-wide"><label>时代背景（可多选）</label><div class="sos-chip-grid" data-sos-scroll="backgrounds">${selectedChips('backgrounds', BACKGROUNDS)}</div><textarea id="sos-custom-background" placeholder="自定义背景，可用逗号或换行分隔">${escapeHtml(c.customBackground)}</textarea></div>
            <div class="sos-field"><label>user 定位</label><div class="sos-segment" data-setting="userRole">${['攻', '受', '中立/不设定'].map(item => `<button type="button" class="${c.userRole === item ? 'selected' : ''}" data-value="${item}">${item}</button>`).join('')}</div></div>
            <div class="sos-field"><label>性向关系</label><div class="sos-segment" data-setting="orientation">${['BG', 'BL', 'GL'].map(item => `<button type="button" class="${c.orientation === item ? 'selected' : ''}" data-value="${item}">${item}</button>`).join('')}</div><small>会按 user 的攻/受定位解释为 GB、BL、GL 等实际方向。</small></div>
            <div class="sos-field"><label>关系数量</label><div class="sos-segment" data-setting="relationshipMode">${['1V1', 'NP'].map(item => `<button type="button" class="${c.relationshipMode === item ? 'selected' : ''}" data-value="${item}">${item}</button>`).join('')}</div></div>
            <div class="sos-field sos-field-wide"><label>user 与主要 NPC 的关系（可多选）</label><div class="sos-chip-grid" data-sos-scroll="relationships">${selectedChips('relationships', RELATIONSHIPS)}</div><textarea id="sos-custom-relationships" placeholder="自定义关系关键词">${escapeHtml(c.customRelationships)}</textarea></div>
            <div class="sos-field"><label>故事基调</label><div class="sos-segment" data-setting="tone">${['甜文', '虐文', '甜虐交织', '纯黄文'].map(item => `<button type="button" class="${c.tone === item ? 'selected' : ''}" data-value="${item}">${item}</button>`).join('')}</div><small>选择“纯黄文”时，大纲必须把成年角色之间的主动 NSFW 情节作为主线规划。</small></div>
            <div class="sos-field"><label>结局</label><div class="sos-segment" data-setting="ending">${['HE', 'BE', '开放式'].map(item => `<button type="button" class="${c.ending === item ? 'selected' : ''}" data-value="${item}">${item}</button>`).join('')}</div></div>
            <div class="sos-field sos-field-wide"><label>剧情情节关键词（可无限组合）</label><div class="sos-chip-grid" data-sos-scroll="tropes">${selectedChips('tropes', TROPES)}</div><textarea id="sos-custom-tropes" placeholder="自定义剧情关键词">${escapeHtml(c.customTropes)}</textarea></div>
            <div class="sos-field"><label>故事长度</label><div class="sos-segment" data-setting="length">${Object.entries(LENGTHS).map(([key, item]) => `<button type="button" class="${c.length === key ? 'selected' : ''}" data-value="${key}">${item.label}</button>`).join('')}</div><small>这里只控制篇幅倾向和推进节奏，不限制大纲字数。中篇至少保留 20 个 user 交互楼层，长篇至少保留 50 个。</small></div>
            <div class="sos-field"><label>大纲 / NPC 生成方式</label><label class="sos-switch"><input id="sos-stream-structured" type="checkbox" ${c.streamStructured ? 'checked' : ''}><span>使用前台流式生成</span></label><small>开启后请求会走酒馆正常生成流程，跟随酒馆的流式设置并把结构化草稿留在聊天中；关闭时使用静默结构化请求，不污染聊天。</small></div>
            <div class="sos-field"><label>特别想看的情节 / 禁区 / 补充要求</label><textarea id="sos-detail" placeholder="例如：必须有雨夜重逢、不要误会拖太久、某个 NPC 必须先道歉...">${escapeHtml(c.detail)}</textarea></div>
        </section>
        <div class="sos-subsection"><strong>已导入参考角色卡</strong><div class="sos-import-list">${state.importedCharacterReferences.length ? state.importedCharacterReferences.map((reference, index) => `<span>${escapeHtml(reference.name)} <small>（${escapeHtml(reference.source)}）</small> <button type="button" class="sos-remove-character-import" data-index="${index}" title="移除">×</button></span>`).join('') : '<em>暂无。可导入其他角色卡，保留其角色内核、身份逻辑和说话方式，用于平行世界创作。</em>'}</div></div>
        <div class="sos-subsection"><strong>参考世界书</strong><div class="sos-worldbook-source"><label for="sos-reference-worldbook">按酒馆现有世界书查询</label><div class="sos-inline-control"><select id="sos-reference-worldbook"><option value="">${availableWorldBooks.length ? '不使用外部世界书' : '酒馆当前没有已导入世界书'}</option>${availableWorldBooks.map(name => `<option value="${escapeHtml(name)}" ${selectedWorldBook === name ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select><button type="button" class="sos-icon-button" data-action="refresh-worldbooks" title="刷新酒馆世界书列表"><i class="fa-solid fa-rotate"></i></button></div><small>${selectedWorldBook ? `当前将读取“${escapeHtml(selectedWorldBook)}”中的 NPC 和世界设定。` : '如果当前角色已绑定世界书，会自动优先使用绑定的世界书；也可以在这里选择其他已导入世界书。'}${worldBookListError ? ` 刷新失败：${escapeHtml(worldBookListError)}` : ''}</small></div><div class="sos-import-list">${state.importedWorldBooks.length ? state.importedWorldBooks.map((book, index) => `<span>${escapeHtml(book.name)} <button type="button" class="sos-remove-worldbook-import" data-index="${index}" title="移除">×</button></span>`).join('') : '<em>暂无本地文件参考。现有世界书不需要上传源文件即可查询。</em>'}</div><label class="sos-file-button"><i class="fa-solid fa-file-import"></i> 导入 JSON 世界书 / 角色卡<input id="sos-worldbook-file" type="file" accept=".json,application/json" hidden></label><div class="sos-actions sos-import-actions"><button type="button" class="sos-secondary" data-action="attach-reference-worldbook"><i class="fa-solid fa-link"></i> 创建并挂载平行 IF 世界书</button></div><small>${state.attachedWorldBookName ? `当前聊天已挂载：${escapeHtml(state.attachedWorldBookName)}` : '挂载按钮只用于把文件参考合并成酒馆可用的平行世界书，不会修改被查询的原世界书。'}</small></div>
        <div class="sos-actions"><button type="button" class="sos-primary" data-action="generate-outline"><i class="fa-solid fa-wand-magic-sparkles"></i> ${state.outline ? '重新生成大纲' : '生成剧情大纲'}</button></div>`;
}

function generationDiagnosticsMarkup() {
    const snapshot = state.lastGeneration || {};
    if (!snapshot.at && !snapshot.error && !snapshot.rawPreview && !snapshot.repairedPreview) return '';
    const labels = { outline: '剧情大纲', persona: 'user 人设', npc: '主要 NPC', generation: '生成任务' };
    const generatedAt = snapshot.at ? new Date(snapshot.at).toLocaleString() : '未知时间';
    const renderBlock = (label, value, className = '') => value
        ? `<div class="sos-diagnostic-block ${className}"><strong>${label}</strong><pre>${escapeHtml(value)}</pre></div>`
        : '';
    const continuation = state.continuation?.kind
        ? `<div class="sos-continuation"><strong>${escapeHtml(labels[state.continuation.kind] || '结构化内容')}输出未完成</strong><button type="button" class="sos-secondary" data-action="continue-structured"><i class="fa-solid fa-forward"></i> 继续生成并导入</button></div>`
        : '';
    return `${continuation}<details class="sos-diagnostics" ${snapshot.error ? 'open' : ''}><summary><span>最近一次响应摘要</span><small>${escapeHtml(labels[snapshot.kind] || snapshot.kind || '暂无')} · ${escapeHtml(generatedAt)}</small></summary><div class="sos-diagnostics-body"><small>这里只显示诊断预览；“诊断预览省略”不代表插件解析时丢弃了原始正文。</small>${renderBlock('错误', snapshot.error, 'error')}${renderBlock('上游原始响应', snapshot.rawPreview)}${renderBlock('整理请求响应', snapshot.repairedPreview)}</div></details>`;
}

function personaMarkup() {
    const existing = text(power_user.persona_description);
    const externalPersona = Boolean(existing);
    const displayedPersona = state.userPersona || personaToText(state.userPersonaData) || existing;
    const acceptance = externalPersona
        ? '<span class="sos-ok">已采用酒馆现有人设</span>'
        : state.userPersonaAccepted ? '<span class="sos-ok">已接受</span>' : '<span>尚未接受</span>';
    return `<div class="sos-section-intro"><span class="sos-kicker">02 / USER PERSONA</span><h2>确认 user 的人设</h2><p>${existing ? '检测到酒馆已有 user 人设。你可以直接采用，也可以在这里为本故事建立独立版本。' : '当前没有检测到酒馆 user 人设。先生成一份角色设定，后续大纲和剧情都会使用它。'}</p></div>${generationDiagnosticsMarkup()}
        <div class="sos-persona-box"><textarea id="sos-persona" placeholder="用户人设会显示在这里">${escapeHtml(displayedPersona)}</textarea><div class="sos-persona-meta">${acceptance}</div></div>
        <div class="sos-revise"><label>人设修改意见</label><textarea id="sos-persona-feedback" placeholder="例如：保留姓名和职业，把性格改得更寡言，补充右手旧伤；未提到的字段保持不变"></textarea></div>
        <div class="sos-actions"><button type="button" class="sos-secondary" data-action="reroll-persona"><i class="fa-solid fa-dice"></i> 直接重 roll</button><button type="button" class="sos-secondary" data-action="revise-persona"><i class="fa-solid fa-pen"></i> 按意见修改</button>${externalPersona ? '' : '<button type="button" class="sos-primary" data-action="accept-persona"><i class="fa-solid fa-check"></i> 接受这份人设并继续</button>'}</div>`;
}

function outlineMarkup() {
    const hasOutline = text(state.outline);
    const length = LENGTHS[state.config.length] || LENGTHS.short;
    const hasAcceptedNpcs = state.npcs.length > 0 && state.npcsAccepted;
    const worldBookNpcSource = state.npcSource === 'worldbook';
    const npcSourceDescription = worldBookNpcSource
        ? '确认大纲后会直接使用角色卡绑定/内置世界书中的已启用条目，不会调用 NPC 生成接口。'
        : hasAcceptedNpcs
            ? '当前已有已接受的 NPC；确认大纲后会直接沿用，不会重新生成 NPC。'
            : '确认大纲后会调用 AI 生成 NPC。';
    return `<div class="sos-section-intro"><span class="sos-kicker">03 / OUTLINE</span><h2>审核剧情大纲</h2><p>故事篇幅：${length.label}。这是节奏和推进密度的倾向，不设本地硬字数上限；AI 必须完整写出开端、发展、转折、高潮、结局、因果链和结局方向。${npcSourceDescription}重 roll 或修改会生成新版本，已完成剧情不会回写。</p></div>${generationDiagnosticsMarkup()}
        <div class="sos-field sos-field-wide sos-npc-source-picker"><label>主要 NPC 来源</label><div class="sos-segment" data-setting="npcSource"><button type="button" class="${!worldBookNpcSource ? 'selected' : ''}" data-action="set-npc-source" data-value="generate"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 生成 NPC</button><button type="button" class="${worldBookNpcSource ? 'selected' : ''}" data-action="set-npc-source" data-value="worldbook"><i class="fa-solid fa-book"></i> 使用角色卡世界书 NPC</button></div><small>${worldBookNpcSource ? '只参考当前角色卡绑定的外部世界书、角色卡内置 character_book 以及已选择的参考世界书中的已启用条目；关闭条目不会发送给 AI。' : '适合角色卡没有现成 NPC，或你希望由当前大纲重新设计 NPC 的情况。'}</small></div>
        <div class="sos-outline-box ${hasOutline ? '' : 'empty'}">${hasOutline ? `<div class="sos-version">版本 ${state.outlineVersion} · ${state.outline.length} 字</div><textarea id="sos-outline-editor" class="sos-outline-editor" aria-label="剧情大纲">${escapeHtml(state.outline)}</textarea>` : '<i>还没有大纲。回到配置页生成一份。</i>'}</div>
        <div class="sos-revise"><label>修改意见</label><textarea id="sos-outline-feedback" placeholder="例如：把第三幕改成 user 主动救 NPC，保留已完成部分，只调整后续走向"></textarea></div>
        <div class="sos-actions"><button type="button" class="sos-secondary" data-action="save-outline" ${hasOutline ? '' : 'disabled'}><i class="fa-solid fa-floppy-disk"></i> 保存编辑后的大纲</button><button type="button" class="sos-secondary" data-action="reroll-outline"><i class="fa-solid fa-dice"></i> 直接重 roll</button><button type="button" class="sos-secondary" data-action="revise-outline"><i class="fa-solid fa-pen"></i> 按意见重写</button><button type="button" class="sos-primary" data-action="accept-outline" ${hasOutline ? '' : 'disabled'}><i class="fa-solid fa-check"></i> ${worldBookNpcSource ? '确认大纲并使用角色卡 NPC' : hasAcceptedNpcs ? '确认大纲并继续剧情' : '接受大纲并生成 NPC'}</button></div>`;
}

function saveEditedOutline() {
    const value = text(document.getElementById('sos-outline-editor')?.value);
    if (!value) return toastr.warning('大纲不能为空。');

    const parsed = normalizeOutlineData({ outline: value }, value);
    if (!hasCompleteOutline(parsed)) {
        return toastr.warning('大纲必须包含完整的开端、发展、转折、高潮和结局。');
    }

    const current = normalizeOutlineData(state.outlineData, state.outline);
    const finalOutlineData = {
        ...parsed,
        characterNames: parsed.characterNames.length ? parsed.characterNames : current.characterNames,
        npcFunctions: parsed.npcFunctions.length ? parsed.npcFunctions : current.npcFunctions,
        nsfwNodes: parsed.nsfwNodes.length ? parsed.nsfwNodes : current.nsfwNodes,
        hardRules: parsed.hardRules.length ? parsed.hardRules : current.hardRules,
    };
    const finalOutline = fitOutlineSections(finalOutlineData);
    if (state.outline) {
        state.outlineRevisions.push({ version: state.outlineVersion, outline: state.outline, outlineData: clone(state.outlineData), accepted: state.outlineAccepted, createdAt: Date.now() });
    }
    state.outlineData = finalOutlineData;
    state.outline = finalOutline;
    state.outlineVersion += 1;
    state.outlineAccepted = false;
    // Revising the route does not invalidate an already accepted cast. Keep
    // it available so the user can continue with the new outline without
    // paying for another NPC generation request.
    if (!state.npcs.length || !state.npcsAccepted) state.npcsAccepted = false;
    state.lastGeneratedAt = Date.now();
    saveState();
    rerender();
    toastr.success('编辑后的大纲已保存，将作为后续 NPC 和剧情生成依据。');
}

function npcField(label, value, index, field, multiline = false) {
    const tag = multiline ? 'textarea' : 'input';
    const content = multiline ? escapeHtml(value) : '';
    const valueAttribute = multiline ? '' : ` value="${escapeHtml(value)}"`;
    return `<label class="sos-npc-field">${label}<${tag} data-npc-index="${index}" data-npc-field="${field}"${valueAttribute}>${content}</${tag}></label>`;
}

function npcMarkup() {
    const cards = state.npcs.map((npc, index) => `<article class="sos-npc-card ${npc.enabled === false ? 'disabled' : ''}"><header><label class="sos-switch sos-npc-enabled"><input type="checkbox" data-npc-index="${index}" data-npc-enabled ${npc.enabled !== false ? 'checked' : ''}><span>参与当前故事</span></label><input data-npc-index="${index}" data-npc-field="name" value="${escapeHtml(npc.name)}"><button type="button" class="sos-icon-button" data-action="delete-npc" data-index="${index}" title="删除 NPC"><i class="fa-solid fa-trash"></i></button></header><div class="sos-npc-grid">${npcField('称呼 / 关键词', asArray(npc.aliases).join('、'), index, 'aliases', true)}${npcField('性别', npc.gender, index, 'gender')}${npcField('年龄', npc.age, index, 'age')}${npcField('身高', npc.height, index, 'height')}${npcField('外貌与辨识度特征', npc.appearance, index, 'appearance', true)}${npcField('性格', npc.personality, index, 'personality', true)}${npcField('身份背景', npc.identity, index, 'identity', true)}${npcField('过去经历', npc.past, index, 'past', true)}${npcField('与 user 的关系', npc.relationship, index, 'relationship', true)}${npcField('对 user 的态度', npc.attitude, index, 'attitude', true)}${npcField('典型语录', asArray(npc.quotes).join('\n'), index, 'quotes', true)}${npcField('NSFW 偏好 / 体位 / 语言风格', npc.nsfw, index, 'nsfw', true)}${npcField('身体信息（可填写）', npc.body, index, 'body', true)}</div></article>`).join('');
    const availableWorldBooks = getNpcWorldBookNames();
    const selectedWorldBook = selectedNpcWorldBookName();
    const explicitWorldBook = explicitNpcWorldBookName();
    const draftIssues = state.npcs.map(validateNpc).filter(Boolean);
    const draftNotice = draftIssues.length
        ? `<div class="sos-empty">AI 返回了可识别但不完整的 NPC 草稿，已先保留到列表。接受前请补全：${escapeHtml(draftIssues.join('；'))}</div>`
        : '';
    const targetOptions = availableWorldBooks.map(name => `<option value="${escapeHtml(name)}" ${explicitWorldBook === name ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');
    return `<div class="sos-section-intro"><span class="sos-kicker">04 / NPC CAST</span><h2>审核主要 NPC</h2><p>关闭某个 NPC 后，它不会参与当前聊天的剧情上下文；不同聊天窗口各自保存 NPC 开关和故事进度。接受后会写入下面选择的目标世界书，默认使用角色卡绑定的世界书。</p></div>${generationDiagnosticsMarkup()}<div class="sos-worldbook-source sos-npc-worldbook-picker"><label for="sos-npc-worldbook">NPC 写入目标世界书</label><div class="sos-inline-control"><select id="sos-npc-worldbook"><option value="">自动选择：${escapeHtml(storyWorldBookName())}</option>${targetOptions}</select><button type="button" class="sos-icon-button" data-action="refresh-worldbooks" title="刷新酒馆世界书列表"><i class="fa-solid fa-rotate"></i></button></div><small>${explicitWorldBook ? `本次接受将把 NPC 条目写入“${escapeHtml(selectedWorldBook)}”。` : `当前自动目标为“${escapeHtml(selectedWorldBook)}”。可以切换到其他已导入世界书；不会创建额外的平行世界书。`}${worldBookListError ? ` 刷新失败：${escapeHtml(worldBookListError)}` : ''}</small></div>${draftNotice}<div class="sos-npc-list">${cards || '<div class="sos-empty">尚未生成 NPC。请先接受大纲。</div>'}</div><div class="sos-revise"><label>NPC 修改意见</label><textarea id="sos-npc-feedback" placeholder="例如：只修改第二名 NPC 的态度和过去经历，保留其他 NPC 及其余字段；补充一个右耳耳钉的辨识特征"></textarea></div><div class="sos-actions"><button type="button" class="sos-secondary" data-action="reroll-npc"><i class="fa-solid fa-dice"></i> 直接重 roll</button><button type="button" class="sos-secondary" data-action="revise-npc" ${cards ? '' : 'disabled'}><i class="fa-solid fa-pen"></i> 按意见修改</button><button type="button" class="sos-primary" data-action="accept-npc" ${cards ? '' : 'disabled'}><i class="fa-solid fa-book"></i> 接受并写入世界书</button></div>`;
}

function storyMarkup() {
    const target = LENGTHS[state.config.length] || LENGTHS.short;
    const active = state.outlineAccepted && state.npcsAccepted;
    return `<div class="sos-section-intro"><span class="sos-kicker">05 / STORY ENGINE</span><h2>按大纲推进剧情</h2><p>当前大纲版本 ${state.outlineVersion}，已推进 ${state.currentTurn} 楼，user 已输入 ${state.userTurnCount} 楼。${target.minTurns ? `本篇在达到最低 user 交互楼层前不会进入最终收束（最低 ${target.minTurns} 楼）。` : '短篇不设置最低楼层。'}</p></div><div class="sos-story-status"><span class="${active ? 'sos-ok' : 'sos-warn'}">${active ? '大纲与 NPC 已锁定' : '请先接受大纲和 NPC'}</span><span>当前聊天已记录 ${state.completedStoryMessages || 0} 段剧情</span></div><div class="sos-revise"><label>中途修改大纲</label><textarea id="sos-mid-feedback" placeholder="已完成内容不会改变。写下你希望后续剧情怎样调整，然后重新审核大纲。"></textarea></div><div class="sos-actions"><button type="button" class="sos-primary" data-action="continue-story" ${active ? '' : 'disabled'}><i class="fa-solid fa-forward-step"></i> 继续剧情</button><button type="button" class="sos-secondary" data-action="revise-from-story"><i class="fa-solid fa-route"></i> 修改后续大纲</button><button type="button" class="sos-secondary" data-action="show-outline"><i class="fa-solid fa-scroll"></i> 查看当前大纲</button></div>`;
}

function dashboardMarkup() {
    const stages = [
        ['config', '配置', 'fa-sliders'], ['persona', 'user 人设', 'fa-user-pen'], ['outline', '剧情大纲', 'fa-scroll'], ['npc', 'NPC', 'fa-users'], ['story', '推进剧情', 'fa-forward-step'],
    ];
    const content = activeStage === 'config' ? configMarkup() : activeStage === 'persona' ? personaMarkup() : activeStage === 'outline' ? outlineMarkup() : activeStage === 'npc' ? npcMarkup() : storyMarkup();
    const generatingNotice = generating ? `<div class="sos-generating" role="status" aria-live="polite"><i class="fa-solid fa-spinner fa-spin"></i><span>${escapeHtml(generatingLabel)}</span></div>` : '';
    return `<div class="sos-panel"><header class="sos-header"><div><span class="sos-brand">STORY OUTLINE STUDIO</span><h1>剧情大纲工作台</h1></div><div class="sos-header-actions"><button type="button" class="sos-header-button" data-action="reset-project" title="清空本聊天的工作台状态"><i class="fa-solid fa-rotate-left"></i></button><button type="button" class="sos-header-button" data-action="minimize" title="最小化"><i class="fa-solid fa-window-minimize"></i></button><button type="button" class="sos-header-button" data-action="close" title="关闭"><i class="fa-solid fa-xmark"></i></button></div></header><nav class="sos-stage-nav">${stages.map(([key, label, icon]) => `<button type="button" class="${activeStage === key ? 'active' : ''} ${stageComplete(key) ? 'complete' : ''}" data-stage="${key}"><i class="fa-solid ${icon}"></i><span>${label}</span></button>`).join('')}</nav><main class="sos-main">${generatingNotice}${content}</main><footer class="sos-footer"><span>${state.worldBookName ? `世界书：${escapeHtml(state.worldBookName)}` : '独立工作台 · 当前聊天保存'}</span><span>${ctx.characterId === undefined ? '空白卡 / 独立模式' : '当前角色卡模式'}</span></footer></div><button type="button" class="sos-restore-button" data-action="restore" title="恢复剧情大纲工作台"><i class="fa-solid fa-window-maximize"></i></button>`;
}

function stageComplete(stage) {
    return stage === 'config' ? Boolean(state.config.backgrounds.length || customValues('backgrounds').length) : stage === 'persona' ? state.userPersonaAccepted || hasExternalUserPersona() : stage === 'outline' ? state.outlineAccepted : stage === 'npc' ? state.npcsAccepted : state.currentTurn > 0;
}

function openPanel(stage = activeStage, reloadState = true) {
    refreshContext();
    // A rerender can happen immediately after generation, before SillyTavern's
    // debounced metadata write completes. Keep the in-memory result for that
    // render instead of replacing it with the previous chat snapshot.
    if (reloadState || !state) state = getState();
    activeStage = stage;
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'sos-overlay';
        document.body.append(panel);
    }
    panel.innerHTML = dashboardMarkup();
    panel.style.setProperty('--sos-zoom', String(state.zoom || 1));
    panel.classList.remove('minimized');
    panel.classList.add('open');
    bindPanelEvents();
    if ((stage === 'config' || stage === 'npc') && !worldBookListLoaded) {
        void refreshAvailableWorldBooks().then(() => {
            if (panel?.classList.contains('open') && activeStage === stage) rerender();
        });
    }
}

function closePanel() {
    panel?.classList.remove('open', 'minimized');
}

function readPanelScrollPositions() {
    return {
        document: document.scrollingElement?.scrollTop || window.scrollY || 0,
        main: panel?.querySelector('.sos-main')?.scrollTop || 0,
        grids: Object.fromEntries([...panel?.querySelectorAll('[data-sos-scroll]') || []].map(element => [element.dataset.sosScroll, element.scrollTop])),
    };
}

function restorePanelScrollPositions(scrollPositions = {}) {
    const documentTop = Number(scrollPositions.document);
    if (Number.isFinite(documentTop)) {
        document.scrollingElement?.scrollTo?.(0, documentTop);
        window.scrollTo?.(0, documentTop);
    }
    for (const element of panel?.querySelectorAll('[data-sos-scroll]') || []) {
        const position = scrollPositions.grids?.[element.dataset.sosScroll];
        if (Number.isFinite(position)) element.scrollTop = position;
    }
    const main = panel?.querySelector('.sos-main');
    if (main && Number.isFinite(Number(scrollPositions.main))) main.scrollTop = Number(scrollPositions.main);
}

function rerender() {
    if (!panel?.classList.contains('open') || panel.classList.contains('minimized')) return;
    const main = panel.querySelector('.sos-main');
    const scrollTop = main?.scrollTop || 0;
    const chipScrollPositions = readPanelScrollPositions();
    const focused = document.activeElement?.closest?.('#sos-overlay') ? document.activeElement : null;
    const focusKey = focused?.id || focused?.dataset?.npcField && `${focused.dataset.npcIndex}:${focused.dataset.npcField}`;
    const focusedChip = focused?.classList?.contains('sos-chip')
        ? { category: focused.dataset.category, value: focused.dataset.value }
        : null;
    openPanel(activeStage, false);
    const restore = () => {
        const nextMain = panel.querySelector('.sos-main');
        if (nextMain) nextMain.scrollTop = scrollTop;
        restorePanelScrollPositions(chipScrollPositions);
        if (focusedChip) {
            const nextChip = [...panel.querySelectorAll('.sos-chip')].find(button => button.dataset.category === focusedChip.category && button.dataset.value === focusedChip.value);
            nextChip?.focus({ preventScroll: true });
        }
        if (focusKey) {
            const nextFocus = focusKey.includes(':')
                ? panel.querySelector(`[data-npc-index="${focusKey.split(':')[0]}"][data-npc-field="${focusKey.split(':')[1]}"]`)
                : panel.querySelector(`#${CSS.escape(focusKey)}`);
            nextFocus?.focus({ preventScroll: true });
        }
    };
    restore();
    requestAnimationFrame(restore);
    setTimeout(restore, 50);
}

function setCustomValues() {
    const read = id => document.getElementById(id)?.value;
    const background = read('sos-custom-background');
    const relationships = read('sos-custom-relationships');
    const tropes = read('sos-custom-tropes');
    const detail = read('sos-detail');
    if (background !== undefined) state.config.customBackground = background;
    if (relationships !== undefined) state.config.customRelationships = relationships;
    if (tropes !== undefined) state.config.customTropes = tropes;
    if (detail !== undefined) state.config.detail = detail;
    const streamStructured = document.getElementById('sos-stream-structured');
    if (streamStructured) state.config.streamStructured = streamStructured.checked;
}

function bindPanelEvents() {
    panel.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => { setCustomValues(); activeStage = button.dataset.stage; saveState(); rerender(); }));
    panel.querySelectorAll('.sos-chip').forEach(button => button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const main = panel.querySelector('.sos-main');
        const chipGrids = [...panel.querySelectorAll('.sos-chip-grid')];
        const mainScrollTop = main?.scrollTop || 0;
        const gridScrollTops = chipGrids.map(element => element.scrollTop);
        const documentScrollTop = document.scrollingElement?.scrollTop || window.scrollY || 0;
        setCustomValues();
        const category = button.dataset.category;
        const values = new Set(state.config[category]);
        const selected = values.has(button.dataset.value);
        selected ? values.delete(button.dataset.value) : values.add(button.dataset.value);
        state.config[category] = [...values];
        button.classList.toggle('selected', !selected);
        button.blur();
        saveState();
        const restoreScroll = () => {
            if (main) main.scrollTop = mainScrollTop;
            chipGrids.forEach((element, index) => { element.scrollTop = gridScrollTops[index]; });
            document.scrollingElement?.scrollTo?.(0, documentScrollTop);
            window.scrollTo?.(0, documentScrollTop);
        };
        restoreScroll();
        requestAnimationFrame(restoreScroll);
        setTimeout(restoreScroll, 50);
    }));
    panel.querySelectorAll('.sos-chip').forEach(button => button.addEventListener('pointerdown', event => {
        if (event.button === 0) event.preventDefault();
    }));
    panel.querySelectorAll('.sos-segment button').forEach(button => button.addEventListener('click', () => {
        setCustomValues();
        const setting = button.parentElement.dataset.setting;
        if (setting === 'npcSource') return handleAction('set-npc-source', button);
        state.config[setting] = button.dataset.value;
        saveState();
        rerender();
    }));
    panel.querySelector('#sos-stream-structured')?.addEventListener('change', () => {
        setCustomValues();
        saveState();
    });
    panel.querySelector('#sos-reference-worldbook')?.addEventListener('change', async event => {
        try {
            await selectReferenceWorldBook(event.target.value);
        } catch (error) {
            toastr.error(error.message || '读取世界书失败');
            rerender();
        }
    });
    panel.querySelector('#sos-npc-worldbook')?.addEventListener('change', async event => {
        try {
            await selectNpcWorldBook(event.target.value);
        } catch (error) {
            toastr.error(error.message || '读取世界书失败');
            rerender();
        }
    });
    panel.querySelectorAll('[data-npc-field]').forEach(input => {
        const eventName = input.dataset.npcField === 'name' ? 'change' : 'input';
        input.addEventListener(eventName, () => {
            const index = Number(input.dataset.npcIndex);
            const npc = state.npcs[index];
            if (!npc) return;

            if (input.dataset.npcField === 'name') {
                const oldName = text(npc.name);
                const newName = text(input.value);
                if (!newName || oldName === newName) return;
                renameNpcAcrossState(oldName, newName);
                state.npcs[index].name = newName;
                state.npcsAccepted = false;
                saveState();
                rerender();
                return;
            }

            const value = input.dataset.npcField === 'aliases' || input.dataset.npcField === 'quotes'
                ? input.value.split(/[\n,，、]/).map(item => item.trim()).filter(Boolean)
                : input.value;
            npc[input.dataset.npcField] = value;
            state.npcsAccepted = false;
            saveState();
        });
    });
    panel.querySelectorAll('[data-npc-enabled]').forEach(input => input.addEventListener('change', () => {
        const npc = state.npcs[Number(input.dataset.npcIndex)];
        if (!npc) return;
        npc.enabled = input.checked;
        state.npcsAccepted = false;
        saveState();
    }));
    panel.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => handleAction(button.dataset.action, button)));
    panel.querySelector('#sos-worldbook-file')?.addEventListener('change', importWorldBook);
    panel.querySelectorAll('.sos-remove-character-import').forEach(button => button.addEventListener('click', () => { state.importedCharacterReferences.splice(Number(button.dataset.index), 1); saveState(); rerender(); }));
    panel.querySelectorAll('.sos-remove-worldbook-import').forEach(button => button.addEventListener('click', () => { state.importedWorldBooks.splice(Number(button.dataset.index), 1); saveState(); rerender(); }));
}

async function handleAction(action, button) {
    const allowedWhileGenerating = new Set(['close', 'minimize', 'restore', 'reset-project', 'zoom-in', 'zoom-out']);
    if (generating && !allowedWhileGenerating.has(action)) return;
    if (action === 'close') return closePanel();
    if (action === 'minimize') {
        panel?.classList.add('minimized');
        return;
    }
    if (action === 'restore') {
        panel?.classList.remove('minimized');
        rerender();
        return;
    }
    if (action === 'zoom-in' || action === 'zoom-out') {
        const scrollPositions = readPanelScrollPositions();
        const delta = action === 'zoom-in' ? 0.1 : -0.1;
        state.zoom = Math.min(1.2, Math.max(0.8, Math.round((Number(state.zoom || 1) + delta) * 10) / 10));
        saveState();
        panel?.style.setProperty('--sos-zoom', String(state.zoom));
        restorePanelScrollPositions(scrollPositions);
        return;
    }
    if (action === 'reset-project') {
        const ok = await ctx.callGenericPopup('清空当前聊天的剧情工作台状态？已写入世界书的 NPC 不会被删除。', POPUP_TYPE.CONFIRM);
        if (ok) {
            generationEpoch += 1;
            state = defaultState();
            saveState();
            activeStage = 'config';
            generationIntent = 'continue';
            rewriteMessageIndex = -1;
            pendingRewriteAfterDeletion = false;
            rerender();
        }
        return;
    }
    if (action === 'refresh-worldbooks') {
        await refreshAvailableWorldBooks(true);
        rerender();
        return;
    }
    setCustomValues();
    if (action === 'continue-structured') return continueStructuredGeneration();
    if (action === 'set-npc-source') {
        const source = button?.dataset?.value === 'worldbook' ? 'worldbook' : 'generate';
        const previousSource = state.npcSource;
        state.npcSource = source;
        if (source !== previousSource) state.npcsAccepted = false;
        saveState();
        rerender();
        return;
    }
    if (action === 'generate-outline') return startOutline();
    if (action === 'generate-persona') return generatePersona();
    if (action === 'reroll-persona') return generatePersona();
    if (action === 'revise-persona') {
        const feedback = text(document.getElementById('sos-persona-feedback')?.value);
        if (!feedback) return toastr.warning('请先填写人设修改意见。');
        return generatePersona(feedback, 'revise');
    }
    if (action === 'accept-persona') return acceptPersona();
    if (action === 'save-outline') return saveEditedOutline();
    if (action === 'reroll-outline') return generateOutline();
    if (action === 'revise-outline') return reviseOutline();
    if (action === 'accept-outline') return acceptOutline();
    if (action === 'reroll-npc') return generateNpcs('', 'reroll-locked');
    if (action === 'revise-npc') {
        const feedback = text(document.getElementById('sos-npc-feedback')?.value);
        if (!feedback) return toastr.warning('请先填写 NPC 修改意见。');
        return generateNpcs(feedback, 'revise');
    }
    if (action === 'delete-npc') { state.npcs.splice(Number(button.dataset.index), 1); state.npcsAccepted = false; saveState(); rerender(); return; }
    if (action === 'accept-npc') return acceptNpcs();
    if (action === 'continue-story') return continueStory();
    if (action === 'revise-from-story') return reviseFromStory();
    if (action === 'show-outline') { activeStage = 'outline'; rerender(); }
    if (action === 'attach-reference-worldbook') return attachReferenceWorldBook();
}

function configPayload() {
    const c = state.config;
    return {
        ...c,
        backgrounds: unique([...c.backgrounds, ...customValues('backgrounds')]),
        relationships: unique([...c.relationships, ...customValues('relationships')]),
        tropes: unique([...c.tropes, ...customValues('tropes')]),
        lengthLabel: LENGTHS[c.length]?.label || '短篇',
        actualOrientation: `${c.orientation}（user为${c.userRole}）`,
    };
}

function getAvailableWorldBookNames() {
    refreshContext();
    // `getWorldInfoNames` is a newer context helper. SillyTavern 1.17
    // already exposes the live `world_names` binding from world-info.js.
    const names = typeof ctx.getWorldInfoNames === 'function'
        ? ctx.getWorldInfoNames()
        : Array.isArray(worldInfoModule?.world_names) ? worldInfoModule.world_names : [];
    return [...new Set(names.map(text).filter(Boolean))].sort(compareWorldBookNames);
}

function getNpcWorldBookNames() {
    return [...new Set([
        ...getAvailableWorldBookNames(),
        ...linkedReferenceWorldBookNames(),
        text(state?.worldBookName),
    ].filter(Boolean))].sort(compareWorldBookNames);
}

async function refreshAvailableWorldBooks(force = false) {
    refreshContext();
    if (worldBookListLoaded && !force) return getAvailableWorldBookNames();
    try {
        if (typeof updateWorldInfoList === 'function') await updateWorldInfoList();
        worldBookListError = '';
        worldBookListLoaded = true;
    } catch (error) {
        worldBookListError = error?.message || '酒馆世界书列表刷新失败';
        console.warn(`[${EXTENSION_ID}] failed to refresh world book list`, error);
    }
    return getAvailableWorldBookNames();
}

function getCharacterExtraWorldBookNames() {
    const settings = typeof getWorldInfoSettings === 'function' ? getWorldInfoSettings() : {};
    const charLore = settings?.world_info?.charLore;
    const character = hasCurrentCharacter() ? ctx.characters[ctx.characterId] : null;
    const fileName = typeof getCharaFilename === 'function'
        ? text(getCharaFilename(ctx.characterId))
        : text(character?.avatar).replace(/\.[^/.]+$/, '');
    const lore = Array.isArray(charLore) ? charLore.find(item => text(item?.name) === fileName) : null;
    return Array.isArray(lore?.extraBooks) ? lore.extraBooks.map(text).filter(Boolean) : [];
}

function getCurrentCharacterBook() {
    refreshContext();
    const character = hasCurrentCharacter() ? ctx.characters[ctx.characterId] : null;
    const book = character?.data?.character_book
        || character?.character_book
        || character?.data?.extensions?.character_book;
    if (!book) return null;
    try { return normalizeWorldBookData(book); } catch { return null; }
}

function linkedReferenceWorldBookNames() {
    const names = [];
    const characterBook = characterBoundWorldBookName();
    if (characterBook) names.push(characterBook);
    names.push(...getCharacterExtraWorldBookNames());
    const chatBook = text(ctx.chatMetadata?.[CHAT_WORLD_INFO_KEY]);
    if (chatBook) names.push(chatBook);
    return unique(names);
}

function characterBoundWorldBookName() {
    refreshContext();
    const character = hasCurrentCharacter() ? ctx.characters?.[ctx.characterId] : null;
    return text(character?.data?.extensions?.world);
}

function getLinkedReferenceWorldBookName() {
    return linkedReferenceWorldBookNames()[0] || '';
}

function explicitReferenceWorldBookName() {
    const selected = text(state?.referenceWorldBookName);
    if (!selected) return '';
    // Keep a successfully loaded manual choice valid while SillyTavern is
    // refreshing its world-info list. The list can briefly be empty during a
    // refresh, which used to make the UI and prompt fall back to the linked
    // character world book immediately after a successful selection.
    if (loadedReferenceWorldBooks.has(selected)) return selected;
    return getAvailableWorldBookNames().includes(selected) ? selected : '';
}

function selectedReferenceWorldBookName() {
    const selected = explicitReferenceWorldBookName();
    if (selected) return selected;
    return getLinkedReferenceWorldBookName();
}

function explicitNpcWorldBookName() {
    return text(state?.npcWorldBookName);
}

function selectedNpcWorldBookName() {
    return explicitNpcWorldBookName() || storyWorldBookName();
}

async function ensureReferenceWorldBookLoaded() {
    await refreshAvailableWorldBooks();
    const explicit = explicitReferenceWorldBookName();
    const linked = linkedReferenceWorldBookNames();
    const names = unique([...(explicit ? [explicit] : []), ...linked]);
    const embedded = getCurrentCharacterBook();
    if (!names.length && !embedded) {
        loadedReferenceWorldBooks = new Map();
        return;
    }
    if (embedded) loadedReferenceWorldBooks.set(EMBEDDED_CHARACTER_BOOK_KEY, embedded);
    for (const name of names) {
        if (loadedReferenceWorldBooks.has(name)) continue;
        const data = normalizeWorldBookData(await loadWorldInfo(name));
        loadedReferenceWorldBooks.set(name, data);
    }
}

function hasWorldBookNpcSource() {
    if (state?.npcSource !== 'worldbook') return false;
    const embedded = loadedReferenceWorldBooks.get(EMBEDDED_CHARACTER_BOOK_KEY);
    if (Object.values(embedded?.entries || {}).some(isWorldBookEntryEnabled)) return true;
    for (const [name, book] of loadedReferenceWorldBooks.entries()) {
        if (name !== EMBEDDED_CHARACTER_BOOK_KEY && Object.values(book?.entries || {}).some(isWorldBookEntryEnabled)) return true;
    }
    return false;
}

function activeWorldBookEntries() {
    if (state?.npcSource !== 'worldbook') return [];
    const sources = [];
    // Reopened chats may reach the native generation pipeline before the
    // asynchronous world-info preload finishes. The embedded card book is
    // already present in the character object, so use it synchronously as a
    // fallback instead of sending an empty NPC context on the first turn.
    const embedded = loadedReferenceWorldBooks.get(EMBEDDED_CHARACTER_BOOK_KEY) || getCurrentCharacterBook();
    if (embedded) sources.push(['角色卡内置 character_book', embedded]);
    const names = unique([explicitReferenceWorldBookName(), ...linkedReferenceWorldBookNames()]);
    for (const name of names) {
        const book = loadedReferenceWorldBooks.get(name);
        if (book) sources.push([name, book]);
    }
    const seen = new Set();
    const result = [];
    for (const [sourceName, book] of sources) {
        for (const entry of Object.values(book?.entries || {})) {
            if (!isWorldBookEntryEnabled(entry) || !text(entry?.content)) continue;
            const keys = unique([...asList(entry?.key), ...asList(entry?.keysecondary)]);
            const identity = `${sourceName}\u0000${text(entry?.uid)}\u0000${keys.join('|')}\u0000${text(entry?.content)}`;
            if (seen.has(identity)) continue;
            seen.add(identity);
            result.push({ sourceName, keys, comment: text(entry?.comment), content: text(entry?.content) });
        }
    }
    return result;
}

function activeWorldBookNpcContext() {
    const entries = activeWorldBookEntries();
    if (!entries.length) return '暂无已启用的角色卡/绑定世界书条目。';
    return entries.map((entry, index) => {
        const label = entry.comment || entry.keys.join('、') || `条目 ${index + 1}`;
        return `[${entry.sourceName}] ${label}${entry.keys.length ? `（关键词：${entry.keys.join('、')}）` : ''}\n${limitPromptText(entry.content, 1800)}`;
    }).join('\n\n');
}

async function selectReferenceWorldBook(name) {
    const requested = text(name);
    if (!requested) {
        state.referenceWorldBookName = '';
        loadedReferenceWorldBooks = new Map();
        saveState();
        rerender();
        return;
    }
    const available = await refreshAvailableWorldBooks();
    if (!available.includes(requested)) throw new Error('找不到所选世界书，可能已被删除；请刷新后重新选择。');
    const data = normalizeWorldBookData(await loadWorldInfo(requested));
    // Persist the choice before any redraw or asynchronous refresh can read
    // the old metadata snapshot.
    state.referenceWorldBookName = requested;
    loadedReferenceWorldBooks.set(requested, data);
    saveState();
    rerender();
}

async function selectNpcWorldBook(name) {
    const requested = text(name);
    if (!requested) {
        state.npcWorldBookName = '';
        saveState();
        rerender();
        return;
    }
    const available = await refreshAvailableWorldBooks();
    if (!available.includes(requested)) throw new Error('找不到所选目标世界书，可能已被删除；请刷新后重新选择。');
    const data = await loadWorldInfo(requested);
    if (!data) throw new Error(`无法读取目标世界书“${requested}”，请确认酒馆已加载该世界书。`);
    state.npcWorldBookName = requested;
    saveState();
    rerender();
}

function currentCharacterContext() {
    refreshContext();
    const character = ctx.characterId !== undefined ? ctx.characters?.[ctx.characterId] : null;
    const fields = ctx.getCharacterCardFields?.() || {};
    return { name: character?.name || ctx.name2 || '当前角色', fields };
}

function hasCurrentCharacter() {
    refreshContext();
    return ctx.characterId !== undefined && Boolean(ctx.characters?.[ctx.characterId]);
}

function referenceBooksText() {
    const maxTotal = 12000;
    let used = 0;
    const books = [];
    for (const book of state.importedWorldBooks) {
        const entries = [];
        for (const entry of book.entries) {
            if (!isWorldBookEntryEnabled(entry)) continue;
            if (isStoryNpcEntry(entry) && state.npcSource !== 'worldbook') continue;
            const remaining = maxTotal - used;
            if (remaining <= 0) break;
            const contentLimit = Math.max(120, Math.min(1800, remaining - 80));
            const content = limitPromptText(entry.content, contentLimit);
            const part = `\n[${entry.keys.join('、')}] ${content}`;
            entries.push(part);
            used += part.length;
        }
        if (entries.length) books.push(`<reference_worldbook name="${escapeHtml(book.name)}">${entries.join('')}\n</reference_worldbook>`);
        if (used >= maxTotal) break;
    }
    const explicit = explicitReferenceWorldBookName();
    const selectedNames = unique([...(explicit ? [explicit] : []), ...linkedReferenceWorldBookNames()]);
    for (const bookName of selectedNames) {
        const data = loadedReferenceWorldBooks.get(bookName);
        if (data?.entries && typeof data.entries === 'object') {
            const entries = [];
            for (const entry of Object.values(data.entries)) {
                if (!isWorldBookEntryEnabled(entry)) continue;
                if (isStoryNpcEntry(entry) && state.npcSource !== 'worldbook') continue;
                const remaining = maxTotal - used;
                if (remaining <= 0) break;
                const content = limitPromptText(entry?.content, Math.max(120, Math.min(1800, remaining - 80)));
                if (!content) continue;
                const keys = unique([...asList(entry?.key), ...asList(entry?.keysecondary)]);
                const part = `\n[${keys.join('、') || '无关键词'}] ${content}`;
                entries.push(part);
                used += part.length;
            }
            if (entries.length) books.push(`<linked_worldbook name="${escapeHtml(bookName)}">${entries.join('')}\n</linked_worldbook>`);
        }
        if (used >= maxTotal) break;
    }
    const embedded = loadedReferenceWorldBooks.get(EMBEDDED_CHARACTER_BOOK_KEY);
    if (embedded?.entries && used < maxTotal) {
        const entries = [];
        for (const entry of Object.values(embedded.entries)) {
            if (!isWorldBookEntryEnabled(entry)) continue;
            const remaining = maxTotal - used;
            if (remaining <= 0) break;
            const content = limitPromptText(entry?.content, Math.max(120, Math.min(1800, remaining - 80)));
            if (!content) continue;
            const keys = unique([...asList(entry?.key), ...asList(entry?.keysecondary)]);
            const part = `\n[${keys.join('、') || '无关键词'}] ${content}`;
            entries.push(part);
            used += part.length;
        }
        if (entries.length) books.push(`<character_embedded_worldbook>${entries.join('')}\n</character_embedded_worldbook>`);
    }
    return books.join('\n');
}

function referenceCharactersText() {
    return state.importedCharacterReferences.map(reference => `<reference_character name="${escapeHtml(reference.name)}" source="${escapeHtml(reference.source)}">${JSON.stringify({
        description: limitPromptText(reference.description, 4500),
        personality: limitPromptText(reference.personality, 2200),
        scenario: limitPromptText(reference.scenario, 2200),
        creator_notes: limitPromptText(reference.creator_notes, 1200),
    })}</reference_character>`).join('\n');
}

function limitPromptText(value, limit) {
    const source = text(value);
    if (source.length <= limit) return source;
    const headLength = Math.ceil(limit * 0.72);
    const tailLength = Math.max(0, limit - headLength - 40);
    return `${source.slice(0, headLength)}\n[…诊断预览省略，原响应仍会完整解析…]\n${tailLength ? source.slice(-tailLength) : ''}`.trim();
}

function currentCharacterPromptContext(fields) {
    return {
        description: limitPromptText(fields.description, 6000),
        personality: limitPromptText(fields.personality, 2600),
        scenario: limitPromptText(fields.scenario, 3000),
        creatorNotes: limitPromptText(fields.creatorNotes, 1800),
        persona: limitPromptText(fields.persona, 2200),
        firstMessage: limitPromptText(fields.firstMessage, 1200),
    };
}

function basePrompt() {
    const character = currentCharacterContext();
    const userText = currentUserPersonaText();
    const userName = currentUserName();
    return `<story_outline_studio>
本扩展是酒馆剧情大纲工作台。当前角色卡：${character.name}
角色卡核心上下文：${JSON.stringify(currentCharacterPromptContext(character.fields))}
外部导入角色卡参考（低优先级）：
${referenceCharactersText() || '暂无'}
${referenceBooksText()}
当前 NPC 来源：${state?.npcSource === 'worldbook' ? '角色卡/绑定世界书。只使用上述世界书中已启用的角色条目，不要额外虚构工作台 NPC，也不要使用关闭条目。' : '工作台 AI 生成。剧情阶段只使用当前已接受且启用的 NPC。'}
外部导入角色卡只能作为角色内核、说话方式和世界设定参考。当前聊天事实、当前工作台配置、user 已接受的人设、已接受大纲和已接受 NPC 设定优先。不得机械复制参考角色卡的剧情。参考角色必须保持原有核心性格、身份逻辑和说话方式，不得 OOC。
配置：${JSON.stringify(configPayload())}
user当前聊天独立人设：${userText || '尚未确定'}
当前 user 唯一姓名：${userName || '尚未确定'}。${userName ? '禁止使用旧聊天、旧人设、参考角色卡或旧大纲中的其他 user 姓名。' : ''}
</story_outline_studio>`;
}

function extractJson(value) {
    if (value && typeof value === 'object') {
        if (value.outline || value['大纲'] || value['剧情大纲'] || value.npcs) return value;
        for (const key of ['content', 'text', 'response', 'result', 'data', 'message']) {
            if (value[key] !== undefined) {
                const nested = extractJson(value[key]);
                if (nested) return nested;
            }
        }
        return value;
    }
    const source = text(value)
        .replace(/^\uFEFF/, '')
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    try {
        const parsed = JSON.parse(source);
        return typeof parsed === 'string' ? extractJson(parsed) : parsed;
    } catch { /* scan below */ }
    for (let start = 0; start < source.length; start++) {
        if (source[start] !== '{' && source[start] !== '[') continue;
        const open = source[start];
        const close = open === '{' ? '}' : ']';
        let depth = 0;
        let quoted = false;
        let escaped = false;
        for (let index = start; index < source.length; index++) {
            const character = source[index];
            if (escaped) { escaped = false; continue; }
            if (character === '\\' && quoted) { escaped = true; continue; }
            if (character === '"') { quoted = !quoted; continue; }
            if (quoted) continue;
            if (character === open) depth++;
            if (character === close) depth--;
            if (depth === 0) {
                try {
                    const parsed = JSON.parse(source.slice(start, index + 1));
                    return typeof parsed === 'string' ? extractJson(parsed) : parsed;
                } catch { break; }
            }
        }
    }
    return null;
}

function parseLooseOutlineObject(value) {
    const source = stripReasoningBlocks(text(value)).trim();
    if (!source) return null;
    const aliases = {
        opening: 'opening', 开端: 'opening', 开场: 'opening',
        development: 'development', 发展: 'development',
        turningPoint: 'turningPoint', turning_point: 'turningPoint', turningpoint: 'turningPoint', 转折: 'turningPoint', 反转: 'turningPoint',
        climax: 'climax', 高潮: 'climax', 决战: 'climax',
        ending: 'ending', end: 'ending', 结局: 'ending', 收束: 'ending',
        characterNames: 'characterNames', character_names: 'characterNames', 主要角色名: 'characterNames', 角色名: 'characterNames',
        npcFunctions: 'npcFunctions', npc_functions: 'npcFunctions', 主要NPC功能: 'npcFunctions', '主要 NPC 功能': 'npcFunctions',
        nsfwNodes: 'nsfwNodes', nsfw_nodes: 'nsfwNodes', 'NSFW节点': 'nsfwNodes', 'NSFW 节点': 'nsfwNodes',
        hardRules: 'hardRules', hard_rules: 'hardRules', 硬性规则: 'hardRules',
    };
    const names = Object.keys(aliases).sort((a, b) => b.length - a.length)
        .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    // Claude occasionally emits a JSON-looking object with a trailing comma,
    // single-quoted values, or an unescaped quote in a long Chinese string.
    // Locate only object-like field labels and recover each value independently
    // so one malformed field does not discard all the other valid sections.
    const matcher = new RegExp('(?:^|[,{]\\s*)(?:["\'“”]?\\s*)(' + names + ')(?:\\s*["\'“”]?\\s*):', 'giu');
    const matches = [...source.matchAll(matcher)];
    if (!matches.length) return null;
    const result = {};
    const cleanString = raw => {
        let chunk = raw.trim().replace(/^[,\\s]+/u, '').replace(/[,}\\s]+$/u, '').trim();
        if ((chunk.startsWith('"') && chunk.endsWith('"')) || (chunk.startsWith("'") && chunk.endsWith("'")) || (chunk.startsWith('“') && chunk.endsWith('”'))) {
            chunk = chunk.slice(1, -1);
        }
        try { return JSON.parse(`"${chunk.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`); } catch { return chunk; }
    };
    const parseList = raw => {
        const chunk = raw.trim().replace(/^[,\\s]+/u, '').replace(/[,}\\s]+$/u, '').trim();
        const body = chunk.startsWith('[') && chunk.endsWith(']') ? chunk.slice(1, -1) : chunk;
        try {
            const parsed = JSON.parse(`[${body.replace(/,\\s*([\\]}])/g, '$1')}]`);
            if (Array.isArray(parsed)) return parsed.map(item => text(item)).filter(Boolean);
        } catch { /* recover quoted list items below */ }
        const quoted = [...body.matchAll(/"((?:\\\\.|[^"\\\\])*)"|'([^']*)'/gu)]
            .map(match => match[1] ?? match[2]).map(text).filter(Boolean);
        return quoted.length ? quoted : body.split(/[,，、\\n]/u).map(item => cleanString(item)).filter(Boolean);
    };
    for (const [index, match] of matches.entries()) {
        const key = aliases[match[1]];
        const start = match.index + match[0].length;
        const end = matches[index + 1]?.index ?? source.length;
        const raw = source.slice(start, end).trim();
        if (!key || !raw) continue;
        if (['characterNames', 'npcFunctions', 'nsfwNodes', 'hardRules'].includes(key)) result[key] = parseList(raw);
        else result[key] = cleanString(raw);
    }
    return Object.keys(result).length ? result : null;
}

function extractAssistantContent(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || value instanceof String) return String(value);
    if (Array.isArray(value)) {
        return value.map(item => extractAssistantContent(item)).filter(Boolean).join('');
    }
    if (typeof value !== 'object') return String(value);

    // OpenAI-compatible chat-completions responses. Keep this branch explicit:
    // it mirrors the reliable `data.choices[0].message.content` path used by
    // standalone plugins before trying any gateway-specific wrappers.
    const choice = value.choices?.[0];
    if (choice) {
        const content = choice.message?.content ?? choice.text ?? choice.delta?.content;
        const extracted = extractAssistantContent(content);
        if (extracted) return extracted;
    }
    for (const key of ['content', 'output_text', 'text']) {
        if (value[key] !== undefined) {
            const extracted = extractAssistantContent(value[key]);
            if (extracted) return extracted;
        }
    }
    for (const key of ['response', 'result', 'data', 'message', 'output']) {
        if (value[key] !== undefined) {
            const extracted = extractAssistantContent(value[key]);
            if (extracted) return extracted;
        }
    }
    return '';
}

function extractGeneratedText(value) {
    const assistantContent = extractAssistantContent(value);
    if (assistantContent) return assistantContent;
    if (value === null || value === undefined) return '';
    if (value instanceof String) return value.toString();
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        // Chat gateways sometimes wrap a completion in an outer array. Keep
        // recursively unwrapping response objects, but preserve a direct
        // structured array such as [{ name: 'NPC' }] for JSON parsing.
        const responseLike = value.some(item => item && typeof item === 'object' && (
            item.choices !== undefined || item.message !== undefined || item.response !== undefined ||
            item.result !== undefined || item.data !== undefined || item.output !== undefined
        ));
        if (responseLike) {
            const parts = value.map(item => extractGeneratedText(item)).filter(Boolean);
            if (parts.length) return parts.join('');
        }
        const parts = value.map(item => {
            if (item && typeof item === 'object') {
                if (item.text !== undefined) return extractGeneratedText(item.text);
                if (item.content !== undefined) return extractGeneratedText(item.content);
                if (item.output_text !== undefined) return extractGeneratedText(item.output_text);
            }
            return typeof item === 'string' ? item : '';
        }).filter(Boolean);
        // A structured result can legitimately be a direct array (for
        // example [{ name: 'NPC' }]). Preserve it for the local JSON parser
        // instead of turning it into an empty response.
        return parts.length ? parts.join('') : JSON.stringify(value);
    }
    if (typeof value !== 'object') return String(value);

    for (const key of ['content', 'text', 'output_text', 'response', 'result', 'data', 'message', 'output']) {
        if (value[key] !== undefined) {
            const nested = extractGeneratedText(value[key]);
            if (nested) return nested;
        }
    }

    const choice = value.choices?.[0];
    if (choice) {
        const nested = extractGeneratedText(choice.message ?? choice.delta ?? choice.text);
        if (nested) return nested;
    }
    // An empty object is how some failed gateway adapters resolve a request.
    // Treat it as no output instead of turning it into the misleading text
    // "{}", which would trigger a pointless repair request and hide the
    // original network/API failure.
    if (Object.keys(value).length === 0) return '';

    // Preserve direct structured payloads for the local parser, but do not
    // stringify arbitrary status/config wrapper objects as if they were AI
    // output.
    const structuredKeys = [
        'outline', '大纲', '剧情大纲', 'opening', 'development', 'turningPoint', 'climax', 'ending',
        'npcs', 'npc', 'characters', 'characterList', 'character_list', '主要NPC', '主要 NPC',
        'name', '姓名', '名字', 'appearance', '外貌', 'persona', 'userPersona', 'user_persona',
    ];
    return Object.keys(value).some(key => structuredKeys.includes(key)) ? JSON.stringify(value) : '';
}

function generationKind(schema) {
    if (schema?.properties?.npcs) return 'npc';
    if (schema?.properties?.name && !schema?.properties?.opening) return 'persona';
    if (schema?.properties?.opening) return 'outline';
    return 'generation';
}

function saveGenerationSnapshot(kind, { raw = '', repaired = '', error = '' } = {}) {
    if (!state) return;
    state.lastGeneration = {
        kind,
        rawPreview: limitPromptText(raw, 1200),
        repairedPreview: limitPromptText(repaired, 1200),
        error: limitPromptText(error, 600),
        at: Date.now(),
    };
    try {
        saveState();
    } catch (saveError) {
        console.warn(`[${EXTENSION_ID}] failed to save generation snapshot`, saveError);
    }
}

function normalizeGeneratedResult(parsed, schema) {
    if (!parsed || typeof parsed !== 'object') return parsed;
    const properties = schema?.properties || {};

    if (properties.npcs) {
        // generateQuietPrompt returns a string, but some gateway adapters or
        // repair paths wrap that string as { content: '...' }. Parse the
        // wrapped body before validating the outer object.
        for (const key of ['content', 'text', 'output_text']) {
            if (typeof parsed[key] === 'string' && parsed[key].trim()) {
                const body = parsed[key].trim();
                const structured = extractJson(body);
                if (structured && structured !== body) {
                    const normalized = normalizeGeneratedResult(structured, schema);
                    if (normalized?.npcs?.length) return { ...parsed, npcs: normalized.npcs };
                }
                const tagged = taggedNpcs(body);
                if (tagged.length) return { ...parsed, npcs: tagged.map(normalizeNpc) };
                const plain = parsePlainNpcBlocks(body);
                if (plain.length) return { ...parsed, npcs: plain.map(normalizeNpc) };
                const fields = parseKeyValueBlock(body);
                if (fields.name || fields['姓名'] || fields.appearance || fields['外貌'] || fields.identity || fields['身份背景']) {
                    return { ...parsed, npcs: [normalizeNpc(fields)] };
                }
            }
            if (parsed[key] && typeof parsed[key] === 'object') {
                const normalized = normalizeGeneratedResult(parsed[key], schema);
                if (normalized?.npcs?.length) return normalized;
            }
        }
        if (parsed.npc_patch !== undefined) {
            const patch = parsed.npc_patch && typeof parsed.npc_patch === 'object' ? parsed.npc_patch : parseKeyValueBlock(parsed.npc_patch);
            return { ...parsed, npcs: patch ? [patch] : [] };
        }
        if (Array.isArray(parsed)) return { npcs: normalizeNpcCollection(parsed) };
        if (Array.isArray(parsed.npcs)) return { ...parsed, npcs: normalizeNpcCollection(parsed.npcs) };
        if (typeof parsed.npcs === 'string') {
            const listed = parsePlainNpcBlocks(parsed.npcs);
            const fields = parseKeyValueBlock(parsed.npcs);
            if (listed.length) return { ...parsed, npcs: normalizeNpcCollection(listed) };
            if (fields.name || fields.appearance || fields['外貌']) return { ...parsed, npcs: [normalizeNpc(fields)] };
        }
        if (parsed.npcs && typeof parsed.npcs === 'object' && !Array.isArray(parsed.npcs)) {
            const listed = Object.entries(parsed.npcs)
                .map(([name, value]) => value && typeof value === 'object' ? ({ name, ...value }) : ({ name, description: value }))
                .filter(item => item.name || item.appearance || item['外貌']);
            if (listed.length) return { ...parsed, npcs: listed.map(normalizeNpc) };
        }
        for (const key of ['characters', 'characterList', 'character_list', 'items', 'results', 'npcList', 'npc_list', 'mainNpcs', 'main_npcs', '主要NPC', '主要 NPC', '主要角色', '角色列表', '人物列表']) {
            if (Array.isArray(parsed[key])) return { ...parsed, npcs: normalizeNpcCollection(parsed[key]) };
            if (parsed[key] && typeof parsed[key] === 'object') {
                const listed = Object.entries(parsed[key])
                    .map(([name, value]) => value && typeof value === 'object' ? ({ name, ...value }) : ({ name, description: value }))
                    .filter(item => item.name || item.appearance || item['外貌']);
                if (listed.length) return { ...parsed, npcs: normalizeNpcCollection(listed) };
            }
        }
        for (const key of ['npc', 'character']) {
            if (Array.isArray(parsed[key])) return { ...parsed, npcs: normalizeNpcCollection(parsed[key]) };
            if (parsed[key] && typeof parsed[key] === 'object') return { ...parsed, npcs: [normalizeNpc(parsed[key])] };
        }
        if (parsed.characters && typeof parsed.characters === 'object') return { ...parsed, npcs: [normalizeNpc(parsed.characters)] };
        for (const key of ['data', 'result', 'response', 'output', 'message']) {
            const nested = parsed[key];
            if (nested && typeof nested === 'object') {
                const normalized = normalizeGeneratedResult(nested, schema);
                if (normalized?.npcs?.length) return normalized;
            }
        }
        // Some models ignore the outer { npcs: [] } wrapper and return one
        // NPC object. Accept it only when it has a recognizable NPC field so
        // arbitrary wrapper objects are still rejected by validation.
        if (parsed.name || parsed['姓名'] || parsed.appearance || parsed['外貌']) return { npcs: [normalizeNpc(parsed)] };
    }

    if (properties.name && !properties.opening) {
        // The same wrapper appears for user persona responses. A model may
        // follow the requested field list without returning JSON or tags.
        for (const key of ['content', 'text', 'output_text']) {
            if (typeof parsed[key] === 'string' && parsed[key].trim()) {
                const body = parsed[key].trim();
                const structured = extractJson(body);
                if (structured && structured !== body) {
                    const normalized = normalizeGeneratedResult(structured, schema);
                    if (normalized?.persona) return { ...parsed, persona: normalized.persona };
                }
                const tagged = taggedPersona(body);
                if (tagged) return { ...parsed, persona: tagged };
                const fields = parseKeyValueBlock(body);
                if (fields.name || fields['姓名'] || fields.appearance || fields['外貌'] || fields.identity || fields['身份背景']) {
                    return { ...parsed, persona: fields };
                }
            }
            if (parsed[key] && typeof parsed[key] === 'object') {
                const normalized = normalizeGeneratedResult(parsed[key], schema);
                if (normalized?.persona) return normalized;
            }
        }
        if (parsed.persona_patch !== undefined) {
            const patch = parsed.persona_patch && typeof parsed.persona_patch === 'object' ? parsed.persona_patch : parseKeyValueBlock(parsed.persona_patch);
            return { ...parsed, persona: patch };
        }
        if (parsed.persona && typeof parsed.persona === 'object') return parsed;
        if (typeof parsed.persona === 'string') return { ...parsed, persona: parseKeyValueBlock(parsed.persona) };
        for (const key of ['userPersona', 'user_persona', 'profile']) {
            if (typeof parsed[key] === 'string') return { ...parsed, persona: parseKeyValueBlock(parsed[key]) };
        }
        for (const key of ['user', 'userPersona', 'user_persona', 'profile', 'character', 'data']) {
            if (parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key])) return { ...parsed, persona: parsed[key] };
        }
        for (const key of ['result', 'response', 'output', 'message']) {
            if (parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key])) {
                const normalized = normalizeGeneratedResult(parsed[key], schema);
                if (normalized?.persona) return normalized;
            }
        }
        if (parsed.name || parsed['姓名'] || parsed.appearance || parsed['外貌']) return { persona: parsed };
    }

    if (properties.opening) {
        if (parsed.outline_patch !== undefined) {
            const patch = parsed.outline_patch && typeof parsed.outline_patch === 'object' ? parsed.outline_patch : parseKeyValueBlock(parsed.outline_patch);
            return patch && typeof patch === 'object' ? { ...parsed, ...patch } : parsed;
        }
        if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object') return parsed[0];
        if (parsed.outline && typeof parsed.outline === 'object') return { ...parsed.outline, ...parsed };
        for (const key of ['data', 'result', 'response', 'output', 'message']) {
            if (parsed[key] && typeof parsed[key] === 'object') {
                const normalized = normalizeGeneratedResult(parsed[key], schema);
                if (normalized && ['opening', 'development', 'turningPoint', 'climax', 'ending', 'outline'].some(field => normalized[field])) return normalized;
            }
        }
    }
    return parsed;
}

function hasGeneratedShape(parsed, schema) {
    if (!parsed || typeof parsed !== 'object') return false;
    const properties = schema?.properties || {};
    if (properties.npcs) {
        const npcs = Array.isArray(parsed.npcs) ? parsed.npcs : [];
        const minimum = Number(properties.npcs.minItems) || 1;
        const maximum = Number(properties.npcs.maxItems) || Infinity;
        return npcs.length >= minimum && npcs.length <= maximum;
    }
    if (properties.name && !properties.opening) {
        const persona = parsed.persona || parsed;
        return Boolean(persona && typeof persona === 'object' && (persona.name || persona['姓名']));
    }
    if (properties.opening) {
        if (text(parsed.outline).match(/开端[：:]/) && text(parsed.outline).match(/发展[：:]/) && text(parsed.outline).match(/转折[：:]/) && text(parsed.outline).match(/高潮[：:]/) && text(parsed.outline).match(/结局[：:]/)) return true;
        const source = parsed.outline && typeof parsed.outline === 'object' ? parsed.outline : parsed;
        const aliases = { opening: '开端', development: '发展', turningPoint: '转折', climax: '高潮', ending: '结局' };
        return Object.keys(aliases).every(key => text(source[key] || source[aliases[key]]));
    }
    return true;
}

function continuationPrefixForIncompleteResponse(raw, parsed, schema) {
    const source = stripReasoningBlocks(raw).trim();
    if (!source || hasGeneratedShape(parsed, schema)) return source;

    if (schema?.properties?.npcs && /<\/npcs>\s*$/iu.test(source)) {
        return source.replace(/<\/npcs>\s*$/iu, '\n');
    }
    if (schema?.properties?.npcs) {
        const fenced = source.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
        const body = (fenced?.[1] || source).trim();
        if (/^\{[\s\S]*\]\s*\}$/u.test(body)) {
            return body.replace(/\]\s*\}\s*$/u, ',\n');
        }
        if (/^\[[\s\S]*\]$/u.test(body)) {
            return `${body.slice(0, -1).replace(/,\s*$/u, '').trimEnd()},\n`;
        }
    }
    if (!schema?.properties?.opening) return source;

    if (/^<outline\b[^>]*>[\s\S]*<\/outline>\s*$/iu.test(source)) {
        return source.replace(/<\/outline>\s*$/iu, '\n');
    }

    const fenced = source.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
    const body = (fenced?.[1] || source).trim();
    if (/^\{[\s\S]*\}$/u.test(body)) {
        return `${body.slice(0, -1).replace(/,\s*$/u, '').trimEnd()},\n`;
    }
    return source;
}

function countTag(raw, tag, closing = false) {
    const pattern = closing ? new RegExp(`<\\/${tag}\\s*>`, 'giu') : new RegExp(`<${tag}(?:\\s|>)`, 'giu');
    return [...text(raw).matchAll(pattern)].length;
}

function hasUnclosedStructuredTags(raw, schema) {
    const source = text(raw);
    if (schema?.properties?.npcs) {
        return countTag(source, 'npcs') > countTag(source, 'npcs', true)
            || countTag(source, 'npc') > countTag(source, 'npc', true);
    }
    if (schema?.properties?.name && !schema?.properties?.opening) {
        return countTag(source, 'persona') > countTag(source, 'persona', true);
    }
    if (schema?.properties?.opening) return countTag(source, 'outline') > countTag(source, 'outline', true);
    return false;
}

function hasUnclosedJson(raw) {
    const source = stripReasoningBlocks(raw).trim();
    // Curly braces in a prose field are not evidence of a cut-off JSON
    // response. Only inspect text that starts like a JSON object/array, or a
    // tagged block whose body starts like JSON.
    if (!/^(?:```(?:json)?\s*)?[\[{]/iu.test(source)
        && !/<(?:persona|npcs?|outline)\b[^>]*>\s*[\[{]/iu.test(source)) return false;
    const jsonStart = source.search(/[\[{]/u);
    if (jsonStart < 0) return false;
    const candidate = source.slice(jsonStart).replace(/```(?:json)?/giu, '');
    let quote = false;
    let escaped = false;
    const stack = [];
    for (const character of candidate) {
        if (escaped) { escaped = false; continue; }
        if (character === '\\') { escaped = true; continue; }
        if (character === '"') { quote = !quote; continue; }
        if (quote) continue;
        if (character === '{' || character === '[') stack.push(character);
        if (character === '}' || character === ']') {
            const expected = character === '}' ? '{' : '[';
            if (stack.at(-1) === expected) stack.pop();
        }
    }
    return quote || stack.length > 0;
}

function isLikelyTruncatedResponse(raw, parsed, schema) {
    const source = stripReasoningBlocks(raw);
    if (!source.trim()) return false;
    if (/内容已截断|输出被截断|继续生成|truncated|finish_reason\s*[=:]\s*["']?length/i.test(source)) return true;
    if (hasUnclosedStructuredTags(source, schema) || hasUnclosedJson(source)) return true;
    // A parser may represent a tagged outline as one text field rather than
    // five object fields. If the normal shape validator already accepts it,
    // it is complete even when the response is not JSON.
    if (parsed && hasGeneratedShape(parsed, schema)) return false;

    const properties = schema?.properties || {};
    if (properties.opening) {
        const outline = parsed?.outline && typeof parsed.outline === 'object' ? parsed.outline : parsed || {};
        return ['opening', 'development', 'turningPoint', 'climax', 'ending'].some(key => !text(outline[key] || outline[{ opening: '开端', development: '发展', turningPoint: '转折', climax: '高潮', ending: '结局' }[key]]));
    }
    if (properties.name && !properties.opening) {
        const persona = parsed?.persona || parsed || {};
        const required = ['name', 'gender', 'age', 'appearance', 'personality', 'identity', 'past', 'habits', 'boundaries'];
        return Boolean(persona.name || persona['姓名']) && required.some(key => !text(persona[key] || persona[{ name: '姓名', gender: '性别', age: '年龄', appearance: '外貌', personality: '性格', identity: '身份背景', past: '过去经历', habits: '习惯', boundaries: '禁区' }[key]]));
    }
    if (properties.npcs) {
        const npcs = Array.isArray(parsed?.npcs) ? parsed.npcs : [];
        const minimum = Number(properties.npcs.minItems) || 1;
        if (npcs.length > 0 && npcs.length < minimum) return true;
        const required = ['name', 'aliases', 'gender', 'age', 'height', 'appearance', 'personality', 'identity', 'past', 'relationship', 'attitude', 'quotes', 'nsfw', 'body'];
        return npcs.length > 0 && npcs.some(npc => required.some(key => Array.isArray(npc?.[key]) ? !npc[key].length : !text(npc?.[key])));
    }
    return false;
}

async function continueStructuredGeneration() {
    const continuation = state?.continuation;
    if (!continuation?.kind || !continuation.raw || !continuation.schema) {
        return toastr.warning('当前没有可继续的截断生成。');
    }

    const kind = continuation.kind;
    const mode = continuation.mode || 'new';
    const feedback = continuation.feedback || '';
    // Keep the original mode and feedback so a cut-off revision resumes the
    // same complete-output contract instead of becoming an unrelated reroll.
    if (kind === 'persona') return generatePersona(feedback, mode, continuation);
    if (kind === 'outline') return generateOutline(feedback, mode, continuation);
    if (kind === 'npc') return generateNpcs(feedback, mode, continuation);
    clearContinuation();
    return toastr.warning('无法识别当前截断内容类型，请重新生成。');
}

function saveContinuation(kind, raw, prompt, schema, responseLength, options = {}) {
    if (!state) return;
    state.continuation = {
        kind,
        raw: text(raw),
        prompt: text(prompt),
        schema: clone(schema),
        responseLength: Number(responseLength) || 1200,
        allowText: Boolean(options.allowText),
        patchTag: text(options.patchTag),
        mode: text(options.continuationMeta?.mode) || 'new',
        feedback: text(options.continuationMeta?.feedback),
        draftToken: text(options.draftToken || options.continuationMeta?.draftToken),
        draftIndex: Number.isInteger(Number(options.draftIndex)) ? Number(options.draftIndex) : Number(options.continuationMeta?.draftIndex) || -1,
        at: Date.now(),
    };
    saveState();
}

function findStructuredDraft(token, fallbackIndex = -1) {
    if (!Array.isArray(ctx?.chat)) return null;
    if (token) {
        const found = ctx.chat.find(message => text(message?.extra?.storyOutlineStudioDraft?.token) === token);
        if (found) return found;
    }
    return Number.isInteger(fallbackIndex) && fallbackIndex >= 0 ? ctx.chat[fallbackIndex] : null;
}

function structuredChatDomIsAligned(targetIndex = -1) {
    if (typeof document === 'undefined' || !Array.isArray(ctx?.chat)) return true;
    const elements = [...document.querySelectorAll('#chat .mes')];
    if (elements.length !== ctx.chat.length) return false;
    const aligned = elements.every((element, index) => Number(element.getAttribute('mesid')) === index);
    if (!aligned) return false;
    return targetIndex < 0 || Boolean(document.querySelector(`#chat .mes[mesid="${targetIndex}"]`));
}

async function waitForStructuredChatFrame() {
    if (typeof requestAnimationFrame !== 'function') return;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function syncStructuredChatDom({ targetIndex = -1, forceReload = false } = {}) {
    if (!Array.isArray(ctx?.chat) || typeof document === 'undefined') return;
    if (!forceReload && structuredChatDomIsAligned(targetIndex)) return;
    if (typeof ctx.reloadCurrentChat !== 'function') {
        console.warn(`[${EXTENSION_ID}] current chat DOM is out of sync, but reloadCurrentChat is unavailable`);
        return;
    }
    await ctx.reloadCurrentChat();
    await waitForStructuredChatFrame();
}

async function refreshStructuredMessage(message) {
    const index = Array.isArray(ctx?.chat) ? ctx.chat.indexOf(message) : -1;
    if (index < 0) return;
    await syncStructuredChatDom({ targetIndex: index });
    if (typeof ctx.updateMessageBlock === 'function') {
        ctx.updateMessageBlock(index, message);
    }
}

async function replaceStructuredDraft(generated, resolvedRaw, continuation) {
    if (!Array.isArray(ctx?.chat)) return null;
    const token = text(continuation?.draftToken) || text(generated?.extra?.storyOutlineStudioDraft?.token);
    const original = continuation?.draftMessage || findStructuredDraft(token, Number(continuation?.draftIndex));
    const target = original || generated;
    if (!target) return null;
    target.mes = text(resolvedRaw);
    target.extra = {
        ...(target.extra || {}),
        storyOutlineStudioDraft: {
            ...(target.extra?.storyOutlineStudioDraft || {}),
            kind: continuation?.kind || target.extra?.storyOutlineStudioDraft?.kind,
            token,
            at: Date.now(),
        },
    };
    // A foreground continuation can make the core append more than one
    // assistant message while it is saving the response. Keep the original
    // structured draft as the only message for this request and remove every
    // generated duplicate, not just the last object reference.
    const generatedMessages = uniqueObjects([
        ...(Array.isArray(continuation?.generatedMessages) ? continuation.generatedMessages : []),
        generated,
    ]);
    for (const message of generatedMessages) {
        if (!message || message === target) continue;
        const generatedIndex = ctx.chat.indexOf(message);
        if (generatedIndex >= 0) ctx.chat.splice(generatedIndex, 1);
    }

    // The old draft is removed before a normal foreground request so the
    // model cannot treat it as an additional chat turn. Restore it to its
    // original position after the request, including adapters that returned a
    // detached/recreated chat array.
    const restoreIndex = Number(continuation?.restoreIndex);
    if (!ctx.chat.includes(target)) {
        const insertionIndex = Number.isInteger(restoreIndex) && restoreIndex >= 0
            ? Math.min(restoreIndex, ctx.chat.length)
            : ctx.chat.length;
        ctx.chat.splice(insertionIndex, 0, target);
    } else if (Number.isInteger(restoreIndex) && restoreIndex >= 0) {
        const currentIndex = ctx.chat.indexOf(target);
        if (currentIndex >= 0 && currentIndex !== restoreIndex) {
            ctx.chat.splice(currentIndex, 1);
            ctx.chat.splice(Math.min(restoreIndex, ctx.chat.length), 0, target);
        }
    }
    await ctx.saveChat?.();
    await syncStructuredChatDom({ targetIndex: ctx.chat.indexOf(target) });
    await refreshStructuredMessage(target);
    return target;
}

function uniqueObjects(values) {
    const result = [];
    const seen = new Set();
    for (const value of values) {
        if (!value || seen.has(value)) continue;
        seen.add(value);
        result.push(value);
    }
    return result;
}

async function retainStructuredDraft(raw, kind, token, index = -1) {
    if (!Array.isArray(ctx?.chat) || !raw) return { token, index };
    const existing = findStructuredDraft(token, index);
    if (existing) {
        existing.mes = text(raw);
        existing.extra = {
            ...(existing.extra || {}),
            storyOutlineStudioDraft: {
                ...(existing.extra?.storyOutlineStudioDraft || {}),
                kind,
                token,
                at: Date.now(),
            },
        };
        await ctx.saveChat?.();
        await syncStructuredChatDom({ targetIndex: ctx.chat.indexOf(existing) });
        await refreshStructuredMessage(existing);
        return { token, index: ctx.chat.indexOf(existing) };
    }
    const draft = {
        name: ctx.name2 || 'Assistant',
        is_user: false,
        mes: text(raw),
        extra: { storyOutlineStudioDraft: { kind, token, at: Date.now() } },
    };
    ctx.chat.push(draft);
    await ctx.saveChat?.();
    await syncStructuredChatDom({ targetIndex: ctx.chat.indexOf(draft) });
    await refreshStructuredMessage(draft);
    return { token, index: ctx.chat.indexOf(draft) };
}

function clearContinuation(kind = '') {
    if (!state?.continuation?.kind || (kind && state.continuation.kind !== kind)) return;
    state.continuation = defaultState().continuation;
    saveState();
}

function parseGeneratedPayload(raw, allowText = false, schema = null) {
    const source = stripReasoningBlocks(raw);
    if (!source) return null;

    // Prefer the explicit fallback protocol. This prevents a stray brace in
    // explanatory text from being mistaken for the actual result.
    const personaPatch = taggedPatches(source, 'persona_patch')[0];
    if (personaPatch && schema?.properties?.name) return normalizeGeneratedResult({ persona: personaPatch }, schema);
    const persona = taggedPersona(source);
    if (persona) return normalizeGeneratedResult({ persona }, schema);
    const npcPatches = taggedNpcPatches(source);
    if (npcPatches.length && schema?.properties?.npcs) return normalizeGeneratedResult({ npcs: npcPatches }, schema);
    const npcs = taggedNpcs(source);
    if (npcs.length) return normalizeGeneratedResult({ npcs }, schema);
    const outlinePatch = extractTaggedBlocks(source, 'outline_patch')[0];
    if (outlinePatch && schema?.properties?.opening) return normalizeGeneratedResult({ outline_patch: extractJson(outlinePatch) || parseKeyValueBlock(outlinePatch) }, schema);
    const outlineBlock = extractTaggedBlocks(source, 'outline')[0];
    if (outlineBlock) {
        return normalizeGeneratedResult({
            outline: outlineBlock,
            characterNames: outlineCharacterNamesFromText(source),
        }, schema);
    }

    const parsed = extractJson(source);
    if (parsed && !(typeof parsed === 'object' && !Object.keys(parsed).length)) return normalizeGeneratedResult(parsed, schema);

    if (schema?.properties?.opening) {
        const looseOutline = parseLooseOutlineObject(source);
        if (looseOutline) return normalizeGeneratedResult(looseOutline, schema);
    }

    // Some gateways/models ignore both JSON and the tag fallback and return a
    // plain Chinese field list. Convert that list before treating the result
    // as unusable. This is the same useful text that would otherwise be found
    // in choices[0].message.content by a direct chat-completions caller.
    if (schema?.properties?.npcs) {
        const plainNpcs = parsePlainNpcBlocks(source);
        if (plainNpcs.length) return { npcs: plainNpcs };
        const fields = parseKeyValueBlock(source);
        if (fields.name || fields.姓名 || fields.appearance || fields.外貌) return { npcs: [fields] };
    }
    const fields = parseKeyValueBlock(source);
    if (schema?.properties?.name && !schema?.properties?.opening && (fields.name || fields.姓名 || fields.appearance || fields.外貌)) {
        return normalizeGeneratedResult({ persona: fields }, schema);
    }
    if (schema?.properties?.opening && ['opening', 'development', 'turningPoint', 'climax', 'ending'].some(key => fields[key])) {
        return fields;
    }
    if (allowText && !/^\s*(?:```\s*)?[\[{]/.test(source) && !/^\s*<!doctype\b|^\s*<html\b/i.test(source)) {
        return normalizeGeneratedResult({ content: source }, schema);
    }
    return null;
}

function joinContinuationRaw(previousRaw, continuationText, schema) {
    const previous = text(previousRaw);
    const next = text(continuationText);
    if (!schema?.properties?.npcs) return `${previous}${next}`;

    // Some adapters ask the model for a continuation but receive the missing
    // NPCs inside a new root wrapper. Preserve the NPCs from the first half
    // and remove only that duplicate wrapper before joining the two halves.
    if (countTag(previous, 'npcs') > countTag(previous, 'npcs', true)
        && /^\s*<npcs\b[^>]*>/iu.test(next)) {
        return `${previous}${next.replace(/^\s*<npcs\b[^>]*>\s*/iu, '')}`;
    }

    const previousTrimmed = previous.trimEnd();
    if (previousTrimmed.endsWith(',')) {
        const objectWrapped = next.match(/^\s*(?:```(?:json)?\s*)?\{\s*["']npcs["']\s*:\s*\[([\s\S]*)\]\s*\}\s*(?:```)?\s*$/iu);
        if (objectWrapped) return `${previous}${objectWrapped[1].trim() }]}`;
        const arrayWrapped = next.match(/^\s*(?:```(?:json)?\s*)?\[([\s\S]*)\]\s*(?:```)?\s*$/iu);
        if (arrayWrapped) return `${previous}${arrayWrapped[1].trim()}]`;
    }
    return `${previous}${next}`;
}

function parseContinuationPayload(previousRaw, continuationText, allowText, schema) {
    const previous = text(previousRaw);
    const next = text(continuationText);
    const combined = joinContinuationRaw(previous, next, schema);
    const directCombined = `${previous}${next}`;
    const combinedParsed = parseGeneratedPayload(combined, allowText, schema);
    const directCombinedParsed = combined === directCombined ? combinedParsed : parseGeneratedPayload(directCombined, allowText, schema);
    const standaloneParsed = parseGeneratedPayload(next, allowText, schema);
    const standaloneLooksRooted = schema?.properties?.npcs
        ? /<npcs?\b|^\s*(?:```(?:json)?\s*)?[\[{]/iu.test(next)
        : schema?.properties?.name && !schema?.properties?.opening
            ? /<persona\b|^\s*(?:```(?:json)?\s*)?[\[{]/iu.test(next)
            : /<outline\b|^\s*(?:```(?:json)?\s*)?[\[{]/iu.test(next);

    // Always prefer the full draft assembled from the retained first half and
    // the continuation. A continuation adapter may put the remaining NPCs in
    // a fresh <npcs> root; parsing that root by itself would silently discard
    // every NPC already present in the retained chat message.
    if (combinedParsed && hasGeneratedShape(combinedParsed, schema)
        && !isLikelyTruncatedResponse(combined, combinedParsed, schema)) {
        return { raw: combined, parsed: combinedParsed };
    }
    if (directCombinedParsed && hasGeneratedShape(directCombinedParsed, schema)
        && !isLikelyTruncatedResponse(directCombined, directCombinedParsed, schema)) {
        return { raw: directCombined, parsed: directCombinedParsed };
    }

    // Some gateways ignore the instruction to continue after the last
    // character and return a fresh complete tagged/JSON result. In that case
    // concatenating the two responses creates duplicate roots and prevents
    // import. Prefer the standalone complete response only when it parses as
    // a complete result; normal suffix-only continuation still uses combined.
    if (standaloneLooksRooted && standaloneParsed && hasGeneratedShape(standaloneParsed, schema)
        && !isLikelyTruncatedResponse(next, standaloneParsed, schema)) {
        return { raw: next, parsed: standaloneParsed };
    }
    return { raw: combined, parsed: combinedParsed || directCombinedParsed };
}

function generatedErrorMessage(error) {
    const seen = new Set();
    const read = (value, depth = 0) => {
        if (value === null || value === undefined || depth > 5) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value !== 'object') return String(value).trim();
        if (seen.has(value)) return '';
        seen.add(value);
        if (Array.isArray(value)) return value.map(item => read(item, depth + 1)).filter(Boolean).join('; ');
        const preferred = ['message', 'error', 'detail', 'statusText', 'status', 'code', 'title', 'reason', 'data', 'response'];
        for (const key of preferred) {
            if (value[key] === undefined || value[key] === null) continue;
            const nested = read(value[key], depth + 1);
            if (nested) return key === 'status' || key === 'code' ? `${key}: ${nested}` : nested;
        }
        try {
            return JSON.stringify(value);
        } catch {
            return '';
        }
    };
    let message = read(error);
    // Some SillyTavern adapters create Error('[object Object]') and keep the
    // useful gateway payload in cause/response/data. Never expose the JS
    // object-coercion placeholder to the user.
    if (/^\[object object\]$/i.test(message)) {
        const candidates = [error?.cause, error?.response, error?.data, error?.error, error?.detail];
        message = candidates.map(candidate => read(candidate)).find(Boolean) || '';
    }
    if (/unexpected token\s*'?/i.test(message)) return '酒馆上游返回了无法解析的内容，通常是 API 代理返回的 HTML 错误页。请检查代理地址和 API 状态。';
    return message || '上游返回了未包含错误详情的失败响应。';
}

function responseErrorMessage(value) {
    if (!value || typeof value !== 'object') return '';
    const status = Number(value.status ?? value.statusCode ?? value.response?.status ?? value.data?.status ?? value.body?.status ?? value.payload?.status);
    const error = value.error ?? value.data?.error ?? value.response?.error ?? value.body?.error ?? value.payload?.error;
    if (error) return generatedErrorMessage(error);
    if (status >= 400) return generatedErrorMessage(value);
    return '';
}

function isUpstreamErrorText(value) {
    const message = text(value);
    return /^(?:service unavailable|temporarily unavailable|upstream unavailable)$/i.test(message.trim())
        || /^(?:error\s*:\s*)?(?:502|503|504)\b/i.test(message.trim());
}

function wrapGenerationError(error) {
    const message = generatedErrorMessage(error);
    if (/client network socket disconnected before secure tls connection was established|secure tls connection was established|tls handshake|socket disconnected|econnreset|enotfound|etimedout|network error|failed to fetch|request to .* failed/i.test(message)) {
        return new Error(`连接上游 API 失败：${message}。这是当前本地酒馆运行环境与中转站之间的网络/TLS 连接问题，不是大纲格式错误。请检查本机酒馆进程能否访问该域名、API 地址和 /v1 路径是否正确、中转站状态、是否需要让 Node.js 使用代理，以及是否可以更换节点。`);
    }
    if (/\b(?:503|504)\b|service unavailable|temporarily unavailable|upstream unavailable/i.test(message)) return new Error(`上游 API 当前不可用（${message}）。这通常是中转站暂时离线、节点过载、网关维护或上游超时，不是 NPC/大纲解析错误。请稍后重试、检查接口状态，或更换 API 节点。`);
    if (/\b502\b|bad gateway/i.test(message)) return new Error('酒馆上游 API 返回 502（Bad Gateway），没有生成结果。请检查 API 代理或接口地址；如果输入上下文很大，请先减少角色卡或导入世界书内容后重试。');
    if (/\b(?:400|401|403|404|408|409|413|429|500|503|504)\b|response status/i.test(message)) return new Error(`酒馆上游 API 请求失败：${message}。请检查 API 设置、额度和代理状态。`);
    return error instanceof Error ? error : new Error(message || '生成失败');
}

function isStructuredOutputUnsupported(error) {
    const message = generatedErrorMessage(error).toLowerCase();
    return /json.?schema|response.?format|structured.?output|unsupported|unknown parameter|未支持|不支持/.test(message)
        && /\b(?:400|404|422)\b|schema|format|structured|参数|unsupported|不支持/.test(message);
}

function getGenerationSchema(schema, patchTag) {
    if (!schema || !patchTag) return schema;
    const relaxed = clone(schema);
    relaxed.required = [];
    if (patchTag === 'npc_patch' && relaxed.properties?.npcs?.items) {
        relaxed.properties.npcs.minItems = 1;
        relaxed.properties.npcs.items.required = [];
    }
    return relaxed;
}

async function generateJson(prompt, schema, responseLength = 1200, { allowText = false, patchTag = '', continuationRaw = '', continuationMeta = null, draftToken = '', draftIndex = -1 } = {}) {
    // Read the assistant body back from SillyTavern and parse it locally. The
    // core structured-output path may turn a valid tag/plain-text response
    // into an empty object before an extension gets to inspect it.
    const fullTag = schema?.properties?.npcs ? '<npcs><npc>每个字段一行：内容</npc></npcs>' : schema?.properties?.name && !schema?.properties?.opening ? '<persona>每个字段一行：内容</persona>' : '<outline>开端：...\n发展：...\n转折：...\n高潮：...\n结局：...\n主要角色名：...\n主要 NPC 功能：...\nNSFW 节点：...\n硬性规则：...</outline>';
    const patchProtocol = patchTag
        ? `本次是局部修改，只输出被修改的字段，不要重写未修改内容：<${patchTag}>字段：新内容</${patchTag}>。NPC 修改时使用 <npc_patch name="目标姓名">字段：新内容</npc_patch>。`
        : schema?.properties?.opening
            ? `大纲必须严格使用下面的纯文本标签协议，禁止返回 JSON、代码块或解释：${fullTag}。必须严格按“开端、发展、转折、高潮、结局、主要角色名、主要 NPC 功能、NSFW 节点、硬性规则”的顺序输出，五个剧情段和所有元数据都必须出现且各只出现一次。每个剧情段最多 700 个汉字；主要 NPC 功能、NSFW 节点、硬性规则每项最多 180 个汉字，分别最多 8 项。不要把 NPC 完整人设、NSFW 细节或硬性规则塞进剧情段。`
            : `请优先使用下面的纯文本标签协议返回完整结果：${fullTag}`;
    const generationSchema = getGenerationSchema(schema, patchTag);
    const outputFormatRule = schema?.properties?.opening && !patchTag
        ? '不要输出解释、Markdown、思维链或 JSON，只能输出一个完整的 <outline> 标签块。'
        : '不要输出解释、Markdown 或思维链。若你能稳定返回 JSON，也可以返回单个 JSON 对象。';
    const schemaInstruction = `\n字段参考（不要输出 schema）：${JSON.stringify(generationSchema)}\n${patchProtocol}${outputFormatRule}`;
    const continuationInstruction = continuationRaw
        ? `\n这是上一次同一结构化响应的续写请求。下面是已经收到的完整前文，请从前文最后一个字符之后继续输出，禁止重复前文、禁止重新输出开头标签、禁止输出解释或 Markdown；只输出缺失的后半段，直到完整闭合所有标签和字段。\n<already_received>\n${continuationRaw}\n</already_received>\n`
        : '';
    const request = async extraPrompt => {
        const params = {
            quietPrompt: `${prompt}${schemaInstruction}${continuationInstruction}${extraPrompt || ''}\n涉及成人内容时，参与者必须是成年人。`,
            responseLength,
            skipWIAN: true,
        };
        // Keep the primary path compatible with SillyTavern 1.17 and simple
        // OpenAI-compatible gateways. The reference plugins use ordinary
        // text generation and parse the result locally; JSON schema output is
        // optional in newer cores but is rejected by many proxies.
        return ctx.generateQuietPrompt(params);
    };
    const requestEpoch = generationEpoch;
    const kind = generationKind(schema);
    if (!continuationRaw) clearContinuation(kind);
    let result;
    structuredGenerationInProgress = true;
    try {
        result = await request();
        if (requestEpoch !== generationEpoch) {
            const error = new Error('当前工作台已清理，旧请求结果已丢弃。');
            error.sosStale = true;
            throw error;
        }
    } catch (error) {
        const wrapped = wrapGenerationError(error);
        if (error?.sosStale) wrapped.sosStale = true;
        if (!error?.sosStale) saveGenerationSnapshot(kind, { error: wrapped.message });
        throw wrapped;
    } finally {
        structuredGenerationInProgress = false;
    }
    const embeddedError = responseErrorMessage(result);
    if (embeddedError) {
        const wrapped = wrapGenerationError(new Error(embeddedError));
        saveGenerationSnapshot(kind, { error: wrapped.message });
        throw wrapped;
    }
    const continuationText = extractAssistantContent(result).trim() || extractGeneratedText(result).trim();
    let raw = continuationRaw ? `${continuationRaw}${continuationText}` : continuationText;
    if (isUpstreamErrorText(raw)) {
        const wrapped = wrapGenerationError(new Error(raw));
        saveGenerationSnapshot(kind, { raw, error: wrapped.message });
        throw wrapped;
    }
    if (continuationRaw) {
        const resolved = parseContinuationPayload(continuationRaw, continuationText, allowText, schema);
        raw = resolved.raw;
        var parsed = resolved.parsed;
    } else {
        var parsed = parseGeneratedPayload(raw, allowText, schema);
    }
    const truncated = isLikelyTruncatedResponse(raw, parsed, schema);
    if (truncated) {
        raw = continuationPrefixForIncompleteResponse(raw, parsed, schema);
        const token = text(draftToken) || generationNonce(`${kind}-draft`);
        const draft = await retainStructuredDraft(raw, kind, token, Number(draftIndex));
        saveContinuation(kind, raw, prompt, schema, responseLength, { allowText, patchTag, continuationMeta, draftToken: draft.token, draftIndex: draft.index });
        saveGenerationSnapshot(kind, { raw, error: 'AI 输出被截断，等待继续生成' });
        throw new Error('AI 输出似乎被截断，已保留前文。请点击“继续生成”完成并导入。');
    }
    if (continuationRaw) await replaceStructuredDraft(null, raw, { kind, draftToken, draftIndex });
    if (parsed && hasGeneratedShape(parsed, schema)) {
        clearContinuation(kind);
        saveGenerationSnapshot(kind, { raw });
        return parsed;
    }
    saveGenerationSnapshot(kind, {
        raw,
        error: raw ? '响应无法识别为所需结构' : '上游返回空内容',
    });
    const preview = limitPromptText(raw, 240);
    console.warn(`[${EXTENSION_ID}] structured response could not be parsed`, { type: typeof result, preview });
    if (!raw) throw new Error('AI 请求已完成，但上游返回了空内容。');
    throw new Error(`AI 返回内容无法识别为 JSON、标签或字段文本，请重试。响应摘要：${preview}`);
}

async function generateJsonForeground(prompt, schema, { allowText = false, patchTag = '', continuationRaw = '', continuationMeta = null, draftToken = '', draftIndex = -1 } = {}) {
    // SillyTavern 1.17 deliberately excludes quiet requests from its streaming
    // processor. A foreground request is the only honest way to expose native
    // streaming, so its structured draft is intentionally retained in chat.
    const requestEpoch = generationEpoch;
    const fullTag = schema?.properties?.npcs ? '<npcs><npc>每个字段一行：内容</npc></npcs>' : schema?.properties?.name && !schema?.properties?.opening ? '<persona>每个字段一行：内容</persona>' : '<outline>开端：...\n发展：...\n转折：...\n高潮：...\n结局：...\n主要角色名：...\n主要 NPC 功能：...\nNSFW 节点：...\n硬性规则：...</outline>';
    const patchProtocol = patchTag
        ? `本次是局部修改，只输出被修改的字段，不要重写未修改内容：<${patchTag}>字段：新内容</${patchTag}>。NPC 修改时使用 <npc_patch name="目标姓名">字段：新内容</npc_patch>。`
        : schema?.properties?.opening
            ? `大纲必须严格使用下面的纯文本标签协议，禁止返回 JSON、代码块或解释：${fullTag}。必须严格按“开端、发展、转折、高潮、结局、主要角色名、主要 NPC 功能、NSFW 节点、硬性规则”的顺序输出，五个剧情段和所有元数据都必须出现且各只出现一次。每个剧情段最多 700 个汉字；主要 NPC 功能、NSFW 节点、硬性规则每项最多 180 个汉字，分别最多 8 项。不要把 NPC 完整人设、NSFW 细节或硬性规则塞进剧情段。`
            : `请优先使用下面的纯文本标签协议返回完整结果：${fullTag}`;
    const generationSchema = getGenerationSchema(schema, patchTag);
    const outputFormatRule = schema?.properties?.opening && !patchTag
        ? '不要输出解释、Markdown、思维链或 JSON，只能输出一个完整的 <outline> 标签块。'
        : '不要输出解释、Markdown 或思维链。若你能稳定返回 JSON，也可以返回单个 JSON 对象。';
    const schemaInstruction = `\n字段参考（不要输出 schema）：${JSON.stringify(generationSchema)}\n${patchProtocol}${outputFormatRule}`;
    const continuationInstruction = continuationRaw
        ? '\n这是对当前最后一条 assistant 结构化草稿的原位续写。请紧接草稿最后一个字符，只输出缺失的后半段；禁止重复已有内容、禁止重新输出开头标签、禁止输出解释或 Markdown，直到完整闭合全部标签和字段。\n'
        : '';
    const kind = generationKind(schema);
    if (!continuationRaw) clearContinuation(kind);
    const continuationDraft = continuationRaw
        ? findStructuredDraft(draftToken, Number(draftIndex))
        : null;
    const continuationDraftIndex = continuationDraft ? ctx.chat.indexOf(continuationDraft) : Number(draftIndex);
    if (continuationDraft && continuationDraftIndex >= 0 && continuationDraftIndex < ctx.chat.length - 1) {
        const trailing = ctx.chat.slice(continuationDraftIndex + 1);
        const suffix = trailing.every(message => !message?.is_user && !message?.is_system)
            ? trailing.map(message => text(message?.mes)).join('')
            : '';
        const recovered = suffix ? parseContinuationPayload(continuationRaw, suffix, allowText, schema) : null;
        if (recovered?.parsed) {
            continuationRaw = continuationPrefixForIncompleteResponse(recovered.raw, recovered.parsed, schema);
            continuationDraft.mes = continuationRaw;
            ctx.chat.splice(continuationDraftIndex + 1, trailing.length);
            await ctx.saveChat?.();
            if (hasGeneratedShape(recovered.parsed, schema)
                && !isLikelyTruncatedResponse(recovered.raw, recovered.parsed, schema)) {
                clearContinuation(kind);
                saveGenerationSnapshot(kind, { raw: recovered.raw });
                return recovered.parsed;
            }
        }
    }
    if (continuationRaw && (!continuationDraft || continuationDraftIndex !== ctx.chat.length - 1 || continuationDraft.is_user)) {
        throw new Error('无法在原楼层继续生成：截断草稿不是当前聊天最后一条 assistant 消息。请删除其后的消息后重试。');
    }
    const beforeLength = ctx.chat?.length || 0;
    const messagesBeforeGeneration = new Set(ctx.chat || []);
    let generated;
    let generatedMessages = [];
    let returnedGenerationText = '';
    let temporaryUserMessage = null;
    const textarea = document.getElementById('send_textarea');
    const pendingUserInput = textarea?.value || '';

    // The continuity prompt contains the accepted outline and should only
    // govern narrative turns. Leaving it active here can make a revision echo
    // the story prompt instead of returning the requested structure.
    ctx.setExtensionPrompt?.(PROMPT_KEY, '', 1, 0, false);
    structuredGenerationInProgress = true;
    try {
        // A structured-generation button must not accidentally submit text
        // that the user has left in the normal chat composer.
        if (textarea && pendingUserInput) {
            textarea.value = '';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // First-pass foreground generation needs an in-memory user anchor so
        // ST does not replace the preceding assistant turn. Native `continue`
        // appends directly to the retained structured draft.
        if (!continuationRaw && Array.isArray(ctx.chat)) {
            temporaryUserMessage = {
                name: ctx.name1 || 'User',
                is_user: true,
                mes: '[剧情工作台结构化请求]',
                extra: { storyOutlineStudioTemporary: true },
            };
            ctx.chat.push(temporaryUserMessage);
        }
        if (continuationRaw) {
            await syncStructuredChatDom({ targetIndex: continuationDraftIndex });
        }
        const result = await ctx.generate(continuationRaw ? 'continue' : 'normal', {
            quiet_prompt: `${prompt}${schemaInstruction}${continuationInstruction}\n涉及成人内容时，参与者必须是成年人。`,
            quietToLoud: true,
            skipWIAN: true,
            force_name2: true,
        });
        returnedGenerationText = extractAssistantContent(result).trim() || extractGeneratedText(result).trim();
        if (requestEpoch !== generationEpoch) {
            const error = new Error('当前工作台已清理，旧请求结果已丢弃。');
            error.sosStale = true;
            throw error;
        }
        generated = continuationRaw
            ? findStructuredDraft(draftToken, continuationDraftIndex) || continuationDraft
            : (ctx.chat || []).slice(beforeLength)
                .filter(message => !message.is_user && text(message?.mes))
                .at(-1);
        generatedMessages = (ctx.chat || []).filter(message => !messagesBeforeGeneration.has(message)
            && !message.is_user
            && text(message?.mes));
        // Some 1.17 adapters return foreground text before their chat-save
        // hook adds a message. It is still a valid parse source, although it
        // cannot be marked as a retained draft until the adapter saves it.
        if (!generated && result !== undefined) {
            if (returnedGenerationText) generated = { mes: returnedGenerationText, extra: {} };
        }
    } catch (error) {
        const wrapped = wrapGenerationError(error);
        if (error?.sosStale) wrapped.sosStale = true;
        if (!error?.sosStale) saveGenerationSnapshot(kind, { error: wrapped.message });
        throw wrapped;
    } finally {
        if (temporaryUserMessage && Array.isArray(ctx.chat)) {
            const temporaryIndex = ctx.chat.indexOf(temporaryUserMessage);
            if (temporaryIndex >= 0) ctx.chat.splice(temporaryIndex, 1);
        }
        if (temporaryUserMessage) {
            try {
                await ctx.saveChat?.();
            } catch (error) {
                console.warn(`[${EXTENSION_ID}] failed to persist structured-message cleanup`, error);
            }
        }
        if (textarea && pendingUserInput && !textarea.value) {
            textarea.value = pendingUserInput;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        structuredGenerationInProgress = false;
        updateContinuityPrompt();
    }

    const generatedText = text(generated?.mes);
    const generatedMessageText = generatedMessages
        .filter(message => message !== generated)
        .map(message => text(message?.mes))
        .filter(Boolean)
        .join('');
    // Depending on the active SillyTavern adapter, native `continue` either
    // mutates the original message, returns text without saving it, or creates
    // one or more new assistant messages. Read all three shapes, but use only
    // one suffix source so the continuation cannot be duplicated.
    const continuationText = continuationRaw
        ? (generatedText !== text(continuationRaw)
            ? generatedText
            : generatedMessageText || returnedGenerationText)
        : generatedText;
    let raw = continuationRaw
        ? (continuationText.startsWith(text(continuationRaw))
            ? continuationText
            : parseContinuationPayload(continuationRaw, continuationText, allowText, schema).raw)
        : generatedText;
    if (!generated || !raw) {
        const error = new Error('酒馆请求已完成，但没有写入结构化草稿消息。请检查 API 响应和酒馆控制台。');
        saveGenerationSnapshot(kind, { error: error.message });
        throw error;
    }
    if (requestEpoch !== generationEpoch) {
        const error = new Error('当前工作台已清理，旧请求结果已丢弃。');
        error.sosStale = true;
        throw error;
    }
    if (isUpstreamErrorText(raw)) {
        const wrapped = wrapGenerationError(new Error(raw));
        saveGenerationSnapshot(kind, { raw, error: wrapped.message });
        throw wrapped;
    }
    let resolvedRaw = raw;
    let parsed;
    if (continuationRaw) {
        parsed = parseGeneratedPayload(raw, allowText, schema);
        if (!parsed) {
            const resolved = parseContinuationPayload(continuationRaw, continuationText, allowText, schema);
            resolvedRaw = resolved.raw;
            parsed = resolved.parsed;
        }
    } else {
        parsed = parseGeneratedPayload(raw, allowText, schema);
    }
    if (resolvedRaw !== raw) raw = resolvedRaw;
    const truncated = isLikelyTruncatedResponse(raw, parsed, schema);
    if (truncated) {
        raw = continuationPrefixForIncompleteResponse(raw, parsed, schema);
        const token = text(draftToken) || generationNonce(`${kind}-draft`);
        let currentDraftIndex = Number(draftIndex);
        if (continuationRaw) {
            const draft = await replaceStructuredDraft(generated, raw, {
                kind,
                draftToken: token,
                draftIndex: currentDraftIndex,
                draftMessage: continuationDraft,
                generatedMessages,
                restoreIndex: continuationDraftIndex,
            });
            currentDraftIndex = draft ? ctx.chat.indexOf(draft) : currentDraftIndex;
        } else if (generated && (ctx.chat || []).includes(generated)) {
            generated.mes = raw;
            generated.extra = {
                ...(generated.extra || {}),
                storyOutlineStudioDraft: { kind, token, at: Date.now() },
            };
            currentDraftIndex = ctx.chat.indexOf(generated);
            await ctx.saveChat?.();
        }
        await syncStructuredChatDom({ targetIndex: currentDraftIndex });
        saveContinuation(kind, raw, prompt, schema, 12000, { allowText, patchTag, continuationMeta, draftToken: token, draftIndex: currentDraftIndex });
        saveGenerationSnapshot(kind, { raw, error: 'AI 输出被截断，等待继续生成' });
        throw new Error('AI 输出似乎被截断，已保留前文。请点击“继续生成”完成并导入。');
    }
    if (continuationRaw) generated = await replaceStructuredDraft(generated, raw, {
        kind,
        draftToken,
        draftIndex,
        draftMessage: continuationDraft,
        generatedMessages,
        restoreIndex: continuationDraftIndex,
    });
    else if (generatedMessages.length > 1) {
        // Keep a successful first-pass structured generation to one chat
        // message as well if an adapter emitted duplicate assistant objects.
        for (const message of generatedMessages) {
            if (message === generated) continue;
            const messageIndex = ctx.chat?.indexOf(message) ?? -1;
            if (messageIndex >= 0) ctx.chat.splice(messageIndex, 1);
        }
        await ctx.saveChat?.();
    }
    const generatedInChat = (ctx.chat || []).includes(generated);
    if (generatedInChat) {
        const token = text(draftToken) || text(generated.extra?.storyOutlineStudioDraft?.token) || generationNonce(`${kind}-draft`);
        generated.extra = {
            ...(generated.extra || {}),
            storyOutlineStudioDraft: { ...(generated.extra?.storyOutlineStudioDraft || {}), kind, token, at: Date.now() },
        };
        await ctx.saveChat?.();
    }
    await syncStructuredChatDom({ targetIndex: generatedInChat ? ctx.chat.indexOf(generated) : -1 });
    if (parsed && hasGeneratedShape(parsed, schema)) {
        clearContinuation(kind);
        saveGenerationSnapshot(kind, { raw });
        return parsed;
    }
    saveGenerationSnapshot(kind, { raw, error: '前台流式草稿无法识别为所需结构' });
    throw new Error('已将流式草稿保留在聊天中，但其格式无法识别。请关闭“前台流式生成”后重试，或修改该草稿要求模型按标签协议返回。');
}

async function generateStructured(prompt, schema, responseLength, options = {}) {
    if (state.config.streamStructured && !options.forceQuiet) return generateJsonForeground(prompt, schema, options);
    return generateJson(prompt, schema, responseLength, options);
}

async function withGenerating(task, label = '正在生成中...') {
    if (generating) return;
    generating = true;
    const taskEpoch = generationEpoch;
    panel?.classList.add('busy');
    generatingLabel = label;
    rerender();
    try {
        await task(taskEpoch);
    } catch (error) {
        if (error?.sosStale || taskEpoch !== generationEpoch) return;
        console.error(`[${EXTENSION_ID}]`, error);
        // generateQuietPrompt may already have shown the upstream API error.
        // Do not add a second toast for the same failed request.
        if (!error?.sosHandled) toastr.error(error.message || '生成失败');
    } finally {
        generating = false;
        panel?.classList.remove('busy');
        rerender();
    }
}

async function startOutline() {
    const externalPersona = externalUserPersonaText();
    if (externalPersona) {
        // A persona already configured in Tavern is an accepted source of
        // truth, even when it is free-form text rather than key/value fields.
        state.userPersona = externalPersona;
        const parsedPersona = parseKeyValueBlock(externalPersona);
        state.userPersonaData = Object.values(parsedPersona).some(Boolean) ? normalizePersonaData(parsedPersona) : {};
        const chatUserName = currentUserName();
        if (chatUserName && parsedPersona.name && canonicalText(parsedPersona.name) !== canonicalText(chatUserName)) {
            parsedPersona.name = chatUserName;
            state.userPersona = personaToText(parsedPersona) || externalPersona;
            state.userPersonaData = normalizePersonaData(parsedPersona);
        }
        state.userPersonaAccepted = true;
        saveState();
    }
    if (!state.userPersonaAccepted) {
        if (text(state.userPersona)) {
            activeStage = 'persona';
            rerender();
            toastr.warning('请先接受当前 user 人设，或重新生成后再继续。');
            return;
        }
        if (externalPersona) {
            state.userPersona = externalPersona;
            const parsedPersona = parseKeyValueBlock(state.userPersona);
            const chatUserName = currentUserName();
            if (chatUserName && parsedPersona.name && canonicalText(parsedPersona.name) !== canonicalText(chatUserName)) {
                parsedPersona.name = chatUserName;
                state.userPersona = personaToText(parsedPersona);
            }
            state.userPersonaData = Object.values(parsedPersona).some(Boolean) ? normalizePersonaData(parsedPersona) : {};
            state.userPersonaAccepted = true;
            saveState();
        } else {
            activeStage = 'persona';
            await generatePersona();
            return;
        }
    }
    await generateOutline();
}

async function generatePersona(feedback = '', mode = 'new', continuation = null) {
    await withGenerating(async () => {
        await ensureReferenceWorldBookLoaded();
        const editedPersona = text(document.getElementById('sos-persona')?.value);
        if (editedPersona) {
            state.userPersona = editedPersona;
            const parsedEditedPersona = parseKeyValueBlock(editedPersona);
            if (Object.values(parsedEditedPersona).some(Boolean)) {
                state.userPersonaData = mergePersonaData(state.userPersonaData, parsedEditedPersona);
            }
            saveState();
        }
        const previousPersona = state.userPersonaData && Object.values(state.userPersonaData).some(Boolean)
            ? JSON.stringify(state.userPersonaData)
            : text(state.userPersona);
        const previous = mode === 'revise' && previousPersona
            ? `\n当前 user 人设草稿（这是本次修改的基线；除非特别要求，不要改动已有字段）：${previousPersona}`
            : '';
        const revision = mode === 'revise'
            ? `\n用户修改意见：${feedback}\n这是基于当前人设的修改。只修改意见明确点名的字段或内容；未点名的姓名、年龄、外貌、性格、身份、经历、习惯、边界必须逐字保留。无论修改了几个字段，都必须重新输出一份完整的人设结果，包含全部字段，不能只返回修改部分，也不能使用 persona_patch。`
            : '';
        const novelty = mode === 'new'
            ? `\n这是全新生成，不是对旧人设润色。随机生成标识：${generationNonce('persona')}。请更换姓名、成长经历、职业细节和辨识度特征，不要复用当前草稿。`
            : '';
        const prompt = `${basePrompt()}\n请生成 user 的故事人设。必须返回完整字段：name、gender、age、appearance、personality、identity、past、habits、boundaries。设定要和配置的背景、性别方向、剧情标签兼容；如果故事包含成人内容，年龄字段必须明确为成年人。${previous}${revision}${novelty}\n保留基线中未被明确要求修改的内容；不要返回空字段。若无法返回 JSON，请输出 <persona> 标签，标签内每行一个“字段：内容”。`;
        const result = await generateStructured(prompt, { type: 'object', properties: { name: { type: 'string' }, gender: { type: 'string' }, age: { type: 'string' }, appearance: { type: 'string' }, personality: { type: 'string' }, identity: { type: 'string' }, past: { type: 'string' }, habits: { type: 'string' }, boundaries: { type: 'string' } }, required: ['name', 'gender', 'age', 'appearance', 'personality', 'identity', 'past', 'habits', 'boundaries'] }, 1800, { allowText: true, continuationRaw: continuation?.raw || '', continuationMeta: { mode, feedback, draftToken: continuation?.draftToken, draftIndex: continuation?.draftIndex }, draftToken: continuation?.draftToken || '', draftIndex: continuation?.draftIndex ?? -1 });
        const nextPersona = mode === 'revise'
            ? mergePersonaData(
                state.userPersonaData || state.userPersona,
                (() => {
                    const next = result.persona || result;
                    const restricted = restrictPersonaRevision(next, feedback);
                    return Object.keys(restricted).length ? restricted : diffPersonaFields(state.userPersonaData || state.userPersona, next);
                })(),
            )
            : normalizePersonaData(result.persona || result);
        const chatUserName = currentUserName();
        if (chatUserName) nextPersona.name = chatUserName;
        const invalid = validatePersona(nextPersona);
        if (invalid) throw new Error(`${invalid}，请重试。`);
        state.userPersonaData = nextPersona;
        state.userPersona = personaToText(nextPersona);
        state.userPersonaAccepted = false;
        saveState();
        activeStage = 'persona';
        rerender();
    }, '正在生成 user 人设...');
}

async function revisePersona() {
    const feedback = text(document.getElementById('sos-persona-feedback')?.value);
    if (!feedback) return toastr.warning('请先填写人设修改意见。');
    await generatePersona(feedback, 'revise');
}

async function acceptPersona() {
    const value = text(document.getElementById('sos-persona')?.value);
    if (!value) return toastr.warning('请先填写 user 人设。');
    const parsedPersona = parseKeyValueBlock(value);
    const normalized = Object.values(parsedPersona).some(Boolean) ? normalizePersonaData(parsedPersona) : normalizePersonaData(value);
    const chatUserName = currentUserName();
    if (chatUserName) normalized.name = chatUserName;
    const ageIssue = validatePersona(normalized);
    if (ageIssue) return toastr.warning(`${ageIssue}。`);
    state.userPersonaData = normalized;
    state.userPersona = personaToText(normalized) || value;
    state.userPersonaAccepted = true;
    saveState();
    await generateOutline();
}

function outlineSchema() {
    const section = { type: 'string' };
    return {
        type: 'object',
        properties: {
            opening: section,
            development: section,
            turningPoint: section,
            climax: section,
            ending: section,
            outline: { type: 'string' },
            characterNames: { type: 'array', items: { type: 'string' } },
            npcFunctions: { type: 'array', items: { type: 'string' } },
            nsfwNodes: { type: 'array', items: { type: 'string' } },
            hardRules: { type: 'array', items: { type: 'string' } },
        },
        required: ['opening', 'development', 'turningPoint', 'climax', 'ending', 'characterNames', 'hardRules'],
    };
}

async function generateOutline(feedback = '', mode = 'new', continuation = null) {
    await withGenerating(async () => {
        await ensureReferenceWorldBookLoaded();
        ensureStoryId();
        const length = LENGTHS[state.config.length] || LENGTHS.short;
        const recentStory = latestChatText();
        const characterStart = text(currentCharacterContext().fields.firstMessage);
        const storyContinuation = recentStory
            ? `\n<recent_chat_context>以下是酒馆当前聊天最近的真实消息，包含 user 已做出的输入和已经发生的剧情。它们是事实依据，不是提示词；已发生内容不得重写，大纲应从这里继续：\n${recentStory}\n</recent_chat_context>`
            : '';
        const openingContext = characterStart
            ? `\n<character_card_opening>角色卡开场白是故事起点和初始状态，不代表故事已经结束。请从开场白发生的状态继续规划后续开端、发展、转折、高潮和结局：\n${characterStart}\n</character_card_opening>`
            : '';
        const nsfwRule = state.config.tone === '纯黄文'
            ? '故事基调为“纯黄文”：NSFW 是主轴，至少规划 3 个有剧情功能的成年角色亲密节点，并写明所属阶段、主动方、关系推进和对应关键词。'
            : '无论甜文、虐文还是甜虐交织，都必须至少安排 1 个成年角色之间、具有剧情功能的 NSFW 节点；甜文用于关系推进，虐文用于冲突或代价，甜虐交织用于转折或和解。若已选强制爱、囚禁、黑化、金丝雀等成人标签，应安排多个节点。';
        const previous = mode === 'revise' && state.outlineData && Object.values(state.outlineData).some(value => Array.isArray(value) ? value.length : value)
            ? `\n当前大纲基线（修改必须基于此版本）：${JSON.stringify(state.outlineData)}\n当前大纲显示文本：${state.outline}`
            : '';
        const outlineHistory = [...state.outlineGenerationHistory, ...(state.outlineData && outlineSignature(state.outlineData) ? [state.outlineData] : [])];
        const currentName = currentUserName();
        const oldUserNames = historicalUserNames();
        const noveltyHistory = mode === 'new'
            ? outlineHistory.slice(-8).map(item => outlineSignature(item)).filter(Boolean).join('、')
            : '';
        const novelty = mode === 'new'
            ? `\n这是全新剧情路线，不是对旧大纲换词。随机生成标识：${generationNonce('outline')}。必须更换核心冲突、关键场景、因果链、高潮解决方式和结局落点。当前 NPC 阵容及其改名后的最终姓名属于合法输入，必须按当前阵容写入大纲；只有在当前 NPC 阵容完全相同且整体高度相似时，才判定为重复。以下仅是历史版本的短指纹，禁止复原或沿用：${noveltyHistory || '暂无历史版本'}。`
            : '';
        const identityRule = currentName
            ? `\n当前聊天 user 的唯一姓名是“${currentName}”。大纲中的 user 必须指向这个姓名，不得使用旧 user 姓名${oldUserNames.length ? `（例如：${oldUserNames.join('、')}）` : ''}。请在 characterNames 中明确列出“${currentName}”。`
            : '\n当前聊天尚未确定 user 姓名，不要擅自从旧资料推断姓名。';
        const revision = mode === 'revise'
            ? `\n用户修改意见：${feedback}\n这是基于当前大纲的修改。必须保留未被意见点名的段落、人物事实、关键词落实方式和结局方向；已完成剧情绝不能改写，只调整未完成部分。${state.currentTurn > 0 ? '当前已经跑过部分剧情：请把已发生事件视为不可修改的历史，只重新规划未完成部分，并让新大纲从最近消息自然接上，不得跳到结局或后日谈。' : ''}无论修改了几个段落，都必须重新输出一份完整的五段大纲和全部元数据，包含开端、发展、转折、高潮、结局、主要角色名、NPC 功能、NSFW 节点和硬性规则，不能只返回修改部分，也不能使用 outline_patch。`
            : '';
        const prompt = `${basePrompt()}\n任务：生成一份${length.label}小说剧情大纲。短篇、中篇、长篇只表示整体篇幅倾向、事件密度和推进节奏，不是硬性字数上限；工作台不会从 AI 返回的大纲中截断任何内容。必须按“开端、发展、转折、高潮、结局、主要角色名、主要 NPC 功能、NSFW 节点、硬性规则”的顺序，完整输出这五段剧情和全部元数据；不能省略高潮或结局，不能把所有内容塞入单一 outline 字段。先完整规划起承转合、因果链、高潮和明确结局，再控制叙述密度。不得使用“……”或"..."代替未完成内容，不得因为篇幅省略结局、因果链、关键词落实或 NSFW 节点。每个剧情段控制在 300-450 个汉字以内；主要 NPC 功能、NSFW 节点、硬性规则各列 3-6 项，每项控制在 80-140 个汉字以内。主要 NPC 功能必须为每名 NPC 各写一项，并严格使用“姓名｜性格：完整核心性格原文｜身份/剧情功能：内容”的格式；这里确定的姓名和性格会在后续 NPC 人设生成时被程序锁定，禁止遗漏、简称或互换。不要把 NPC 完整人设、NSFW 细节或硬性规则塞进开端、发展、转折、高潮、结局。严格落实所有已选背景、关系、基调、结局、情节关键词和特别要求，不得自行删掉标签。必须在 characterNames（主要角色名）中列出当前 user 和每一名主要 NPC 的最终姓名，不能只写“user”“NPC”或职能。${nsfwRule}\n所有人物必须明确为成年人，性行为必须发生在成年人之间并符合用户设定。${identityRule}${previous}${novelty}${revision}${storyContinuation}${openingContext}\n必须使用完整的 <outline> 标签协议返回，不要返回 JSON；标签内依次填写“开端：...\n发展：...\n转折：...\n高潮：...\n结局：...\n主要角色名：...\n主要 NPC 功能：姓名｜性格：...｜身份/剧情功能：...\nNSFW 节点：...\n硬性规则：...”。`;
        // Leave enough upstream output budget for a complete five-part outline
        // and its metadata. The selected length is a pacing hint, not a token
        // ceiling, and the local formatter no longer truncates the response.
        const outlineResponseLength = state.config.length === 'long' ? 12000 : 8000;
        const result = await generateStructured(
            prompt,
            outlineSchema(),
            outlineResponseLength,
            { allowText: true, continuationRaw: continuation?.raw || '', continuationMeta: { mode, feedback, draftToken: continuation?.draftToken, draftIndex: continuation?.draftIndex }, draftToken: continuation?.draftToken || '', draftIndex: continuation?.draftIndex ?? -1 },
        );
        const finalOutlineData = mode === 'revise'
            ? mergeOutlineData(
                state.outlineData,
                (() => {
                    const next = normalizeOutlineData(result, result.outline ? '' : text(result));
                    if (hasCompleteOutline(next)) return next;
                    const restricted = restrictOutlineRevision(next, feedback);
                    return Object.keys(restricted).length
                        ? restricted
                        : diffOutlineFields(state.outlineData, next);
                })(),
            )
            : normalizeOutlineData(result, result.outline ? '' : text(result));

        if (!hasCompleteOutline(finalOutlineData)) {
            throw new Error('AI 返回的大纲缺少完整的开端、发展、转折、高潮或结局，请重试。');
        }
        if (currentName && oldUserNames.length
            && containsAnyName(outlineText(finalOutlineData), oldUserNames)) {
            throw new Error('AI 返回的大纲仍包含旧 user 姓名，已拒绝写入；当前大纲未被覆盖。');
        }
        if (currentName) {
            finalOutlineData.characterNames = unique([
                currentName,
                ...finalOutlineData.characterNames,
            ]);
        }
        const finalOutline = fitOutlineSections(finalOutlineData);
        if (state.outline) {
            state.outlineRevisions.push({ version: state.outlineVersion, outline: state.outline, outlineData: clone(state.outlineData), accepted: state.outlineAccepted, createdAt: Date.now() });
        }
        state.outlineData = finalOutlineData;
        state.outline = finalOutline;
        if (mode === 'new') {
            state.outlineGenerationHistory = [...outlineHistory, clone(finalOutlineData)].slice(-8);
        }
        state.outlineVersion += 1;
        state.outlineAccepted = false;
        // A fresh outline is a new route and must not silently reuse the old
        // accepted cast. A revision keeps the existing cast so users can edit
        // the route without paying for NPC generation again.
        if (mode === 'new' || !state.npcs.length || !state.npcsAccepted) state.npcsAccepted = false;
        state.lastGeneratedAt = Date.now();
        saveState();
        activeStage = 'outline';
        rerender();
    }, '正在生成剧情大纲...');
}

async function reviseOutline() {
    const feedback = text(document.getElementById('sos-outline-feedback')?.value);
    if (!feedback) return toastr.warning('请先填写修改意见。');
    await generateOutline(feedback, 'revise');
}

async function acceptOutline() {
    if (!text(state.outline)) return;
    state.outlineAccepted = true;
    saveState();
    if (state.npcSource === 'worldbook') {
        await withGenerating(async () => {
            await ensureReferenceWorldBookLoaded();
            if (!hasWorldBookNpcSource()) {
                state.outlineAccepted = false;
                saveState();
                throw new Error('当前角色卡或已选择的世界书没有可用的已启用条目；请切换 NPC 来源或先绑定世界书。');
            }
            state.npcsAccepted = true;
            state.worldBookName = characterBoundWorldBookName() || selectedReferenceWorldBookName() || '角色卡世界书';
            saveState();
            activeStage = 'story';
            rerender();
            toastr.success('大纲已确认，将使用角色卡世界书中的已启用 NPC，不会额外调用 NPC 生成。');
        }, '正在读取角色卡世界书...');
        return;
    }
    if (state.npcs.length > 0 && state.npcsAccepted) {
        activeStage = 'story';
        rerender();
        toastr.success('大纲已确认，沿用当前 NPC，不重新生成。');
        return;
    }
    await generateNpcs();
}

async function generateNpcs(feedback = '', mode = 'new', continuation = null) {
    await withGenerating(async () => {
        if (state.npcSource === 'worldbook') {
            return toastr.warning('当前选择了使用角色卡世界书 NPC，不会调用 AI 生成 NPC。');
        }
        await ensureReferenceWorldBookLoaded();
        ensureStoryId();
        if (!state.outlineAccepted) return toastr.warning('请先接受大纲。');
        const previous = mode === 'revise' && state.npcs.length
            ? `\n当前 NPC 草稿（本次重生成的基线；除非用户明确要求，不要改变姓名、身份、核心性格、关系和说话方式）：${JSON.stringify(state.npcs)}`
            : '\n当前没有 NPC 草稿，请根据大纲生成全部主要 NPC。';
        const currentName = currentUserName();
        const outlineConstraints = outlineNpcConstraints(state.outlineData);
        const existingNpcNames = unique(state.npcs.map(npc => text(npc?.name)).filter(Boolean));
        const lockExistingNames = mode === 'reroll-locked' || mode === 'revise';
        const lockedNpcNames = lockExistingNames ? existingNpcNames : [];
        const outlineConstraintText = outlineConstraints.map(item => {
            const personality = item.personality ? `；锁定性格原文：${item.personality}` : '';
            return `${item.name}${personality}；大纲相关原文：${item.source || '大纲只列出了姓名，其他设定须从完整大纲中判断'}`;
        }).join('\n');
        const lockedNamesRule = lockExistingNames
            ? `\n本次基于已有 NPC 重 roll/修改。必须严格保留以下已有姓名并按原顺序返回：${lockedNpcNames.join('、')}。禁止改名、换同音字、拿别名替代 name、添加或删除已有 NPC。`
            : '\nNPC 数量由你根据大纲、user 与 NPC 关系、剧情冲突和已选标签自行判断，不要从 characterNames 字段机械提取数量，也不要把剧情正文里的普通词语当作 NPC。只生成真正承担主要关系线、冲突线或关键剧情功能的 NPC。';
        const outlineRule = outlineConstraintText
            ? `\n大纲中的“主要 NPC 功能”是人物姓名和核心性格参考。每个被列出的 NPC 都要优先采用对应姓名，并以核心性格为基础扩展行为表现、心理动机、处事方式和关系反应；不得改变、否定、反转或弱化核心性格，也不能把甲的设定给乙。扩展后的 personality 要保留核心性格原文或清晰含义。参考如下：\n${outlineConstraintText}`
            : '';
        const npcCount = lockedNpcNames.length ? `恰好 ${lockedNpcNames.length}` : '由你判断合适数量的';
        const revision = mode === 'revise'
            ? `\n用户 NPC 修改意见：${feedback}\n这是基于当前 NPC 草稿的修改。只修改意见明确点名的 NPC、字段或内容；未点名的 NPC 以及未点名字段必须保持原值，尤其是姓名、身份、核心性格、关系、说话方式和已确认的成年人年龄。无论修改了几个字段，都必须重新输出全部 NPC 的完整结果，每名 NPC 都要包含全部字段，不能只返回修改部分，也不能使用 npc_patch。`
            : '';
        const npcSchema = { type: 'object', properties: { npcs: { type: 'array', ...(lockedNpcNames.length ? { minItems: lockedNpcNames.length, maxItems: lockedNpcNames.length } : {}), items: { type: 'object', properties: { name: { type: 'string' }, aliases: { type: 'array', items: { type: 'string' } }, gender: { type: 'string' }, age: { type: 'string' }, height: { type: 'string' }, appearance: { type: 'string' }, personality: { type: 'string' }, identity: { type: 'string' }, past: { type: 'string' }, relationship: { type: 'string' }, attitude: { type: 'string' }, quotes: { type: 'array', items: { type: 'string' } }, nsfw: { type: 'string' }, body: { type: 'string' } }, required: ['name', 'aliases', 'gender', 'age', 'height', 'appearance', 'personality', 'identity', 'past', 'relationship', 'attitude', 'quotes', 'nsfw', 'body'] } } }, required: ['npcs'] };
        const prompt = `${basePrompt()}\n当前 user 唯一姓名：${currentName || '尚未确定'}。NPC 与 user 的关系必须匹配这个姓名，不得把旧 user 人设、旧聊天或参考资料中的其他人当作当前 user。\n已接受的大纲：${state.outline}\n请只根据该大纲生成 ${npcCount} 主要 NPC。每个字段必须完整；如果大纲包含成人内容，相关 NPC 的年龄字段必须明确为成年人。严格按以下顺序输出每一名 NPC，第一行必须是 name（姓名）：name、aliases（称呼/关键词）、gender、age、height、appearance、personality、identity、past、relationship、attitude、quotes、nsfw、body。没有完成一个 NPC 的全部字段前，不得开始下一个 NPC。先简洁、完整地写完所有 NPC，再补充细节；不得用省略号或“内容已截断”代替字段。每名 NPC 都必须单独使用完整的 <npc>...</npc>，最后闭合 </npcs>。不得输出分析、解释、前言或 Markdown。外貌要有至少两条可识别细节，不能都是模板化帅哥美女；性格必须能从身份和过去经历合理推出，不能自相矛盾。NSFW 字段只写成年角色的偏好、体位和语言风格，不改变人物性格。关键词必须覆盖姓名、昵称、去姓名、user 对其特殊称呼。${previous}${lockedNamesRule}${outlineRule}${revision}\n如果无法返回 JSON，请使用 <npcs><npc>字段：内容</npc></npcs>，不要解释。`;
        const result = await generateStructured(
            prompt,
            npcSchema,
            state.config.relationshipMode === 'NP' ? 16000 : 10000,
            { allowText: true, continuationRaw: continuation?.raw || '', continuationMeta: { mode, feedback, draftToken: continuation?.draftToken, draftIndex: continuation?.draftIndex }, draftToken: continuation?.draftToken || '', draftIndex: continuation?.draftIndex ?? -1 },
        );
        let nextNpcs = mode === 'revise'
            ? mergeNpcDrafts(
                state.npcs,
                (() => {
                    const restricted = restrictNpcRevision(result.npcs, feedback, state.npcs);
                    return restricted.length
                        ? restricted
                        : diffNpcFields(state.npcs, result.npcs, feedback);
                })(),
                feedback,
            )
            : Array.isArray(result.npcs)
                ? normalizeNpcCollection(result.npcs)
                : [];

        if (!nextNpcs.length) {
            throw new Error('AI 没有返回主要 NPC，请重试；当前 NPC 草稿已保留。');
        }

        nextNpcs = lockNpcsToOutline(normalizeNpcCollection(nextNpcs), state.outlineData, lockedNpcNames);
        if (!nextNpcs) {
            throw new Error(`AI 返回的 NPC 人数与当前已有 NPC 不一致。当前要求 ${lockedNpcNames.length} 人（${lockedNpcNames.join('、')}），已保留原 NPC；请继续生成完整内容或重试。`);
        }
        if (npcNameCollision(nextNpcs, [currentName])) {
            throw new Error('大纲中的 NPC 姓名存在重复或与当前 user 重名，已拒绝写入；请先修正大纲角色名单。');
        }
        if (state.config.relationshipMode === 'NP' && nextNpcs.length < 2) {
            throw new Error('NP 模式必须生成至少 2 名互不重复的主要 NPC，当前结果已拒绝写入。');
        }
        state.npcs = nextNpcs;
        state.npcsAccepted = false;
        saveState();
        activeStage = 'npc';
        rerender();
        const invalid = nextNpcs.map(validateNpc).filter(Boolean);
        if (invalid.length) toastr.warning('已保留 AI 返回的 NPC 草稿；部分字段不完整，请在接受前补全或按意见修改。');
    }, '正在生成 NPC...');
}

function getWorldBookTarget() {
    refreshContext();
    const character = hasCurrentCharacter() ? ctx.characters[ctx.characterId] : null;
    return character?.data?.extensions?.world || '';
}

function storyWorldBookName() {
    const characterBook = characterBoundWorldBookName();
    const existingChatBook = text(ctx.chatMetadata?.[CHAT_WORLD_INFO_KEY]);
    // A character card's primary world is the authoritative target for NPCs.
    // Chat metadata may still point at an old parallel book created by an
    // earlier version of the extension, so it must not override the card.
    // Blank-card chats have no primary world and fall back to their chat book.
    if (characterBook) return characterBook;
    if (existingChatBook) return existingChatBook;
    const canonicalName = '剧情大纲工作台';
    if (getAvailableWorldBookNames().includes(canonicalName)) return canonicalName;
    return canonicalName;
}

function npcToWorldEntry(npc) {
    const normalized = normalizeNpc(npc);
    const name = normalized.name || '未命名 NPC';
    const storyId = ensureStoryId();
    const keys = unique([name, ...normalized.aliases, name.split(/\s+/).at(-1)]);
    const content = `[剧情大纲工作台 NPC]\n故事 ID：${storyId}\n姓名：${name}\n关键词：${keys.join('、')}\n性别：${normalized.gender}\n年龄：${normalized.age}\n身高：${normalized.height}\n外貌：${normalized.appearance}\n性格：${normalized.personality}\n身份背景：${normalized.identity}\n过去经历：${normalized.past}\n与 user 的关系：${normalized.relationship}\n对 user 的态度：${normalized.attitude}\n典型语录：${normalized.quotes.join('；')}\nNSFW偏好与语言风格：${normalized.nsfw}\n身体信息：${normalized.body}`;
    return { keys, content, comment: name, enabled: normalized.enabled !== false };
}

function isCurrentStoryNpcEntry(entry, storyId) {
    if (!isStoryNpcEntry(entry)) return false;
    const content = text(entry?.content);
    return content.includes(`故事 ID：${storyId}`) || content.includes(`故事 ID: ${storyId}`);
}

async function acceptNpcs() {
    if (!state.npcs.length) return toastr.warning('没有可写入的 NPC。');
    state.npcs = state.npcs.map(normalizeNpc);
    const invalid = state.npcs.map(validateNpc).find(Boolean);
    if (invalid) return toastr.warning(`${invalid} 请先修改。`);
    await withGenerating(async () => {
        const selected = explicitNpcWorldBookName();
        const available = await refreshAvailableWorldBooks();
        if (selected && !available.includes(selected)) throw new Error('所选目标世界书已不存在，请刷新列表后重新选择。');
        const bookName = selected || storyWorldBookName();
        const loaded = await loadWorldInfo(bookName);
        if (selected && !loaded) throw new Error(`无法读取目标世界书“${bookName}”，NPC 未写入。`);
        const data = cloneWorldBookData(loaded);
        if (!data.entries || typeof data.entries !== 'object') data.entries = {};
        const storyId = ensureStoryId();
        for (const [entryId, entry] of Object.entries(data.entries)) {
            if (isCurrentStoryNpcEntry(entry, storyId)) delete data.entries[entryId];
        }
        for (const npc of state.npcs) {
            const normalized = npcToWorldEntry(npc);
            const existing = Object.values(data.entries).find(entry => isCurrentStoryNpcEntry(entry, storyId) && text(entry?.comment) === normalized.comment);
            const entry = existing || createWorldInfoEntry(bookName, data);
            if (!entry) continue;
            entry.key = normalized.keys;
            entry.keysecondary = [];
            entry.comment = normalized.comment;
            entry.content = normalized.content;
            entry.constant = false;
            entry.selective = false;
            entry.order = 100;
            entry.position = 1;
            entry.disable = normalized.enabled === false;
        }
        await saveWorldInfo(bookName, data, true);
        await updateWorldInfoList?.();
        if (ctx.chatMetadata && !characterBoundWorldBookName()) {
            // Preserve the current chat binding. If the console is operating
            // in its standalone mode, use the conventional workbench name.
            if (!text(ctx.chatMetadata[CHAT_WORLD_INFO_KEY])) {
                ctx.chatMetadata[CHAT_WORLD_INFO_KEY] = bookName;
                await ctx.saveMetadata?.();
            }
        }
        state.worldBookName = bookName;
        state.npcsAccepted = true;
        saveState();
        activeStage = 'story';
        rerender();
        toastr.success(`NPC 已写入世界书：${bookName}`);
    });
}

async function importWorldBook(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        const parsed = JSON.parse(await file.text());
        const card = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
        const book = card?.character_book || parsed?.character_book || parsed;
        const rawEntries = book?.entries;
        const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries && typeof rawEntries === 'object' ? Object.values(rawEntries) : [];
        const normalized = entries.map(entry => ({
            keys: unique([...asList(entry.key), ...asList(entry.keys), ...asList(entry.keysecondary)]),
            content: text(entry.content || entry.description),
            enabled: isWorldBookEntryEnabled(entry),
        })).filter(entry => entry.content);
        const getCardField = (...keys) => keys.map(key => card?.[key] ?? parsed?.[key]).find(value => value !== undefined && value !== null);
        const characterFields = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example', 'system_prompt', 'post_history_instructions', 'creator_notes', 'creatorcomment'];
        const hasCharacter = characterFields.some(field => text(getCardField(field)));
        if (!hasCharacter && !normalized.length) throw new Error('文件不是角色卡或世界书格式。');
        if (hasCharacter) {
            state.importedCharacterReferences.push({
                name: text(getCardField('name')) || file.name.replace(/\.json$/i, ''),
                description: text(getCardField('description')),
                personality: text(getCardField('personality')),
                scenario: text(getCardField('scenario')),
                first_mes: text(getCardField('first_mes')),
                mes_example: text(getCardField('mes_example')),
                system_prompt: text(getCardField('system_prompt')),
                post_history_instructions: text(getCardField('post_history_instructions')),
                creator_notes: text(getCardField('creator_notes', 'creatorcomment')),
                source: file.name,
            });
        }
        if (normalized.length) state.importedWorldBooks.push({ name: file.name, entries: normalized });
        saveState();
        rerender();
        const importedParts = [];
        if (hasCharacter) importedParts.push('角色本体');
        if (normalized.length) importedParts.push(`${normalized.length} 条世界书`);
        toastr.success(`已导入${importedParts.join('和')}`);
    } catch (error) { toastr.error(error.message || '导入失败'); }
    event.target.value = '';
}

function safeWorldBookName(value) {
    return text(value)
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 64);
}

function cloneWorldBookData(data) {
    if (!data || typeof data !== 'object') return { entries: {} };
    if (!Object.keys(data).length) return { entries: {} };
    return clone(normalizeWorldBookData(data));
}

function referenceCharacterWorldEntry(reference) {
    const name = text(reference?.name) || '未命名参考角色';
    const keys = unique([name, ...asList(reference?.aliases), name.length > 1 ? name.slice(1) : '']);
    const content = [
        '[剧情工作台平行 IF 参考角色]',
        `姓名：${name}`,
        `角色描述：${text(reference?.description)}`,
        `性格：${text(reference?.personality)}`,
        `场景与身份：${text(reference?.scenario)}`,
        `开场白：${text(reference?.first_mes)}`,
        `示例对话：${text(reference?.mes_example)}`,
        `系统提示：${text(reference?.system_prompt)}`,
        `历史提示：${text(reference?.post_history_instructions)}`,
        `创作者备注：${text(reference?.creator_notes)}`,
        '要求：在平行 IF 故事中保留该角色的核心身份逻辑、性格和说话方式，避免 OOC。',
    ].filter(line => !line.endsWith('：')).join('\n');
    return { keys, content, comment: `SOS IF Character - ${name}` };
}

function importedWorldBookEntries() {
    const result = [];
    for (const book of state.importedWorldBooks) {
        for (const [index, imported] of book.entries.entries()) {
            const content = text(imported?.content);
            if (!content) continue;
            result.push({
                keys: unique([...asList(imported?.keys), ...asList(imported?.key)]),
                content,
                comment: `SOS IF World - ${text(book.name) || '未命名世界书'} - ${index + 1}`,
            });
        }
    }
    return result;
}

function writeWorldInfoEntry(bookName, data, normalized) {
    const existing = Object.values(data.entries).find(entry => text(entry?.comment) === normalized.comment);
    const entry = existing || createWorldInfoEntry(bookName, data);
    if (!entry) return false;
    entry.key = normalized.keys.length ? normalized.keys : [normalized.comment];
    entry.keysecondary = [];
    entry.comment = normalized.comment;
    entry.content = normalized.content;
    // Imported parallel references must be in the normal World Info context
    // even when the player does not type one of their names in a given turn.
    entry.constant = true;
    entry.selective = false;
    entry.order = 200;
    entry.disable = false;
    return true;
}

async function attachReferenceWorldBook() {
    if (!state.importedCharacterReferences.length && !state.importedWorldBooks.length) {
        return toastr.warning('请先导入至少一张参考角色卡或世界书。');
    }
    await withGenerating(async () => {
        refreshContext();
        const existingChatBook = text(ctx.chatMetadata?.[CHAT_WORLD_INFO_KEY]);
        const previousAttached = text(state.attachedWorldBookName);
        const fallback = `剧情工作台-平行IF-${ctx.getCurrentChatId?.() || currentCharacterContext().name}`;
        const bookName = safeWorldBookName(previousAttached || fallback) || '剧情工作台-平行IF';

        // Clone a directly attached existing world book into a dedicated
        // composite so this feature never mutates or deletes the user's source
        // book. Re-running updates the same composite and avoids duplicates.
        const sourceName = existingChatBook && existingChatBook !== bookName ? existingChatBook : bookName;
        const source = await loadWorldInfo(sourceName);
        const data = cloneWorldBookData(source);
        let written = 0;
        for (const reference of state.importedCharacterReferences) {
            if (writeWorldInfoEntry(bookName, data, referenceCharacterWorldEntry(reference))) written++;
        }
        for (const entry of importedWorldBookEntries()) {
            if (writeWorldInfoEntry(bookName, data, entry)) written++;
        }
        if (!written) throw new Error('导入内容中没有可写入世界书的有效条目。');

        await saveWorldInfo(bookName, data, true);
        await ctx.updateWorldInfoList?.();
        if (!ctx.chatMetadata) throw new Error('当前聊天元数据不可用，无法挂载聊天世界书。');
        ctx.chatMetadata[CHAT_WORLD_INFO_KEY] = bookName;
        await ctx.saveMetadata?.();
        state.attachedWorldBookName = bookName;
        saveState();
        rerender();
        toastr.success(`已挂载当前聊天世界书：${bookName}${existingChatBook && existingChatBook !== bookName ? '（已复制并合并原聊天世界书）' : ''}`);
    });
}

function storyPrompt() {
    const min = LENGTHS[state.config.length]?.minTurns || 0;
    const remaining = Math.max(0, min - state.userTurnCount);
    const activeNpcs = state.npcSource === 'worldbook' ? [] : state.npcs.filter(npc => npc.enabled !== false);
    const activeWorldBooks = state.npcSource === 'worldbook' ? activeWorldBookNpcContext() : '';
    const npcSourceRule = state.npcSource === 'worldbook'
        ? 'NPC 来源为角色卡/绑定世界书。只使用当前角色卡世界书、角色卡内置 character_book 和已选择参考世界书中已启用的角色条目；关闭条目不得出场，不要额外虚构工作台 NPC，也不要把旧聊天中的 NPC 当作当前 NPC。'
        : 'NPC 来源为工作台 AI 生成。只使用下方当前故事启用的 NPC；关闭的 NPC 不得出场。';
    const isRewrite = generationIntent === 'rewrite';
    const visibleChat = latestChatText({ beforeMessageIndex: isRewrite ? rewriteMessageIndex : -1 });
    const historyRule = isRewrite
        ? `这是一次重写当前楼层任务。目标楼层是第 ${Math.max(1, rewriteMessageIndex + 1)} 条聊天消息。只能参考目标楼层之前的实际聊天，必须重新写这一楼；严禁把被重 roll 的旧正文当作事实，严禁跳到大纲后续楼层或结局。`
        : '这是一次新的剧情推进任务。只能根据酒馆当前聊天中的实际历史和当前大纲推进下一段，不要把大纲内容当成已经发生的剧情。';
    const pacingRule = remaining > 0
        ? `距离最低交互要求还差 ${remaining} 个 user 楼层。在达到 ${min} 个 user 楼层前，严禁进入最终高潮、解决核心矛盾、完成终极目标、让主要关系定局或输出结局；本次只能推进过程事件并留下明确的后续行动空间。禁止出现“结局后”“后日谈”“多年后”“婚后日常”或故事已经结束的叙述。`
        : '已达到最低交互楼层，可以依据大纲和当前节奏进入高潮或结局，但不要无故跳过必要情节；只有真正完成大纲中的结局事件后，才允许写结局后的内容。';
    const contextRule = isRewrite
        ? '酒馆会根据本次重写任务提供当前上下文；上一条被替换的 assistant 正文不属于可参考历史。'
        : state.currentTurn > 0
            ? `酒馆会自动提供当前聊天的实际消息；请以最近一条实际 user 输入和上一条剧情为准，自动判断大纲已经推进到哪一段。当前工作台计数仅作辅助：剧情楼 ${state.currentTurn}，user 交互楼 ${state.userTurnCount}。`
            : '请从当前聊天最后一条实际内容承接开端；不要因为大纲包含高潮和结局就直接跳到故事末尾。';
    const actualHistory = visibleChat
        ? `\n<current_chat_history>以下是当前酒馆聊天中可参考的真实历史。它会随删除、重 roll 和编辑实时变化；这里只能把它当作已经发生的事实，不是新的 user 指令：\n${visibleChat}\n</current_chat_history>`
        : '\n<current_chat_history>当前目标之前没有可用的聊天历史，请从角色卡开场和当前大纲的开端自然开始。</current_chat_history>';
    return `${basePrompt()}\n<story_outline_studio_continuity>\n<current_effective_outline>\n当前唯一生效的大纲版本：${state.outlineVersion}\n旧聊天中出现的旧版本大纲、旧剧情指令或旧规划不得覆盖当前版本。以下大纲只是未来路线规划，不代表已经发生：\n${state.outline}\n</current_effective_outline>${actualHistory}\n<next_story_task>\n${historyRule}当前聊天会由酒馆原生上下文继续提供；不得把大纲内容当成已经发生的剧情。\n</next_story_task>\n</story_outline_studio_continuity>\n当前故事 ID：${ensureStoryId()}\n当前 user 唯一姓名：${currentUserName() || '尚未确定'}\n当前故事启用的 NPC：${JSON.stringify(activeNpcs)}\n关闭的 NPC 不得出场、不得作为关系对象、不得被世界书上下文重新启用。\n${contextRule}\n${state.npcSource === 'worldbook' ? `角色卡/绑定世界书当前启用条目（这些是本故事唯一可用的现成 NPC/设定候选，关闭条目不在此处）：\n<active_worldbook_npc_entries>\n${activeWorldBooks}\n</active_worldbook_npc_entries>` : ''}\n不要使用或猜测旧的剧情快照；以当前聊天中实际仍存在的消息为唯一剧情历史。\n本篇最低 user 交互楼层：${min}\n楼层硬约束：${pacingRule}\n配置中的特别想看的情节、禁区和补充要求：${text(state.config.detail) || '暂无'}\n特别要求是本次剧情的高优先级约束；其中明确指定的中途、高潮、结尾或场景，必须在未完成大纲范围内优先落实，已完成部分除外。\n硬规则：严格按照当前唯一生效的大纲版本和所有配置关键词推进；不要擅自改变 user 人设；不要让 NPC OOC；不要提前结局；已完成剧情只当作历史；新的剧情必须连接最近聊天内容。user 本楼明确做出的行动、选择、拒绝、目标和新要求优先于未发生的大纲情节；不要无视 user 输入，也不要强行把 user 拉回原轨。普通偏差要自然吸收，并把未完成的大纲事件改写成能由当前行动导向的版本。若 user 的行动与未完成大纲的关键事件、关系走向或结局方向发生实质冲突，先承接 user 已经做出的事实，不要在本楼强行纠正；将其作为新的分支，并提示 user 可用“修改后续大纲”确认后续路线。已完成剧情绝不能改写。如果 user 本楼只输入“继续剧情”或等价推进指令，不要把这几个字当作剧情事实，直接按照当前唯一生效的大纲版本、最近聊天和当前节奏推进下一楼。只输出本次剧情正文，不要大纲、总结、设定说明。`;
}

function updateContinuityPrompt() {
    if (!state?.outlineAccepted || !state?.npcsAccepted) {
        ctx.setExtensionPrompt?.(PROMPT_KEY, '', 1, 0, false);
        return;
    }
    ctx.setExtensionPrompt?.(PROMPT_KEY, storyPrompt(), 1, 0, false);
}

function latestChatText({ beforeMessageIndex = -1 } = {}) {
    const source = beforeMessageIndex >= 0
        ? (ctx.chat || []).slice(0, beforeMessageIndex)
        : (ctx.chat || []);
    return source.slice(-16)
        .filter(message => {
            const extra = message?.extra || {};
            return text(message?.mes)
                && !extra.storyOutlineStudioDraft
                && !extra.storyOutlineStudioTemporary
                && !extra.storyOutlineStudio?.continuationDirective;
        })
        .slice(-12)
        .map(message => `${message.name || (message.is_user ? ctx.name1 : ctx.name2)}：${message.mes}`)
        .join('\n');
}

function isContinuationDirective(value) {
    return /^(?:继续剧情|继续|下一楼|推进剧情|继续下一楼|continue(?:\s+story)?)[。！!？?\s]*$/i.test(text(value));
}

function storyMessageKey(message, index) {
    const id = text(message?.mesId || message?.id || message?.send_date);
    return id ? id : `${index}:${text(message?.name)}:${text(message?.mes).slice(0, 160)}`;
}

function trackReceivedStoryMessage(messageIndex) {
    if (!state?.outlineAccepted || !state?.npcsAccepted || structuredGenerationInProgress) return;
    const index = Number(messageIndex);
    const message = Number.isInteger(index) ? ctx.chat?.[index] : null;
    if (!message || message.is_user || !text(message.mes) || message.extra?.storyOutlineStudioTemporary || message.extra?.storyOutlineStudioDraft) return;
    const key = storyMessageKey(message, index);
    if (state.trackedStoryMessageKeys.includes(key) || message.extra?.storyOutlineStudio?.countedInteraction) return;
    state.trackedStoryMessageKeys = [...state.trackedStoryMessageKeys, key].slice(-200);
    state.currentTurn += 1;
    state.completedStoryMessages += 1;
    state.completedStorySnapshot = `${state.completedStorySnapshot}\n${text(message.mes)}`.trim().slice(-12000);
    message.extra = {
        ...(message.extra || {}),
        storyOutlineStudio: {
            version: state.outlineVersion,
            turn: state.currentTurn,
            countedInteraction: true,
        },
    };
    saveState();
    void ctx.saveChat?.();
    if (panel?.classList.contains('open')) rerender();
}

function syncStoryProgressFromChat({ render = false } = {}) {
    if (!state || !ctx?.chat) return;
    const storyMessages = ctx.chat.filter(message => !message?.is_user && message?.extra?.storyOutlineStudio?.countedInteraction && text(message?.mes));
    const chatKeys = new Set(ctx.chat.map((message, index) => storyMessageKey(message, index)));
    const userMessages = ctx.chat.filter((message, index) => message?.is_user
        && text(message?.mes)
        && !message?.extra?.storyOutlineStudioTemporary
        && !message?.extra?.storyOutlineStudioDraft
        && state.trackedUserMessageKeys.includes(storyMessageKey(message, index)));
    state.trackedStoryMessageKeys = storyMessages.map((message, index) => storyMessageKey(message, index)).slice(-200);
    state.trackedUserMessageKeys = state.trackedUserMessageKeys.filter(key => chatKeys.has(key)).slice(-200);
    state.currentTurn = storyMessages.length;
    state.completedStoryMessages = storyMessages.length;
    // Older metadata did not retain user message keys. Keep its already
    // tracked count until a new marked user message gives us a complete key
    // set, while new chats use exact current-chat counting.
    if (state.trackedUserMessageKeys.length || userMessages.length) state.userTurnCount = userMessages.length;
    if (render) {
        saveState();
        if (panel?.classList.contains('open')) rerender();
    }
}

function setGenerationIntent(intent, messageIndex = -1) {
    generationIntent = intent === 'rewrite' ? 'rewrite' : 'continue';
    rewriteMessageIndex = generationIntent === 'rewrite'
        ? Math.max(0, Number.isInteger(Number(messageIndex)) ? Number(messageIndex) : (ctx.chat?.length || 1) - 1)
        : -1;
    updateContinuityPrompt();
}

function markRewriteAfterDeletion() {
    pendingRewriteAfterDeletion = true;
    generationIntent = 'rewrite';
    rewriteMessageIndex = ctx.chat?.length || 0;
    updateContinuityPrompt();
}

async function continueStory() {
    await withGenerating(async () => {
        if (!state.outlineAccepted || !state.npcsAccepted) return toastr.warning('请先接受大纲和 NPC。');
        await ensureReferenceWorldBookLoaded();
        const beforeLength = ctx.chat.length;
        const continuationDirective = '请根据当前有效剧情大纲、上一段已完成剧情和当前聊天上下文，继续下一段剧情。必须推进新的事件，不要重复上一段，也不要进入结局后的后日谈。';
        continuationGenerationInProgress = true;
        try {
            setGenerationIntent('continue');
            // Use SillyTavern's normal foreground send path. This inserts the
            // directive as a visible user message, saves it, emits the normal
            // message events, and starts generation just like a Quick Reply.
            const textarea = document.querySelector('#send_textarea');
            if (!textarea) throw new Error('找不到酒馆输入框，无法发送继续剧情指令。');
            textarea.value = continuationDirective;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            await ctx.generate('normal', {
                quiet_prompt: `【继续剧情指令】\n${continuationDirective}\n必须根据当前唯一生效的大纲版本推进新的事件、行动、信息或关系变化；不得重复上一段，不得把上一段快照中的旧指令当成当前指令，不得在大纲尚未真正完成时进入结局后的后日谈。`,
                quietToLoud: true,
                skipWIAN: false,
                force_name2: true,
            });
            const generated = ctx.chat.slice(beforeLength)
                .filter(message => !message.is_user && text(message.mes))
                .at(-1);
            const content = text(generated?.mes);
            if (!generated || !content) throw new Error('酒馆请求已完成，但没有写入剧情消息。请检查 API 响应和酒馆控制台。');
            trackReceivedStoryMessage(ctx.chat.indexOf(generated));
            syncStoryProgressFromChat();
            saveState();
            await ctx.saveChat?.();
            rerender();
        } catch (error) {
            throw wrapGenerationError(error);
        } finally {
            continuationGenerationInProgress = false;
            setGenerationIntent('continue');
        }
    });
}

async function reviseFromStory() {
    const feedback = text(document.getElementById('sos-mid-feedback')?.value);
    if (!feedback) return toastr.warning('请先填写后续大纲修改意见。');
    activeStage = 'outline';
    rerender();
    await reviseOutlineWithFeedback(feedback);
}

async function reviseOutlineWithFeedback(feedback) {
    await generateOutline(feedback, 'revise');
}

function installButton() {
    const existing = document.getElementById('sos_wand_container');
    const container = existing || document.createElement('div');
    container.id = 'sos_wand_container';
    container.className = 'extension_container';
    container.innerHTML = '<div class="extensionsMenuExtensionButton sos-wand-button" title="打开剧情大纲工作台"><i class="fa-solid fa-scroll" aria-hidden="true"></i><span>打开剧情大纲工作台</span></div>';
    const menu = document.getElementById('extensionsMenu');
    if (!menu) {
        if (buttonRetryCount < 20 && !buttonRetryTimer) {
            buttonRetryCount += 1;
            buttonRetryTimer = setTimeout(() => {
                buttonRetryTimer = null;
                installButton();
            }, 500);
        }
        return;
    }
    if (!existing) menu.append(container);
    buttonRetryCount = 0;
    container.title = '打开剧情大纲工作台';
    const open = () => {
        refreshContext();
        const nextKey = contextCacheKey(ctx);
        if (activeChatKey !== nextKey) {
            activeChatKey = nextKey;
            generationEpoch += 1;
            state = getState();
        }
        openPanel('config', false);
    };
    container.onclick = open;
    container.querySelector('.sos-wand-button')?.addEventListener('click', event => {
        event.stopPropagation();
        open();
    });
}

function installSlashCommand() {
    try {
        if (SlashCommandParser.commands['sos-continue'] || SlashCommandParser.commands['story-continue']) return;
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'sos-continue', aliases: ['story-continue'], helpString: '使用剧情大纲工作台继续下一楼剧情', callback: async () => {
            refreshContext();
            const nextKey = contextCacheKey(ctx);
            if (activeChatKey !== nextKey) {
                activeChatKey = nextKey;
                generationEpoch += 1;
                state = getState();
            }
            await continueStory();
            return '';
        } }));
    } catch (error) {
        // A command registration conflict must not disable the visual workbench.
        console.warn(`[${EXTENSION_ID}] slash command registration skipped`, error);
    }
}

function installEvents() {
    ctx.eventSource?.on?.(ctx.eventTypes.CHAT_CHANGED, () => {
        refreshContext();
        const nextKey = contextCacheKey(ctx);
        if (activeChatKey !== nextKey) {
            activeChatKey = nextKey;
            generationEpoch += 1;
            state = getState();
            activeStage = 'config';
            generationIntent = 'continue';
            rewriteMessageIndex = -1;
            pendingRewriteAfterDeletion = false;
        }
        void refreshAvailableWorldBooks(true);
        void ensureReferenceWorldBookLoaded()
            .then(() => updateContinuityPrompt())
            .catch(error => console.warn(`[${EXTENSION_ID}] failed to preload linked world books`, error));
        updateContinuityPrompt();
        if (panel?.classList.contains('open')) rerender();
    });
    ctx.eventSource?.on?.(ctx.eventTypes.MESSAGE_SENT, messageIndex => {
        if (!state || !state.outlineAccepted) return;
        const message = Number.isInteger(messageIndex) ? ctx.chat?.[messageIndex] : null;
        if (!message?.is_user || message?.extra?.storyOutlineStudioTemporary || message?.extra?.storyOutlineStudioDraft) return;
        if (pendingRewriteAfterDeletion) {
            setGenerationIntent('rewrite', Number.isInteger(messageIndex) ? messageIndex + 1 : ctx.chat.length);
        }
        const continuation = continuationGenerationInProgress;
        message.extra = {
            ...(message.extra || {}),
            storyOutlineStudio: {
                ...(message.extra?.storyOutlineStudio || {}),
                ...(continuation ? { continuationDirective: true } : {}),
                countedUserInteraction: true,
                outlineVersion: state.outlineVersion,
            },
        };
        state.trackedUserMessageKeys = [...state.trackedUserMessageKeys, storyMessageKey(message, messageIndex)].slice(-200);
        syncStoryProgressFromChat();
        saveState();
    });
    ctx.eventSource?.on?.(ctx.eventTypes.MESSAGE_RECEIVED, messageIndex => {
        trackReceivedStoryMessage(messageIndex);
    });
    ctx.eventSource?.on?.(ctx.eventTypes.MESSAGE_SWIPED, messageIndex => {
        setGenerationIntent('rewrite', messageIndex);
    });
    ctx.eventSource?.on?.(ctx.eventTypes.GENERATION_STARTED, type => {
        if (type === 'regenerate' || type === 'swipe') {
            setGenerationIntent('rewrite', (ctx.chat?.length || 1) - 1);
        } else if (type === 'normal' || type === 'continue') {
            if (pendingRewriteAfterDeletion) {
                generationIntent = 'rewrite';
                rewriteMessageIndex = Math.max(0, ctx.chat?.length || 0);
                updateContinuityPrompt();
            } else {
                setGenerationIntent('continue');
            }
        }
    });
    ctx.eventSource?.on?.(ctx.eventTypes.MESSAGE_DELETED, () => {
        const previousStoryCount = Number(state?.currentTurn || 0);
        syncStoryProgressFromChat({ render: true });
        if (state && state.currentTurn < previousStoryCount) markRewriteAfterDeletion();
    });
    ctx.eventSource?.on?.(ctx.eventTypes.MESSAGE_UPDATED, () => {
        syncStoryProgressFromChat({ render: true });
    });
    ctx.eventSource?.on?.(ctx.eventTypes.MESSAGE_SWIPE_DELETED, () => {
        const previousStoryCount = Number(state?.currentTurn || 0);
        syncStoryProgressFromChat({ render: true });
        if (state && state.currentTurn < previousStoryCount) markRewriteAfterDeletion();
    });
    ctx.eventSource?.on?.(ctx.eventTypes.GENERATION_ENDED, () => {
        pendingRewriteAfterDeletion = false;
        setGenerationIntent('continue');
    });
}

let initialized = false;

async function init() {
    if (initialized) return;

    try {
        await dependencyPromise;
        refreshContext();
        activeChatKey = contextCacheKey(ctx);
        state = getState();
        installButton();
        if (state.outlineAccepted && state.npcsAccepted) {
            void ensureReferenceWorldBookLoaded()
                .then(() => updateContinuityPrompt())
                .catch(error => console.warn(`[${EXTENSION_ID}] failed to preload linked world books`, error));
        }
    } catch (error) {
        console.error(`[${EXTENSION_ID}] failed to mount`, error);
        return;
    }

    initialized = true;
    installSlashCommand();
    try {
        installEvents();
    } catch (error) {
        console.warn(`[${EXTENSION_ID}] event installation skipped`, error);
    }
    try {
        updateContinuityPrompt();
    } catch (error) {
        console.warn(`[${EXTENSION_ID}] continuity prompt installation skipped`, error);
    }
}

// Publish the bridge immediately. Character-card scripts can run before the
// dynamically loaded extension has finished importing its dependencies.
window.storyOutlineStudio = {
    open: async () => {
        await init();
        if (!initialized) throw dependencyError || new Error('剧情大纲工作台初始化失败，请查看酒馆控制台。');
        refreshContext();
        const nextKey = contextCacheKey(ctx);
        if (activeChatKey !== nextKey) {
            activeChatKey = nextKey;
            generationEpoch += 1;
            state = getState();
        }
        openPanel('config', false);
    },
    getState: () => state ? clone(state) : null,
    continue: async () => {
        await init();
        if (!initialized) throw dependencyError || new Error('剧情大纲工作台初始化失败，请查看酒馆控制台。');
        refreshContext();
        const nextKey = contextCacheKey(ctx);
        if (activeChatKey !== nextKey) {
            activeChatKey = nextKey;
            generationEpoch += 1;
            state = getState();
        }
        return continueStory();
    },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void init(), { once: true }); else void init();
