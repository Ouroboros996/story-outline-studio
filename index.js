const EXTENSION_ID = 'story-outline-studio';
const METADATA_KEY = 'storyOutlineStudio';
const PROMPT_KEY = 'story-outline-studio-continuity';
const VERSION = 10;

// Load core modules after the extension script itself has been evaluated. This
// avoids the script.js <-> st-context.js cycle preventing the public API from
// being registered during startup.
let getContext;
let createWorldInfoEntry;
let loadWorldInfo;
let saveWorldInfo;
let power_user;
let POPUP_TYPE;
let SlashCommandParser;
let SlashCommand;
let dependenciesReady = false;
let dependencyError = null;

const dependencyPromise = new Promise(resolve => setTimeout(resolve, 0)).then(() => Promise.all([
    import('../../../st-context.js'),
    import('../../../world-info.js'),
    import('../../../power-user.js'),
    import('../../../popup.js'),
    import('../../../slash-commands/SlashCommandParser.js'),
    import('../../../slash-commands/SlashCommand.js'),
])).then(([contextModule, worldInfoModule, powerUserModule, popupModule, parserModule, commandModule]) => {
    getContext = contextModule.getContext;
    ({ createWorldInfoEntry, loadWorldInfo, saveWorldInfo } = worldInfoModule);
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
    '古代', '现代', '都市', '校园', '职场', '民国', '高干', '维多利亚时代', '大正时代', '江户时代', '中世纪', '大海盗时代',
    '武侠', '仙侠修真', '西幻', '东方玄幻', '异世界', '科幻未来', '星际', '赛博朋克', '末世', '丧尸',
    '无限流', '快穿', '系统', '重生', '穿书', '古穿今', '今穿古', 'ABO', '兽人', '虫族', '克苏鲁',
    '灵异恐怖', '种田', '宅斗', '宫斗', '政斗', '随身空间', '娱乐圈', '豪门世家', '悬疑推理', '刑侦',
    '电竞', '网游', '灵气复苏', '末日求生', '年代文', '女尊', '男尊', '真假千金', '替嫁', '架空历史',
    '神话传说', '蒸汽朋克', '机甲', '星球殖民', '时间循环', '平行世界', '规则怪谈', '经营建设',
];

const RELATIONSHIPS = [
    '青梅竹马', '天降', '同事', '同学', '室友', '上下级', '前辈与后辈', '学长与学弟', '学长与学妹',
    '学姐与学弟', '学姐与学妹', '学霸与学渣', '欢喜冤家', '死对头', '情敌', '前任', '破镜重圆',
    '强制爱', '囚禁', '黑化', '监禁者与被监禁者', '控制与反控制',
    '暗卫与主人', '君臣', '师尊与徒弟', '师兄弟', '师兄妹', '师姐弟', '师姐妹', '道士与妖怪',
    '魔尊与仙尊', '正道与邪道', '修士与凡人', '宗主与弟子', '王与臣', '公主与骑士', '贵族与平民',
    '契约恶魔与召唤者', '契约者与被契约者', '人外', '饲养者与被饲养生物', '研究人员与被研究生物',
    '炉鼎与采补对象', '猎人与猎物', '医生与患者', '心理咨询师与来访者', '警察与嫌疑人', '侦探与委托人',
    '老板与金丝雀', '包养', '小三', '替身', '白月光', '兄弟', '兄妹', '姐弟', '姐妹', '父子（真）',
    '父子（伪）', '父女（真）', '父女（伪）', '母子（真）', '母子（伪）', '母女（真）', '母女（伪）',
    '养成', '主仆', '恋人', '协议婚姻', '先婚后爱', '联姻', '搭档', '战友', '室友', '网友',
    '玩家与NPC', '宿敌', '共犯', '债主与欠债人', '师徒反转', '神明与信徒', '信徒与异端', '人类与AI',
];

const TROPES = [
    '先婚后爱', '破镜重圆', '追妻火葬场', '追夫火葬场', '情敌变情人', '暗恋成真', '双向暗恋', '双向救赎',
    '强制爱', '囚禁', '黑化', '替身', '相爱相杀', '养成', '双强对抗', '金丝雀', 'NPC有白月光',
    'user有白月光', 'user是万人嫌', 'user是万人迷', 'user是劣质Alpha', 'user是劣质Omega', 'user是Beta',
    'user是顶级Alpha', 'user是顶级Omega', 'user信息素与NPC100%匹配', 'user信息素与NPC匹配度极低',
    '掉马', '马甲', '身份互换', '真假身份', '替嫁', '带球跑', '先虐后甜', '追妻修罗场', '火葬场文学',
    '白月光回国', '误会梗', '强取豪夺', '久别重逢', '一见钟情', '日久生情', '见色起意', '蓄谋已久',
    '欢喜冤家', '宿命感', '天作之合', '势均力敌', '年下', '年上', '忠犬', '疯批', '清冷', '病娇',
    '傲娇', '扮猪吃虎', '扮弱', '扮演任务', '任务世界', '系统任务', '升级打怪', '打脸逆袭', '复仇虐渣',
    '经营建设', '种田日常', '权谋斗争', '宫斗宅斗', '悬疑解谜', '无限副本', '规则怪谈', '生存挑战',
    '末日同行', '公路求生', '群像', '多线叙事', '慢热', '高甜', '玻璃渣里找糖', '开放式结局',
];

const LENGTHS = {
    short: { label: '短篇', max: 400, minTurns: 0 },
    medium: { label: '中篇', max: 700, minTurns: 20 },
    long: { label: '长篇', max: 1000, minTurns: 50 },
};

let ctx = null;
let state = null;
let activeStage = 'config';
let panel = null;
let generating = false;
let buttonRetryTimer = null;
let buttonRetryCount = 0;

function refreshContext() {
    if (!dependenciesReady || typeof getContext !== 'function') {
        throw dependencyError || new Error('酒馆核心模块仍在加载，请稍后重试。');
    }
    ctx = getContext();
    return ctx;
}

const clone = value => JSON.parse(JSON.stringify(value));
const asArray = value => Array.isArray(value) ? value.filter(Boolean).map(String) : [];
const asList = value => Array.isArray(value)
    ? value.filter(Boolean).map(item => typeof item === 'object' ? text(item.name ?? item.label ?? item.value ?? item.text ?? item.content ?? item.quote ?? item.alias ?? item.key ?? JSON.stringify(item)) : String(item))
    : text(value).split(/[\n,，、]/).map(item => item.trim()).filter(Boolean);
const unique = values => [...new Set(asArray(values))];
const text = value => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean).join('\n').trim();
    if (typeof value === 'object') {
        const nested = value.text ?? value.content ?? value.value ?? value.name ?? value.label;
        if (nested !== undefined) return text(nested);
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
    return npc;
}

function ageNumber(value) {
    const match = text(value).match(/(?:^|\D)(\d{1,3})(?:\s*岁|\s*years?|\s*yo)?/i);
    return match ? Number(match[1]) : null;
}

function validateAdultNpc(npc) {
    const age = ageNumber(npc.age);
    if (age !== null) return age >= 18;
    return /成年|成人|18\s*以上|十八岁以上|二十|三十|四十|五十|六十|七十|八十|九十/.test(text(npc.age));
}

function validateAdultText(value) {
    const age = ageNumber(value);
    if (age !== null) return age >= 18;
    return !/(?:未成年|少年|少女|儿童|孩童|幼年|十[七六五四三二一]岁|\b1[0-7]\s*岁)/i.test(text(value));
}

