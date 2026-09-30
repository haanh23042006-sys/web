/**
 * ARTFAIR - Hội Chợ Nghệ Thuật Mở Trực Tuyến
 * Complete Interactive Application Logic
 */

// =============================================================================
// 1. DATA REPOSITORY: 15 REAL ARTWORKS IN WORKSPACE
// =============================================================================
// =============================================================================
// 1. DATA REPOSITORY: 15 REAL ARTWORKS IN WORKSPACE
// Sourced centrally from artists-data.js (window.ARTWORKS_DATABASE)
// =============================================================================
var ARTWORKS_DATABASE = (typeof window !== 'undefined' && window.ARTWORKS_DATABASE) ? window.ARTWORKS_DATABASE : (typeof ARTWORKS_DATABASE !== 'undefined' ? ARTWORKS_DATABASE : []);

// 2. STATE MANAGEMENT & GUEST INTERCEPT CORE
// =============================================================================
const APP_STATE = {
  // Authentication: null means Guest
  currentUser: null,
  
  // Intercept Queue: holds actions requested by guest
  pendingIntent: null,
  
  // User Collections & Cart
  favorites: new Set(),
  cart: [],
  appliedCoupon: null,
  discountRate: 0,
  
  // Filter States
  currentCategory: 'all',
  searchQuery: '',
  priceRange: 'all',
  licenseType: 'all',
  sortBy: 'featured',
  activeKeyword: null,
  
  // Currently inspected artwork in detail modal
  selectedArtwork: null,
  selectedDetailTier: 'personal',
  
  // OTP Verification state
  otpCode: '888666',
  otpTimerInterval: null,
  otpCountdown: 60
};

// =============================================================================
// 3. INITIALIZATION ON DOM READY
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initAnnouncementBar();
  loadLocalStorageSession();
  setupImageProtection();
  initUIComponents();
  initSearchAndFilters();
  initCalculator();
  initDropzone();
  initHomeCommissionSection();
  setupAccessibleLinks();
  renderArtworkGallery();
  updateHeaderCounters();
});

// Top Announcement Bar with localStorage persistence
function initAnnouncementBar() {
  const isClosed = localStorage.getItem('artfair_announcement_closed');
  const bar = document.getElementById('topAnnouncementBar');
  if (bar && isClosed === 'true') {
    bar.style.display = 'none';
  }
}

function closeTopAnnouncement() {
  const bar = document.getElementById('topAnnouncementBar');
  if (bar) {
    bar.style.display = 'none';
    localStorage.setItem('artfair_announcement_closed', 'true');
  }
}

// Global handler to prevent jumping on href="#" links
function setupAccessibleLinks() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href="#"]');
    if (link) {
      e.preventDefault();
    }
  });
}

// Load user session from localStorage
function loadLocalStorageSession() {
  try {
    const savedUser = localStorage.getItem('artfair_user');
    if (savedUser) {
      APP_STATE.currentUser = JSON.parse(savedUser);
      loginUserSuccess(APP_STATE.currentUser, false);
    }
    const savedCart = localStorage.getItem('artfair_cart');
    if (savedCart) {
      APP_STATE.cart = JSON.parse(savedCart);
    }
    const savedFavs = localStorage.getItem('artfair_favs');
    if (savedFavs) {
      APP_STATE.favorites = new Set(JSON.parse(savedFavs));
    }
  } catch (e) {
    console.warn('Storage load fallback', e);
  }
}

function saveLocalStorageSession() {
  try {
    if (APP_STATE.currentUser) {
      localStorage.setItem('artfair_user', JSON.stringify(APP_STATE.currentUser));
    } else {
      localStorage.removeItem('artfair_user');
    }
    localStorage.setItem('artfair_cart', JSON.stringify(APP_STATE.cart));
    localStorage.setItem('artfair_favs', JSON.stringify([...APP_STATE.favorites]));
  } catch (e) {
    console.warn('Storage save fallback', e);
  }
}

// Copyright protection against right-click and drag
function setupImageProtection() {
  document.addEventListener('contextmenu', (e) => {
    if (e.target.matches('img, .card-media-wrapper, .artwork-card, .detail-img-viewport, .showcase-img, .art-watermark-overlay')) {
      e.preventDefault();
      showToast('⚠️ Hình ảnh được bảo hộ bản quyền bởi ARTFAIR. Vui lòng mua bản quyền để tải file gốc chất lượng cao.', 'warning');
    }
  });

  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  });
}

// Setup global UI listeners and helpers
function initUIComponents() {
  // Mobile Nav Drawer Toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileNavDrawer');
  const closeMobileNav = document.getElementById('closeMobileNav');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => mobileDrawer.classList.add('active'));
    closeMobileNav.addEventListener('click', () => mobileDrawer.classList.remove('active'));
    
    // Close on link click
    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => mobileDrawer.classList.remove('active'));
    });
  }

  // Header Dropdown Toggle
  const avatarPill = document.getElementById('userAvatarPill');
  const dropdownMenu = document.getElementById('userDropdownMenu');
  if (avatarPill && dropdownMenu) {
    avatarPill.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdownMenu.classList.remove('show'));
  }

  // Logout button
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      handleUserLogout();
    });
  }

  // Header Auth Open buttons
  document.getElementById('btnOpenLogin').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('btnOpenRegister').addEventListener('click', () => openAuthModal('register'));
  document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);

  // Close modals on overlay backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // Artwork Detail Modal Close
  document.getElementById('closeDetailModal').addEventListener('click', () => {
    document.getElementById('artworkDetailModalOverlay').classList.remove('active');
  });

  // Cart Drawer
  document.getElementById('btnHeaderCart').addEventListener('click', openCartDrawer);
  document.getElementById('closeCartDrawer').addEventListener('click', closeCartDrawer);
  document.getElementById('cartDrawerOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('cartDrawerOverlay')) closeCartDrawer();
  });

  // Header Favorite button opens toast or filtered view
  document.getElementById('btnHeaderFavorites').addEventListener('click', () => {
    if (APP_STATE.favorites.size === 0) {
      showToast('Bộ sưu tập yêu thích đang trống. Hãy thả tim cho tác phẩm bạn yêu thích!', 'info');
    } else {
      filterByFavorites();
    }
  });

  // Image Zoom Lens Setup
  setupImageZoomLens();
  
  // OTP Digits Auto-focus setup
  setupOtpDigitInputs();
}

// =============================================================================
// 4. GUEST INTERCEPT SYSTEM (REQUIRE AUTH)
// =============================================================================
/**
 * Intercepts protected actions if user is guest (not logged in).
 * If authenticated, runs callback immediately.
 * If guest, saves intent, displays modal with notice, and alerts user.
 */
