const htmlInput = document.getElementById('html-input');
const previewContainer = document.getElementById('preview-container');
const previewBtn = document.getElementById('preview-btn');
const convertBtn = document.getElementById('convert-btn');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const fileNameEl = document.getElementById('file-name');
const sizeInfoEl = document.getElementById('size-info');
const syncBtn = document.getElementById('sync-btn');
const toolbar = document.getElementById('toolbar');
const fontSizeInput = document.getElementById('font-size-input');
const applyFontSizeBtn = document.getElementById('apply-font-size');
const textColorInput = document.getElementById('text-color');
const bgColorInput = document.getElementById('bg-color');
const colorPreview = document.getElementById('color-preview');
const bgColorPreview = document.getElementById('bgcolor-preview');
const H2C_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
let currentWidth = 0, currentHeight = 0;

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
  });
});

function getEditDoc() { const f = document.getElementById('preview-frame'); return f ? f.contentDocument : null; }
function focusIframe() { const f = document.getElementById('preview-frame'); if (f) f.contentWindow.focus(); }
function exec(cmd, value = null) { const doc = getEditDoc(); if (!doc) return; focusIframe(); doc.execCommand(cmd, false, value); updateToolbarState(); }

function applyFontSize(px) {
  const doc = getEditDoc(); if (!doc || !px) return; focusIframe();
  doc.execCommand('fontSize', false, '7');
  doc.querySelectorAll('font[size="7"]').forEach(el => {
    const span = doc.createElement('span'); span.style.fontSize = px + 'px';
    while (el.firstChild) span.appendChild(el.firstChild);
    el.parentNode.replaceChild(span, el);
  });
}

function updateToolbarState() {
  const doc = getEditDoc(); if (!doc) return;
  ['bold','italic','underline','justifyLeft','justifyCenter','justifyRight'].forEach(cmd => {
    document.querySelector(`[data-cmd="${cmd}"]`)?.classList.toggle('active', doc.queryCommandState(cmd));
  });
}

toolbar.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => btn.addEventListener('click', () => exec(btn.dataset.cmd)));
applyFontSizeBtn.addEventListener('click', () => { if (fontSizeInput.value) applyFontSize(fontSizeInput.value); });
fontSizeInput.addEventListener('keydown', e => { if (e.key === 'Enter' && fontSizeInput.value) { focusIframe(); applyFontSize(fontSizeInput.value); e.preventDefault(); } });

textColorInput.addEventListener('input', () => { colorPreview.style.borderBottomColor = textColorInput.value; colorPreview.style.color = textColorInput.value; });
textColorInput.addEventListener('change', () => exec('foreColor', textColorInput.value));
document.querySelector('.color-btn').addEventListener('click', e => { if (e.target !== textColorInput) textColorInput.click(); });
bgColorInput.addEventListener('input', () => { bgColorPreview.style.background = bgColorInput.value; });
bgColorInput.addEventListener('change', () => exec('hiliteColor', bgColorInput.value));
document.querySelectorAll('.color-btn')[1]?.addEventListener('click', e => { if (e.target !== bgColorInput) bgColorInput.click(); });

function bindIframeEvents(iframe) {
  try {
    const doc = iframe.contentDocument;
    doc.addEventListener('keyup', updateToolbarState);
    doc.addEventListener('mouseup', updateToolbarState);
    doc.addEventListener('selectionchange', updateToolbarState);
  } catch (_) {}
}

function updatePreview(html) {
  if (!html.trim()) return;
  previewContainer.innerHTML = ''; convertBtn.disabled = true; sizeInfoEl.textContent = '計測中...';
  const containerW = previewContainer.clientWidth || 900;
  const iframe = document.createElement('iframe');
  iframe.id = 'preview-frame';
  iframe.style.cssText = `border:none;display:block;width:${containerW}px;height:600px;`;
  previewContainer.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  function measure() {
    const root = doc.documentElement, body = doc.body;
    const w = Math.max(root?.scrollWidth||0, root?.offsetWidth||0, body?.scrollWidth||0, body?.offsetWidth||0) || containerW;
    const h = Math.max(root?.scrollHeight||0, root?.offsetHeight||0, body?.scrollHeight||0, body?.offsetHeight||0) || 600;
    currentWidth = w; currentHeight = h;
    iframe.style.width = w + 'px'; iframe.style.height = h + 'px';
    sizeInfoEl.textContent = `${w} × ${h} px`;
    convertBtn.disabled = false; doc.designMode = 'on'; bindIframeEvents(iframe);
  }
  try { iframe.contentWindow.addEventListener('load', () => setTimeout(measure, 50)); } catch (_) {}
  setTimeout(measure, 400);
}

