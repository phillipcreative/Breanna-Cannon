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

  ugcVideoCards.forEach((card) => {
    const thumbnail = card.querySelector('.ugc-video-card__thumbnail');
    const videoContainer = card.querySelector('.ugc-video-card__video');
    const video = videoContainer?.querySelector('video');

    if (thumbnail && video) {
      thumbnail.addEventListener('click', () => {
        card.classList.add('is-playing');
        video.play().catch((error) => {
          console.error('Error playing video:', error);
        });
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