function requireAuth(actionDesc, callback, redirectUrl = null) {
  if (APP_STATE.currentUser) {
    // Already authenticated, proceed
    callback();
    return true;
  }

  // Guest Intercept Triggered
  APP_STATE.pendingIntent = {
    action: actionDesc,
    callback: callback,
    redirectUrl: redirectUrl || window.location.href
  };

  // Show Intercept Notice inside Modal
  const noticeBox = document.getElementById('guestInterceptNotice');
  const actionText = document.getElementById('interceptActionDesc');
  if (noticeBox && actionText) {
    noticeBox.style.display = 'flex';
    actionText.textContent = `Thao tác "${actionDesc}" yêu cầu đăng nhập tài khoản. Vui lòng đăng nhập để tiếp tục mà không làm gián đoạn trải nghiệm của bạn.`;
  }

  openAuthModal('login');
  showToast(`Vui lòng đăng nhập để thực hiện: ${actionDesc}`, 'warning');
  return false;
}

// Resume and execute the pending action after login
function executePendingIntent() {
  if (APP_STATE.pendingIntent && typeof APP_STATE.pendingIntent.callback === 'function') {
    const intent = APP_STATE.pendingIntent;
    APP_STATE.pendingIntent = null;
    showToast(`Đã khôi phục thao tác: ${intent.action}`, 'success');
    setTimeout(() => {
      intent.callback();
    }, 350);
  }
}

// =============================================================================
// 5. AUTHENTICATION & SOCIAL LOGIN LOGIC
// =============================================================================
function openAuthModal(defaultTab = 'login') {
  const modal = document.getElementById('authModalOverlay');
  modal.classList.add('active');
  switchAuthTab(defaultTab);
}

function closeAuthModal() {
  const modal = document.getElementById('authModalOverlay');
  modal.classList.remove('active');
  // Hide intercept banner on clean close
  document.getElementById('guestInterceptNotice').style.display = 'none';
}

function switchAuthTab(tabName) {
  const tabBtnLogin = document.getElementById('tabBtnLogin');
  const tabBtnRegister = document.getElementById('tabBtnRegister');
  const paneLogin = document.getElementById('paneLogin');
  const paneRegister = document.getElementById('paneRegister');
  const paneOtp = document.getElementById('paneOtp');

  // Reset active classes
  tabBtnLogin.classList.remove('active');
  tabBtnRegister.classList.remove('active');
  paneLogin.classList.remove('active');
  paneRegister.classList.remove('active');
  paneOtp.classList.remove('active');

  if (tabName === 'login') {
    tabBtnLogin.classList.add('active');
    paneLogin.classList.add('active');
  } else if (tabName === 'register') {
    tabBtnRegister.classList.add('active');
    paneRegister.classList.add('active');
  } else if (tabName === 'otp') {
    paneOtp.classList.add('active');
    startOtpCountdown();
    setTimeout(() => {
      const firstInp = document.querySelector('.otp-digit-input');
      if (firstInp) {
        firstInp.focus();
        firstInp.select();
      }
    }, 150);
  }
}

function togglePasswordVisibility(fieldId) {
  const input = document.getElementById(fieldId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

// Handle Traditional Login
function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  
  // Authenticate user
  loginUserSuccess({
    name: email.split('@')[0] || 'Nghệ Sĩ Trẻ',
    email: email,
    role: 'creator',
    roleLabel: 'Họa Sĩ / Designer Pro',
    avatar: '2e72c41b49afad2d08530b6a0475ba66.jpg'
  });
}

// Handle Registration Form (Smooth Transition to 6-digit OTP)
function handleRegisterSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('regFullName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const role = document.getElementById('regRole').value;

  // Set target email in OTP view
  document.getElementById('otpTargetEmail').textContent = email;

  // Stash temp user data
  window._pendingRegUser = {
    name: name,
    email: email,
    role: role,
    roleLabel: role === 'artist' ? 'Họa Sĩ Tự Do' : 'Chủ Shop POD',
    avatar: role === 'artist' ? '34afaac0faa70a1bb6c4b5ad89b77756-2.jpg' : '2e72c41b49afad2d08530b6a0475ba66.jpg'
  };

  // Transition to OTP screen
  switchAuthTab('otp');
  showToast('Mã xác thực OTP bảo mật 6 số đã được gửi tới email: ' + email, 'info');
}

// Setup 6-digit OTP Inputs
function setupOtpDigitInputs() {
  const container = document.getElementById('otpDigitsBox');
  if (!container) return;

  const inputs = container.querySelectorAll('.otp-digit-input');

  inputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val.length > 0) {
        // Move to next input
        if (idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });

    // Handle paste event
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d{6}$/.test(pasteData)) {
        pasteData.split('').forEach((char, i) => {
          if (inputs[i]) inputs[i].value = char;
        });
        inputs[inputs.length - 1].focus();
      }
    });
  });
}

function startOtpCountdown() {
  clearInterval(APP_STATE.otpTimerInterval);
  APP_STATE.otpCountdown = 60;
  const timerLabel = document.getElementById('otpTimerVal');
  const resendBtn = document.getElementById('btnResendOtp');
  if (resendBtn) resendBtn.disabled = true;

  APP_STATE.otpTimerInterval = setInterval(() => {
    APP_STATE.otpCountdown--;
    if (timerLabel) {
      const seconds = APP_STATE.otpCountdown < 10 ? `0${APP_STATE.otpCountdown}` : APP_STATE.otpCountdown;
      timerLabel.textContent = `00:${seconds}s`;
    }

    if (APP_STATE.otpCountdown <= 0) {
      clearInterval(APP_STATE.otpTimerInterval);
      if (resendBtn) resendBtn.disabled = false;
      if (timerLabel) timerLabel.textContent = 'Gửi lại mã';
    }
  }, 1000);
}

function resendOtpCode() {
  startOtpCountdown();
  showToast('Đã gửi lại mã xác thực OTP mới đến email của bạn!', 'info');
  const inputs = document.querySelectorAll('.otp-digit-input');
  inputs.forEach(inp => inp.value = '');
  if (inputs.length > 0) inputs[0].focus();
}

function resendOtpCode() {
  startOtpCountdown();
  showToast('Đã gửi lại mã xác thực OTP mới đến email của bạn!', 'info');
}

function verifyOtpCode() {
  const inputs = document.querySelectorAll('.otp-digit-input');
  let enteredCode = '';
  inputs.forEach(inp => enteredCode += inp.value);

  if (enteredCode.length < 6) {
    showToast('Vui lòng nhập đủ 6 chữ số mã OTP!', 'warning');
    return;
  }

  // Verification passed
  showToast('Xác thực OTP thành công!', 'success');
  const newUser = window._pendingRegUser || {
    name: 'Thành Viên Mới',
    email: 'user@artfair.vn',
    role: 'creator',
    roleLabel: 'Gen Z Creator',
    avatar: '45fbff086b31157aa2e23b94f086bd06.jpg'
  };

  loginUserSuccess(newUser);
}

// Social SSO Login: Google SSO
function handleGoogleLogin() {
  showToast('Chuyển hướng đến cổng đăng nhập Google Accounts...', 'info');
  // Requirement: Click opens actual redirect to https://accounts.google.com
  setTimeout(() => {
    window.location.href = 'https://accounts.google.com';
  }, 800);
}

