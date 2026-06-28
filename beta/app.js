// ============================================
// INDONESIAN BAKERY — APP LOGIC (BETA)
// ============================================

// Global state
let app = {
  user: null,
  branch: null,
  currentMode: null,
  inputData: {}, // Track unsaved changes
  shipments: [],
  currentShipmentId: null,
};

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// INPUT MODES — Masuk / Sisa / Terjual / Retur
// ============================================

function openInput(mode) {
  app.currentMode = mode;
  app.inputData = {};

  const modeConfig = {
    masuk: { title: 'Catat Roti Masuk', icon: '⬆', banner: 'Mode: Roti Masuk', color: 'in' },
    sisa: { title: 'Catat Sisa Roti', icon: '⬇', banner: 'Mode: Sisa Roti Akhir Hari', color: 'out' },
    terjual: { title: 'Catat Penjualan', icon: '💰', banner: 'Mode: Penjualan / Terjual', color: 'out' },
    retur: { title: 'Catat Retur', icon: '🔄', banner: 'Mode: Retur / Barang Rusak', color: 'r' },
  };

  const config = modeConfig[mode];
  if (!config) return;

  document.getElementById('input-title').textContent = config.title;
  document.getElementById('input-ic').textContent = config.icon;
  document.getElementById('input-t1').textContent = config.banner;
  document.getElementById('input-banner').className = `mode-banner ${config.color}`;
  document.getElementById('input-save').className = `save-btn save-${config.color}`;

  renderInput('');
  show('input');
}

