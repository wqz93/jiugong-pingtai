/* 生成「单文件版」页面：把 SheetJS 以 base64 内嵌，整页零网络请求。
   用法：
     node build_offline.js                                   # 生成桌面单文件离线版
     node build_offline.js <输出路径>                        # 生成到指定路径（线上备用站用，标题保持正常）
     node build_offline.js <输出路径> --offline-title        # 标题标注「单文件离线版」
   生成后自动做内嵌库校验、外部依赖检查与浏览器脚本链路自检。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const outPath = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2]
  : 'E:/桌面/移动端聚合平台/移动端培训部聚合平台_单文件离线版.html';
const offlineTitle = process.argv.includes('--offline-title');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const libBuf = fs.readFileSync(path.join(ROOT, 'xlsx.full.min.js'));
const b64 = libBuf.toString('base64');

/* 1. 去掉外链库 script，单文件版不再需要任何网络回退 */
const loadRe = /<!-- 解析库随站点本地发布[\s\S]*?<script defer src="xlsx\.full\.min\.js"[^>]*><\/script>/;
if (!loadRe.test(html)) throw new Error('未找到库加载片段');
html = html.replace(loadRe, '<!-- 单文件版：SheetJS 以 base64 内嵌，全程零网络请求 -->');

/* 2. 用 DOM textContent 注入库代码，规避 HTML 对 <!-- / </script> 的解析问题 */
const marker = '<script>\nconst DAYS = ';
if (!html.includes(marker)) throw new Error('未找到业务脚本起点');
const loader = `<script type="text/plain" id="xlsx-b64">${b64}</script>
<script>
(function () {
  try {
    var b64 = document.getElementById('xlsx-b64').textContent.replace(/\\s+/g, '');
    var bin = atob(b64), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    var code;
    if (typeof TextDecoder !== 'undefined') code = new TextDecoder('utf-8').decode(u);
    else {
      var s = '';
      for (var j = 0; j < u.length; j += 8192) s += String.fromCharCode.apply(null, u.subarray(j, j + 8192));
      code = decodeURIComponent(escape(s));
    }
    var tag = document.createElement('script');
    tag.textContent = code;
    document.head.appendChild(tag);
  } catch (e) { window.__xlsxErr = String((e && e.message) || e); }
})();
</script>
<script>`;
html = html.replace(marker, loader + '\nconst DAYS = ');

/* 单文件版已内嵌解析库，去掉「同域重试」提示与按钮参数，改为纯离线文案 */
html = html.replace(
  /解析库尚未加载完成，请稍候几秒再点「重试加载解析库」（仅从本站重试，不依赖外网）。', true\)/g,
  "解析库加载失败，请刷新页面重试（本文件已内置解析库，无需联网）。')"
);
if (offlineTitle) {
  html = html.replace('<title>移动端培训部聚合平台</title>', '<title>移动端培训部聚合平台 · 单文件离线版</title>');
}

fs.writeFileSync(outPath, html, 'utf8');

/* ================= 自检 ================= */
const m = html.match(/<script type="text\/plain" id="xlsx-b64">([\s\S]*?)<\/script>/);
if (!m || !Buffer.from(m[1], 'base64').equals(libBuf)) throw new Error('内嵌库与原文件不一致');
if (html.includes('cdn.jsdelivr.net') || /<script[^>]+src="http/.test(html)) throw new Error('仍存在外部依赖');
if (/src="xlsx\.full\.min\.js"/.test(html)) throw new Error('仍引用独立库文件');
for (const key of ['id="panel-grade"', 'id="panel-name"', 'function queryGrade', 'flex-wrap:wrap']) {
  if (!html.includes(key)) throw new Error('页面缺失：' + key);
}

/* 模拟浏览器按顺序执行脚本，验证内嵌库可用、业务脚本无错误 */
const els = {};
const el = id => (els[id] || (els[id] = {
  id, value: '', innerHTML: '', textContent: id === 'xlsx-b64' ? b64 : '', style: {}, dataset: {}, files: [],
  classList: { add() {}, remove() {}, toggle() {} }, click() {},
}));
let ctx;
const document = {
  getElementById: el,
  querySelectorAll: () => [],
  createElement: () => ({ textContent: '' }),
  head: { appendChild(node) { vm.runInContext(node.textContent, ctx, { filename: 'xlsx.inline.js' }); } },
};
const localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
ctx = vm.createContext({
  document, localStorage, console,
  atob: s => Buffer.from(s, 'base64').toString('binary'),
  TextDecoder, Uint8Array, escape, decodeURIComponent, FileReader: function () {},
});
ctx.window = ctx;
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(x => ({ raw: x[0], code: x[1] }));
blocks.forEach(b => { if (!b.raw.includes('type="text/plain"')) vm.runInContext(b.code, ctx); });
if (!ctx.XLSX || typeof ctx.XLSX.read !== 'function') throw new Error('内嵌库未成功挂载 XLSX');
if (ctx.window.__xlsxErr) throw new Error('库解码失败：' + ctx.window.__xlsxErr);
if (typeof ctx.queryGrade !== 'function' || typeof ctx.gradeSet !== 'function') throw new Error('年级查询脚本未生效');

/* 若真实 Excel 在，顺便跑一次端到端（505 班 + 年级查询） */
const zsPath = 'E:/桌面/移动端聚合平台/招生简章.xls';
const rfPath = 'E:/桌面/移动端聚合平台/教室功能.xlsx';
if (fs.existsSync(zsPath) && fs.existsSync(rfPath)) {
  ctx.__wbZ = ctx.XLSX.read(fs.readFileSync(zsPath), { type: 'buffer' });
  ctx.__wbR = ctx.XLSX.read(fs.readFileSync(rfPath), { type: 'buffer' });
  vm.runInContext('DATA = mergeData(parseZhaosheng(__wbZ), parseRoomFunc(__wbR))', ctx);
  const n = vm.runInContext('DATA.classes.length', ctx);
  if (n !== 505) throw new Error('真实 Excel 班级数异常：' + n);
  el('gradeSelect').value = '小学二年级';
  vm.runInContext("campus='厦港'; queryGrade()", ctx);
  if (!el('gradeResult').innerHTML.includes('招生年级')) throw new Error('年级查询结果异常');
  console.log('端到端自检：505 班，年级查询正常');
}

console.log('OK  ' + outPath + '  ' + Buffer.byteLength(html) + ' bytes');
