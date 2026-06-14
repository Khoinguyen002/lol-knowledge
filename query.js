import fs from 'fs';
import path from 'path';
import { VectorDB } from './db-store.js';

// Entity-aware Session Memory logic
const SESSION_FILE = path.resolve(process.cwd(), 'session.json');

function loadSession() {
  if (fs.existsSync(SESSION_FILE)) {
    try { return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')); } catch(e) { return {}; }
  }
  return {};
}

function saveSession(session) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf8');
}

async function run() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const queryStr = args.filter(a => a !== '--json').join(' ').trim();

  if (!queryStr) {
    if (jsonMode) {
      console.log(JSON.stringify({ error: 'Thiếu câu hỏi truy vấn.' }));
    } else {
      console.log('❌ Lỗi: Vui lòng nhập câu hỏi!');
      console.log('Cú pháp: node query.js "câu hỏi của bạn" [--json]');
    }
    process.exit(1);
  }

  const configPath = path.resolve(process.cwd(), 'config.json');
  if (!fs.existsSync(configPath)) {
    if (jsonMode) {
      console.log(JSON.stringify({ error: 'Chưa cấu hình activeVersion. Hãy chạy sync trước!' }));
    } else {
      console.log('❌ Lỗi: Chưa tìm thấy config.json. Bạn cần chạy đồng bộ dữ liệu trước!');
    }
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const version = config.activeVersion;

  const db = new VectorDB(version);
  if (!db.load()) {
    if (jsonMode) {
      console.log(JSON.stringify({ error: `Không thể tải file db_${version}.json. Hãy chạy sync trước!` }));
    } else {
      console.log(`❌ Lỗi: Không tìm thấy cơ sở dữ liệu cho patch ${version}.`);
    }
    process.exit(1);
  }

  try {
    if (!jsonMode) {
      console.log(`\n🔍 Đang truy vấn V13 AI Coach cho: "${queryStr}" (Patch: ${version})...`);
    }

    // Gắn session context vào queryStr nếu có đại từ nhân xưng (nó, chiêu đó)
    let session = loadSession();
    let augmentedQuery = queryStr;
    if (/(nó|hắn|chiêu đó|thằng đó)/i.test(queryStr) && session.lastChampion) {
       augmentedQuery = `${session.lastChampion} ${queryStr}`;
       if (!jsonMode) console.log(`👉 Session Context: Sử dụng "${session.lastChampion}" cho đại từ nhân xưng.`);
    }

    const results = await db.query(augmentedQuery, 4);

    // Lưu session
    saveSession({ lastChampion: augmentedQuery.split(' ')[0] }); // Giả định từ đầu tiên là tên tướng (cần parser chuẩn hơn nhưng đủ dùng)

    if (jsonMode) {
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    }

    const { structured_pipeline_output, rag_chunks } = results;

    console.log('\n================ V13 AI COACH DECISION ================');
    if (structured_pipeline_output) {
      console.log(`[GAME MODE]         : ${structured_pipeline_output.Game_Mode} (Rules: ${structured_pipeline_output.Mode_Ruleset})`);
      console.log(`[TRUTH LAYER]       : ${structured_pipeline_output.Truth_Layer}`);
      console.log(`[SIMULATION]        : ${structured_pipeline_output.Stochastic_Simulation}`);
      console.log(`[MUTATIONS]         : ${structured_pipeline_output.Mutations_Applied}`);
      if (structured_pipeline_output.Selected_Augments) {
        console.log(`[SELECTED AUGMENTS] : ${structured_pipeline_output.Selected_Augments}`);
      }
      console.log(`[CALIBRATION OBS]   : ${structured_pipeline_output.Reality_Calibration_Observer}`);
      console.log(`[STRATEGY EV]       :`);
      
      const strategy = structured_pipeline_output.Strategic_Policy;
      if (typeof strategy === 'object') {
        for (const [phase, tactic] of Object.entries(strategy)) {
          console.log(`   - ${phase.toUpperCase()}: ${tactic}`);
        }
      } else {
        console.log(`   - ${strategy}`);
      }

      console.log(`[RECOVERY TREE]     :`);
      const recovery = structured_pipeline_output.Recovery_Options;
      if (recovery && recovery.behind_state) {
        recovery.behind_state.forEach(state => {
          console.log(`   - Nếu ${state.condition}: ${state.action}`);
        });
      } else {
        console.log(`   - ${recovery}`);
      }
    }

    console.log(`\n================ RAG CONTEXT (TOP ${rag_chunks.length}) ================`);
    if (rag_chunks.length === 0) {
      console.log('Không tìm thấy thông tin nào phù hợp.');
    } else {
      rag_chunks.forEach((res, index) => {
        console.log(`[${index + 1}] ${res.title.toUpperCase()} (Score: ${res.metrics.finalScore})`);
        console.log(`   └─ Type: ${res.type} | Tags/Skills: ${res.tags || res.skill || 'N/A'}`);
        console.log(`   └─ Match: Vector: ${res.metrics.cosine} | Keyword: ${res.metrics.keyword} | Boost: ${res.metrics.boost}`);
        
        let textSummary = res.text.replace(/\n/g, ' - ');
        if (textSummary.length > 150) textSummary = textSummary.substring(0, 150) + '...';
        console.log(`   └─ Content: ${textSummary}`);
      });
    }

    process.exit(0);
  } catch (err) {
    if (jsonMode) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error('❌ Lỗi khi thực hiện truy vấn:', err.message);
    }
    process.exit(1);
  }
}

run();