// Social SSO Login: Facebook Login
function handleFacebookLogin() {
  showToast('Chuyển hướng đến cổng đăng nhập Facebook...', 'info');
  // Requirement: Click opens actual redirect to https://www.facebook.com/login
  setTimeout(() => {
    window.location.href = 'https://www.facebook.com/login';
  }, 800);
}

// 1-Click Fast Demo Login for Testers
function quickDemoLogin(type) {
  if (type === 'artist') {
    loginUserSuccess({
      name: 'Minh Trí (Artist)',
      email: 'minhtri.art@artfair.vn',
      role: 'artist',
      roleLabel: 'Họa Sĩ Nổi Bật • Pro Studio',
      avatar: '34afaac0faa70a1bb6c4b5ad89b77756-2.jpg'
    });
  } else {
    loginUserSuccess({
      name: 'Hoàng My (POD Shop)',
      email: 'my.streetwear@gmail.com',
      role: 'collector',
      roleLabel: 'Chủ Shop POD Gen Z • Gold Member',
      avatar: '2e72c41b49afad2d08530b6a0475ba66.jpg'
    });
  }
}

// Login Success State Update
function loginUserSuccess(userObj, shouldToast = true) {
  APP_STATE.currentUser = userObj;
  saveLocalStorageSession();

  // Update UI Elements
  const guestBox = document.getElementById('guestActions');
  const profileZone = document.getElementById('loggedInProfile');
  if (guestBox) guestBox.style.display = 'none';
  if (profileZone) profileZone.style.display = 'block';

  const nameLbl = document.getElementById('userNameLabel');
  const dropName = document.getElementById('dropdownUserName');
  const dropRole = document.getElementById('dropdownUserRole');
  const userAvatar = document.getElementById('userAvatarImg');

  if (nameLbl) nameLbl.textContent = userObj.name;
  if (dropName) dropName.textContent = userObj.name;
  if (dropRole) dropRole.textContent = userObj.roleLabel;
  if (userObj.avatar && userAvatar) {
    userAvatar.src = userObj.avatar;
  }

  closeAuthModal();
  if (shouldToast) {
    showToast(`Xin chào mừng ${userObj.name} đã gia nhập ARTFAIR!`, 'success');
  }

  // Resume intercepted action
  executePendingIntent();
}

// Logout
function handleUserLogout() {
  APP_STATE.currentUser = null;
  saveLocalStorageSession();
  const guestBox = document.getElementById('guestActions');
  const profileZone = document.getElementById('loggedInProfile');
  const userMenu = document.getElementById('userDropdownMenu');

  if (guestBox) guestBox.style.display = 'flex';
  if (profileZone) profileZone.style.display = 'none';
  if (userMenu) userMenu.classList.remove('show');
  showToast('Bạn đã đăng xuất tài khoản an toàn.', 'info');
}

function handleForgotPassword(event) {
  event.preventDefault();
  const email = prompt('Vui lòng nhập email đăng ký tài khoản để nhận link đặt lại mật khẩu:', 'demo@artfair.vn');
  if (email) {
    showToast(`Đã gửi hướng dẫn khôi phục mật khẩu đến: ${email}`, 'success');
  }
}

// =============================================================================
// 6. GALLERY RENDERING, ADVANCED SEARCH & FILTERING
// =============================================================================
function initSearchAndFilters() {
  const searchInput = document.getElementById('headerSearchInput');
  const clearBtn = document.getElementById('searchClearBtn');

  // Search input live handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      APP_STATE.searchQuery = e.target.value.trim().toLowerCase();
      if (clearBtn) {
        clearBtn.style.display = APP_STATE.searchQuery ? 'block' : 'none';
      }
      renderArtworkGallery();
    });

    // Keyboard shortcut '/'
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      APP_STATE.searchQuery = '';
      clearBtn.style.display = 'none';
      renderArtworkGallery();
    });
  }

  // Category Tabs click listeners
  const tabs = document.querySelectorAll('.category-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      APP_STATE.currentCategory = tab.dataset.category;
      renderArtworkGallery();
    });
  });

  // Price select
  document.getElementById('priceFilterSelect').addEventListener('change', (e) => {
    APP_STATE.priceRange = e.target.value;
    renderArtworkGallery();
  });

  // License type select
  document.getElementById('licenseTypeSelect').addEventListener('change', (e) => {
    APP_STATE.licenseType = e.target.value;
    renderArtworkGallery();
  });

  // Sort select
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    APP_STATE.sortBy = e.target.value;
    renderArtworkGallery();
  });

  // Reset filters button
  document.getElementById('btnResetFilters').addEventListener('click', resetAllFilters);

  // Keyword chips
  document.querySelectorAll('.keyword-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.classList.contains('active')) {
        chip.classList.remove('active');
        APP_STATE.activeKeyword = null;
      } else {
        document.querySelectorAll('.keyword-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        APP_STATE.activeKeyword = chip.dataset.keyword;
      }
      renderArtworkGallery();
    });
  });
}

function resetAllFilters() {
  APP_STATE.searchQuery = '';
  APP_STATE.currentCategory = 'all';
  APP_STATE.priceRange = 'all';
  APP_STATE.licenseType = 'all';
  APP_STATE.sortBy = 'featured';
  APP_STATE.activeKeyword = null;

  const searchInput = document.getElementById('headerSearchInput');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = 'none';

  document.querySelectorAll('.category-tab-btn').forEach((tab, i) => {
    tab.classList.toggle('active', i === 0);
  });
  document.querySelectorAll('.keyword-chip').forEach(chip => chip.classList.remove('active'));
  document.getElementById('priceFilterSelect').value = 'all';
  document.getElementById('licenseTypeSelect').value = 'all';
  document.getElementById('sortSelect').value = 'featured';

  renderArtworkGallery();
  showToast('Đã đặt lại toàn bộ bộ lọc về mặc định.', 'info');
}

function filterByCategory(cat) {
  const tabs = document.querySelectorAll('.category-tab-btn');
  tabs.forEach(tab => {
    if (tab.dataset.category === cat) {
      tab.click();
    }
  });
}

function filterByFavorites() {
  APP_STATE.currentCategory = 'favorites';
  renderArtworkGallery();
}

/**
 * Filter and Sort logic
 */