previewBtn.addEventListener('click', () => updatePreview(htmlInput.value));
htmlInput.addEventListener('input', () => { if (htmlInput.value.trim()) updatePreview(htmlInput.value); });
syncBtn.addEventListener('click', () => {
  const f = document.getElementById('preview-frame'); if (!f) return;
  htmlInput.value = '<!DOCTYPE html>\n' + f.contentDocument.documentElement.outerHTML;
  syncBtn.textContent = '✅ 同期しました'; setTimeout(() => { syncBtn.textContent = '← コードに同期'; }, 1500);
});

// 画像パネル
const imageFileInput = document.getElementById('image-file-input');
const imageUploadArea = document.getElementById('image-upload-area');
const imageThumbs = document.getElementById('image-thumbs');
const insertPanel = document.getElementById('insert-panel');
const insertPanelTitle = document.getElementById('insert-panel-title');
const insertPreviewImg = document.getElementById('insert-preview');
const insertTarget = document.getElementById('insert-target');
const insertWidth = document.getElementById('insert-width');
const insertHeight = document.getElementById('insert-height');
const insertExecute = document.getElementById('insert-execute');
const insertCancel = document.getElementById('insert-cancel');
const insertClose = document.getElementById('insert-close');
let activeInsertDataUrl = null;

function readImageAsBase64(file) {
  return new Promise(resolve => { const r = new FileReader(); r.onload = e => resolve(e.target.result); r.readAsDataURL(file); });
}

function refreshInsertTargets() {
  while (insertTarget.options.length > 2) insertTarget.remove(2);
  const f = document.getElementById('preview-frame'); if (!f) return;
  const imgs = Array.from(f.contentDocument.querySelectorAll('img')); if (!imgs.length) return;
  const sep = document.createElement('option'); sep.disabled = true; sep.textContent = '── 既存の画像と差し替え ──';
  insertTarget.appendChild(sep);
  imgs.forEach((img, i) => {
    const opt = document.createElement('option'); opt.value = `replace-${i}`;
    opt.textContent = img.alt ? `画像${i+1}「${img.alt}」` : `画像${i+1}`;
    insertTarget.appendChild(opt);
  });
}

function openInsertPanel(name, dataUrl) {
  activeInsertDataUrl = dataUrl; insertPanelTitle.textContent = `📷 ${name}`;
  insertPreviewImg.src = dataUrl; insertWidth.value = ''; insertHeight.value = '';
  refreshInsertTargets(); insertPanel.classList.remove('hidden');
  insertPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeInsertPanel() { insertPanel.classList.add('hidden'); activeInsertDataUrl = null; }
insertClose.addEventListener('click', closeInsertPanel);
insertCancel.addEventListener('click', closeInsertPanel);

insertExecute.addEventListener('click', () => {
  const f = document.getElementById('preview-frame'); if (!f || !activeInsertDataUrl) return;
  const doc = f.contentDocument;
  const w = insertWidth.value ? `${insertWidth.value}px` : '100%';
  const h = insertHeight.value ? `${insertHeight.value}px` : 'auto';
  const style = `max-width:100%;width:${w};height:${h};`;
  const target = insertTarget.value;
  if (target === 'end') { const img = doc.createElement('img'); img.src = activeInsertDataUrl; img.style.cssText = style; doc.body.appendChild(img); }
  else if (target === 'start') { const img = doc.createElement('img'); img.src = activeInsertDataUrl; img.style.cssText = style; doc.body.insertBefore(img, doc.body.firstChild); }
  else if (target.startsWith('replace-')) { const idx = parseInt(target.replace('replace-','')); const ex = doc.querySelectorAll('img')[idx]; if (ex) { ex.src = activeInsertDataUrl; ex.style.cssText = style; } }
  setTimeout(() => {
    const root = doc.documentElement, body = doc.body;
    const h2 = Math.max(root.scrollHeight, body?.scrollHeight||0);
    currentHeight = h2; f.style.height = h2+'px'; sizeInfoEl.textContent = `${currentWidth} × ${h2} px`;
  }, 150);
  closeInsertPanel();
});

async function processImageFiles(files) {
  for (const file of files) { if (!file.type.startsWith('image/')) continue; const dataUrl = await readImageAsBase64(file); addImageThumb(file.name, dataUrl); }
}

function addImageThumb(name, dataUrl) {
  const item = document.createElement('div'); item.className = 'image-thumb-item'; item.title = `${name}\nクリックして挿入設定を開く`;
  const img = document.createElement('img'); img.className = 'image-thumb-img'; img.src = dataUrl; img.alt = name;
  const label = document.createElement('div'); label.className = 'image-thumb-name'; label.textContent = name;
  const del = document.createElement('button'); del.className = 'image-thumb-del'; del.textContent = '×';
  del.onclick = e => { e.stopPropagation(); item.remove(); };
  item.addEventListener('click', () => openInsertPanel(name, dataUrl));
  item.append(img, label, del); imageThumbs.appendChild(item);
}

imageFileInput.addEventListener('change', e => processImageFiles(Array.from(e.target.files)));
imageUploadArea.addEventListener('dragover', e => { e.preventDefault(); imageUploadArea.classList.add('drag-over'); });
imageUploadArea.addEventListener('dragleave', () => imageUploadArea.classList.remove('drag-over'));
imageUploadArea.addEventListener('drop', e => { e.preventDefault(); imageUploadArea.classList.remove('drag-over'); processImageFiles(Array.from(e.dataTransfer.files)); });

fileInput.addEventListener('change', e => { const f = e.target.files[0]; if (f) loadFile(f); });
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f && (f.name.endsWith('.html')||f.name.endsWith('.htm'))) loadFile(f); else alert('.html または .htm ファイルをアップロードしてください'); });

