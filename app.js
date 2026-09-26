// Birthday Prank Card - Interactive Engine

(function () {
  'use strict';

  // State
  let config = {};
  let currentSlideIndex = 0;
  let isSoundEnabled = true;
  let isDragging = false;
  let dragStartX = 0;
  let currentDragX = 0;
  let activeDragSource = null; // 'card' or 'thumb'
  let isScratchCompleted = false;
  let isRealCodeRevealed = false;
  let trollAttemptCount = 0;

  // Audio Context (initialized on first user interaction)
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Synthesized Sound Effects
  const SoundFX = {
    click: () => {
      if (!isSoundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } catch (e) {}
    },

    slideAdvance: () => {
      if (!isSoundEnabled || !audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        // Ascending pleasant chord
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.04);
          gain.gain.setValueAtTime(0, now + i * 0.04);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.04 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.3);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + i * 0.04);
          osc.stop(now + i * 0.04 + 0.3);
        });
      } catch (e) {}
    },

    springBack: () => {
      if (!isSoundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.08);
        osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      } catch (e) {}
    },

    trollHop: () => {
      if (!isSoundEnabled || !audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } catch (e) {}
    },

    fanfare: () => {
      if (!isSoundEnabled || !audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const notes = [
          { f: 523.25, d: 0.15, t: 0.0 },  // C5
          { f: 523.25, d: 0.15, t: 0.15 }, // C5
          { f: 523.25, d: 0.15, t: 0.30 }, // C5
          { f: 659.25, d: 0.30, t: 0.45 }, // E5
          { f: 783.99, d: 0.20, t: 0.75 }, // G5
          { f: 1046.5, d: 0.60, t: 0.95 }  // C6
        ];
        notes.forEach(({ f, d, t }) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(f, now + t);
          gain.gain.setValueAtTime(0, now + t);
          gain.gain.linearRampToValueAtTime(0.16, now + t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + t);
          osc.stop(now + t + d);
        });
      } catch (e) {}
    },

    scratchSound: () => {
      if (!isSoundEnabled || !audioCtx) return;
      try {
        // Subtle white noise burst
        const bufferSize = audioCtx.sampleRate * 0.03;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);
        noise.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
      } catch (e) {}
    }
  };

  // Humor status quotes mapped across journey
  function getHumorStatus(current, total) {
    // Special funny overtime captions when exceeding 31
    const bonusCaptions = {
      30: "שקף 31! הגעת לרגע הגדול... או שמא?! 🎂",
      31: "רגע... 32 מתוך 31?! משהו פה השתבש במטריקס 😱",
      32: "33 מתוך 31: היקום החליט להוסיף הארכת זמן! ⏰",
      33: "34 מתוך 31: הסרגל שקרן אבל הברכה מהלב! ❤️",
      34: "35 מתוך 31: האגודל שלך עובד שעות נוספות 💪",
      35: "36 מתוך 31: פרק בונוס בחסות משרד החינוך 👩‍🏫",
      36: "37 מתוך 31: מי מאמין לסרגלים בשנת 2024? 😂",
      37: "38 מתוך 31: שקט של עשרים דקות בדרך אלייך ☕",
      38: "39 מתוך 31: התקף צחוק מובטח של גיל 30 🧘‍♀️",
      39: "40 מתוך 31: כרטיס לפני אחרון (באמת הפעם!) ⏱️",
      40: "41 מתוך 31: זהו! שברת את השיא! החליקי למתנה! 🎁"
    };

    if (bonusCaptions[current]) {
      return bonusCaptions[current];
    }

    const ratio = current / Math.max(1, Math.min(total, 31) - 1);
    if (ratio === 0) return "פרק 1: המסע מתחיל... הכיני את האגודל.";
    if (ratio < 0.15) return "להחליק בהתמדה. לוקח זמן לעכל חוכמת אחים כזאת.";
    if (ratio < 0.3) return "איזו טכניקה! החלקה ימינה ברמת אולימפיאדה.";
    if (ratio < 0.45) return "ידעת שגלילת ברכות ארוכות מחזקת את שרירי האגודל?";
    if (ratio < 0.6) return "נקודת מחצית: קחי שלוק מים ותזכרי מי אוהב אותך.";
    if (ratio < 0.75) return "94% מהאחיות נשברות לפני הכרטיסייה הזאת. לא ירדן!";
    if (ratio < 0.9) return "כספת הגיפטקארד מתחילה להיפתח... גלגלי השיניים מסתובבים!";
    if (ratio < 1) return "ישורת אחרונה! עוד החלקה אגדית אחת והמתנה שלך!";
    return "שקף 31! הגעת לסוף... כמעט! 😉";
  }

  // Load and merge configuration
  function loadConfig() {
    let baseConfig = JSON.parse(JSON.stringify(window.DEFAULT_CONFIG || {}));
    
    // Check URL Hash for shared config
    if (window.location.hash.startsWith('#data=')) {
      try {
        const encoded = window.location.hash.replace('#data=', '');
        const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
        baseConfig = Object.assign(baseConfig, decoded);
      } catch (e) {
        console.warn("Could not decode hash configuration:", e);
      }
    } else {
      // Check local storage
      const saved = localStorage.getItem('sister_prank_config_v3');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          baseConfig = Object.assign(baseConfig, parsed);
        } catch (e) {}
      }
    }

    // Check URL search params for easy code testing (?code=...&amount=...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('code')) baseConfig.giftCode = urlParams.get('code');
      if (urlParams.has('amount')) baseConfig.giftAmount = urlParams.get('amount');
      if (urlParams.has('url')) baseConfig.giftUrl = urlParams.get('url');
      if (urlParams.has('brand')) baseConfig.giftBrand = urlParams.get('brand');
    } catch (e) {}

    config = baseConfig;
    applyConfigToUI();
  }

  // Save configuration
  function saveConfig(newConfig) {
    config = newConfig;
    localStorage.setItem('sister_prank_config_v3', JSON.stringify(config));
    applyConfigToUI();
    showToast("ההגדרות נשמרו!");
  }

  // Apply config to DOM elements
  function applyConfigToUI() {
    document.title = `${config.sisterName}'s Very Special Birthday Blessing 🎂`;
    
    const badgeName = document.getElementById('badgeSisterName');
    if (badgeName) badgeName.textContent = `${config.sisterName}'s Birthday`;

    const introTitle = document.getElementById('introTitle');
    if (introTitle) introTitle.textContent = `Happy Birthday, ${config.sisterName}! 🎉`;

    const cardSisterName = document.getElementById('cardSisterName');
    if (cardSisterName) cardSisterName.textContent = config.sisterName;

    const brandNameDisplay = document.getElementById('brandNameDisplay');
    const brandIcon = document.getElementById('brandIcon');
    const giftValDisplay = document.getElementById('giftValDisplay');
    const redeemLinkBtn = document.getElementById('redeemLinkBtn');
    const senderNameDisplay = document.getElementById('senderNameDisplay');

    if (brandNameDisplay) brandNameDisplay.textContent = config.giftBrandName || 'Amazon';
    if (giftValDisplay) giftValDisplay.textContent = config.giftAmount || '$50';
    if (senderNameDisplay) senderNameDisplay.textContent = config.senderName || 'האח שלך';
    if (redeemLinkBtn) redeemLinkBtn.href = config.giftUrl || 'https://amazon.com';

    // Brand icons & styles
    const brandMap = {
      buyme: { icon: '🎁', name: 'BuyMe All' },
      zara: { icon: '👗', name: 'Zara' },
      terminalx: { icon: '👟', name: 'Terminal X' },
      story: { icon: '🛍️', name: 'Story Online' },
      amazon: { icon: '📦', name: 'Amazon' },
      starbucks: { icon: '☕', name: 'קפה ומאפה' },
      custom: { icon: '✨', name: config.giftBrandName || 'Gift Card' }
    };
    const bInfo = brandMap[config.giftBrand] || brandMap.buyme;
    if (brandIcon) brandIcon.textContent = bInfo.icon;
    if (brandNameDisplay) brandNameDisplay.textContent = bInfo.name;

    // Code to display
    const codeEl = document.getElementById('displayedGiftCode');
    if (codeEl) {
      if (config.isPrankCodeFirst && !isRealCodeRevealed) {
        codeEl.textContent = config.prankCode || 'ERROR-404-NO-FUNDS';
      } else {
        codeEl.textContent = config.giftCode || 'AMAZON-GIFT-BDAY-2024';
      }
    }

    renderCurrentSlide();
  }

  // Render current slide in swiper arena
  function renderCurrentSlide() {
    const total = (config.slides && config.slides.length) ? config.slides.length : 1;
    if (currentSlideIndex >= total) {
      showFinale();
      return;
    }

    const currentSlide = config.slides[currentSlideIndex] || {
      badge: "🎉 Birthday Blessing",
      text: "Wishing you a wonderful birthday!"
    };

    const nextSlide = config.slides[currentSlideIndex + 1];

    // Update active card with pop-in effect
    const activeBadge = document.getElementById('activeBadge');
    const activeText = document.getElementById('activeText');
    const slideStamp = document.getElementById('slideStamp');
    const activeCard = document.getElementById('activeCard');

    if (activeBadge) activeBadge.textContent = currentSlide.badge || `Part ${currentSlideIndex + 1}`;
    if (activeText) activeText.textContent = currentSlide.text;
    if (slideStamp) slideStamp.style.opacity = '0';

    if (activeCard) {
      activeCard.style.transition = 'none';
      activeCard.style.transform = 'scale(0.92) translateY(14px)';
      activeCard.style.opacity = '0.7';
      activeCard.offsetHeight; // force reflow
      activeCard.style.transition = 'transform 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
      activeCard.style.transform = 'scale(1) translateY(0) rotate(0deg)';
      activeCard.style.opacity = '1';
    }

    // Update preview card
    const previewText = document.getElementById('previewText');
    const cardPreview = document.getElementById('cardPreview');
    if (nextSlide) {
      if (previewText) previewText.textContent = nextSlide.text;
      if (cardPreview) cardPreview.style.display = 'flex';
    } else {
      if (previewText) previewText.textContent = "🎁 המתנה הסופית: החליקי עוד פעם אחת לחשיפת הגיפטקארד שלך!";
      if (cardPreview) cardPreview.style.display = 'flex';
    }

    // Reset bottom slider
    resetSliderTrack();

    // Update counter & progress bar (Prank lock: always display out of 31!)
    const DISPLAY_TOTAL = 31;
    const cardCounter = document.getElementById('cardCounter');
    const progressFill = document.getElementById('progressFill');
    const humorCaption = document.getElementById('humorCaption');

    const currentNum = currentSlideIndex + 1;
    if (cardCounter) {
      if (currentNum <= DISPLAY_TOTAL) {
        cardCounter.textContent = `${currentNum} / ${DISPLAY_TOTAL}`;
        cardCounter.style.color = 'var(--secondary)';
        cardCounter.style.borderColor = 'rgba(255, 255, 255, 0.8)';
      } else {
        // Hilarious overtime breach!
        cardCounter.textContent = `${currentNum} / ${DISPLAY_TOTAL} 🚨`;
        cardCounter.style.color = '#ff0055';
        cardCounter.style.borderColor = '#ff0055';
      }
    }

    if (progressFill) {
      const pct = Math.min(100, Math.round((currentNum / DISPLAY_TOTAL) * 100));
      progressFill.style.width = `${pct}%`;
      if (currentNum > DISPLAY_TOTAL) {
        progressFill.style.background = 'linear-gradient(90deg, #ff0055, #ffb703, #06d6a0, #7b2cbf)';
      } else {
        progressFill.style.background = 'linear-gradient(90deg, var(--primary), var(--accent), var(--accent-green))';
      }
    }

    if (humorCaption) {
      humorCaption.textContent = getHumorStatus(currentSlideIndex, total);
    }
  }

  function resetSliderTrack() {
    const slideThumb = document.getElementById('slideThumb');
    const trackFill = document.getElementById('trackFill');
    if (slideThumb) {
      slideThumb.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      slideThumb.style.transform = 'translateX(0px)';
    }
    if (trackFill) {
      trackFill.style.transition = 'width 0.25s ease';
      trackFill.style.width = '0%';
    }
  }

  // Advance to next slide
  function advanceSlide() {
    SoundFX.slideAdvance();
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const activeCard = document.getElementById('activeCard');
    const slideStamp = document.getElementById('slideStamp');

    if (slideStamp) slideStamp.style.opacity = '1';

    if (activeCard) {
      activeCard.style.transition = 'transform 0.28s ease-in, opacity 0.28s ease-in';
      activeCard.style.transform = 'translateX(400px) rotate(18deg)';
      activeCard.style.opacity = '0';
    }

    setTimeout(() => {
      currentSlideIndex++;
      const total = config.slides ? config.slides.length : 1;
      if (currentSlideIndex >= total) {
        showFinale();
      } else {
        renderCurrentSlide();
      }
    }, 280);
  }

  // Drag interaction handling (works for BOTH Card swipe and Bottom slider track)
  function setupDragInteractions() {
    const activeCard = document.getElementById('activeCard');
    const slideTrack = document.getElementById('slideTrack');
    const slideThumb = document.getElementById('slideThumb');
    const trackFill = document.getElementById('trackFill');
    const slideStamp = document.getElementById('slideStamp');

    function getTrackMaxDrag() {
      if (!slideTrack || !slideThumb) return 200;
      return slideTrack.clientWidth - slideThumb.clientWidth - 8;
    }

    function onDragStart(clientX, source) {
      initAudio();
      isDragging = true;
      dragStartX = clientX;
      currentDragX = 0;
      activeDragSource = source;

      if (activeCard) activeCard.style.transition = 'none';
      if (slideThumb) slideThumb.style.transition = 'none';
      if (trackFill) trackFill.style.transition = 'none';

      SoundFX.click();
    }

    function onDragMove(clientX) {
      if (!isDragging) return;
      const deltaX = clientX - dragStartX;

      // Only allow dragging to the right (positive delta)
      currentDragX = Math.max(0, deltaX);

      const maxTrack = getTrackMaxDrag();
      const progressRatio = Math.min(1, currentDragX / maxTrack);

      // Synchronize Card motion
      if (activeCard) {
        const cardTranslate = currentDragX * 0.95;
        const cardRotate = Math.min(14, (currentDragX / 25));
        activeCard.style.transform = `translateX(${cardTranslate}px) rotate(${cardRotate}deg)`;
        if (slideStamp) {
          slideStamp.style.opacity = (progressRatio * 1.2).toString();
        }
      }

      // Synchronize Slider Track motion
      if (slideThumb) {
        const thumbX = Math.min(maxTrack, currentDragX);
        slideThumb.style.transform = `translateX(${thumbX}px)`;
      }
      if (trackFill) {
        trackFill.style.width = `${progressRatio * 100}%`;
      }
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;

      const maxTrack = getTrackMaxDrag();
      const threshold = maxTrack * 0.55; // 55% distance to unlock

      if (currentDragX >= threshold) {
        // Complete the slide!
        advanceSlide();
      } else {
        // Spring back
        SoundFX.springBack();
        if (activeCard) {
          activeCard.style.transition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          activeCard.style.transform = 'translateX(0px) rotate(0deg)';
        }
        if (slideStamp) {
          slideStamp.style.opacity = '0';
        }
        resetSliderTrack();
      }
      currentDragX = 0;
    }

    // Card Pointer & Touch Events
    if (window.PointerEvent) {
      if (activeCard) {
        activeCard.addEventListener('pointerdown', (e) => {
          onDragStart(e.clientX, 'card');
        });
      }
      if (slideThumb) {
        slideThumb.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          onDragStart(e.clientX, 'thumb');
        });
      }
      window.addEventListener('pointermove', (e) => {
        onDragMove(e.clientX);
      });
      window.addEventListener('pointerup', onDragEnd);
      window.addEventListener('pointercancel', onDragEnd);
    } else {
      // Touch fallback for older engines
      if (activeCard) {
        activeCard.addEventListener('touchstart', (e) => {
          if (e.touches.length === 1) onDragStart(e.touches[0].clientX, 'card');
        }, { passive: true });
      }
      if (slideThumb) {
        slideThumb.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          if (e.touches.length === 1) onDragStart(e.touches[0].clientX, 'thumb');
        }, { passive: true });
      }
      window.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) onDragMove(e.touches[0].clientX);
      }, { passive: true });
      window.addEventListener('touchend', onDragEnd);
      window.addEventListener('touchcancel', onDragEnd);
    }
  }

  // Troll Skip Button (flees playfully)
  function setupTrollSkipButton() {
    const btn = document.getElementById('trollSkipBtn');
    if (!btn) return;

    const trollTaunts = [
      "ניסיון יפה! 😜",
      "אין קיצורי דרך לאחות בת 30! 🏃‍♀️",
      "כמעט נגעת בי! 💨",
      "האגודל שלך עוד לא סיים אימון! 💪",
      "החליקי ימינה כדי להרוויח את זה! ✨",
      "המתנה בורחת! 🎁",
      "סבלנות זו מעלה של מורות! 🧘",
      "אני פה עכשיו! 🏃‍♂️💨"
    ];

    function evade(e) {
      if (e) e.preventDefault();
      initAudio();
      SoundFX.trollHop();
      trollAttemptCount++;

      const randomX = (Math.random() - 0.5) * 220;
      const randomY = (Math.random() - 0.5) * 80;
      const rot = (Math.random() - 0.5) * 30;

      btn.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${rot}deg)`;
      const taunt = trollTaunts[trollAttemptCount % trollTaunts.length];
      btn.textContent = taunt;

      if (trollAttemptCount >= 6) {
        showToast("חוק אחים עתיק: הדרך היחידה למתנה היא להחליק את כל הברכה! 😉");
      }
    }

    btn.addEventListener('mouseenter', evade);
    btn.addEventListener('touchstart', (e) => {
      evade(e);
    }, { passive: false });
    btn.addEventListener('click', evade);
  }

  // Finale: Confetti & Scratch-off Card
  function showFinale() {
    const blessingScreen = document.getElementById('blessingScreen');
    const finaleScreen = document.getElementById('finaleScreen');
    if (blessingScreen) blessingScreen.style.display = 'none';
    if (finaleScreen) finaleScreen.style.display = 'flex';

    SoundFX.fanfare();
    launchConfetti();
    initScratchCard();
  }

  // Scratch-off Canvas implementation
  function initScratchCard() {
    const canvas = document.getElementById('scratchCanvas');
    if (!canvas) return;

    const box = document.getElementById('scratchBox');
    if (!box) return;

    canvas.width = box.clientWidth || 340;
    canvas.height = box.clientHeight || 48;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw metallic silver foil pattern
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#c0c0c0');
    grad.addColorStop(0.25, '#e6e6e6');
    grad.addColorStop(0.5, '#b0b0b0');
    grad.addColorStop(0.75, '#f5f5f5');
    grad.addColorStop(1, '#a6a6a6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative text on foil
    ctx.fillStyle = '#666666';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ גרדי כאן כדי לחשוף את הקוד ✨', canvas.width / 2, canvas.height / 2);

    let isScratching = false;

    function scratch(x, y) {
      initAudio();
      SoundFX.scratchSound();

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();

      checkScratchPercentage();
    }

    function checkScratchPercentage() {
      if (isScratchCompleted) return;
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        let transparentCount = 0;
        const total = pixels.length / 4;

        // Sample every 8th pixel for fast performance
        for (let i = 3; i < pixels.length; i += 32) {
          if (pixels[i] === 0) {
            transparentCount++;
          }
        }

        const sampledTotal = total / 8;
        if (transparentCount / sampledTotal > 0.42) {
          isScratchCompleted = true;
          // Smoothly fade out remaining foil
          canvas.style.transition = 'opacity 0.5s ease';
          canvas.style.opacity = '0';
          setTimeout(() => {
            canvas.style.display = 'none';
          }, 500);

          const hint = document.getElementById('scratchHint');
          if (hint) {
            hint.innerHTML = '🎉 <strong>הקוד נחשף!</strong> לחצי על הכפתור למטה להעתקה!';
            hint.style.color = '#06d6a0';
          }
          launchConfetti();
        }
      } catch (e) {}
    }

    function getCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
      const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    canvas.addEventListener('mousedown', (e) => {
      isScratching = true;
      const coords = getCoords(e);
      scratch(coords.x, coords.y);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isScratching) return;
      const coords = getCoords(e);
      scratch(coords.x, coords.y);
    });

    window.addEventListener('mouseup', () => {
      isScratching = false;
    });

    canvas.addEventListener('touchstart', (e) => {
      isScratching = true;
      const coords = getCoords(e);
      scratch(coords.x, coords.y);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isScratching) return;
      const coords = getCoords(e);
      scratch(coords.x, coords.y);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isScratching = false;
    });
  }

  // Confetti Particle System
  function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#ff4d6d', '#ff758f', '#7b2cbf', '#ffb703', '#06d6a0', '#48cae4', '#ffffff'];
    const particles = [];

    for (let i = 0; i < 110; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 5,
        size: Math.random() * 9 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let animationFrame;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // gravity
        p.vx *= 0.98; // air drag
        p.rotation += p.rotSpeed;
        p.opacity -= 0.007;

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    cancelAnimationFrame(animationFrame);
    render();
  }

  // Prank Reveal Logic (if initial prank code is shown)
  function setupPrankCodeReveal() {
    const copyBtn = document.getElementById('copyCodeBtn');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', () => {
      initAudio();
      const codeEl = document.getElementById('displayedGiftCode');
      const copyText = document.getElementById('copyCodeText');

      if (config.isPrankCodeFirst && !isRealCodeRevealed) {
        // Prank trigger!
        SoundFX.trollHop();
        isRealCodeRevealed = true;
        if (codeEl) {
          codeEl.style.color = '#ef4444';
          codeEl.textContent = "רגע... הקוד נפסל?! 😱";
        }

        showToast("רגע... משהו לא תקין בקוד?! בדקי שוב! 😂");

        setTimeout(() => {
          if (codeEl) {
            codeEl.style.color = '#10b981';
            codeEl.textContent = config.giftCode || 'YARDEN-30-QUEEN-LOVE-YOU';
          }
          launchConfetti();
          SoundFX.fanfare();
          if (copyText) copyText.textContent = "העתיקי את הקוד האמיתי 🎁";
          showToast("סתם מתיחה! הנה הקוד האמיתי שלך! 🥳💖");
        }, 1800);
        return;
      }

      // Normal copy
      const finalCode = (codeEl && codeEl.textContent) ? codeEl.textContent : (config.giftCode || '');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(finalCode).then(() => {
          SoundFX.slideAdvance();
          showToast("קוד המתנה הועתק ללוח! 🎁");
          if (copyText) copyText.textContent = "הועתק! ✨";
          setTimeout(() => {
            if (copyText) copyText.textContent = "העתיקי את קוד המתנה";
          }, 2500);
        });
      } else {
        showToast(`קוד: ${finalCode}`);
      }
    });
  }

  // Toast notification
  function showToast(msg) {
    const toast = document.getElementById('shareToast');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Studio / Settings Modal logic
  function setupSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    const openBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const saveBtn = document.getElementById('saveConfigBtn');
    const shareLinkBtn = document.getElementById('shareLinkBtn');
    const resetBtn = document.getElementById('resetDefaultsBtn');

    // Inputs
    const inputSisterName = document.getElementById('inputSisterName');
    const inputSenderName = document.getElementById('inputSenderName');
    const inputBlessingText = document.getElementById('inputBlessingText');
    const selectGiftBrand = document.getElementById('selectGiftBrand');
    const inputGiftAmount = document.getElementById('inputGiftAmount');
    const inputGiftCode = document.getElementById('inputGiftCode');
    const inputGiftUrl = document.getElementById('inputGiftUrl');
    const checkPrankCode = document.getElementById('checkPrankCode');

    function populateForm() {
      if (inputSisterName) inputSisterName.value = config.sisterName || '';
      if (inputSenderName) inputSenderName.value = config.senderName || '';
      if (selectGiftBrand) selectGiftBrand.value = config.giftBrand || 'amazon';
      if (inputGiftAmount) inputGiftAmount.value = config.giftAmount || '$50';
      if (inputGiftCode) inputGiftCode.value = config.giftCode || '';
      if (inputGiftUrl) inputGiftUrl.value = config.giftUrl || '';
      if (checkPrankCode) checkPrankCode.checked = !!config.isPrankCodeFirst;

      // Format slides back into readable text
      if (inputBlessingText) {
        if (config.slides && config.slides.length) {
          inputBlessingText.value = config.slides.map(s => s.text).join('\n\n');
        } else {
          inputBlessingText.value = '';
        }
      }
    }

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        populateForm();
        if (modal) modal.classList.add('active');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modal) modal.classList.remove('active');
      });
    }

    // Parse textarea into slides
    function parseSlidesFromText(rawText) {
      if (!rawText || !rawText.trim()) {
        return window.DEFAULT_CONFIG.slides;
      }

      // Check if user separated with '---'
      let chunks = [];
      if (rawText.includes('---')) {
        chunks = rawText.split('---').map(s => s.trim()).filter(Boolean);
      } else {
        // Split by double newlines or single newlines if paragraphs
        chunks = rawText.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      }

      if (chunks.length === 0) {
        chunks = [rawText.trim()];
      }

      const badges = ['🌟 חוכמת חיים', '👑 ירדן האהובה', '🍕 מאחורי הקלעים', '💅 סטייל של מגזין', '💎 שוברת תקרות', '✨ חוק האחים', '🏆 שבירת שיאים', '🎁 סף המתנה'];

      return chunks.map((chunk, idx) => ({
        badge: badges[idx % badges.length],
        text: chunk
      }));
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const brandNames = {
          buyme: 'BuyMe All',
          zara: 'Zara',
          terminalx: 'Terminal X',
          story: 'Story Online',
          amazon: 'Amazon',
          starbucks: 'קפה ומאפה',
          custom: 'מתנה מיוחדת'
        };

        const updated = {
          ...config,
          sisterName: inputSisterName.value.trim() || 'ירדן',
          senderName: inputSenderName.value.trim() || 'האח שלך',
          giftBrand: selectGiftBrand.value,
          giftBrandName: brandNames[selectGiftBrand.value] || 'BuyMe All',
          giftAmount: inputGiftAmount.value.trim() || '₪300',
          giftCode: inputGiftCode.value.trim() || 'YARDEN-30-QUEEN-LOVE-YOU',
          giftUrl: inputGiftUrl.value.trim() || 'https://buyme.co.il',
          isPrankCodeFirst: checkPrankCode.checked,
          slides: parseSlidesFromText(inputBlessingText.value)
        };

        saveConfig(updated);
        currentSlideIndex = 0;
        isRealCodeRevealed = false;
        isScratchCompleted = false;
        renderCurrentSlide();

        if (modal) modal.classList.remove('active');
      });
    }

    // Shareable link generator
    if (shareLinkBtn) {
      shareLinkBtn.addEventListener('click', () => {
        const currentData = {
          sisterName: inputSisterName.value.trim() || config.sisterName,
          senderName: inputSenderName.value.trim() || config.senderName,
          giftBrand: selectGiftBrand.value,
          giftBrandName: selectGiftBrand.options[selectGiftBrand.selectedIndex].text.split(' ')[0],
          giftAmount: inputGiftAmount.value.trim() || config.giftAmount,
          giftCode: inputGiftCode.value.trim() || config.giftCode,
          giftUrl: inputGiftUrl.value.trim() || config.giftUrl,
          isPrankCodeFirst: checkPrankCode.checked,
          slides: parseSlidesFromText(inputBlessingText.value)
        };

        try {
          const jsonStr = JSON.stringify(currentData);
          const encoded = btoa(encodeURIComponent(jsonStr));
          const shareUrl = `${window.location.origin}${window.location.pathname}#data=${encoded}`;
          
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl).then(() => {
              showToast("הקישור הועתק ללוח! שלח לירדן בוואטסאפ! 🔗");
            });
          } else {
            prompt("העתק את הקישור לשליחה לירדן:", shareUrl);
          }
        } catch (e) {
          showToast("הטקסט ארוך מדי לקישור ישיר, מומלץ להשתמש בקובץ האתר ישירות.");
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("לאפס את כל ההגדרות והברכות לברירת המחדל לירדן?")) {
          localStorage.removeItem('sister_prank_config');
          window.location.hash = '';
          config = JSON.parse(JSON.stringify(window.DEFAULT_CONFIG));
          populateForm();
          applyConfigToUI();
          currentSlideIndex = 0;
          isRealCodeRevealed = false;
          isScratchCompleted = false;
          renderCurrentSlide();
          showToast("ההגדרות אופסו בהצלחה!");
        }
      });
    }
  }

  // App Initialization
  function init() {
    loadConfig();

    // Sound toggle
    const soundBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        initAudio();
        isSoundEnabled = !isSoundEnabled;
        if (soundIcon) soundIcon.textContent = isSoundEnabled ? '🔊' : '🔇';
        showToast(isSoundEnabled ? "הסאונד הופעל 🔊" : "הסאונד הושתק 🔇");
      });
    }

    // Secret Admin Shortcut: Tap the birthday badge 5 times quickly to update voucher code directly on mobile!
    const headerBadge = document.getElementById('headerBadge');
    if (headerBadge) {
      let tapCount = 0;
      let tapTimer = null;
      headerBadge.addEventListener('click', () => {
        tapCount++;
        clearTimeout(tapTimer);
        tapTimer = setTimeout(() => { tapCount = 0; }, 1800);
        if (tapCount >= 5) {
          tapCount = 0;
          const newCode = prompt("🔐 עדכון סודי של קוד השובר:", config.giftCode || '');
          if (newCode && newCode.trim()) {
            config.giftCode = newCode.trim();
            saveConfig(config);
            applyConfigToUI();
            showToast("קוד השובר עודכן בהצלחה! 🎁");
          }
        }
      });
    }

    // Open Birthday Card button
    const openBtn = document.getElementById('openCardBtn');
    const openCardTrigger = document.getElementById('openCardTrigger');
    function startCardFlow() {
      initAudio();
      SoundFX.slideAdvance();
      const introScreen = document.getElementById('introScreen');
      const blessingScreen = document.getElementById('blessingScreen');
      if (introScreen) introScreen.style.display = 'none';
      if (blessingScreen) blessingScreen.style.display = 'flex';
      renderCurrentSlide();
    }
    if (openBtn) openBtn.addEventListener('click', (e) => { e.stopPropagation(); startCardFlow(); });
    if (openCardTrigger) openCardTrigger.addEventListener('click', startCardFlow);

    // Restart button
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        currentSlideIndex = 0;
        isRealCodeRevealed = false;
        isScratchCompleted = false;
        const finaleScreen = document.getElementById('finaleScreen');
        const blessingScreen = document.getElementById('blessingScreen');
        if (finaleScreen) finaleScreen.style.display = 'none';
        if (blessingScreen) blessingScreen.style.display = 'flex';
        renderCurrentSlide();
      });
    }

    setupDragInteractions();
    setupTrollSkipButton();
    setupPrankCodeReveal();
    setupSettingsModal();

    // Keyboard navigation (Right Arrow key advances slide)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        const blessingScreen = document.getElementById('blessingScreen');
        if (blessingScreen && blessingScreen.style.display !== 'none') {
          advanceSlide();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