function getFilteredArtworks() {
  return ARTWORKS_DATABASE.filter(item => {
    // 1. Favorites check
    if (APP_STATE.currentCategory === 'favorites') {
      if (!APP_STATE.favorites.has(item.id)) return false;
    } 
    // 2. Category check
    else if (APP_STATE.currentCategory !== 'all' && item.category !== APP_STATE.currentCategory) {
      return false;
    }

    // 3. Search query check (Semantic search across title, artist, tags, category)
    if (APP_STATE.searchQuery) {
      const q = APP_STATE.searchQuery;
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchArtist = item.artist.toLowerCase().includes(q);
      const matchTags = item.tags.some(t => t.toLowerCase().includes(q));
      const matchCat = item.categoryName.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      if (!matchTitle && !matchArtist && !matchTags && !matchCat && !matchDesc) {
        return false;
      }
    }

    // 4. Keyword tag check
    if (APP_STATE.activeKeyword) {
      const kw = APP_STATE.activeKeyword.toLowerCase();
      const hasTag = item.tags.some(t => t.toLowerCase().includes(kw));
      if (!hasTag) return false;
    }

    // 5 & 6. Synchronized Price Range & License Filters (no gap between tiers)
    let targetPrice = item.basePrice;
    if (APP_STATE.licenseType === 'commercial') {
      targetPrice = item.commercialPrice;
    } else if (APP_STATE.licenseType === 'extended') {
      targetPrice = item.extendedPrice;
    } else if (APP_STATE.licenseType === 'exclusive') {
      targetPrice = item.exclusivePrice;
    }

    // License filtering
    if (APP_STATE.licenseType === 'personal' && item.basePrice > 120) return false;
    if (APP_STATE.licenseType === 'commercial' && !item.commercialPrice) return false;
    if (APP_STATE.licenseType === 'extended' && !item.extendedPrice) return false;
    if (APP_STATE.licenseType === 'exclusive' && !item.exclusivePrice) return false;

    // Price range filtering
    if (APP_STATE.priceRange === 'under100') {
      if (APP_STATE.licenseType === 'all') {
        if (item.basePrice >= 100) return false;
      } else {
        if (targetPrice >= 100) return false;
      }
    } else if (APP_STATE.priceRange === '100to300') {
      if (APP_STATE.licenseType === 'all') {
        const inRange = (item.basePrice >= 100 && item.basePrice <= 300) ||
                        (item.commercialPrice >= 100 && item.commercialPrice <= 300);
        if (!inRange) return false;
      } else {
        if (targetPrice < 100 || targetPrice > 300) return false;
      }
    } else if (APP_STATE.priceRange === '300to1000') {
      if (APP_STATE.licenseType === 'all') {
        const inRange = (item.commercialPrice >= 300 && item.commercialPrice <= 1000) ||
                        (item.extendedPrice >= 300 && item.extendedPrice <= 1000);
        if (!inRange) return false;
      } else {
        if (targetPrice < 300 || targetPrice > 1000) return false;
      }
    } else if (APP_STATE.priceRange === 'above1000') {
      if (APP_STATE.licenseType === 'all') {
        if (item.exclusivePrice < 1000) return false;
      } else {
        if (targetPrice < 1000) return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (APP_STATE.sortBy === 'price-asc') return a.basePrice - b.basePrice;
    if (APP_STATE.sortBy === 'price-desc') return b.exclusivePrice - a.exclusivePrice;
    if (APP_STATE.sortBy === 'popular') return b.likes - a.likes;
    if (APP_STATE.sortBy === 'newest') return new Date(b.date) - new Date(a.date);
    return 0; // featured natural order
  });
}

/**
 * Render the gallery grid
 */
function renderArtworkGallery() {
  const container = document.getElementById('artworkGrid');
  const emptyState = document.getElementById('emptyState');
  const countLabel = document.getElementById('resultsCount');
  
  if (!container) return;

  const items = getFilteredArtworks();

  if (countLabel) {
    countLabel.textContent = `Hiển thị ${items.length} / ${ARTWORKS_DATABASE.length} tác phẩm`;
  }

  if (items.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  container.innerHTML = items.map(art => {
    const isLiked = APP_STATE.favorites.has(art.id);
    const tagsHtml = art.tags.slice(0, 3).map(t => `<span class="card-tag">${t}</span>`).join('');

    return `
      <div class="artwork-card" data-id="${art.id}">
        <!-- Media container with Watermark and Quick Actions -->
        <div class="card-media-wrapper" role="button" tabindex="0" onclick="openArtworkDetail('${art.id}')" onkeydown="if(event.key==='Enter'||event.key===' ')openArtworkDetail('${art.id}')" aria-label="Xem chi tiết tác phẩm ${art.title}">
          <img src="${art.image}" alt="${art.title} - Tác phẩm của ${art.artist}" class="card-art-img" loading="lazy" decoding="async">
          
          <!-- Diagonal Watermark Overlay for protection -->
          <div class="card-watermark" aria-hidden="true"></div>

          <!-- Category Badge -->
          <span class="card-cat-badge">${art.categoryName}</span>

          <!-- Floating Action Buttons -->
          <div class="card-quick-actions" onclick="event.stopPropagation()">
            <button class="btn-card-action ${isLiked ? 'liked' : ''}" 
                    title="${isLiked ? 'Bỏ thích' : 'Thả tim'}" 
                    aria-label="${isLiked ? 'Bỏ thích' : 'Thả tim'} cho ${art.title}"
                    onclick="handleCardHeartClick('${art.id}', this)">
              <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
            <button class="btn-card-action" title="Xem chi tiết & zoom" 
                    aria-label="Phóng to và xem chi tiết ${art.title}"
                    onclick="openArtworkDetail('${art.id}')">
              <i class="fa-solid fa-magnifying-glass-plus"></i>
            </button>
          </div>
        </div>

        <!-- Card Body -->
        <div class="card-info-box">
          <div class="card-title-row">
            <h3 class="artwork-card-title">
              <button type="button" class="artwork-card-title-btn" onclick="openArtworkDetail('${art.id}')" aria-label="Xem chi tiết tác phẩm ${art.title}">${art.title}</button>
            </h3>
            <button type="button" class="artist-micro-row artist-micro-btn" onclick="event.stopPropagation(); navigateToArtistProfile('${art.artist}')" title="Xem trang cá nhân của ${art.artist}" aria-label="Trang nghệ sĩ ${art.artist}">
              <img src="${art.artistAvatar}" alt="Avatar ${art.artist}" class="artist-micro-avatar" loading="lazy" decoding="async">
              <span class="artist-micro-name">${art.artist} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.65rem;" aria-hidden="true"></i></span>
            </button>
          </div>

          <div class="card-tags-list">
            ${tagsHtml}
          </div>

          <!-- Footer: Starting price and Direct buy -->
          <div class="card-footer-strip">
            <div class="card-pricing">
              <span class="license-label">Bản quyền từ</span>
              <span class="price-tag">$${art.basePrice}</span>
            </div>
            <button class="btn-card-buy" onclick="handleCardBuyNow('${art.id}')" aria-label="Mua ngay bản quyền ${art.title}">
              <i class="fa-solid fa-bolt"></i> Mua Ngay
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================================
// 7. GUEST-INTERCEPTED ACTIONS (FAVORITE, BUY, COMMISSION, FOLLOW)
// =============================================================================

// Card Heart Click with Guest Intercept
function handleCardHeartClick(artId, buttonEl) {
  requireAuth('Thả tim lưu vào bộ sưu tập', () => {
    const art = ARTWORKS_DATABASE.find(a => a.id === artId);
    if (!art) return;

    if (APP_STATE.favorites.has(artId)) {
      APP_STATE.favorites.delete(artId);
      art.likes = Math.max(0, art.likes - 1);
      showToast(`Đã bỏ tác phẩm "${art.title}" khỏi mục yêu thích.`, 'info');
    } else {
      APP_STATE.favorites.add(artId);
      art.likes += 1;
      showToast(`Đã thêm "${art.title}" vào bộ sưu tập yêu thích của bạn!`, 'success');
    }

    updateHeaderCounters();
    renderArtworkGallery();
  });
}

// Card Buy Now with Guest Intercept
function handleCardBuyNow(artId) {
  requireAuth('Mua bản quyền tác phẩm', () => {
    const art = ARTWORKS_DATABASE.find(a => a.id === artId);
    if (!art) return;
    openArtworkDetail(artId);
    showToast(`Đang mở chi tiết bản quyền: ${art.title}`, 'info');
  });
}

// Follow Artist with Guest Intercept
function handleFollowArtist(artistName) {
  requireAuth(`Theo dõi nghệ sĩ ${artistName}`, () => {
    showToast(`Bạn đã theo dõi thành công gian hàng của ${artistName}! Thông báo tác phẩm mới sẽ gửi qua email của bạn.`, 'success');
  });
}

// Request Commission with Guest Intercept
function handleCommissionRequestBtn(preselectedArtist = null) {
  if (preselectedArtist) {
    const select = document.getElementById('homeCommArtistSelect') || document.getElementById('commArtistSelect');
    if (select) {
      select.value = preselectedArtist;
      if (typeof updateHomeArtistPackages === 'function') {
        updateHomeArtistPackages(preselectedArtist);
      }
    }
  }
  // Scroll smoothly to section
  const section = document.getElementById('commission-section');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// Home Commission Wizard Hub logic
function initHomeCommissionSection() {
  const deadlineInput = document.getElementById('homeCommDeadline');
  if (deadlineInput) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    deadlineInput.value = d.toISOString().split('T')[0];
  }
}

function updateHomeSlider(val) {
  const num = parseInt(val, 10);
  const sliderVal = document.getElementById('homeSliderVal');
  const sliderVnd = document.getElementById('homeSliderVnd');
  if (sliderVal) sliderVal.textContent = `$${num.toLocaleString()} USD`;
  if (sliderVnd) {
    const vnd = (num * 25400).toLocaleString('vi-VN');
    sliderVnd.textContent = `(~ ${vnd} VNĐ)`;
  }
}

function handleHomePackageChange(packageId) {
  const select = document.getElementById('homeCommPackageSelect');
  if (!select) return;
  const selectedOpt = select.options[select.selectedIndex];
  const price = parseInt(selectedOpt.getAttribute('data-price') || '180', 10);
  const slider = document.getElementById('homeBudgetSlider');
  if (slider) {
    slider.value = price;
    updateHomeSlider(price);
  }
}

function updateHomeArtistPackages(artistSlug) {
  const select = document.getElementById('homeCommPackageSelect');
  if (!select) return;
  if (artistSlug === 'alexdang') {
    select.innerHTML = `
      <option value="personal" data-price="120">Concept Phác Thảo Mecha ($120)</option>
      <option value="commercial" data-price="450" selected>Game Indie Asset Commercial ($450)</option>
      <option value="extended" data-price="950">Game AAA & Full Rights ($950)</option>
      <option value="exclusive" data-price="3000">Buyout Toàn Quyền Mecha AAA ($3,000)</option>
    `;
  } else if (artistSlug === 'kietnguyen') {
    select.innerHTML = `
      <option value="personal" data-price="70">Thiết Kế Áo Cá Nhân ($70)</option>
      <option value="commercial" data-price="220" selected>Vector Master POD Thương Mại ($220)</option>
      <option value="extended" data-price="600">Local Brand Full Campaign ($600)</option>
      <option value="exclusive" data-price="1800">Độc Quyền Bộ Sưu Tập Streetwear ($1,800)</option>
    `;
  } else if (artistSlug === 'hoaithuong') {
    select.innerHTML = `
      <option value="personal" data-price="50">Minh Họa Botanical Canvas ($50)</option>
      <option value="commercial" data-price="160" selected>In Ấn Home Decor & Khung Gỗ ($160)</option>
      <option value="extended" data-price="420">Bao Bì Sản Phẩm Mỹ Phẩm ($420)</option>
      <option value="exclusive" data-price="1400">Độc Quyền Nhận Diện Botanical ($1,400)</option>
    `;
  } else {
    select.innerHTML = `
      <option value="personal" data-price="50">Vẽ Cá Nhân Phi Thương Mại (Khởi điểm $50)</option>
      <option value="commercial" data-price="180" selected>Thương Mại POD Nhỏ (Dưới 5,000 áo - $180)</option>
      <option value="extended" data-price="480">POD Toàn Cầu Mở Rộng ($480)</option>
      <option value="exclusive" data-price="1500">Độc Quyền Toàn Phần Buyout ($1,500 - $3,000)</option>
    `;
  }
  handleHomePackageChange(select.value);
}

function goToSelectedArtistProfile() {
  const artistSlug = document.getElementById('homeCommArtistSelect').value || 'lanchi';
  navigateToArtistProfile(artistSlug);
}

function handleHomeCommissionSubmit(event) {
  event.preventDefault();
  requireAuth('Khởi tạo hợp đồng Commission sáng tạo', () => {
    const artistSelect = document.getElementById('homeCommArtistSelect');
    const artistSlug = artistSelect.value;
    const artistName = artistSelect.options[artistSelect.selectedIndex].text;
    const pkgSelect = document.getElementById('homeCommPackageSelect');
    const pkgName = pkgSelect.options[pkgSelect.selectedIndex].text;
    const deadline = document.getElementById('homeCommDeadline').value;
    const budget = document.getElementById('homeBudgetSlider').value;
    const title = document.getElementById('homeCommTitle').value;
    const desc = document.getElementById('homeCommDesc').value;

    const ticketId = 'COMM-' + Math.floor(1000 + Math.random() * 9000);

    const confirmTicket = document.getElementById('confirmTicketId');
    const confirmBox = document.getElementById('confirmSummaryBox');
    if (confirmTicket) confirmTicket.textContent = '#' + ticketId;
    if (confirmBox) {
      confirmBox.innerHTML = `
        <p><strong>Nghệ sĩ tiếp nhận:</strong> ${artistName}</p>
        <p><strong>Gói dịch vụ:</strong> ${pkgName}</p>
        <p><strong>Dự án:</strong> ${title}</p>
        <p><strong>Ngân sách đầu tư:</strong> $${parseInt(budget, 10).toLocaleString()} USD (~ ${(budget * 25400).toLocaleString('vi-VN')} VNĐ)</p>
        <p><strong>Hạn bàn giao:</strong> ${deadline}</p>
        <p><strong>Mô tả ý tưởng:</strong> "${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}"</p>
      `;
    }

    const modal = document.getElementById('commissionSuccessModal');
    if (modal) modal.classList.add('active');

    // Reset form
    document.getElementById('homeCommissionForm').reset();
    initHomeCommissionSection();
    showToast(`Đã gửi brief dự án #${ticketId} thành công tới nghệ sĩ!`, 'success');
  });
}

// =============================================================================
// 8. ARTWORK DETAIL MODAL WITH WATERMARK TOGGLE & ZOOM
// =============================================================================
function openArtworkDetail(artId) {
  const art = ARTWORKS_DATABASE.find(a => a.id === artId);
  if (!art) return;

  APP_STATE.selectedArtwork = art;
  APP_STATE.selectedDetailTier = 'personal';

  // Populate modal fields
  const modalImg = document.getElementById('modalArtImg');
  if (modalImg) {
    modalImg.classList.add('skeleton-shimmer');
    modalImg.src = art.image;
    modalImg.alt = `Tác phẩm ${art.title} bởi nghệ sĩ ${art.artist}`;
    modalImg.onload = () => modalImg.classList.remove('skeleton-shimmer');
  }

  document.getElementById('modalArtTitle').textContent = art.title;
  document.getElementById('modalArtCategory').textContent = art.categoryName;
  document.getElementById('modalArtId').textContent = `ID: #${art.id}`;
  document.getElementById('modalArtLikes').innerHTML = `<i class="fa-solid fa-heart text-danger"></i> ${art.likes} lượt thích`;
  document.getElementById('modalArtistName').textContent = art.artist;
  document.getElementById('modalArtistAvatar').src = art.artistAvatar;
  document.getElementById('modalArtResolution').textContent = art.dimensions;
  document.getElementById('modalArtFormats').textContent = art.formats;
  document.getElementById('modalArtUsage').textContent = art.usage;
  document.getElementById('modalArtSoftware').textContent = art.software;
  document.getElementById('modalArtDesc').textContent = art.description;

  // DYNAMIC PRICING: Calculate & display all 4 tiers from artwork database
  const pPersonal = document.getElementById('modalPricePersonal');
  const pCommercial = document.getElementById('modalPriceCommercial');
  const pExtended = document.getElementById('modalPriceExtended');
  const pExclusive = document.getElementById('modalPriceExclusive');

  if (pPersonal) pPersonal.textContent = `$${art.basePrice}`;
  if (pCommercial) pCommercial.textContent = `$${art.commercialPrice}`;
  if (pExtended) pExtended.textContent = `$${art.extendedPrice}`;
  if (pExclusive) pExclusive.textContent = `$${art.exclusivePrice}`;

  // Reset Tier Selection
  const tierRadios = document.querySelectorAll('input[name="modalSelectedTier"]');
  tierRadios.forEach(r => {
    r.checked = r.value === 'personal';
    const container = r.closest('.modal-tier-radio');
    if (container) container.classList.toggle('active', r.value === 'personal');
  });

  // Heart state in modal
  const isLiked = APP_STATE.favorites.has(art.id);
  const heartBtn = document.getElementById('btnModalToggleHeart');
  const heartText = document.getElementById('modalHeartBtnText');
  if (heartBtn && heartText) {
    heartBtn.classList.toggle('liked', isLiked);
    heartText.textContent = isLiked ? 'Đã Thích' : 'Thả Tim';
    heartBtn.querySelector('i').className = isLiked ? 'fa-solid fa-heart text-danger' : 'fa-regular fa-heart';
  }

  // Update dynamic price and VND conversion
  updateModalPrice();

  // Show modal
  document.getElementById('artworkDetailModalOverlay').classList.add('active');
}

function updateModalPrice() {
  const art = APP_STATE.selectedArtwork;
  if (!art) return;

  const selectedTierRadio = document.querySelector('input[name="modalSelectedTier"]:checked');
  const tier = selectedTierRadio ? selectedTierRadio.value : 'personal';
  APP_STATE.selectedDetailTier = tier;

  // Highlight active radio container
  document.querySelectorAll('.modal-tier-radio').forEach(r => {
    const radioInput = r.querySelector('input');
    r.classList.toggle('active', radioInput ? radioInput.checked : false);
  });

  let price = art.basePrice;
  if (tier === 'commercial') price = art.commercialPrice;
  if (tier === 'extended') price = art.extendedPrice;
  if (tier === 'exclusive') price = art.exclusivePrice;

  const finalPriceEl = document.getElementById('modalFinalPrice');
  if (finalPriceEl) finalPriceEl.textContent = `$${price} USD`;

  const vndSubEl = document.getElementById('modalVndSub');
  if (vndSubEl) {
    const vndPrice = (price * 25400).toLocaleString('vi-VN');
    vndSubEl.textContent = `(~ ${vndPrice} VNĐ)`;
  }
}

// Watermark toggle in preview
function toggleWatermarkPreview(showWatermark) {
  const layer = document.getElementById('modalWatermarkLayer');
  if (layer) {
    layer.style.opacity = showWatermark ? '1' : '0.08';
  }
}

// High-Res Image Zoom Lens implementation
function setupImageZoomLens() {
  const viewport = document.getElementById('detailImgViewport');
  const img = document.getElementById('modalArtImg');

  if (!viewport || !img) return;

  viewport.addEventListener('mousemove', (e) => {
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    img.style.transform = 'scale(2.2)';
  });

  viewport.addEventListener('mouseleave', () => {
    img.style.transformOrigin = 'center center';
    img.style.transform = 'scale(1)';
  });
}

function toggleFullscreenArtPreview() {
  const img = document.getElementById('modalArtImg');
  if (!img) return;
  if (img.requestFullscreen) {
    img.requestFullscreen();
  } else {
    window.open(img.src, '_blank');
  }
}

function handleModalLike() {
  if (!APP_STATE.selectedArtwork) return;
  handleCardHeartClick(APP_STATE.selectedArtwork.id, null);
  // Update heart button inside modal
  const isLiked = APP_STATE.favorites.has(APP_STATE.selectedArtwork.id);
  const heartBtn = document.getElementById('btnModalToggleHeart');
  const heartText = document.getElementById('modalHeartBtnText');
  if (heartBtn && heartText) {
    heartBtn.classList.toggle('liked', isLiked);
    heartText.textContent = isLiked ? 'Đã Thích' : 'Thả Tim';
    heartBtn.querySelector('i').className = isLiked ? 'fa-solid fa-heart text-danger' : 'fa-regular fa-heart';
  }
}

function handleModalFollow() {
  if (!APP_STATE.selectedArtwork) return;
  handleFollowArtist(APP_STATE.selectedArtwork.artist);
}

function handleModalAddToCart() {
  const art = APP_STATE.selectedArtwork;
  if (!art) return;

  requireAuth('Thêm bản quyền vào giỏ hàng', () => {
    let price = art.basePrice;
    let tierLabel = 'Cá Nhân (Personal)';
    if (APP_STATE.selectedDetailTier === 'commercial') {
      price = art.commercialPrice;
      tierLabel = 'Thương Mại POD Nhỏ';
    } else if (APP_STATE.selectedDetailTier === 'extended') {
      price = art.extendedPrice;
      tierLabel = 'POD Mở Rộng Toàn Cầu';
    } else if (APP_STATE.selectedDetailTier === 'exclusive') {
      price = art.exclusivePrice;
      tierLabel = 'Độc Quyền Full Buyout';
    }

    APP_STATE.cart.push({
      id: art.id + '-' + APP_STATE.selectedDetailTier + '-' + Date.now(),
      artId: art.id,
      title: art.title,
      artist: art.artist,
      image: art.image,
      tier: APP_STATE.selectedDetailTier,
      tierLabel: tierLabel,
      price: price
    });

    updateHeaderCounters();
    showToast(`Đã thêm "${art.title}" (${tierLabel}) vào giỏ hàng!`, 'success');
    openCartDrawer();
  });
}

function handleModalBuyNow() {
  const art = APP_STATE.selectedArtwork;
  if (!art) return;

  requireAuth('Mua ngay bản quyền', () => {
    handleModalAddToCart();
    closeArtworkDetailModal();
    openCartDrawer();
  });
}

function closeArtworkDetailModal() {
  document.getElementById('artworkDetailModalOverlay').classList.remove('active');
}

// =============================================================================
// 9. SMART LICENSE CALCULATOR SECTION LOGIC ($50 - $3,000)
// =============================================================================
function initCalculator() {
  const tierRadios = document.querySelectorAll('input[name="calcTier"]');
  tierRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.tier-radio-card').forEach(c => c.classList.remove('active'));
      radio.closest('.tier-radio-card').classList.add('active');
      calculateLicensePrice();
    });
  });

  const addonCheckboxes = document.querySelectorAll('.addon-checkbox-label input');
  addonCheckboxes.forEach(chk => {
    chk.addEventListener('change', calculateLicensePrice);
  });

  calculateLicensePrice();
}

