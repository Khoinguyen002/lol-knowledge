import fs from 'fs';
import path from 'path';

async function run() {
  console.log('Đang kết nối tới Riot Data Dragon...');
  let versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
  const version = versions[0];
  
  console.log(`Lấy dữ liệu 170+ tướng từ patch ${version}...`);
  const champRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
  const champData = await champRes.json();
  const champions = Object.keys(champData.data);
  
  const metaPath = path.resolve(process.cwd(), 'meta_decisions.json');
  let currentMeta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
  
  // Khởi tạo root patch nếu chưa có
  if (!currentMeta["16.12.1"]) currentMeta["16.12.1"] = { top: {}, aram: {} };
  
  // Lấy dữ liệu cũ để không bị ghi đè các tướng đã setup tay (Jax, Fiora, ARAM)
  const existingTop = currentMeta["16.12.1"].top || {};
  const existingAram = currentMeta["16.12.1"].aram || {};
  
  console.log('Bắt đầu nạp Data Struct Meta Decision cho toàn bộ tướng...');
  let addedCount = 0;
  for (const champ of champions) {
    if (!existingTop[champ]) {
      // Generate cấu trúc default có sẵn cho các tướng còn lại (giả lập data scrape)
      existingTop[champ] = {
        tier: "B",
        max_order: ["Q", "W", "E"],
        timeline_strategy: {
          early_game: `Lv 1-5: Tập trung farm lính và giữ vị trí an toàn với ${champ}. Nếu đối phương lao vào, hãy rút lui và chờ gank.`,
          mid_game: `Lv 6-11: Tận dụng chiêu cuối để kiểm soát Rồng hoặc Sứ Giả. Chơi xoay quanh rừng.`,
          late_game: `Lv 12-18: Đi cùng đồng đội, ưu tiên bảo vệ chủ lực hoặc dùng sát thương diện rộng trong giao tranh tổng.`
        },
        recovery_decision_tree: {
          behind_state: [
            { "condition": "Thua đồ và bị ép lane", "action": "Ôm trụ farm an toàn, nhường trụ 1 nếu cần để tránh bị snowball. Lên đồ thủ." }
          ]
        },
        reality_anchor: {
          winrate_general: parseFloat((48 + Math.random() * 4).toFixed(1)), // random winrate 48-52% làm baseline mock
          pickrate: parseFloat((1 + Math.random() * 9).toFixed(1)),
          source: "Auto-generated Baseline Meta"
        }
      };
      addedCount++;
    }
  }
  
  currentMeta["16.12.1"].top = existingTop;
  currentMeta["16.12.1"].aram = existingAram; 
  
  fs.writeFileSync(metaPath, JSON.stringify(currentMeta, null, 2), 'utf8');
  console.log(`Đã auto-fill thêm data chiến thuật cho ${addedCount} tướng vào meta_decisions.json thành công!`);
}

run().catch(console.error);
