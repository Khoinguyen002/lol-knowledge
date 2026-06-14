import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';

let embedder = null;

export async function getEmbedder() {
  if (!embedder) {
    console.log('Đang khởi tạo model embedding local (Xenova/multilingual-e5-small)...');
    embedder = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
    console.log('Model embedding đã sẵn sàng.');
  }
  return embedder;
}

export async function generateEmbedding(text, isQuery = false) {
  const pipe = await getEmbedder();
  const prefix = isQuery ? 'query: ' : 'passage: ';
  const textWithPrefix = text.startsWith('query: ') || text.startsWith('passage: ') 
    ? text 
    : `${prefix}${text}`;
  
  const output = await pipe(textWithPrefix, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function calculateKeywordOverlap(query, text) {
  const stopwords = new Set(['của', 'và', 'chiêu', 'tướng', 'làm', 'gì', 'the', 'a', 'an', 'is', 'of', 'how', 'does', 'work', 'bao', 'nhiêu', 'sao', 'như', 'thế', 'nào', 'với', 'trong', 'cơ', 'bản']);
  const tokenize = (str) => {
    return str.toLowerCase().split(/[^a-z0-9A-Z_àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìííịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/u).filter(t => t.length > 1 && !stopwords.has(t));
  };
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return 0;
  const textLower = text.toLowerCase();
  let matches = 0;
  for (const term of queryTerms) {
    if (textLower.includes(term)) matches++;
  }
  return matches / queryTerms.length;
}

export function parseQuery(query, championList = []) {
  const normalizedQuery = query.toLowerCase();
  let detectedChampion = null;
  for (const champ of championList) {
    if (normalizedQuery.includes(champ.toLowerCase())) {
      detectedChampion = champ;
      break;
    }
  }

  let gameMode = 'SR';
  if (normalizedQuery.includes('aram') || normalizedQuery.includes('vực gió hú')) {
    gameMode = 'ARAM';
  } else if (normalizedQuery.includes('hỗn loạn') || normalizedQuery.includes('chaos')) {
    gameMode = 'CHAOS';
  }

  if (!detectedChampion && gameMode === 'ARAM') {
    detectedChampion = 'ARAM';
  }

  let detectedAbility = null;
  if (/\b(passive|nội tại|noi tai|noi-tai)\b/i.test(normalizedQuery) || /\bp\b/i.test(normalizedQuery)) detectedAbility = 'Passive';
  else if (/\bq\b/i.test(normalizedQuery) || /\bchiêu 1\b/i.test(normalizedQuery)) detectedAbility = 'Q';
  else if (/\bw\b/i.test(normalizedQuery) || /\bchiêu 2\b/i.test(normalizedQuery)) detectedAbility = 'W';
  else if (/\be\b/i.test(normalizedQuery) || /\bchiêu 3\b/i.test(normalizedQuery)) detectedAbility = 'E';
  else if (/\br\b/i.test(normalizedQuery) || /\bchiêu cuối\b/i.test(normalizedQuery) || /\bult\b/i.test(normalizedQuery)) detectedAbility = 'R';

  const detectedAttributes = [];
  if (/\b(cooldown|hồi chiêu|cd|hoi chieu)\b/i.test(normalizedQuery)) detectedAttributes.push('cooldown');
  if (/\b(damage|sát thương|sat thuong|stvl|stpt|dame|dmg|scaling)\b/i.test(normalizedQuery)) detectedAttributes.push('damage');
  if (/\b(mana|năng lượng|cost|tiêu hao|tieu hao)\b/i.test(normalizedQuery)) detectedAttributes.push('cost');

  return { champion: detectedChampion, ability: detectedAbility, attributes: detectedAttributes, gameMode };
}

// ---- V14 MULTI-MODE GAME WORLD ENGINE ----

class ModeResolver {
  constructor(db) { this.db = db; }
  resolve(gameModeStr) {
    return this.db.data.game_modes?.[gameModeStr] || {
      parameters: { randomness_level: 0.15, execution_error_scale: 1.0 },
      ruleset_overrides: [],
      calibration_source: "OP.GG High Elo"
    };
  }
}

class TruthNode {
  constructor(db) { this.db = db; }
  resolve(subject, ability, modeRuleset) {
    const interactions = this.db.data.interactions || { truth_rules: {} };
    const rules = interactions.truth_rules || {};
    
    // 1. Mode-aware logic (Dynamic Ruleset)
    if (modeRuleset.includes("vision_irrelevant") && ability === "Ward") {
       return { level: 'A', confidence: 1.0, result: null, note: "[Mode Override] Tầm nhìn vô dụng trong mode này." };
    }
    if (modeRuleset.includes("heal_shield_penalty_50") && (ability === "Heal" || ability === "W")) {
       return { level: 'A', confidence: 1.0, result: null, note: "[Mode Override] Cơ chế hồi máu/tạo lá chắn bị giảm sức mạnh." };
    }
    
    // 2. Absolute Rules
    if (rules.constraint_locks) {
      for (const lock of rules.constraint_locks) {
        if (lock.subject === `${subject} ${ability}` || lock.subject === subject) {
          return { level: 'A', confidence: 1.0, result: lock, note: "Absolute Constraint Lock (Engine-level Truth)" };
        }
      }
    }
    
    // 3. Verified Rules
    if (rules.B_verified) {
      for (const v of rules.B_verified) {
        if (v.champion === subject && (!ability || v.ability === ability)) {
          return { level: 'B', confidence: 0.8, result: v, note: "Verified Rule (Data-based)" };
        }
      }
    }
    return { level: 'C', confidence: 0.4, result: null, note: "Inferred Rule (Simulation Fallback)" };
  }
}

class StateBuilder {
  constructor(db) { this.db = db; }
  build(champion, gameMode) {
    const decisions = (this.db.data.meta_decisions || {})["16.12.1"] || {};
    // Base meta (Modifier Layer architecture - currently mapping direct to champ)
    let baseMeta = decisions.top?.[champion] || {}; 
    if (champion === "ARAM") baseMeta = decisions.aram?.["ARAM"] || {};
    
    const stats = (this.db.data.championStats || {})[champion] || {};
    return { champion, baseMeta, stats, gameMode };
  }
}

class AugmentEngine {
  classifyActiveRole(champion, baseMeta, queryText, ruleset) {
    const scores = { fighter: 0.0, tank: 0.0, adc: 0.0, mage: 0.0 };
    
    // 1. Champion Base Role Base Score (+3.0)
    const mages = ['Ahri', 'Anivia', 'Annie', 'Azir', 'Brand', 'Cassiopeia', 'Diana', 'Evelynn', 'Fiddlesticks', 'Fizz', 'Gragas', 'Heimerdinger', 'Karthus', 'Kassadin', 'Katarina', 'LeBlanc', 'Lissandra', 'Lux', 'Malzahar', 'Neeko', 'Orianna', 'Ryze', 'Swain', 'Syndra', 'Taliyah', 'TwistedFate', 'Veigar', 'VelKoz', 'Viktor', 'Vladimir', 'Xerath', 'Ziggs', 'Zoe', 'Zyra'];
    const adcs = ['Aphelios', 'Ashe', 'Caitlyn', 'Draven', 'Ezreal', 'Jhin', 'Jinx', 'Kai\'Sa', 'Kalista', 'KogMaw', 'Lucian', 'MissFortune', 'Samira', 'Sivir', 'Tristana', 'Twitch', 'Varus', 'Vayne', 'Xayah', 'Zeri'];
    const tanks = ['Alistar', 'Amumu', 'Blitzcrank', 'Braum', 'ChoGath', 'DrMundo', 'Gnar', 'Leona', 'Malphite', 'Maokai', 'Nautilus', 'Ornn', 'Poppy', 'Rammus', 'Sejuani', 'Shen', 'Sion', 'TahmKench', 'Zac'];
    
    if (mages.includes(champion)) scores.mage += 3.0;
    else if (adcs.includes(champion)) scores.adc += 3.0;
    else if (tanks.includes(champion)) scores.tank += 3.0;
    else scores.fighter += 3.0;
    
    // 2. Query Intent Score
    const qLower = (queryText || "").toLowerCase();
    if (/(ap|phép|pháp sư|sách chiêu hồn)/i.test(qLower)) scores.mage += 2.0;
    if (/(ad|sát lực|xạ thủ|crit|chí mạng|tốc đánh|bắn)/i.test(qLower)) scores.adc += 2.0;
    if (/(tank|đỡ đòn|thủ|giáp|máu|khiên)/i.test(qLower)) scores.tank += 2.0;
    if (/(đấu sĩ|combats|rìu|tam hợp|chinh phục|phân tách)/i.test(qLower)) scores.fighter += 2.0;
    
    // 3. Item State Score
    const mageItems = ['mũ phù thủy', 'trượng', 'đồng hồ cát', 'mặt nạ liandry', 'vọng âm', 'quỷ thư', 'nhẫn doran'];
    const adcItems = ['vô cực', 'cuồng cung', 'nỏ tử thủ', 'ma vũ', 'gươm suy vong', 'cung phong linh', 'kiếm doran'];
    const tankItems = ['giáp gai', 'giáp máu', 'tim băng', 'giáp tâm linh', 'khiên thái dương', 'thạch giáp', 'khiên doran'];
    const fighterItems = ['tam hợp', 'rìu mãng xà', 'móng vuốt sterak', 'rìu đen', 'chùy hấp huyết', 'búa rìu sát thần'];
    
    for (const item of mageItems) { if (qLower.includes(item)) scores.mage += 2.0; }
    for (const item of adcItems) { if (qLower.includes(item)) scores.adc += 2.0; }
    for (const item of tankItems) { if (qLower.includes(item)) scores.tank += 2.0; }
    for (const item of fighterItems) { if (qLower.includes(item)) scores.fighter += 2.0; }
    
    // 4. Mode Ruleset Score
    if (ruleset && ruleset.includes("snowball_summoner_enabled")) {
      scores.fighter += 0.5;
      scores.tank += 0.5;
    }
    
    let bestRole = 'fighter';
    let maxScore = -1;
    for (const [role, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestRole = role;
      }
    }
    return bestRole;
  }

  apply(state, modeConfig, queryText) {
    const ruleset = modeConfig.ruleset_overrides || [];
    const champion = state.champion || "Jax";
    const activeRole = this.classifyActiveRole(champion, state.baseMeta, queryText, ruleset);
    
    const augmentedState = {
      ...state,
      activeRole,
      modifiers: {
        damage_dealt_multiplier: 1.0,
        damage_taken_multiplier: 1.0,
        ability_haste: 0,
        attackspeed_multiplier: 1.0,
        hp_bonus: 0,
        size_multiplier: 1.0,
        lifesteal: 0,
        ult_ability_haste: 0,
        ult_damage_multiplier: 1.0,
        cooldown_multiplier: 1.0,
        revive_first_death: false,
        vision_radius_instability: false,
        reaction_time_modifier: 0.0,
        ability_mutation_enabled: false,
        poro_damage_bonus: 0
      }
    };

    const chosenAugments = [];
    const seed = champion ? champion.length : 5;

    if (modeConfig.augments_pool) {
      const tiers = ['silver', 'gold', 'prismatic'];
      for (const tier of tiers) {
        const pool = modeConfig.augments_pool[tier] || [];
        if (pool.length === 0) continue;

        // Seeded generation of 3 options
        const tierOffset = tier === 'silver' ? 0 : (tier === 'gold' ? 1 : 2);
        const options = [];
        for (let i = 0; i < 3; i++) {
          const index = (seed + tierOffset * 7 + i * 13) % pool.length;
          options.push(pool[index]);
        }

        // De-duplicate options
        const uniqueOptions = [];
        const seenIds = new Set();
        for (const opt of options) {
          if (!seenIds.has(opt.id)) {
            seenIds.add(opt.id);
            uniqueOptions.push(opt);
          }
        }

        // Choose best match for activeRole
        let bestAug = uniqueOptions.find(a => a.type === activeRole);
        if (!bestAug) {
          bestAug = uniqueOptions.find(a => a.type === 'all');
        }
        if (!bestAug) {
          bestAug = uniqueOptions[0];
        }

        chosenAugments.push(bestAug);

        // Apply modifications
        if (bestAug.modifiers) {
          for (const [modKey, val] of Object.entries(bestAug.modifiers)) {
            if (typeof val === 'number') {
              if (modKey.endsWith('_multiplier')) {
                augmentedState.modifiers[modKey] *= val;
              } else {
                augmentedState.modifiers[modKey] += val;
              }
            } else if (typeof val === 'boolean') {
              augmentedState.modifiers[modKey] = val;
            }
          }
        }
      }
    }

    return { augmentedState, chosenAugments };
  }
}

class MechanicsEngine {
  calculateAdvantage(state) {
    const stats = state.stats || {};
    const modifiers = state.modifiers || {};
    const role = state.activeRole || 'fighter';

    // Phase 1: Pre-Hit (Setup, positioning, spacing & reaction time)
    const baseMS = stats.movespeed || 335;
    const msMod = modifiers.movespeed_multiplier || 1.0;
    const range = stats.attackrange || 125;
    const reactionMod = modifiers.reaction_time_modifier || 0.0; // e.g. -0.10 slows opponent down, giving us +0.10 advantage
    
    const preHitScore = ((baseMS * msMod) / 350) * 0.3 + (range / 650) * 0.2 - reactionMod * 0.5;

    // Phase 2: Hit Window (Damage sequencing: Burst vs Sustained)
    const baseAD = stats.attackdamage || 60;
    const adMod = modifiers.damage_dealt_multiplier || 1.0;
    const asMod = modifiers.attackspeed_multiplier || 1.0;
    const haste = modifiers.ability_haste || 0;
    const ultHaste = modifiers.ult_ability_haste || 0;
    const totalHaste = haste + ultHaste;
    const cooldownMod = 100 / (100 + totalHaste);

    let hitScore = 0;
    if (role === 'mage' || role === 'fighter') {
      // Burst damage sequencing: high spell scaling & cooldown efficiency
      const burstScaling = modifiers.ult_damage_multiplier || 1.0;
      hitScore = ((baseAD * adMod * burstScaling) / 100) * (1.5 / cooldownMod);
    } else {
      // Sustained damage sequencing: attack speed & consistent dps
      const dpsScaling = asMod * adMod;
      hitScore = ((baseAD * dpsScaling) / 100) * 2.0;
    }

    // Phase 3: Post-Hit (Survivability, shielding, recovery & mitigation)
    const baseArmor = stats.armor || 30;
    const baseMR = stats.spellblock || 30;
    const baseHP = stats.hp || 600;
    const hpBonus = modifiers.hp_bonus || 0;
    const sizeMod = modifiers.size_multiplier || 1.0;
    const finalHP = (baseHP + hpBonus) * sizeMod;
    
    const rawMitigation = 1 - (100 / (100 + (baseArmor + baseMR) / 2));
    const lifestealFactor = (modifiers.lifesteal || 0) * 0.02;
    const survivabilityWindow = (finalHP / 500) * (1 + rawMitigation);
    
    let postHitScore = survivabilityWindow * (1 + lifestealFactor);
    if (modifiers.revive_first_death) {
      postHitScore += 0.25; // Significant post-hit recovery window
    }
    if (modifiers.untargetable_on_low_hp) {
      postHitScore += 0.15; // Escape/recovery window
    }

    // Integrate combat phases into final advantage
    let weightPre = 0.2, weightHit = 0.5, weightPost = 0.3;
    if (role === 'tank') {
      weightPre = 0.15; weightHit = 0.25; weightPost = 0.60;
    } else if (role === 'adc') {
      weightPre = 0.30; weightHit = 0.55; weightPost = 0.15;
    } else if (role === 'mage') {
      weightPre = 0.25; weightHit = 0.60; weightPost = 0.15;
    }

    const advantage = (preHitScore * weightPre) + (hitScore * weightHit) + (postHitScore * weightPost);

    // Bounded normalization to game probability range [0.10, 0.95]
    return Math.min(0.95, Math.max(0.10, 0.2 + advantage * 0.3));
  }
}

class ModeMutationEngine {
  mutate(baseAdvantage, modeConfig, champion) {
    const ruleset = modeConfig.ruleset_overrides || [];
    let mutatedAdvantage = baseAdvantage;
    let appliedMutations = [];
    
    const seed = champion ? champion.length : 5;
    
    if (ruleset.includes("ability_mutation_enabled")) {
       const dmgMod = (seed % 3 === 0) ? 0.05 : ((seed % 2 === 0) ? -0.05 : 0);
       mutatedAdvantage += dmgMod;
       appliedMutations.push(`Ability Mutation (Dmg Mod: ${dmgMod > 0 ? '+' : ''}${dmgMod})`);
    }
    if (ruleset.includes("cooldown_randomization")) {
       appliedMutations.push(`Cooldown Shift (Seeded)`);
    }
    if (ruleset.includes("vision_instability")) {
       appliedMutations.push(`Vision Radius Instability`);
    }
    return { mutatedAdvantage, appliedMutations };
  }
}

class HumanNoiseEngine {
  injectNoise(hitChance, randomnessLevel, errorScale) {
    const noise = (Math.random() * randomnessLevel) - (randomnessLevel / 2); 
    const scaledNoise = noise * errorScale;
    return Math.min(1.0, Math.max(0.0, hitChance + scaledNoise));
  }
}

class MonteCarloSimulation {
  constructor() {
    this.noise = new HumanNoiseEngine();
  }
  
  simulate(mutatedAdvantage, modeConfig) {
    const trials = 50;
    let wins = 0;
    
    for (let i = 0; i < trials; i++) {
      const hitChance = mutatedAdvantage;
      const finalChance = this.noise.injectNoise(hitChance, modeConfig.parameters.randomness_level, modeConfig.parameters.execution_error_scale);
      if (Math.random() < finalChance) {
        wins++;
      }
    }
    
    return {
      winrate: wins / trials,
      trials: trials,
      noise_level_used: modeConfig.parameters.randomness_level,
      error_scale: modeConfig.parameters.execution_error_scale
    };
  }
}

class CalibrationObserver {
  observe(simulationResult, state, modeConfig) {
    const realityWinrate = state.baseMeta.reality_anchor?.winrate_general || 50;
    const drift = Math.abs((simulationResult.winrate * 100) - realityWinrate);
    const source = modeConfig.calibration_source || state.baseMeta.reality_anchor?.source || "Unknown";
    
    let biasNote = drift > 15 
      ? `High Drift (${drift.toFixed(1)}% divergence from ${source})` 
      : `Calibrated (Matches ${source} within bounds)`;
      
    return { drift_note: biasNote, anchor_source: source };
  }
}

class RenderNode {
  render(truthResult, simResult, calibrationResult, state, modeConfig, chosenAugments, appliedMutations) {
    const augmentDisplay = chosenAugments && chosenAugments.length > 0 
      ? chosenAugments.map(a => `${a.name} (${a.description})`).join(', ')
      : "None";

    return {
      Game_Mode: state.gameMode,
      Mode_Ruleset: modeConfig.ruleset_overrides.join(', ') || "None",
      Truth_Layer: `[Level ${truthResult.level}] ${truthResult.note} (Confidence: ${truthResult.confidence})`,
      Stochastic_Simulation: `${(simResult.winrate * 100).toFixed(1)}% Win Probability ±${(simResult.noise_level_used*100).toFixed(0)}% (n=${simResult.trials})`,
      Mutations_Applied: appliedMutations && appliedMutations.length > 0 ? appliedMutations.join(', ') : "None",
      Selected_Augments: augmentDisplay,
      Reality_Calibration_Observer: calibrationResult.drift_note,
      Strategic_Policy: state.baseMeta.timeline_strategy || "Chưa có chiến thuật cụ thể",
      Recovery_Options: state.baseMeta.recovery_decision_tree || "Chưa có kịch bản thọt"
    };
  }
}

export class StagedControllerGraph {
  constructor(db) {
    this.db = db;
    this.modeResolver = new ModeResolver(db);
    this.truthNode = new TruthNode(db);
    this.stateBuilder = new StateBuilder(db);
    this.augmentEngine = new AugmentEngine();
    this.mechanics = new MechanicsEngine();
    this.modeMutationEngine = new ModeMutationEngine();
    this.simulator = new MonteCarloSimulation();
    this.calibration = new CalibrationObserver();
    this.renderNode = new RenderNode();
  }
  
  execute(queryContext) {
    const champ = queryContext.champion || "Jax";
    const ability = queryContext.ability || "N/A";
    const gameMode = queryContext.gameMode || "SR";
    const queryString = queryContext.queryString || "";

    const modeConfig = this.modeResolver.resolve(gameMode);
    const truth = this.truthNode.resolve(champ, ability, modeConfig.ruleset_overrides);
    const baseState = this.stateBuilder.build(champ, gameMode);
    
    const { augmentedState, chosenAugments } = this.augmentEngine.apply(baseState, modeConfig, queryString);
    const mechanicsAdv = this.mechanics.calculateAdvantage(augmentedState);
    const { mutatedAdvantage, appliedMutations } = this.modeMutationEngine.mutate(mechanicsAdv, modeConfig, champ);
    const simResult = this.simulator.simulate(mutatedAdvantage, modeConfig);
    const calibResult = this.calibration.observe(simResult, augmentedState, modeConfig);
    
    return this.renderNode.render(truth, simResult, calibResult, augmentedState, modeConfig, chosenAugments, appliedMutations);
  }
}

// ---- VECTOR DB ----

export class VectorDB {
  constructor(version) {
    this.version = version;
    this.filePath = path.resolve(process.cwd(), `db_${version}.json`);
    this.data = {
      version: version,
      champions: [], 
      chunks: [],
      interactions: {},
      meta_decisions: {},
      championStats: {},
      game_modes: {}
    };
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      console.log(`Đang tải database ${path.basename(this.filePath)}...`);
      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.data = JSON.parse(raw);
      console.log(`Đã tải DB V14 với ${this.data.chunks?.length || 0} chunks và đầy đủ Data/Truth/Engine Nodes.`);
      this.graph = new StagedControllerGraph(this);
      return true;
    }
    console.log(`Chưa tìm thấy file DB: ${path.basename(this.filePath)}. Cần chạy sync để khởi tạo.`);
    return false;
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    console.log('Ghi database thành công.');
  }

  async query(queryString, topK = 5) {
    if (!this.data.chunks || this.data.chunks.length === 0) {
      throw new Error('Database trống trơn. Hãy chạy sync dữ liệu trước!');
    }

    const parsed = parseQuery(queryString, this.data.champions);
    console.log('Query Analysis:', parsed);

    const queryVector = await generateEmbedding(queryString, true);

    const scoredChunks = this.data.chunks.map(chunk => {
      const cosine = cosineSimilarity(queryVector, chunk.embedding);
      const keyword = calculateKeywordOverlap(queryString, chunk.text);
      let score = 0.6 * cosine + 0.4 * keyword;
      let boost = 0.0;

      if (parsed.champion && chunk.champion && chunk.champion.toLowerCase() === parsed.champion.toLowerCase()) boost += 0.25;
      if (parsed.ability && chunk.skill && chunk.skill.toUpperCase() === parsed.ability.toUpperCase()) boost += 0.25;
      
      const finalScore = score + boost;

      return {
        ...chunk,
        embedding: undefined,
        metrics: {
          cosine: parseFloat(cosine.toFixed(4)),
          keyword: parseFloat(keyword.toFixed(4)),
          boost: parseFloat(boost.toFixed(4)),
          finalScore: parseFloat(finalScore.toFixed(4))
        }
      };
    });

    scoredChunks.sort((a, b) => b.metrics.finalScore - a.metrics.finalScore);
    const topChunks = scoredChunks.slice(0, topK);

    let pipelineResult = null;
    if (this.graph) {
      pipelineResult = this.graph.execute({
        champion: parsed.champion,
        ability: parsed.ability,
        gameMode: parsed.gameMode,
        queryString: queryString
      });
    }

    return {
      structured_pipeline_output: pipelineResult,
      rag_chunks: topChunks
    };
  }
}