function calculateLicensePrice() {
  const selectedTier = document.querySelector('input[name="calcTier"]:checked');
  const basePrice = selectedTier ? parseInt(selectedTier.value, 10) : 50;

  let addonsFee = 0;
  document.querySelectorAll('.addon-checkbox-label input:checked').forEach(chk => {
    addonsFee += parseInt(chk.value, 10);
  });

  const totalUsd = basePrice + addonsFee;
  const exchangeRate = 25400; // VNĐ / USD
  const totalVnd = totalUsd * exchangeRate;

  // Format currency
  document.getElementById('calcBasePriceDisplay').textContent = `$${basePrice}`;
  document.getElementById('calcAddonsDisplay').textContent = `+$${addonsFee}`;
  document.getElementById('calcTotalUsd').textContent = `$${totalUsd.toLocaleString()} USD`;
  document.getElementById('calcTotalVnd').textContent = `(~ ${totalVnd.toLocaleString('vi-VN')} VNĐ)`;
}

function handleCalculatorOrder() {
  requireAuth('Đặt mua cấu hình bản quyền tùy chỉnh', () => {
    const selectedTier = document.querySelector('input[name="calcTier"]:checked');
    const basePrice = selectedTier ? parseInt(selectedTier.value, 10) : 50;
    
    let addonsFee = 0;
    const selectedAddons = [];
    document.querySelectorAll('.addon-checkbox-label input:checked').forEach(chk => {
      addonsFee += parseInt(chk.value, 10);
      selectedAddons.push(chk.parentElement.querySelector('.addon-info span').textContent);
    });

    const total = basePrice + addonsFee;

    // Add to cart as a custom package
    APP_STATE.cart.push({
      id: 'CUSTOM-CALC-' + Date.now(),
      artId: 'AF-CUSTOM',
      title: 'Gói Bản Quyền Tùy Biến (Custom License)',
      artist: 'ARTFAIR Verified Artists',
      image: '45fbff086b31157aa2e23b94f086bd06.jpg',
      tier: 'custom',
      tierLabel: `Gói $${basePrice} + ${selectedAddons.length} Dịch Vụ Addon`,
      price: total
    });

    updateHeaderCounters();
    openCartDrawer();
    showToast('Đã thêm cấu hình bản quyền vào giỏ hàng!', 'success');
  });
}

