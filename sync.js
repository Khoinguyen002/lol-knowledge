import fs from 'fs';
import path from 'path';
import { generateEmbedding, getEmbedder } from './db-store.js';

function cleanHtml(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function run() {
  const args = process.argv.slice(2);
  let targetVersion = null;
  const versionIndex = args.indexOf('--version');
  if (versionIndex !== -1 && args[versionIndex + 1]) {
    targetVersion = args[versionIndex + 1];
  } else if (args[0] && !args[0].startsWith('-')) {
    targetVersion = args[0];
  }

  console.log('Đang kết nối tới Riot Data Dragon...');
  let versions = [];
  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    versions = await res.json();
  } catch (err) {
    console.error('Không thể lấy danh sách phiên bản từ Riot:', err.message);
    process.exit(1);
  }

  const latestVersion = versions[0];
  const version = targetVersion || latestVersion;
  console.log(`Phiên bản mục tiêu để sync: ${version} (Bản mới nhất hiện tại: ${latestVersion})`);

  await getEmbedder();

  console.log(`Đang tải danh sách tướng của patch ${version}...`);
  let championListEn = {};
  try {
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
    const data = await res.json();
    championListEn = data.data;
  } catch (err) {
    console.error('Không thể tải danh sách tướng en_US:', err.message);
    process.exit(1);
  }

  const championIds = Object.keys(championListEn);

  console.log(`Đang tải danh sách trang bị...`);
  let itemsEn = {}, itemsVi = {};
  try {
    const resEn = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`);
    const dataEn = await resEn.json();
    itemsEn = dataEn.data;

    const resVi = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/vi_VN/item.json`);
    if (resVi.ok) {
      const dataVi = await resVi.json();
      itemsVi = dataVi.data;
    }
  } catch (err) {
    console.warn('Cảnh báo: Không thể tải danh sách trang bị:', err.message);
  }

  const rawChunks = [];
  
  // Đọc các file JSON cấu trúc V13
  console.log('Đang đọc các file cấu trúc V13 (combos, meta_decisions, interactions)...');
  const combosPath = path.resolve(process.cwd(), 'combos.json');
  const metaPath = path.resolve(process.cwd(), 'meta_decisions.json');
  const interPath = path.resolve(process.cwd(), 'interactions.json');
  
  const combosData = fs.existsSync(combosPath) ? JSON.parse(fs.readFileSync(combosPath, 'utf8')) : {};
  const metaData = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
  const interData = fs.existsSync(interPath) ? JSON.parse(fs.readFileSync(interPath, 'utf8')) : {};

  const spellMap = {}; // Scoped spell map

  const itemKeys = Object.keys(itemsEn);
  for (const itemId of itemKeys) {
    const itemEn = itemsEn[itemId];
    const itemVi = itemsVi[itemId] || itemEn;

    if (!itemEn.gold.purchasable || itemEn.gold.total === 0 || !itemEn.description) {
      continue;
    }

    const cleanDescEn = cleanHtml(itemEn.description);
    const cleanDescVi = cleanHtml(itemVi.description);

    rawChunks.push({ champion: null, type: 'item', itemId, title: itemEn.name, language: 'en', text: `Item: ${itemEn.name}\nDescription: ${cleanDescEn}\nGold Cost: ${itemEn.gold.total}` });
    rawChunks.push({ champion: null, type: 'item', itemId, title: itemVi.name, language: 'vi', text: `Trang bị: ${itemVi.name}\nMô tả: ${cleanDescVi}\nGiá vàng: ${itemVi.gold.total}` });
  }

  console.log('Đang tải dữ liệu chi tiết của 170+ tướng...');
  const batchSize = 15;
  const championDetails = [];

  for (let i = 0; i < championIds.length; i += batchSize) {
    const batch = championIds.slice(i, i + batchSize);
    await Promise.all(batch.map(async (id) => {
      try {
        const [enRes, viRes] = await Promise.all([
          fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${id}.json`),
          fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/vi_VN/champion/${id}.json`)
        ]);

        if (enRes.ok) {
          const enData = await enRes.json();
          const viData = viRes.ok ? await viRes.json() : enData;
          championDetails.push({ id, en: enData.data[id], vi: viData.data[id], stats: enData.data[id].stats });
        }
      } catch (err) {
        console.error(`Lỗi tải tướng ${id}:`, err.message);
      }
    }));
  }

  // Tự động phân tích và trích xuất mechanic tags (Regex Heuristics)
  function extractTags(description) {
    const tags = [];
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('projectile') || lowerDesc.includes('đạn đạo') || lowerDesc.includes('missile')) tags.push('projectile');
    if (lowerDesc.includes('dash') || lowerDesc.includes('leap') || lowerDesc.includes('lướt') || lowerDesc.includes('nhảy')) tags.push('dash');
    if (lowerDesc.includes('on-hit') || lowerDesc.includes('hiệu ứng đòn đánh')) tags.push('on_hit');
    if (lowerDesc.includes('stun') || lowerDesc.includes('choáng') || lowerDesc.includes('airborne') || lowerDesc.includes('hất tung')) tags.push('cc');
    return tags;
  }

  const championStats = {};

  for (const champ of championDetails) {
    const id = champ.id;
    const en = champ.en;
    const vi = champ.vi;

    championStats[id] = champ.stats; // Lưu base stats cho Simulation Engine
    spellMap[id.toLowerCase()] = {};

    const statsEn = `HP: ${en.stats.hp} (+${en.stats.hpperlevel}/lvl), Mana: ${en.stats.mp}, AD: ${en.stats.attackdamage}, Armor: ${en.stats.armor}, MR: ${en.stats.spellblock}`;
    const statsVi = `Máu: ${vi.stats.hp} (+${vi.stats.hpperlevel}/cấp), NL: ${vi.stats.mp}, STVL: ${vi.stats.attackdamage}, Giáp: ${vi.stats.armor}, Kháng phép: ${vi.stats.spellblock}`;

    rawChunks.push({ champion: id, type: 'overview', title: `${en.name} (${en.title})`, language: 'en', text: `Champion: ${en.name}\nTags: ${en.tags.join(', ')}\nStats: ${statsEn}` });
    rawChunks.push({ champion: id, type: 'overview', title: `${vi.name} (${vi.title})`, language: 'vi', text: `Tướng: ${vi.name}\nVai trò: ${vi.tags.join(', ')}\nChỉ số: ${statsVi}` });

    spellMap[id.toLowerCase()]['passive'] = [en.passive.name.toLowerCase(), vi.passive.name.toLowerCase(), 'passive', 'nội tại', 'p'];
    rawChunks.push({ champion: id, type: 'ability', skill: 'Passive', title: `Passive: ${en.passive.name}`, language: 'en', text: `Champion: ${en.name}\nAbility: Passive\nName: ${en.passive.name}\nDesc: ${cleanHtml(en.passive.description)}` });
    rawChunks.push({ champion: id, type: 'ability', skill: 'Passive', title: `Nội tại: ${vi.passive.name}`, language: 'vi', text: `Tướng: ${vi.name}\nKỹ năng: Nội tại\nTên: ${vi.passive.name}\nMô tả: ${cleanHtml(vi.passive.description)}` });

    const spellKeys = ['Q', 'W', 'E', 'R'];
    for (let s = 0; s < 4; s++) {
      const spellEn = en.spells[s];
      const spellVi = vi.spells[s] || spellEn;
      const key = spellKeys[s];

      if (!spellEn) continue;

      spellMap[id.toLowerCase()][key.toLowerCase()] = [spellEn.name.toLowerCase(), spellVi.name.toLowerCase(), key.toLowerCase(), `chiêu ${key.toLowerCase()}`];

      const tagsEn = extractTags(spellEn.description);
      const tagsVi = extractTags(spellVi.description);
      const combinedTags = Array.from(new Set([...tagsEn, ...tagsVi]));

      rawChunks.push({ champion: id, type: 'ability', skill: key, tags: combinedTags, title: `${key}: ${spellEn.name}`, language: 'en', text: `Champion: ${en.name}\nAbility: ${key}\nName: ${spellEn.name}\nDesc: ${cleanHtml(spellEn.description)}\nCooldown: ${spellEn.cooldownBurn}s\nCost: ${spellEn.costBurn}` });
      rawChunks.push({ champion: id, type: 'ability', skill: key, tags: combinedTags, title: `${key}: ${spellVi.name}`, language: 'vi', text: `Tướng: ${vi.name}\nKỹ năng: ${key}\nTên: ${spellVi.name}\nMô tả: ${cleanHtml(spellVi.description)}\nHồi chiêu: ${spellVi.cooldownBurn}s\nTiêu hao: ${spellVi.costBurn}` });
    }
  }

  for (const [champ, combos] of Object.entries(combosData)) {
    for (const [comboName, comboData] of Object.entries(combos)) {
      rawChunks.push({
        champion: champ,
        type: 'combo',
        title: `${champ} - ${comboName}`,
        language: 'vi',
        text: `Tướng: ${champ}\nCombo: ${comboName}\nCác bước thực hiện:\n${comboData.steps.map(s => `Bước ${s.step}: Bấm ${s.action} (${s.timing}) - Ràng buộc: ${JSON.stringify(s.state_precondition)} - ${s.description}`).join('\n')}`
      });
    }
  }

  const db = {
    version: version,
    champions: championIds,
    championStats: championStats,
    spellMap: spellMap,
    interactions: interData,
    meta_decisions: metaData,
    evolved_meta_cache: {}, 
    chunks: []
  };

  const embedBatchSize = 20;
  for (let i = 0; i < rawChunks.length; i += embedBatchSize) {
    const chunkBatch = rawChunks.slice(i, i + embedBatchSize);
    await Promise.all(chunkBatch.map(async (chunk) => {
      try {
        const vector = await generateEmbedding(chunk.text, false);
        db.chunks.push({ ...chunk, embedding: vector });
      } catch (err) {}
    }));
  }

  const dbFilePath = path.resolve(process.cwd(), `db_${version}.json`);
  fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Đã lưu database ra file: ${dbFilePath}`);

  const configPath = path.resolve(process.cwd(), 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ activeVersion: version }, null, 2), 'utf8');
  console.log('ĐỒNG BỘ DỮ LIỆU HOÀN TẤT V13!');
}

run();
