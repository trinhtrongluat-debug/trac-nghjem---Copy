import { spawn } from 'child_process';
import readline from 'readline';

console.log('================================================================');
console.log('    HỆ THỐNG THI TRẮC NGHIỆM AI - KHỞI TẠO ĐƯỜNG LINK ONLINE    ');
console.log('================================================================\n');
console.log('[1/2] Đang khởi động Server nội bộ trên cổng 3000...');

// Start the backend server
const serverProcess = spawn('cmd.exe', ['/c', 'npx.cmd tsx server.ts'], {
  stdio: ['inherit', 'pipe', 'pipe'],
});

serverProcess.stdout.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('running on port')) {
    console.log('[OK] Máy chủ nội bộ đã sẵn sàng!');
    console.log('[2/2] Đang kết nối đường hầm Cloudflare Internet bảo mật...');
    startTunnel();
  }
});

serverProcess.stderr.on('data', (data) => {
  // console.error(data.toString());
});

let tunnelStarted = false;
function startTunnel() {
  if (tunnelStarted) return;
  tunnelStarted = true;

  const tunnelProcess = spawn('cmd.exe', ['/c', 'npx.cmd --yes cloudflared tunnel --url http://localhost:3000'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const rl = readline.createInterface({ input: tunnelProcess.stderr });

  rl.on('line', (line) => {
    const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match) {
      const onlineUrl = match[0];
      console.log('\n================================================================');
      console.log('🎉 ĐÃ KẾT NỐI INTERNET THÀNH CÔNG! BẠN CÓ THỂ GỬI LINK CHO HỌC SINH');
      console.log('================================================================');
      console.log(`\n🌐 LINK DÀNH CHO GIÁO VIÊN (Quản lý đề, xem điểm trực tiếp):`);
      console.log(`   👉 ${onlineUrl}`);
      console.log(`\n📝 LINK GỬI CHO HỌC SINH Ở XA (Vào thẳng phòng thi):`);
      console.log(`   👉 ${onlineUrl}/?exam=ENG-12-HK2-2026`);
      console.log(`      (Thay ENG-12-HK2-2026 bằng mã đề thi của bạn tạo ra)\n`);
      console.log('💡 Mẹo: Khi bạn vào link Giáo Viên ở trên, vào "Khu Vực 3",');
      console.log('        nút "Sao chép link" và "Mã QR" sẽ tự động dùng link Online này!');
      console.log('================================================================');
      console.log('⚠️  LƯU Ý: Giữ cửa sổ này mở trong suốt buổi thi để học sinh làm bài.');
      console.log('    Nhấn Ctrl + C để dừng chia sẻ link.\n');

      // Open browser for teacher
      spawn('cmd.exe', ['/c', 'start', onlineUrl], { detached: true });
    }
  });

  process.on('SIGINT', () => {
    tunnelProcess.kill();
    serverProcess.kill();
    process.exit();
  });
}
