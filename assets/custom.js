document.addEventListener("DOMContentLoaded", () => {
  // Hide price elements if custom quantity selector is not present
  const initPriceDisplay = () => {
    const quantitySelector = document.querySelector('.custom-quantity-selector');
    const addToCartButton = document.querySelector('.btn.add-to-cart');

    // If custom quantity selector doesn't exist, hide price elements to show only "Add To Cart" text
    if (!quantitySelector && addToCartButton) {
      const discountedPriceLabel = addToCartButton.querySelector('.discounted-price-label');
      const atcTotal = addToCartButton.querySelector('.atc-total');

      if (discountedPriceLabel) {
        discountedPriceLabel.style.display = 'none';
      }
      if (atcTotal) {
        atcTotal.style.display = 'none';
      }
    }
  };

  // Wait a bit for DOM to be ready
  setTimeout(initPriceDisplay, 100);

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

  // Create UGC video modal
  const createUgcVideoModal = () => {
    const modal = document.createElement('div');
    modal.className = 'ugc-video-modal';
    modal.innerHTML = `
      <div class="ugc-video-modal__overlay"></div>
      <div class="ugc-video-modal__content">
        <button class="ugc-video-modal__close" aria-label="Close video">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="ugc-video-modal__video-wrapper"></div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  };

  // UGC video card functionality
  const ugcVideoCards = document.querySelectorAll('.ugc-video-card');
  let ugcVideoModal = document.querySelector('.ugc-video-modal');

  if (!ugcVideoModal) {
    ugcVideoModal = createUgcVideoModal();
  }

  const modalOverlay = ugcVideoModal.querySelector('.ugc-video-modal__overlay');
  const modalVideoWrapper = ugcVideoModal.querySelector('.ugc-video-modal__video-wrapper');
  const modalClose = ugcVideoModal.querySelector('.ugc-video-modal__close');

  const openVideoModal = (video) => {
    const videoClone = video.cloneNode(true);
    videoClone.controls = true;
    videoClone.autoplay = true;
    modalVideoWrapper.innerHTML = '';
    modalVideoWrapper.appendChild(videoClone);
    ugcVideoModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Play video in modal
    videoClone.play().catch((error) => {
      console.error('Error playing video:', error);
    });
  };

  const closeVideoModal = () => {
    const modalVideo = modalVideoWrapper.querySelector('video');
    if (modalVideo) {
      modalVideo.pause();
      modalVideoWrapper.innerHTML = '';
    }
    ugcVideoModal.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  // Close modal handlers
  modalOverlay.addEventListener('click', closeVideoModal);
  modalClose.addEventListener('click', closeVideoModal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ugcVideoModal.classList.contains('is-open')) {
      closeVideoModal();
    }
  });

  ugcVideoCards.forEach((card) => {
    const thumbnail = card.querySelector('.ugc-video-card__thumbnail');
    const videoContainer = card.querySelector('.ugc-video-card__video');
    const video = videoContainer?.querySelector('video');

    if (thumbnail && video) {
      thumbnail.addEventListener('click', () => {
        openVideoModal(video);
      });

      video.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      });
    }
  });

});