// =============================================================================
// 10. COMMISSION BOOKING LOGIC & SIMULATED UPLOAD
// =============================================================================
function initDropzone() {
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('dummyFileInput');
  const fileList = document.getElementById('uploadedFilesList');
  const slider = document.getElementById('commBudgetSlider');
  const sliderVal = document.getElementById('sliderValDisplay');

  // Slider budget update
  if (slider && sliderVal) {
    slider.addEventListener('input', (e) => {
      sliderVal.textContent = `$${parseInt(e.target.value, 10).toLocaleString()} USD`;
    });
  }

  // Set default deadline date to 14 days from today
  const deadlineInput = document.getElementById('commDeadline');
  if (deadlineInput) {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    deadlineInput.value = d.toISOString().split('T')[0];
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--color-primary)';
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = 'var(--color-peach)';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--color-peach)';
      handleDummyFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
      handleDummyFiles(fileInput.files);
    });
  }

  function handleDummyFiles(files) {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const chip = document.createElement('span');
      chip.className = 'uploaded-chip';
      chip.innerHTML = `<i class="fa-solid fa-file-image"></i> ${files[i].name} <i class="fa-solid fa-xmark text-danger" style="cursor:pointer;" onclick="this.parentElement.remove()"></i>`;
      fileList.appendChild(chip);
    }
    showToast(`Đã tải lên ${files.length} tệp tham khảo cho nghệ sĩ!`, 'info');
  }
}

