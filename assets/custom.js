document.addEventListener("DOMContentLoaded", () => {
  const teamsMegaMenu = document.querySelector('.megamenu--teams');

  if (teamsMegaMenu) {
    const teamsMegaMenuButton = teamsMegaMenu.querySelectorAll('.js-teams-mega-menu');

    teamsMegaMenuButton.forEach((button) => {
      button.addEventListener("mouseenter", (event) => {
        const el = event.target;
        const group = el.dataset.group;
        const currentActiveLinks = teamsMegaMenu.querySelector('.megamenu__links--active');
        const newActiveLinks = teamsMegaMenu.querySelector(`.megamenu__links[data-group="${group}"]`);
        const currentActiveButton = teamsMegaMenu.querySelector('.megamenu__button--active');
        currentActiveButton.classList.remove('megamenu__button--active');
        el.classList.add('megamenu__button--active');

        currentActiveLinks.classList.remove('megamenu__links--active');
        newActiveLinks.classList.add('megamenu__links--active');
      });
    });
  }

  // Discount code copy functionality
  const discountCodeBlocks = document.querySelectorAll('.discount-code-block');

  discountCodeBlocks.forEach((block) => {
    const codeCopyElement = block.querySelector('.code-copy');
    const copyButton = block.querySelector('.discount-copy-btn');

    if (codeCopyElement && copyButton) {
      const copyText = (e) => {
        let textToCopy = codeCopyElement.textContent.trim();
        textToCopy = textToCopy.replace(/^code:\s*/i, '');

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.setAttribute('tooltip', 'Copied! ✅');
          }).catch(() => {
            fallbackCopyText(textToCopy, copyButton);
          });
        } else {
          fallbackCopyText(textToCopy, copyButton);
        }
      };

      const fallbackCopyText = (text, button) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          button.setAttribute('tooltip', 'Copied! ✅');
        } catch (err) {
          button.setAttribute('tooltip', 'Failed to copy');
        }
        document.body.removeChild(textArea);
      };

      const resetTooltip = (e) => {
        copyButton.setAttribute('tooltip', 'Copy to clipboard');
      };

      copyButton.addEventListener('click', copyText);
      copyButton.addEventListener('mouseleave', resetTooltip);
    }
  });

  // UGC video card functionality
  const ugcVideoCards = document.querySelectorAll('.ugc-video-card');
  let modal = document.querySelector('.ugc-video-modal');

  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'ugc-video-modal';
    modal.innerHTML = `
      <div class="ugc-video-modal__overlay"></div>
      <div class="ugc-video-modal__container">
        <div class="ugc-video-modal__video-wrapper"></div>
        <button class="ugc-video-modal__close" aria-label="Close video">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const modalOverlay = modal.querySelector('.ugc-video-modal__overlay');
  const modalVideoWrapper = modal.querySelector('.ugc-video-modal__video-wrapper');
  const modalClose = modal.querySelector('.ugc-video-modal__close');

  const pauseAllVideos = (exceptVideo = null) => {
    ugcVideoCards.forEach((card) => {
      const videoContainer = card.querySelector('.ugc-video-card__video');
      const video = videoContainer?.querySelector('video');

      if (video && video !== exceptVideo && !video.paused) {
        video.pause();
        card.classList.remove('is-playing');
      }
    });
  };

  const openModal = (videoElement) => {
    pauseAllVideos();

    const clonedVideo = videoElement.cloneNode(true);
    clonedVideo.setAttribute('controls', 'true');
    clonedVideo.setAttribute('autoplay', 'true');
    clonedVideo.setAttribute('playsinline', 'true');

    modalVideoWrapper.innerHTML = '';
    modalVideoWrapper.appendChild(clonedVideo);
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    clonedVideo.play().catch((error) => {
      console.error('Error playing video in modal:', error);
    });
  };

  const closeModal = () => {
    const modalVideo = modalVideoWrapper.querySelector('video');
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.src = '';
    }
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    modalVideoWrapper.innerHTML = '';
  };

  modalOverlay.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  ugcVideoCards.forEach((card) => {
    const thumbnail = card.querySelector('.ugc-video-card__thumbnail');
    const videoContainer = card.querySelector('.ugc-video-card__video');
    const video = videoContainer?.querySelector('video');
    const fullscreenBtn = videoContainer?.querySelector('.ugc-video-card__fullscreen-btn');

    if (thumbnail && video) {
      thumbnail.addEventListener('click', () => {
        pauseAllVideos(video);
        card.classList.add('is-playing');
        video.play().catch((error) => {
          console.error('Error playing video:', error);
        });
      });

      video.addEventListener('play', () => {
        pauseAllVideos(video);
        card.classList.add('is-playing');
      });

      video.addEventListener('pause', () => {
        if (video.paused) {
          card.classList.remove('is-playing');
        }
      });

      video.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) {
          pauseAllVideos(video);
          video.play();
        } else {
          video.pause();
        }
      });

      if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal(video);
        });
      }

      video.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement === video || document.webkitFullscreenElement === video || document.mozFullScreenElement === video || document.msFullscreenElement === video) {
          openModal(video);
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
        }
      });

      video.addEventListener('dblclick', () => {
        openModal(video);
      });
    }
  });

  // Quantity selector accordion functionality
  const quantityOptions = document.querySelectorAll('.custom-quantity-selector .quantity-option');

  const reinitializeSwiperInAccordion = (accordionContent) => {
    const sliderContainer = accordionContent.querySelector('.recommended-product-slider');
    if (!sliderContainer) return;

    const swiperWrapper = sliderContainer.querySelector('.swiper-wrapper');
    if (!swiperWrapper || !swiperWrapper.innerHTML.trim()) return;

    const swiperEl = sliderContainer.querySelector('.rebuy-recommendations-swiper');
    if (!swiperEl || swiperEl.swiperInstance) return;

    // Start with opacity 0, then fade in after initialization
    sliderContainer.classList.remove('fading-out');
    sliderContainer.classList.add('fading-in');

    // Trigger custom event to reinitialize Swiper
    const event = new CustomEvent('rebuy-reinitialize-swiper', {
      detail: { container: sliderContainer }
    });
    document.dispatchEvent(event);
  };

  const toggleAccordion = (option) => {
    const content = option.nextElementSibling;

    if (!content || !content.classList.contains('quantity-selector-accordion')) {
      return;
    }

    const isOpen = content.classList.contains('is-open');

    if (isOpen) {
      content.classList.remove('is-open');
      content.style.maxHeight = null;
    } else {
      // Close all other accordions
      quantityOptions.forEach((otherOption) => {
        const otherContent = otherOption.nextElementSibling;
        if (otherContent && otherContent.classList.contains('quantity-selector-accordion')) {
          otherContent.classList.remove('is-open');
          otherContent.style.maxHeight = null;
        }
      });

      content.classList.add('is-open');
      content.style.maxHeight = content.scrollHeight + 'px';

      // Reinitialize Swiper if content exists
      setTimeout(() => {
        reinitializeSwiperInAccordion(content);
      }, 100);
    }
  };

  quantityOptions.forEach((option) => {
    const radioButton = option.querySelector('input[type="radio"]');

    if (radioButton) {
      // Initialize accordion state for pre-checked radio button
      if (radioButton.checked) {
        const content = option.nextElementSibling;
        if (content && content.classList.contains('quantity-selector-accordion')) {
          content.classList.add('is-open');
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      }

      // Handle radio button change
      radioButton.addEventListener('change', () => {
        if (radioButton.checked) {
          toggleAccordion(option);
        }
      });
    }
  });
});