function loadFile(file) {
  const reader = new FileReader(); reader.onload = e => { htmlInput.value = e.target.result; fileNameEl.textContent = '読み込み済み: '+file.name; updatePreview(e.target.result); }; reader.readAsText(file, 'UTF-8');
}

convertBtn.addEventListener('click', async () => {
  const editIframe = document.getElementById('preview-frame'); if (!editIframe) return;
  const editDoc = editIframe.contentDocument;
  editDoc.designMode = 'off';
  const currentHtml = '<!DOCTYPE html>' + editDoc.documentElement.outerHTML;
  editDoc.designMode = 'on';
  convertBtn.classList.add('loading');
  convertBtn.querySelector('.btn-icon').textContent = '';
  if (convertBtn.childNodes[1]) convertBtn.childNodes[1].textContent = ' 変換中...';
  const captureFrame = document.createElement('iframe');
  captureFrame.style.cssText = `position:fixed;left:-9999px;top:0;border:none;width:${currentWidth}px;height:${currentHeight}px;visibility:hidden;pointer-events:none;`;
  document.body.appendChild(captureFrame);
  try {
    const captureDoc = captureFrame.contentDocument;
    captureDoc.open(); captureDoc.write(currentHtml); captureDoc.close();
    await new Promise(resolve => { let done=false; const finish=()=>{if(!done){done=true;resolve();}}; try{captureFrame.contentWindow.addEventListener('load',finish);}catch(_){} setTimeout(finish,800); });
    const captureWin = captureFrame.contentWindow;
    await new Promise(resolve => {
      const imgs = Array.from(captureDoc.querySelectorAll('img')); if (!imgs.length){resolve();return;}
      let rem=imgs.length; const done=()=>{if(--rem<=0)resolve();};
      imgs.forEach(img=>{ if(img.complete)done(); else{img.addEventListener('load',done);img.addEventListener('error',done);} });
      setTimeout(resolve,4000);
    });
    if (!captureWin.html2canvas) {
      await new Promise((resolve,reject)=>{ const s=captureDoc.createElement('script'); s.src=H2C_CDN; s.onload=resolve; s.onerror=()=>reject(new Error('html2canvas読み込み失敗')); captureDoc.head.appendChild(s); });
    }
    const root=captureDoc.documentElement, body=captureDoc.body;
    const w=Math.max(root.scrollWidth,body?.scrollWidth||0)||currentWidth;
    const h=Math.max(root.scrollHeight,body?.scrollHeight||0)||currentHeight;
    captureFrame.style.width=w+'px'; captureFrame.style.height=h+'px'; captureWin.scrollTo(0,0);
    const canvas = await captureWin.html2canvas(root,{scale:2,useCORS:true,backgroundColor:'#ffffff',width:w,height:h,windowWidth:w,windowHeight:h,scrollX:0,scrollY:0,x:0,y:0});
    const link=document.createElement('a'); link.download='converted-'+Date.now()+'.png'; link.href=canvas.toDataURL('image/png'); link.click();
    sizeInfoEl.textContent=`${w} × ${h} px`; currentWidth=w; currentHeight=h;
  } catch(err) { console.error(err); alert('変換中にエラーが発生しました:\n'+err.message); }
  finally {
    document.body.removeChild(captureFrame);
    convertBtn.classList.remove('loading');
    convertBtn.querySelector('.btn-icon').textContent='🖼️';
    if(convertBtn.childNodes[1])convertBtn.childNodes[1].textContent=' PNGに変換してダウンロード';
  }
});