function handleCommissionSubmit(event) {
  event.preventDefault();

  requireAuth('Gửi yêu cầu Commission độc bản', () => {
    const artist = document.getElementById('commArtistSelect').value;
    const category = document.getElementById('commCategorySelect').options[document.getElementById('commCategorySelect').selectedIndex].text;
    const budget = document.getElementById('commBudgetSlider').value;
    const deadline = document.getElementById('commDeadline').value;
    const desc = document.getElementById('commDescription').value;

    const ticketId = 'COMM-' + Math.floor(1000 + Math.random() * 9000);

    // Fill confirmation modal
    document.getElementById('confirmTicketId').textContent = '#' + ticketId;
    document.getElementById('confirmSummaryBox').innerHTML = `
      <p><strong>Nghệ sĩ nhận yêu cầu:</strong> ${artist}</p>
      <p><strong>Hạng mục:</strong> ${category}</p>
      <p><strong>Ngân sách đầu tư:</strong> $${budget} USD</p>
      <p><strong>Hạn bàn giao:</strong> ${deadline}</p>
      <p><strong>Ghi chú ý tưởng:</strong> "${desc.substring(0, 90)}..."</p>
    `;

    // Show confirmation modal
    document.getElementById('commissionSuccessModal').classList.add('active');

    // Reset form
    document.getElementById('commissionForm').reset();
    document.getElementById('uploadedFilesList').innerHTML = '';
  });
}