function renderInput(search = '') {
  const inputList = document.getElementById('input-list');
  
  // Get products from app state (assume already loaded)
  let products = app.products || [];
  if (search) products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const html = products.map(prod => {
    const saved = app.inputData[prod.id] || { masuk: 0, sisa: 0, terjual: 0, retur: 0 };
    
    return `
      <div class="in-row2">
        <div class="in-name">${prod.name}</div>
        <div class="in-fields">
          ${app.currentMode === 'masuk' ? `
            <div class="in-field">
              <label class="in-field-lbl produksi">Masuk (pcs)</label>
              <div class="qc">
                <button class="qb in" onclick="decrementInput('${prod.id}', 'masuk')">−</button>
                <input class="qn" type="number" id="qty-${prod.id}" value="${saved.masuk}" 
                  onchange="saveInputValue('${prod.id}', 'masuk', this.value)">
                <button class="qb in" onclick="incrementInput('${prod.id}', 'masuk')">+</button>
              </div>
            </div>
          ` : ''}
          
          ${app.currentMode === 'sisa' ? `
            <div class="in-field">
              <label class="in-field-lbl sisa">Sisa (pcs)</label>
              <div class="qc">
                <button class="qb out" onclick="decrementInput('${prod.id}', 'sisa')">−</button>
                <input class="qn" type="number" id="qty-${prod.id}" value="${saved.sisa}" 
                  onchange="saveInputValue('${prod.id}', 'sisa', this.value)">
                <button class="qb out" onclick="incrementInput('${prod.id}', 'sisa')">+</button>
              </div>
            </div>
          ` : ''}
          
          ${app.currentMode === 'terjual' ? `
            <div class="in-field">
              <label class="in-field-lbl" style="color:var(--text2)">Terjual (pcs)</label>
              <div class="qc">
                <button class="qb" style="border-color:var(--text2);color:var(--text2)" onclick="decrementInput('${prod.id}', 'terjual')">−</button>
                <input class="qn" type="number" id="qty-${prod.id}" value="${saved.terjual}" 
                  onchange="saveInputValue('${prod.id}', 'terjual', this.value)">
                <button class="qb" style="border-color:var(--text2);color:var(--text2)" onclick="incrementInput('${prod.id}', 'terjual')">+</button>
              </div>
            </div>
          ` : ''}
          
          ${app.currentMode === 'retur' ? `
            <div class="in-field">
              <label class="in-field-lbl retur">Retur (pcs)</label>
              <div class="qc">
                <button class="qb" style="border-color:#7C3AED;color:#7C3AED" onclick="decrementInput('${prod.id}', 'retur')">−</button>
                <input class="qn" type="number" id="qty-${prod.id}" value="${saved.retur}" 
                  onchange="saveInputValue('${prod.id}', 'retur', this.value)">
                <button class="qb" style="border-color:#7C3AED;color:#7C3AED" onclick="incrementInput('${prod.id}', 'retur')">+</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  inputList.innerHTML = html || '<div class="empty">Tidak ada produk</div>';
}

function incrementInput(prodId, type) {
  const input = document.getElementById(`qty-${prodId}`);
  if (!input) return;
  const val = parseInt(input.value) || 0;
  input.value = val + 1;
  saveInputValue(prodId, type, val + 1);
}

function decrementInput(prodId, type) {
  const input = document.getElementById(`qty-${prodId}`);
  if (!input) return;
  const val = parseInt(input.value) || 0;
  if (val > 0) {
    input.value = val - 1;
    saveInputValue(prodId, type, val - 1);
  }
}

function saveInputValue(prodId, type, value) {
  if (!app.inputData[prodId]) app.inputData[prodId] = { masuk: 0, sisa: 0, terjual: 0, retur: 0 };
  app.inputData[prodId][type] = parseInt(value) || 0;
}

async function saveInput() {
  if (!Object.keys(app.inputData).length) {
    alert('Tidak ada data untuk disimpan');
    return;
  }

  try {
    const records = [];
    for (const [prodId, data] of Object.entries(app.inputData)) {
      if (data[app.currentMode] > 0) {
        records.push({
          product_id: prodId,
          branch_id: app.branch.id,
          type: app.currentMode,
          quantity: data[app.currentMode],
          created_at: new Date().toISOString(),
          created_by: app.user.id,
        });
      }
    }

    if (records.length === 0) {
      alert('Tidak ada data yang diubah');
      return;
    }

    // Insert ke table 'stock_logs'
    const { error } = await supabase.from('stock_logs').insert(records);
    if (error) throw error;

    // Update stok di table 'stock'
    for (const record of records) {
      if (record.type === 'masuk') {
        // Tambah stok
        await supabase.rpc('increment_stock', {
          p_product_id: record.product_id,
          p_branch_id: record.branch_id,
          p_qty: record.quantity,
        });
      } else if (record.type === 'sisa') {
        // Update stok akhir hari
        await supabase.from('stock').update({
          current: record.quantity,
          updated_at: new Date().toISOString(),
        }).match({ product_id: record.product_id, branch_id: record.branch_id });
      } else if (record.type === 'terjual') {
        // Kurangi stok
        await supabase.rpc('decrement_stock', {
          p_product_id: record.product_id,
          p_branch_id: record.branch_id,
          p_qty: record.quantity,
        });
      } else if (record.type === 'retur') {
        // Tambah stok (return)
        await supabase.rpc('increment_stock', {
          p_product_id: record.product_id,
          p_branch_id: record.branch_id,
          p_qty: record.quantity,
        });
      }
    }

    app.inputData = {};
    show('overview');
    renderOverview();
    alert('✓ Data berhasil disimpan');
  } catch (err) {
    console.error(err);
    alert('❌ Gagal simpan: ' + err.message);
  }
}

function leaveInput() {
  if (Object.keys(app.inputData).length > 0) {
    document.getElementById('unsaved-modal').classList.add('open');
  } else {
    show('overview');
  }
}

function unsavedSimpan() {
  document.getElementById('unsaved-modal').classList.remove('open');
  saveInput();
}

function unsavedBuang() {
  app.inputData = {};
  document.getElementById('unsaved-modal').classList.remove('open');
  show('overview');
}

function unsavedBatal() {
  document.getElementById('unsaved-modal').classList.remove('open');
}

// ============================================
// SHIPMENT CONFIRMATION
// ============================================

async function openConfirmShipment(shipmentId) {
  app.currentShipmentId = shipmentId;

  try {
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('*, shipment_items(*)')
      .eq('id', shipmentId)
      .single();

    if (error) throw error;

    const confirmList = document.getElementById('confirm-ship-list');
    const html = shipment.shipment_items.map(item => `
      <div class="ship-detail-row" data-item-id="${item.product_id}">
        <div class="ship-detail-name">${item.product_name}</div>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-size:11px;color:var(--text3)">Dikirim:</span>
          <span class="ship-detail-qty">${item.qty_sent} pcs</span>
          <span style="font-size:11px;color:var(--text3)">Terima:</span>
          <input type="number" class="ih-qty-input" value="${item.qty_sent}" data-product-id="${item.product_id}">
        </div>
      </div>
    `).join('');

    confirmList.innerHTML = html;
    document.getElementById('confirm-ship-modal').classList.add('open');
  } catch (err) {
    console.error(err);
    alert('Gagal load shipment: ' + err.message);
  }
}

function closeConfirmShipModal() {
  document.getElementById('confirm-ship-modal').classList.remove('open');
  app.currentShipmentId = null;
}

async function submitConfirmShipment() {
  if (!app.currentShipmentId) return;

  try {
    const items = document.querySelectorAll('#confirm-ship-list [data-item-id]');
    const confirmed = [];
    let hasMismatch = false;

    items.forEach(item => {
      const productId = item.dataset.itemId;
      const qtyInput = item.querySelector('input[type="number"]');
      const qtySent = parseInt(item.querySelector('.ship-detail-qty').textContent);
      const qtyReceived = parseInt(qtyInput.value) || 0;

      confirmed.push({
        product_id: productId,
        qty_sent: qtySent,
        qty_received: qtyReceived,
        mismatch: qtySent !== qtyReceived,
      });

      if (qtySent !== qtyReceived) hasMismatch = true;
    });

    // 1. Update shipment status → CONFIRMED
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        status: 'confirmed',
        received_items: confirmed,
        received_at: new Date().toISOString(),
      })
      .eq('id', app.currentShipmentId);

    if (updateError) throw updateError;

    // 2. Update stok cabang penerima
    const { data: shipment } = await supabase
      .from('shipments')
      .select('target_branch_id')
      .eq('id', app.currentShipmentId)
      .single();

    for (const item of confirmed) {
      await supabase.rpc('increment_stock', {
        p_product_id: item.product_id,
        p_branch_id: shipment.target_branch_id,
        p_qty: item.qty_received,
      });
    }

    // 3. Log entry ke stock_logs
    const logRecords = confirmed.map(item => ({
      product_id: item.product_id,
      branch_id: shipment.target_branch_id,
      type: 'in_shipment',
      quantity: item.qty_received,
      reference_id: app.currentShipmentId,
      created_at: new Date().toISOString(),
      created_by: app.user.id,
    }));

    await supabase.from('stock_logs').insert(logRecords);

    closeConfirmShipModal();
    renderShipments();
    alert('✓ Penerimaan berhasil dikonfirmasi' + (hasMismatch ? ' (ada selisih)' : ''));
  } catch (err) {
    console.error(err);
    alert('❌ Gagal konfirmasi: ' + err.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function show(screenName) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(`screen-${screenName}`);
  if (screen) screen.classList.add('active');
}

async function renderOverview(search = '') {
  const overviewList = document.getElementById('overview-list');

  try {
    // Get products with current stock
    let { data: products, error } = await supabase
      .from('stock')
      .select('product_id, product:products(id,name,category), current')
      .eq('branch_id', app.branch.id);

    if (error) throw error;

    if (search) {
      products = products.filter(p => p.product.name.toLowerCase().includes(search.toLowerCase()));
    }

    const html = products.map(item => {
      const status = item.current === 0 ? 'zero' : item.current < 10 ? 'low' : 'ok';
      return `
        <div class="ov-row ${status}">
          <div class="dot dot-${status}"></div>
          <div class="ov-info">
            <div class="ov-name">${item.product.name}</div>
            <div class="ov-sub">Cat: ${item.product.category || '-'}</div>
          </div>
          <div class="ov-now ${status}">
            <b>${item.current}</b>
            <small>pcs</small>
          </div>
        </div>
      `;
    }).join('');

    overviewList.innerHTML = html || '<div class="empty">Tidak ada produk</div>';
  } catch (err) {
    console.error(err);
    overviewList.innerHTML = '<div class="empty">Gagal muat data</div>';
  }
}

async function renderShipments() {
  const shipList = document.getElementById('ship-list');

  try {
    const { data: shipments, error } = await supabase
      .from('shipments')
      .select('*, source_branch:source_branch_id(name), target_branch:target_branch_id(name)')
      .eq('target_branch_id', app.branch.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    app.shipments = shipments;

    const html = shipments.map(ship => {
      const statusClass = ship.status === 'pending' ? 'pending' : ship.status === 'confirmed' ? 'confirmed' : 'selisih';
      return `
        <div class="ship-card">
          <div class="ship-card-top">
            <div>
              <div class="ship-route">📦 Dari ${ship.source_branch.name}</div>
              <div class="ship-date">${new Date(ship.created_at).toLocaleDateString('id-ID')}</div>
            </div>
            <div class="ship-status ${statusClass}">${ship.status.toUpperCase()}</div>
          </div>
          <div class="ship-meta">${ship.shipment_items?.length || 0} item</div>
          ${ship.status === 'pending' ? `
            <button class="add-btn" style="margin-top:8px;width:100%" onclick="openConfirmShipment('${ship.id}')">
              ✓ Konfirmasi Penerimaan
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    shipList.innerHTML = html || '<div class="empty">Tidak ada pengiriman</div>';
  } catch (err) {
    console.error(err);
    shipList.innerHTML = '<div class="empty">Gagal muat pengiriman</div>';
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth & load user data
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    show('login');
    return;
  }

  app.user = data.user;
  show('overview');

  // Load products
  const { data: products } = await supabase.from('products').select('*');
  app.products = products || [];

  renderOverview();
});