function validateNpc(npc) {
    const missing = ['name', 'age', 'appearance', 'personality', 'identity', 'relationship'].filter(field => !text(npc[field]));
    if (missing.length) return `NPC「${npc.name || '未命名'}」缺少：${missing.join('、')}`;
    if (!validateAdultNpc(npc)) return `NPC「${npc.name}」的年龄不是明确的成年人年龄，请修改为 18 岁以上。`;
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
        },
        userPersona: '',
        userPersonaData: {},
        userPersonaAccepted: false,
        outline: '',
        outlineData: {},
        outlineVersion: 0,
        outlineAccepted: false,
        outlineRevisions: [],
        npcs: [],
        npcsAccepted: false,
        importedCharacterReferences: [],
        importedWorldBooks: [],
        currentTurn: 0,
        userTurnCount: 0,
        completedStorySnapshot: '',
        completedStoryMessages: 0,
        worldBookName: '',
        lastGeneratedAt: 0,
        lastGeneration: {
            kind: '',
            rawPreview: '',
            repairedPreview: '',
            error: '',
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
    next.userPersonaData = next.userPersonaData && typeof next.userPersonaData === 'object' ? next.userPersonaData : {};
    next.outlineData = next.outlineData && typeof next.outlineData === 'object' ? next.outlineData : {};
    if (!Object.values(next.userPersonaData).some(Boolean) && next.userPersona) {
        next.userPersonaData = parseKeyValueBlock(next.userPersona);
    }
    if (!Object.values(next.outlineData).some(value => Array.isArray(value) ? value.length : value) && next.outline) {
        next.outlineData = normalizeOutlineData({ outline: next.outline }, next.outline);
    }
    next.outlineRevisions = Array.isArray(next.outlineRevisions) ? next.outlineRevisions : [];
    next.lastGeneration = next.lastGeneration && typeof next.lastGeneration === 'object'
        ? {
            kind: text(next.lastGeneration.kind),
            rawPreview: limitPromptText(next.lastGeneration.rawPreview, 1200),
            repairedPreview: limitPromptText(next.lastGeneration.repairedPreview, 1200),
            error: limitPromptText(next.lastGeneration.error, 600),
            at: Number(next.lastGeneration.at) || 0,
        }
        : defaultState().lastGeneration;
    next.npcs = Array.isArray(next.npcs) ? next.npcs.map(normalizeNpc) : [];
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
        ['opening', '开端', 0.15, false],
        ['development', '发展', 0.25, false],
        ['turningPoint', '转折', 0.20, false],
        ['climax', '高潮', 0.20, false],
        ['ending', '结局', 0.20, true],
    ];
    const fixed = labels.reduce((sum, [, label]) => sum + label.length + 2, 0) + labels.length - 1;
    const available = Math.max(80, limit - fixed);
    const sections = labels.map(([key, label, weight, preserveEnd]) => ({
        key,
        label,
        preserveEnd,
        value: text(source[key] ?? source[label]),
        budget: Math.max(18, Math.floor(available * weight)),
    }));

    let result = sections.map(section => `${section.label}：${trimText(section.value || '（待补充）', section.budget, section.preserveEnd)}`).join('\n');
    const extras = [
        ['主要 NPC 功能', asList(source.npcFunctions).slice(0, 8).join('；')],
        ['NSFW 节点', asList(source.nsfwNodes).slice(0, 8).join('；')],
        ['硬性规则', asList(source.hardRules).slice(0, 8).join('；')],
    ].filter(([, value]) => value);
    for (const [label, value] of extras) {
        const remaining = limit - result.length - 1;
        if (remaining < label.length + 8) break;
        result += `\n${label}：${trimText(value, Math.max(1, remaining - label.length - 2), false)}`;
    }
    // Never use a blind final slice: it can cut the ending label or its only
    // sentence when optional metadata was appended above.
    if (result.length <= limit) return result;
    const core = sections.map(section => `${section.label}：${trimText(section.value || '（待补充）', section.budget, section.preserveEnd)}`).join('\n');
    return core.length <= limit ? core : `${core.slice(0, Math.max(0, limit - 1))}…`;
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
    for (const line of text(value).split(/\r?\n/)) {
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
    return candidates.map(block => {
        const cleaned = block
            .replace(/^(?:#{1,6}\s*)?(?:主要\s*)?(?:NPC|角色|人物)\s*(?:[#：:]?\s*\d+|[一二三四五六七八九十]+)?\s*[：:]?\s*/i, '')
            .replace(/^[-=]{3,}\s*$/gm, '')
            .trim();
        return parseKeyValueBlock(cleaned);
    }).filter(fields => fields.name || fields.appearance || fields['外貌'] || fields.identity || fields['身份背景']);
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
    const containers = extractTaggedBlocks(raw, 'npcs');
    const blocks = (containers.length ? containers.flatMap(container => extractTaggedBlocks(container, 'npc')) : extractTaggedBlocks(raw, 'npc'));
    return blocks.length ? blocks.map(block => extractJson(block) || parseKeyValueBlock(block)) : [];
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

function normalizeOutlineData(value, raw = '') {
    const source = value && typeof value === 'object' ? value : {};
    const legacy = stripReasoningBlocks(text(source.outline ?? source['大纲'] ?? source['剧情大纲'] ?? source.content ?? raw))
        .replace(/^\s*\[\s*(开端|发展|转折|高潮|结局)\s*\]\s*$/gim, '$1：')
        .replace(/^\s*(?:#{1,6}\s*)?(开端|发展|转折|高潮|结局)\s*$/gim, '$1：');
    const sectionFromLegacy = (label, nextLabels) => {
        const pattern = new RegExp(`${label}[：:]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextLabels.join('|')})[：:]|$)`, 'i');
        return legacy.match(pattern)?.[1]?.trim() || '';
    };
    const tagged = key => extractTaggedBlocks(raw, key)[0] || '';
    const get = (key, label, ...aliases) => {
        const direct = source[key] ?? aliases.map(alias => source[alias]).find(Boolean) ?? tagged(key);
        return text(direct || sectionFromLegacy(label, ['开端', '发展', '转折', '高潮', '结局'].filter(item => item !== label)));
    };
    return {
        opening: get('opening', '开端', '开场', 'opening', '开端'),
        development: get('development', '发展', 'development', '发展'),
        turningPoint: get('turningPoint', '转折', 'turning_point', 'turning', '转折'),
        climax: get('climax', '高潮', 'climax', '高潮'),
        ending: get('ending', '结局', 'end', 'ending', '结局'),
        npcFunctions: asList(source.npcFunctions ?? source['主要 NPC 功能'] ?? source['主要NPC功能'] ?? tagged('npc_functions')),
        nsfwNodes: asList(source.nsfwNodes ?? source['NSFW 节点'] ?? source['NSFW节点'] ?? tagged('nsfw_nodes')),
        hardRules: asList(source.hardRules ?? source['硬性规则'] ?? tagged('hard_rules')),
    };
}

function mergeOutlineData(previous, next) {
    const oldOutline = normalizeOutlineData(previous);
    const newOutline = normalizeOutlineData(next);
    const merged = {};
    for (const key of ['opening', 'development', 'turningPoint', 'climax', 'ending']) {
        merged[key] = newOutline[key] || oldOutline[key];
    }
    for (const key of ['npcFunctions', 'nsfwNodes', 'hardRules']) {
        merged[key] = newOutline[key].length ? newOutline[key] : oldOutline[key];
    }
    return merged;
}

function validatePersona(persona) {
    const normalized = normalizePersonaData(persona);
    const missing = ['name', 'gender', 'age', 'appearance', 'personality', 'identity', 'past', 'habits', 'boundaries']
        .filter(field => !normalized[field]);
    if (missing.length) return `user 人设缺少：${missing.join('、')}`;
    if (!validateAdultText(normalized.age)) return 'user 人设年龄不是明确的成年人年龄';
    return '';
}

function selectedChips(category, values) {
    return values.map(value => `<button type="button" class="sos-chip ${category} ${state.config[category]?.includes(value) ? 'selected' : ''}" data-category="${category}" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join('');
}

function customValues(category) {
    const value = category === 'backgrounds' ? state.config.customBackground : category === 'relationships' ? state.config.customRelationships : state.config.customTropes;
    return text(value).split(/[\n,，、]/).map(item => item.trim()).filter(Boolean);
}

function configMarkup() {
    const c = state.config;
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
            <div class="sos-field"><label>故事长度</label><div class="sos-segment" data-setting="length">${Object.entries(LENGTHS).map(([key, item]) => `<button type="button" class="${c.length === key ? 'selected' : ''}" data-value="${key}">${item.label}</button>`).join('')}</div><small>中篇至少保留 20 个 user 交互楼层，长篇至少保留 50 个。</small></div>
            <div class="sos-field"><label>特别想看的情节 / 禁区 / 补充要求</label><textarea id="sos-detail" placeholder="例如：必须有雨夜重逢、不要误会拖太久、某个 NPC 必须先道歉...">${escapeHtml(c.detail)}</textarea></div>
        </section>
        <div class="sos-subsection"><strong>已导入参考角色卡</strong><div class="sos-import-list">${state.importedCharacterReferences.length ? state.importedCharacterReferences.map((reference, index) => `<span>${escapeHtml(reference.name)} <small>（${escapeHtml(reference.source)}）</small> <button type="button" class="sos-remove-character-import" data-index="${index}" title="移除">×</button></span>`).join('') : '<em>暂无。可导入其他角色卡，保留其角色内核、身份逻辑和说话方式，用于平行世界创作。</em>'}</div></div>
        <div class="sos-subsection"><strong>已导入参考世界书</strong><div class="sos-import-list">${state.importedWorldBooks.length ? state.importedWorldBooks.map((book, index) => `<span>${escapeHtml(book.name)} <button type="button" class="sos-remove-worldbook-import" data-index="${index}" title="移除">×</button></span>`).join('') : '<em>暂无。可以导入其他角色卡的世界书，用作平行世界参考。</em>'}</div><label class="sos-file-button"><i class="fa-solid fa-file-import"></i> 导入 JSON 世界书 / 角色卡<input id="sos-worldbook-file" type="file" accept=".json,application/json" hidden></label></div>
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
    return `<details class="sos-diagnostics" ${snapshot.error ? 'open' : ''}><summary><span>最近一次响应摘要</span><small>${escapeHtml(labels[snapshot.kind] || snapshot.kind || '暂无')} · ${escapeHtml(generatedAt)}</small></summary><div class="sos-diagnostics-body">${renderBlock('错误', snapshot.error, 'error')}${renderBlock('上游原始响应', snapshot.rawPreview)}${renderBlock('整理请求响应', snapshot.repairedPreview)}</div></details>`;
}

function personaMarkup() {
    const existing = text(power_user.persona_description);
    return `<div class="sos-section-intro"><span class="sos-kicker">02 / USER PERSONA</span><h2>确认 user 的人设</h2><p>${existing ? '检测到酒馆已有 user 人设。你可以直接采用，也可以在这里为本故事建立独立版本。' : '当前没有检测到酒馆 user 人设。先生成一份成年人角色设定，后续大纲和剧情都会使用它。'}</p></div>${generationDiagnosticsMarkup()}
        <div class="sos-persona-box"><textarea id="sos-persona" placeholder="用户人设会显示在这里">${escapeHtml(state.userPersona || existing)}</textarea><div class="sos-persona-meta">${state.userPersonaAccepted ? '<span class="sos-ok">已接受</span>' : '<span>尚未接受</span>'}</div></div>
        <div class="sos-revise"><label>人设修改意见</label><textarea id="sos-persona-feedback" placeholder="例如：保留姓名和职业，把性格改得更寡言，补充右手旧伤；未提到的字段保持不变"></textarea></div>
        <div class="sos-actions"><button type="button" class="sos-secondary" data-action="reroll-persona"><i class="fa-solid fa-dice"></i> 直接重 roll</button><button type="button" class="sos-secondary" data-action="revise-persona"><i class="fa-solid fa-pen"></i> 按意见修改</button><button type="button" class="sos-primary" data-action="accept-persona"><i class="fa-solid fa-check"></i> 接受这份人设并继续</button></div>`;
}

function outlineMarkup() {
    const hasOutline = text(state.outline);
    const length = LENGTHS[state.config.length] || LENGTHS.short;
    return `<div class="sos-section-intro"><span class="sos-kicker">03 / OUTLINE</span><h2>审核剧情大纲</h2><p>目标长度：${length.label}，不超过 ${length.max} 字。接受后才会用于生成 NPC 和剧情。重 roll 或修改会生成新版本，已完成剧情不会回写。</p></div>${generationDiagnosticsMarkup()}
        <div class="sos-outline-box ${hasOutline ? '' : 'empty'}">${hasOutline ? `<div class="sos-version">版本 ${state.outlineVersion} · ${state.outline.length} 字</div><div id="sos-outline-text">${escapeHtml(state.outline)}</div>` : '<i>还没有大纲。回到配置页生成一份。</i>'}</div>
        <div class="sos-revise"><label>修改意见</label><textarea id="sos-outline-feedback" placeholder="例如：把第三幕改成 user 主动救 NPC，保留已完成部分，只调整后续走向"></textarea></div>
        <div class="sos-actions"><button type="button" class="sos-secondary" data-action="reroll-outline"><i class="fa-solid fa-dice"></i> 直接重 roll</button><button type="button" class="sos-secondary" data-action="revise-outline"><i class="fa-solid fa-pen"></i> 按意见重写</button><button type="button" class="sos-primary" data-action="accept-outline" ${hasOutline ? '' : 'disabled'}><i class="fa-solid fa-check"></i> 接受大纲并生成 NPC</button></div>`;
}

function npcField(label, value, index, field, multiline = false) {
    const tag = multiline ? 'textarea' : 'input';
    const content = multiline ? escapeHtml(value) : '';
    const valueAttribute = multiline ? '' : ` value="${escapeHtml(value)}"`;
    return `<label class="sos-npc-field">${label}<${tag} data-npc-index="${index}" data-npc-field="${field}"${valueAttribute}>${content}</${tag}></label>`;
}

function npcMarkup() {
    const cards = state.npcs.map((npc, index) => `<article class="sos-npc-card"><header><input data-npc-index="${index}" data-npc-field="name" value="${escapeHtml(npc.name)}"><button type="button" class="sos-icon-button" data-action="delete-npc" data-index="${index}" title="删除 NPC"><i class="fa-solid fa-trash"></i></button></header><div class="sos-npc-grid">${npcField('称呼 / 关键词', asArray(npc.aliases).join('、'), index, 'aliases', true)}${npcField('性别', npc.gender, index, 'gender')}${npcField('年龄（必须成年）', npc.age, index, 'age')}${npcField('身高', npc.height, index, 'height')}${npcField('外貌与辨识度特征', npc.appearance, index, 'appearance', true)}${npcField('性格', npc.personality, index, 'personality', true)}${npcField('身份背景', npc.identity, index, 'identity', true)}${npcField('过去经历', npc.past, index, 'past', true)}${npcField('与 user 的关系', npc.relationship, index, 'relationship', true)}${npcField('对 user 的态度', npc.attitude, index, 'attitude', true)}${npcField('典型语录', asArray(npc.quotes).join('\n'), index, 'quotes', true)}${npcField('NSFW 偏好 / 体位 / 语言风格', npc.nsfw, index, 'nsfw', true)}${npcField('成年身体信息（男性可填写）', npc.body, index, 'body', true)}</div></article>`).join('');
    return `<div class="sos-section-intro"><span class="sos-kicker">04 / NPC CAST</span><h2>审核主要 NPC</h2><p>每名 NPC 都必须是成年人。请检查外貌辨识度、经历与性格的因果关系，以及对 user 的态度。接受后会写入当前角色绑定的世界书。</p></div>${generationDiagnosticsMarkup()}<div class="sos-npc-list">${cards || '<div class="sos-empty">尚未生成 NPC。请先接受大纲。</div>'}</div><div class="sos-revise"><label>NPC 修改意见</label><textarea id="sos-npc-feedback" placeholder="例如：只修改第二名 NPC 的态度和过去经历，保留其他 NPC 及其余字段；补充一个右耳耳钉的辨识特征"></textarea></div><div class="sos-actions"><button type="button" class="sos-secondary" data-action="reroll-npc"><i class="fa-solid fa-dice"></i> 直接重 roll</button><button type="button" class="sos-secondary" data-action="revise-npc" ${cards ? '' : 'disabled'}><i class="fa-solid fa-pen"></i> 按意见修改</button><button type="button" class="sos-primary" data-action="accept-npc" ${cards ? '' : 'disabled'}><i class="fa-solid fa-book"></i> 接受并写入世界书</button></div>`;
}

function storyMarkup() {
    const target = LENGTHS[state.config.length] || LENGTHS.short;
    const active = state.outlineAccepted && state.npcsAccepted;
    return `<div class="sos-section-intro"><span class="sos-kicker">05 / STORY ENGINE</span><h2>按大纲推进剧情</h2><p>当前大纲版本 ${state.outlineVersion}，已推进 ${state.currentTurn} 楼，user 已输入 ${state.userTurnCount} 楼。${target.minTurns ? `本篇在达到最低 user 交互楼层前不会进入最终收束（最低 ${target.minTurns} 楼）。` : '短篇不设置最低楼层。'}</p></div><div class="sos-story-status"><span class="${active ? 'sos-ok' : 'sos-warn'}">${active ? '大纲与 NPC 已锁定' : '请先接受大纲和 NPC'}</span><span>已完成剧情快照：${state.completedStorySnapshot ? state.completedStorySnapshot.length + ' 字' : '暂无'}</span></div><div class="sos-revise"><label>中途修改大纲</label><textarea id="sos-mid-feedback" placeholder="已完成内容不会改变。写下你希望后续剧情怎样调整，然后重新审核大纲。"></textarea></div><div class="sos-actions"><button type="button" class="sos-primary" data-action="continue-story" ${active ? '' : 'disabled'}><i class="fa-solid fa-forward-step"></i> 继续剧情</button><button type="button" class="sos-secondary" data-action="revise-from-story"><i class="fa-solid fa-route"></i> 修改后续大纲</button><button type="button" class="sos-secondary" data-action="show-outline"><i class="fa-solid fa-scroll"></i> 查看当前大纲</button></div>`;
}

function dashboardMarkup() {
    const stages = [
        ['config', '配置', 'fa-sliders'], ['persona', 'user 人设', 'fa-user-pen'], ['outline', '剧情大纲', 'fa-scroll'], ['npc', 'NPC', 'fa-users'], ['story', '推进剧情', 'fa-forward-step'],
    ];
    const content = activeStage === 'config' ? configMarkup() : activeStage === 'persona' ? personaMarkup() : activeStage === 'outline' ? outlineMarkup() : activeStage === 'npc' ? npcMarkup() : storyMarkup();
    return `<div class="sos-panel"><header class="sos-header"><div><span class="sos-brand">STORY OUTLINE STUDIO</span><h1>剧情大纲工作台</h1></div><div class="sos-header-actions"><button type="button" class="sos-header-button" data-action="reset-project" title="清空本聊天的工作台状态"><i class="fa-solid fa-rotate-left"></i></button><button type="button" class="sos-header-button" data-action="minimize" title="最小化"><i class="fa-solid fa-window-minimize"></i></button><button type="button" class="sos-header-button" data-action="close" title="关闭"><i class="fa-solid fa-xmark"></i></button></div></header><nav class="sos-stage-nav">${stages.map(([key, label, icon]) => `<button type="button" class="${activeStage === key ? 'active' : ''} ${stageComplete(key) ? 'complete' : ''}" data-stage="${key}"><i class="fa-solid ${icon}"></i><span>${label}</span></button>`).join('')}</nav><main class="sos-main">${content}</main><footer class="sos-footer"><span>${state.worldBookName ? `世界书：${escapeHtml(state.worldBookName)}` : '独立工作台 · 当前聊天保存'}</span><span>${ctx.characterId === undefined ? '空白卡 / 独立模式' : '当前角色卡模式'}</span></footer></div><button type="button" class="sos-restore-button" data-action="restore" title="恢复剧情大纲工作台"><i class="fa-solid fa-window-maximize"></i></button>`;
}

function stageComplete(stage) {
    return stage === 'config' ? Boolean(state.config.backgrounds.length || customValues('backgrounds').length) : stage === 'persona' ? state.userPersonaAccepted : stage === 'outline' ? state.outlineAccepted : stage === 'npc' ? state.npcsAccepted : state.currentTurn > 0;
}

function openPanel(stage = activeStage) {
    activeStage = stage;
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'sos-overlay';
        document.body.append(panel);
    }
    panel.innerHTML = dashboardMarkup();
    panel.classList.remove('minimized');
    panel.classList.add('open');
    bindPanelEvents();
}

function closePanel() {
    panel?.classList.remove('open', 'minimized');
}

function readPanelScrollPositions() {
    return {
        document: document.scrollingElement?.scrollTop || window.scrollY || 0,
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
    openPanel(activeStage);
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
        state.config[button.parentElement.dataset.setting] = button.dataset.value;
        saveState();
        rerender();
    }));
    panel.querySelectorAll('[data-npc-field]').forEach(input => input.addEventListener('input', () => {
        const npc = state.npcs[Number(input.dataset.npcIndex)];
        if (!npc) return;
        const value = input.dataset.npcField === 'aliases' || input.dataset.npcField === 'quotes' ? input.value.split(/[\n,，、]/).map(item => item.trim()).filter(Boolean) : input.value;
        npc[input.dataset.npcField] = value;
        state.npcsAccepted = false;
        saveState();
    }));
    panel.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => handleAction(button.dataset.action, button)));
    panel.querySelector('#sos-worldbook-file')?.addEventListener('change', importWorldBook);
    panel.querySelectorAll('.sos-remove-character-import').forEach(button => button.addEventListener('click', () => { state.importedCharacterReferences.splice(Number(button.dataset.index), 1); saveState(); rerender(); }));
    panel.querySelectorAll('.sos-remove-worldbook-import').forEach(button => button.addEventListener('click', () => { state.importedWorldBooks.splice(Number(button.dataset.index), 1); saveState(); rerender(); }));
}

async function handleAction(action, button) {
    if (generating && action !== 'close') return;
    if (action === 'close') return closePanel();
    if (action === 'minimize') {
        panel?.classList.add('minimized');
        return;
    }
    if (action === 'restore') {
        panel?.classList.remove('minimized');
        return;
    }
    if (action === 'reset-project') {
        const ok = await ctx.callGenericPopup('清空当前聊天的剧情工作台状态？已写入世界书的 NPC 不会被删除。', POPUP_TYPE.CONFIRM);
        if (ok) { state = defaultState(); saveState(); activeStage = 'config'; rerender(); }
        return;
    }
    setCustomValues();
    if (action === 'generate-outline') return startOutline();
    if (action === 'generate-persona') return generatePersona();
    if (action === 'reroll-persona') return generatePersona();
    if (action === 'revise-persona') {
        const feedback = text(document.getElementById('sos-persona-feedback')?.value);
        if (!feedback) return toastr.warning('请先填写人设修改意见。');
        return generatePersona(feedback, 'revise');
    }
    if (action === 'accept-persona') return acceptPersona();
    if (action === 'reroll-outline') return generateOutline();
    if (action === 'revise-outline') return reviseOutline();
    if (action === 'accept-outline') return acceptOutline();
    if (action === 'reroll-npc') return generateNpcs();
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
    return `${source.slice(0, headLength)}\n[…内容已截断…]\n${tailLength ? source.slice(-tailLength) : ''}`.trim();
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
    return `<story_outline_studio>
本扩展是酒馆剧情大纲工作台。当前角色卡：${character.name}
角色卡核心上下文：${JSON.stringify(currentCharacterPromptContext(character.fields))}
外部导入角色卡参考（低优先级）：
${referenceCharactersText() || '暂无'}
${referenceBooksText()}
外部导入角色卡只能作为角色内核、说话方式和世界设定参考。当前聊天事实、当前工作台配置、user 已接受的人设、已接受大纲和已接受 NPC 设定优先。不得机械复制参考角色卡的剧情。参考角色必须保持原有核心性格、身份逻辑和说话方式，不得 OOC。
配置：${JSON.stringify(configPayload())}
user人设：${state.userPersona || power_user.persona_description || '尚未确定'}
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
        if (Array.isArray(parsed)) return { npcs: parsed.map(normalizeNpc) };
        if (Array.isArray(parsed.npcs)) return { ...parsed, npcs: parsed.npcs.map(normalizeNpc) };
        if (typeof parsed.npcs === 'string') {
            const listed = parsePlainNpcBlocks(parsed.npcs);
            const fields = parseKeyValueBlock(parsed.npcs);
            if (listed.length) return { ...parsed, npcs: listed.map(normalizeNpc) };
            if (fields.name || fields.appearance || fields['外貌']) return { ...parsed, npcs: [normalizeNpc(fields)] };
        }
        if (parsed.npcs && typeof parsed.npcs === 'object' && !Array.isArray(parsed.npcs)) {
            const listed = Object.entries(parsed.npcs)
                .map(([name, value]) => value && typeof value === 'object' ? ({ name, ...value }) : ({ name, description: value }))
                .filter(item => item.name || item.appearance || item['外貌']);
            if (listed.length) return { ...parsed, npcs: listed.map(normalizeNpc) };
        }
        for (const key of ['characters', 'characterList', 'character_list', 'items', 'results', 'npcList', 'npc_list', 'mainNpcs', 'main_npcs', '主要NPC', '主要 NPC', '主要角色', '角色列表', '人物列表']) {
            if (Array.isArray(parsed[key])) return { ...parsed, npcs: parsed[key].map(normalizeNpc) };
            if (parsed[key] && typeof parsed[key] === 'object') {
                const listed = Object.entries(parsed[key])
                    .map(([name, value]) => value && typeof value === 'object' ? ({ name, ...value }) : ({ name, description: value }))
                    .filter(item => item.name || item.appearance || item['外貌']);
                if (listed.length) return { ...parsed, npcs: listed.map(normalizeNpc) };
            }
        }
        for (const key of ['npc', 'character']) {
            if (Array.isArray(parsed[key])) return { ...parsed, npcs: parsed[key].map(normalizeNpc) };
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
    if (properties.npcs) return Array.isArray(parsed.npcs) && parsed.npcs.length > 0;
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
    if (outlineBlock) return normalizeGeneratedResult({ outline: outlineBlock }, schema);

    const parsed = extractJson(source);
    if (parsed && !(typeof parsed === 'object' && !Object.keys(parsed).length)) return normalizeGeneratedResult(parsed, schema);

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

function generatedErrorMessage(error) {
    const message = text(error?.message || error?.error?.message || error?.detail?.message || error?.response || error);
    if (/unexpected token\s*'?/i.test(message)) return '酒馆上游返回了无法解析的内容，通常是 API 代理返回的 HTML 错误页。请检查代理地址和 API 状态。';
    return message;
}

function wrapGenerationError(error) {
    const message = generatedErrorMessage(error);
    if (/client network socket disconnected before secure tls connection was established|secure tls connection was established|tls handshake|socket disconnected|econnreset|enotfound|etimedout|network error|failed to fetch|request to .* failed/i.test(message)) {
        return new Error(`连接上游 API 失败：${message}。这是云酒馆服务器与中转站之间的网络/TLS 连接问题，不是大纲格式错误。请检查 API 地址和路径、中转站状态、云酒馆服务器能否访问该域名，以及是否需要代理或更换节点。`);
    }
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

async function generateJson(prompt, schema, responseLength = 1200, { allowText = false, patchTag = '' } = {}) {
    // Read the assistant body back from SillyTavern and parse it locally. The
    // core structured-output path may turn a valid tag/plain-text response
    // into an empty object before an extension gets to inspect it.
    const fullTag = schema?.properties?.npcs ? '<npcs><npc>每个字段一行：内容</npc></npcs>' : schema?.properties?.name && !schema?.properties?.opening ? '<persona>每个字段一行：内容</persona>' : '<outline>开端：...\n发展：...\n转折：...\n高潮：...\n结局：...</outline>';
    const patchProtocol = patchTag
        ? `本次是局部修改，只输出被修改的字段，不要重写未修改内容：<${patchTag}>字段：新内容</${patchTag}>。NPC 修改时使用 <npc_patch name="目标姓名">字段：新内容</npc_patch>。`
        : `请优先使用下面的纯文本标签协议返回完整结果：${fullTag}`;
    const generationSchema = getGenerationSchema(schema, patchTag);
    const schemaInstruction = `\n字段参考（不要输出 schema）：${JSON.stringify(generationSchema)}\n${patchProtocol}不要输出解释、Markdown 或思维链。若你能稳定返回 JSON，也可以返回单个 JSON 对象。`;
    const request = async extraPrompt => {
        const params = {
            quietPrompt: `${prompt}${schemaInstruction}${extraPrompt || ''}\n所有人物必须明确为成年人。`,
            responseLength,
            skipWIAN: false,
        };
        // Keep the primary path compatible with SillyTavern 1.17 and simple
        // OpenAI-compatible gateways. The reference plugins use ordinary
        // text generation and parse the result locally; JSON schema output is
        // optional in newer cores but is rejected by many proxies.
        return ctx.generateQuietPrompt(params);
    };
    let result;
    const kind = generationKind(schema);
    let repairError = '';
    try {
        result = await request();
    } catch (error) {
        const wrapped = wrapGenerationError(error);
        saveGenerationSnapshot(kind, { error: wrapped.message });
        throw wrapped;
    }
    const raw = extractAssistantContent(result).trim() || extractGeneratedText(result).trim();
    const parsed = parseGeneratedPayload(raw, allowText, schema);
    if (parsed && hasGeneratedShape(parsed, schema)) {
        saveGenerationSnapshot(kind, { raw });
        return parsed;
    }

    // One short repair pass handles models that prepend a refusal, code fence,
    // or an incomplete tag. It still uses the same normal text endpoint and
    // therefore preserves compatibility with the selected preset/API.
    if (raw) {
        try {
            const repaired = await request(`\n上一次返回未被识别。请只把下面的内容整理成指定标签协议并重新输出，不要解释：\n${limitPromptText(raw, 12000)}`);
            const repairedRaw = extractAssistantContent(repaired).trim() || extractGeneratedText(repaired).trim();
            const repairedParsed = parseGeneratedPayload(repairedRaw, allowText, schema);
            if (repairedParsed && hasGeneratedShape(repairedParsed, schema)) {
                saveGenerationSnapshot(kind, { raw, repaired: repairedRaw });
                return repairedParsed;
            }
            saveGenerationSnapshot(kind, { raw, repaired: repairedRaw, error: '整理后的响应仍缺少必要字段' });
        } catch (error) {
            const wrappedRepairError = wrapGenerationError(error);
            repairError = `整理请求失败：${wrappedRepairError.message}`;
            saveGenerationSnapshot(kind, { raw, error: repairError });
            console.warn(`[${EXTENSION_ID}] response repair request failed`, error);
        }
    } else {
        saveGenerationSnapshot(kind, { error: '上游返回空内容' });
    }

    const preview = limitPromptText(raw, 240);
    console.warn(`[${EXTENSION_ID}] structured response could not be parsed`, { type: typeof result, preview });
    if (!raw) throw new Error('AI 请求已完成，但上游返回了空内容。请重试，并检查 API 的最大输出长度。');
    throw new Error(`AI 返回内容无法识别为 JSON、标签或字段文本，请重试。当前草稿已保留。响应摘要：${preview}${repairError ? `；${repairError}` : ''}`);
}

async function withGenerating(task) {
    if (generating) return;
    generating = true;
    panel?.classList.add('busy');
    try {
        await task();
    } catch (error) {
        console.error(`[${EXTENSION_ID}]`, error);
        // generateQuietPrompt may already have shown the upstream API error.
        // Do not add a second toast for the same failed request.
        if (!error?.sosHandled) toastr.error(error.message || '生成失败');
    } finally {
        generating = false;
        panel?.classList.remove('busy');
    }
}

async function startOutline() {
    if (!state.userPersonaAccepted) {
        if (text(state.userPersona)) {
            activeStage = 'persona';
            rerender();
            toastr.warning('请先接受当前 user 人设，或重新生成后再继续。');
            return;
        }
        if (text(power_user.persona_description)) {
            state.userPersona = text(power_user.persona_description);
            const parsedPersona = parseKeyValueBlock(state.userPersona);
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

async function generatePersona(feedback = '', mode = 'new') {
    await withGenerating(async () => {
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
        const previous = previousPersona
            ? `\n当前 user 人设草稿（这是本次重生成的基线；除非特别要求，不要改动已有字段）：${previousPersona}`
            : '';
        const revision = mode === 'revise'
            ? `\n用户修改意见：${feedback}\n这是局部修改，不是重新创作。只修改意见明确点名的字段或内容；未点名的姓名、年龄、外貌、性格、身份、经历、习惯、边界必须逐字保留。输出仍须包含完整字段。`
            : '';
        const prompt = `${basePrompt()}\n请生成 user 的故事人设。必须返回完整字段：name、gender、age、appearance、personality、identity、past、habits、boundaries。年龄必须 >= 18，设定要和配置的背景、性别方向、剧情标签兼容。${previous}${revision}\n保留基线中未被明确要求修改的内容；不要返回空字段。若无法返回 JSON，请输出 <persona> 标签，标签内每行一个“字段：内容”。`;
        const result = await generateJson(prompt, { type: 'object', properties: { name: { type: 'string' }, gender: { type: 'string' }, age: { type: 'string' }, appearance: { type: 'string' }, personality: { type: 'string' }, identity: { type: 'string' }, past: { type: 'string' }, habits: { type: 'string' }, boundaries: { type: 'string' } }, required: ['name', 'gender', 'age', 'appearance', 'personality', 'identity', 'past', 'habits', 'boundaries'] }, 1800, { allowText: true, patchTag: mode === 'revise' ? 'persona_patch' : '' });
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
        const invalid = validatePersona(nextPersona);
        if (invalid) throw new Error(`${invalid}，请重试。`);
        state.userPersonaData = nextPersona;
        state.userPersona = personaToText(nextPersona);
        state.userPersonaAccepted = false;
        saveState();
        activeStage = 'persona';
        rerender();
    });
}

async function revisePersona() {
    const feedback = text(document.getElementById('sos-persona-feedback')?.value);
    if (!feedback) return toastr.warning('请先填写人设修改意见。');
    await generatePersona(feedback, 'revise');
}

async function acceptPersona() {
    const value = text(document.getElementById('sos-persona')?.value);
    if (!value) return toastr.warning('请先填写 user 人设。');
    if (!validateAdultText(value)) return toastr.warning('user 人设必须明确为成年人，不能包含未成年设定。');
    state.userPersona = value;
    const parsedPersona = parseKeyValueBlock(value);
    state.userPersonaData = Object.values(parsedPersona).some(Boolean) ? normalizePersonaData(parsedPersona) : {};
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
            npcFunctions: { type: 'array', items: { type: 'string' } },
            nsfwNodes: { type: 'array', items: { type: 'string' } },
            hardRules: { type: 'array', items: { type: 'string' } },
        },
        required: ['opening', 'development', 'turningPoint', 'climax', 'ending', 'hardRules'],
    };
}

async function generateOutline(feedback = '', mode = 'new') {
    await withGenerating(async () => {
        const length = LENGTHS[state.config.length] || LENGTHS.short;
        const completed = state.completedStorySnapshot ? `\n已完成剧情（只可作为历史，不得改写）：${state.completedStorySnapshot}` : '';
        const nsfwRule = state.config.tone === '纯黄文'
            ? '故事基调为“纯黄文”：NSFW 是主轴，至少规划 3 个有剧情功能的成年角色亲密节点，并写明所属阶段、主动方、关系推进和对应关键词。'
            : '无论甜文、虐文还是甜虐交织，都必须至少安排 1 个成年角色之间、具有剧情功能的 NSFW 节点；甜文用于关系推进，虐文用于冲突或代价，甜虐交织用于转折或和解。若已选强制爱、囚禁、黑化、金丝雀等成人标签，应安排多个节点。';
        const previous = state.outlineData && Object.values(state.outlineData).some(value => Array.isArray(value) ? value.length : value)
            ? `\n当前大纲基线（修改必须基于此版本）：${JSON.stringify(state.outlineData)}\n当前大纲显示文本：${state.outline}`
            : '';
        const revision = mode === 'revise'
            ? `\n用户修改意见：${feedback}\n这是基于当前大纲的局部修订。必须保留未被意见点名的段落、人物事实、关键词落实方式和结局方向；已完成剧情绝不能改写，只调整未完成部分。`
            : '';
        const prompt = `${basePrompt()}\n任务：生成一份${length.label}小说剧情大纲。输出必须包含开端、发展、转折、高潮、结局五段，按这五段分别填写字段，不能把所有内容塞入单一 outline 字段。先完整规划起承转合和明确结局，再控制篇幅；${length.label}最终显示不超过${length.max}字，但不要为了字数省略结局、因果链或必要事件，超出的压缩由工作台本地处理。每段都要简洁但必须有具体事件、因果和结局。严格落实所有已选背景、关系、基调、结局、情节关键词和特别要求，不得自行删掉标签。另列出主要 NPC 功能、NSFW 节点、硬性规则。${nsfwRule}\n所有人物必须明确为成年人，性行为必须发生在成年人之间并符合用户设定。${previous}${revision}${completed}\n若无法返回 JSON，请使用纯文本标签：<outline>内含“开端：...\n发展：...\n转折：...\n高潮：...\n结局：...”</outline>。`;
        const result = await generateJson(prompt, outlineSchema(), state.config.length === 'long' ? 5000 : 3200, { allowText: true, patchTag: mode === 'revise' ? 'outline_patch' : '' });
        const outlineData = mode === 'revise'
            ? mergeOutlineData(
                state.outlineData,
                (() => {
                    const next = normalizeOutlineData(result, result.outline ? '' : text(result));
                    const restricted = restrictOutlineRevision(next, feedback);
                    return Object.keys(restricted).length ? restricted : diffOutlineFields(state.outlineData, next);
                })(),
            )
            : normalizeOutlineData(result, result.outline ? '' : text(result));
        if (!outlineData.opening || !outlineData.development || !outlineData.turningPoint || !outlineData.climax || !outlineData.ending) {
            throw new Error('AI 返回的大纲缺少完整的开端、发展、转折、高潮或结局，请重试。');
        }
        const outline = fitOutlineSections(outlineData, length.max);
        if (!outline) throw new Error('AI 没有返回大纲正文。');
        if (state.outline) {
            state.outlineRevisions.push({ version: state.outlineVersion, outline: state.outline, outlineData: clone(state.outlineData), accepted: state.outlineAccepted, createdAt: Date.now() });
        }
        state.outlineData = outlineData;
        state.outline = outline;
        state.outlineVersion += 1;
        state.outlineAccepted = false;
        state.npcsAccepted = false;
        state.lastGeneratedAt = Date.now();
        saveState();
        activeStage = 'outline';
        rerender();
    });
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
    await generateNpcs();
}

async function generateNpcs(feedback = '', mode = 'new') {
    await withGenerating(async () => {
        if (!state.outlineAccepted) return toastr.warning('请先接受大纲。');
        const previous = state.npcs.length
            ? `\n当前 NPC 草稿（本次重生成的基线；除非用户明确要求，不要改变姓名、身份、核心性格、关系和说话方式）：${JSON.stringify(state.npcs)}`
            : '\n当前没有 NPC 草稿，请根据大纲生成全部主要 NPC。';
        const revision = mode === 'revise'
            ? `\n用户 NPC 修改意见：${feedback}\n这是基于当前 NPC 草稿的局部修改，不是全部重写。只修改意见明确点名的 NPC、字段或内容；未点名的 NPC 以及未点名字段必须保持原值，尤其是姓名、身份、核心性格、关系、说话方式和已确认的成年人年龄。`
            : '';
        const npcCountRule = state.config.relationshipMode === 'NP'
            ? '关系数量为 NP：生成所有承担主要关系线、冲突线或 NSFW 节点的主要 NPC，至少 2 人；不要只返回一个代表角色。'
            : '关系数量为 1V1：生成 1 名主要恋爱 NPC；只有在大纲明确需要且对主线有作用时，才额外生成少量功能 NPC。';
        const prompt = `${basePrompt()}\n已接受的大纲：${state.outline}\n请生成该大纲所需的全部主要 NPC。${npcCountRule}每人必须是明确的成年人，必须返回至少 1 人且每个字段完整。外貌要有至少两条可识别细节，不能都是模板化帅哥美女；性格必须能从身份和过去经历合理推出，不能自相矛盾。NSFW 字段只写成年角色的偏好、体位和语言风格，不改变人物性格。关键词必须覆盖姓名、昵称、去姓名、user 对其特殊称呼。${previous}${revision}\n如果无法返回 JSON，请使用 <npcs><npc>字段：内容</npc></npcs>，不要解释。`;
        const result = await generateJson(prompt, { type: 'object', properties: { npcs: { type: 'array', minItems: 1, items: { type: 'object', properties: { name: { type: 'string' }, aliases: { type: 'array', items: { type: 'string' } }, gender: { type: 'string' }, age: { type: 'string' }, height: { type: 'string' }, appearance: { type: 'string' }, personality: { type: 'string' }, identity: { type: 'string' }, past: { type: 'string' }, relationship: { type: 'string' }, attitude: { type: 'string' }, quotes: { type: 'array', items: { type: 'string' } }, nsfw: { type: 'string' }, body: { type: 'string' } }, required: ['name', 'aliases', 'gender', 'age', 'height', 'appearance', 'personality', 'identity', 'past', 'relationship', 'attitude', 'quotes', 'nsfw', 'body'] } } }, required: ['npcs'] }, state.config.relationshipMode === 'NP' ? 9000 : 6000, { allowText: true, patchTag: mode === 'revise' ? 'npc_patch' : '' });
        const nextNpcs = mode === 'revise'
            ? mergeNpcDrafts(
                state.npcs,
                (() => {
                    const restricted = restrictNpcRevision(result.npcs, feedback, state.npcs);
                    return restricted.length ? restricted : diffNpcFields(state.npcs, result.npcs, feedback);
                })(),
                feedback,
            )
            : Array.isArray(result.npcs) ? result.npcs.map(normalizeNpc) : [];
        if (!nextNpcs.length) throw new Error('AI 没有返回主要 NPC，请重试；当前 NPC 草稿已保留。');
        const invalid = nextNpcs.map(validateNpc).find(Boolean);
        if (invalid) throw new Error(`${invalid} 请重新生成或修改后再接受。`);
        state.npcs = nextNpcs;
        state.npcsAccepted = false;
        saveState();
        activeStage = 'npc';
        rerender();
    });
}

function getWorldBookTarget() {
    refreshContext();
    const character = hasCurrentCharacter() ? ctx.characters[ctx.characterId] : null;
    return character?.data?.extensions?.world || '';
}

function npcToWorldEntry(npc) {
    const normalized = normalizeNpc(npc);
    const name = normalized.name || '未命名 NPC';
    const keys = unique([name, ...normalized.aliases, name.split(/\s+/).at(-1)]);
    const content = `[剧情大纲工作台 NPC]\n姓名：${name}\n关键词：${keys.join('、')}\n性别：${normalized.gender}\n年龄：${normalized.age}（必须为成年人）\n身高：${normalized.height}\n外貌：${normalized.appearance}\n性格：${normalized.personality}\n身份背景：${normalized.identity}\n过去经历：${normalized.past}\n与 user 的关系：${normalized.relationship}\n对 user 的态度：${normalized.attitude}\n典型语录：${normalized.quotes.join('；')}\nNSFW偏好与语言风格：${normalized.nsfw}\n成年身体信息：${normalized.body}`;
    return { keys, content, comment: `SOS NPC - ${name}` };
}

async function acceptNpcs() {
    if (!state.npcs.length) return toastr.warning('没有可写入的 NPC。');
    state.npcs = state.npcs.map(normalizeNpc);
    const invalid = state.npcs.map(validateNpc).find(Boolean);
    if (invalid) return toastr.warning(`${invalid} 请先修改。`);
    await withGenerating(async () => {
        let bookName = getWorldBookTarget();
        if (!bookName) bookName = state.worldBookName || `剧情工作台-${currentCharacterContext().name}`;
        const data = (await loadWorldInfo(bookName)) || { entries: {} };
        if (!data.entries || typeof data.entries !== 'object') data.entries = {};
        for (const npc of state.npcs) {
            const normalized = npcToWorldEntry(npc);
            const existing = Object.values(data.entries).find(entry => text(entry?.comment) === normalized.comment);
            const entry = existing || createWorldInfoEntry(bookName, data);
            if (!entry) continue;
            entry.key = normalized.keys;
            entry.keysecondary = [];
            entry.comment = normalized.comment;
            entry.content = normalized.content;
            entry.constant = false;
            entry.selective = false;
            entry.order = 100;
            entry.disable = false;
        }
        await saveWorldInfo(bookName, data, true);
        const currentWorldBook = getWorldBookTarget();
        if (!currentWorldBook && hasCurrentCharacter() && ctx.writeExtensionField) {
            await ctx.writeExtensionField(ctx.characterId, 'world', bookName);
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
        const normalized = entries.map(entry => ({ keys: unique([...asList(entry.key), ...asList(entry.keys), ...asList(entry.keysecondary)]), content: text(entry.content || entry.description) })).filter(entry => entry.content);
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

function storyPrompt() {
    const min = LENGTHS[state.config.length]?.minTurns || 0;
    const remaining = Math.max(0, min - state.userTurnCount);
    const pacingRule = remaining > 0
        ? `距离最低交互要求还差 ${remaining} 个 user 楼层。在达到 ${min} 个 user 楼层前，严禁进入最终高潮、解决核心矛盾、完成终极目标、让主要关系定局或输出结局；本次只能推进过程事件并留下明确的后续行动空间。`
        : '已达到最低交互楼层，可以依据大纲和当前节奏进入高潮或结局，但不要无故跳过必要情节。';
    return `${basePrompt()}\n已接受大纲（版本${state.outlineVersion}）：${state.outline}\n已确认 NPC：${JSON.stringify(state.npcs)}\n已完成剧情快照（绝不能重写）：${state.completedStorySnapshot || '暂无'}\n当前剧情楼层：${state.currentTurn}；user已输入楼层：${state.userTurnCount}；本篇最低 user 交互楼层：${min}\n楼层硬约束：${pacingRule}\n硬规则：严格按照接受的大纲和所有配置关键词推进；不要擅自改变 user 人设；不要让 NPC OOC；不要提前结局；已完成剧情只当作历史；新的剧情必须连接最近聊天内容。如果 user 本楼只输入“继续剧情”或等价推进指令，不要把这几个字当作剧情事实，直接按照接受版大纲、最近聊天和当前节奏推进下一楼。只输出本次剧情正文，不要大纲、总结、设定说明。`;
}

function updateContinuityPrompt() {
    if (!state?.outlineAccepted || !state?.npcsAccepted) {
        ctx.setExtensionPrompt?.(PROMPT_KEY, '', 1, 0, false);
        return;
    }
    ctx.setExtensionPrompt?.(PROMPT_KEY, storyPrompt(), 1, 0, false);
}

function latestChatText() {
    return (ctx.chat || []).slice(-8).map(message => `${message.name || (message.is_user ? ctx.name1 : ctx.name2)}：${message.mes}`).join('\n');
}

function isContinuationDirective(value) {
    return /^(?:继续剧情|继续|下一楼|推进剧情|继续下一楼|continue(?:\s+story)?)[。！!？?\s]*$/i.test(text(value));
}

async function continueStory() {
    await withGenerating(async () => {
        if (!state.outlineAccepted || !state.npcsAccepted) return toastr.warning('请先接受大纲和 NPC。');
        let result;
        try {
            result = await ctx.generateQuietPrompt({ quietPrompt: `${storyPrompt()}\n最近聊天：\n${latestChatText()}\n现在继续下一楼剧情。`, responseLength: state.config.length === 'long' ? 1800 : 1000, skipWIAN: false });
        } catch (error) {
            throw wrapGenerationError(error);
        }
        const content = extractGeneratedText(result).trim();
        if (!content) throw new Error('AI 没有返回剧情。');
        const message = { name: ctx.name2 || currentCharacterContext().name, is_user: false, is_system: false, mes: content, send_date: Date.now(), extra: { storyOutlineStudio: { version: state.outlineVersion, turn: state.currentTurn + 1 } } };
        ctx.chat.push(message);
        ctx.addOneMessage(message);
        state.currentTurn += 1;
        state.completedStoryMessages += 1;
        state.completedStorySnapshot = `${state.completedStorySnapshot}\n${content}`.trim().slice(-12000);
        saveState();
        await ctx.saveChat?.();
        rerender();
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
    container.innerHTML = '<div class="fa-solid fa-scroll extensionsMenuExtensionButton sos-wand-button" title="打开剧情大纲工作台"></div>';
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
    const open = () => { refreshContext(); state = getState(); openPanel('config'); };
    container.onclick = open;
    container.querySelector('.sos-wand-button')?.addEventListener('click', event => {
        event.stopPropagation();
        open();
    });
}

function installSlashCommand() {
    try {
        if (SlashCommandParser.commands['sos-continue'] || SlashCommandParser.commands['story-continue']) return;
        SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'sos-continue', aliases: ['story-continue'], helpString: '使用剧情大纲工作台继续下一楼剧情', callback: async () => { refreshContext(); state = getState(); await continueStory(); return ''; } }));
    } catch (error) {
        // A command registration conflict must not disable the visual workbench.
        console.warn(`[${EXTENSION_ID}] slash command registration skipped`, error);
    }
}

function installEvents() {
    ctx.eventSource?.on?.(ctx.eventTypes.CHAT_CHANGED, () => {
        refreshContext();
        state = getState();
        updateContinuityPrompt();
        if (panel?.classList.contains('open')) { activeStage = 'config'; rerender(); }
    });
    ctx.eventSource?.on?.(ctx.eventTypes.MESSAGE_SENT, messageIndex => {
        if (!state || !state.outlineAccepted) return;
        const message = Number.isInteger(messageIndex) ? ctx.chat?.[messageIndex] : null;
        if (!message?.is_user || isContinuationDirective(message.mes)) return;
        state.userTurnCount += 1;
        saveState();
    });
}

let initialized = false;

async function init() {
    if (initialized) return;

    try {
        await dependencyPromise;
        refreshContext();
        state = getState();
        installButton();
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
        state = getState();
        openPanel('config');
    },
    getState: () => state ? clone(state) : null,
    continue: async () => {
        await init();
        if (!initialized) throw dependencyError || new Error('剧情大纲工作台初始化失败，请查看酒馆控制台。');
        refreshContext();
        state = getState();
        return continueStory();
    },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void init(), { once: true }); else void init();