function closeCommissionSuccessModal() {
  document.getElementById('commissionSuccessModal').classList.remove('active');
}

// =============================================================================
// 11. SHOPPING CART DRAWER & CHECKOUT
// =============================================================================
function openCartDrawer() {
  renderCartDrawer();
  document.getElementById('cartDrawerOverlay').classList.add('active');
}

function closeCartDrawer() {
  document.getElementById('cartDrawerOverlay').classList.remove('active');
}

function renderCartDrawer() {
  const container = document.getElementById('cartItemsContainer');
  const countBadge = document.getElementById('cartDrawerCount');
  const subtotalLabel = document.getElementById('cartSubtotal');
  const discountLabel = document.getElementById('cartDiscount');
  const discountLine = document.getElementById('discountLine');
  const grandTotalLabel = document.getElementById('cartGrandTotal');

  countBadge.textContent = APP_STATE.cart.length;

  if (APP_STATE.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 40px 10px;">
        <i class="fa-solid fa-bag-shopping empty-icon"></i>
        <h4>Giỏ hàng của bạn đang trống</h4>
        <p>Khám phá chợ phiên và chọn gói bản quyền phù hợp cho tác phẩm bạn yêu thích.</p>
        <button class="btn btn-outline btn-sm" onclick="closeCartDrawer()">Tiếp tục xem tranh</button>
      </div>
    `;
    subtotalLabel.textContent = '$0';
    discountLine.style.display = 'none';
    grandTotalLabel.textContent = '$0 USD';
    return;
  }

  let subtotal = 0;
  container.innerHTML = APP_STATE.cart.map((item, index) => {
    subtotal += item.price;
    return `
      <div class="cart-item-row">
        <img src="${item.image}" alt="${item.title}" class="cart-item-thumb">
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.title}</h4>
          <p class="cart-item-artist">${item.artist}</p>
          <span class="cart-item-tier-badge">${item.tierLabel}</span>
          <div class="cart-item-price">$${item.price} USD</div>
        </div>
        <button class="cart-item-remove" title="Xóa khỏi giỏ" onclick="removeCartItem(${index})">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');

  subtotalLabel.textContent = `$${subtotal.toLocaleString()} USD`;

  // Apply Coupon Discount
  const discount = Math.round(subtotal * APP_STATE.discountRate);
  if (discount > 0) {
    discountLine.style.display = 'flex';
    discountLabel.textContent = `-$${discount.toLocaleString()} USD (${APP_STATE.discountRate * 100}%)`;
  } else {
    discountLine.style.display = 'none';
  }

  const grandTotal = Math.max(0, subtotal - discount);
  grandTotalLabel.textContent = `$${grandTotal.toLocaleString()} USD`;
}

function removeCartItem(index) {
  APP_STATE.cart.splice(index, 1);
  updateHeaderCounters();
  renderCartDrawer();
  showToast('Đã xóa mục khỏi giỏ hàng.', 'info');
}

function applyCouponCode() {
  const input = document.getElementById('couponInput');
  const msg = document.getElementById('couponMessage');
  const code = input.value.trim().toUpperCase();

  if (code === 'GENZART' || code === 'ARTFAIR2026') {
    APP_STATE.discountRate = 0.15; // 15% discount
    APP_STATE.appliedCoupon = code;
    msg.className = 'coupon-status-msg success';
    msg.textContent = `Áp dụng thành công mã ${code}! Bạn được giảm 15% tổng đơn hàng.`;
    renderCartDrawer();
  } else if (!code) {
    msg.className = 'coupon-status-msg error';
    msg.textContent = 'Vui lòng nhập mã giảm giá!';
  } else {
    msg.className = 'coupon-status-msg error';
    msg.textContent = 'Mã giảm giá không hợp lệ hoặc đã hết lượt dùng.';
  }
}

function handleProceedCheckout() {
  if (APP_STATE.cart.length === 0) {
    showToast('Giỏ hàng trống! Hãy chọn tác phẩm trước khi thanh toán.', 'warning');
    return;
  }

  requireAuth('Thanh toán bản quyền hợp pháp', () => {
    const total = document.getElementById('cartGrandTotal').textContent;
    const confirmOrder = confirm(`Xác nhận thanh toán đơn hàng bản quyền trị giá ${total} qua cổng thanh toán bảo mật?`);
    if (confirmOrder) {
      showToast('Đang khởi tạo hợp đồng bản quyền điện tử và tải file gốc...', 'info');
      setTimeout(() => {
        APP_STATE.cart = [];
        updateHeaderCounters();
        closeCartDrawer();
        alert('🎉 Chúc mừng bạn đã sở hữu bản quyền hợp pháp! Giấy phép thương mại và link tải file gốc độ phân giải cao đã được gửi tới email của bạn.');
      }, 1200);
    }
  });
}

function updateHeaderCounters() {
  const favBadge = document.getElementById('favoritesCountBadge');
  const cartBadge = document.getElementById('cartCountBadge');

  if (favBadge) favBadge.textContent = APP_STATE.favorites.size;
  if (cartBadge) cartBadge.textContent = APP_STATE.cart.length;
}

// =============================================================================
// 12. TOAST NOTIFICATIONS HELPER
// =============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-card ${type}`;

  let icon = 'fa-solid fa-circle-info';
  if (type === 'success') icon = 'fa-solid fa-circle-check';
  if (type === 'warning') icon = 'fa-solid fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="${icon} toast-icon"></i>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Newsletter subscription handler
function handleNewsletter(e) {
  e.preventDefault();
  const emailInput = e.target.querySelector('input');
  showToast(`Cảm ơn bạn! Đã gửi voucher giảm giá 15% vào email: ${emailInput.value}`, 'success');
  emailInput.value = '';
}

// Terms modal popup helper
function showTermsModal(type) {
  let title = 'Chính Sách Bản Quyền ARTFAIR';
  let content = 'Tất cả tác phẩm trên ARTFAIR đều được xác thực quyền tác giả theo luật sở hữu trí tuệ. Người mua nhận giấy phép thương mại điện tử hợp pháp.';
  if (type === 'privacy') {
    title = 'Chính Sách Bảo Mật';
    content = 'Thông tin thanh toán và sáng tạo của bạn được mã hóa an toàn 256-bit.';
  } else if (type === 'guarantee') {
    title = 'Cam Kết Hoàn Tiền';
    content = 'Hoàn tiền 100% trong 48 giờ nếu file gốc bị lỗi hoặc artist không bàn giao đúng thời hạn.';
  }
  alert(`${title}\n\n${content}`);
}
