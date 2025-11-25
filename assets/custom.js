document.addEventListener("DOMContentLoaded", () => {
  // Update Add to Cart Total based on quantity selector and selected rebuy products
  const updateAddToCartTotal = () => {
    const quantitySelector = document.querySelector('.custom-quantity-selector');
    if (!quantitySelector) return;

    const selectedQuantityInput = quantitySelector.querySelector('input[name="quantity_tier"]:checked');
    const atcTotal = document.querySelector('.atc-total');

    if (!selectedQuantityInput || !atcTotal) return;

    // Access data attributes for main product
    const discountedPriceCents = selectedQuantityInput.getAttribute('data-discounted-price-cents');
    const totalPriceCents = selectedQuantityInput.getAttribute('data-total-price-cents');

    if (!discountedPriceCents) return;

    let discountedPrice = parseInt(discountedPriceCents) || 0;
    let totalPrice = parseInt(totalPriceCents) || 0;

    // Add selected rebuy product prices
    const rebuyContainers = document.querySelectorAll('.rebuy-recommendations-container');
    rebuyContainers.forEach((container) => {
      const checkedBoxes = container.querySelectorAll('.rebuy-product-card__checkbox:checked');
      checkedBoxes.forEach((checkbox) => {
        const productPrice = checkbox.getAttribute('data-product-price');
        if (productPrice) {
          // Parse price - Rebuy might return formatted price like "$45.00" or just "45.00"
          const priceStr = productPrice.toString().replace(/[^0-9.]/g, '');
          const priceValue = parseFloat(priceStr) || 0;
          // Convert to cents if it's a dollar amount (less than 1000)
          const priceInCents = priceValue < 1000 ? Math.round(priceValue * 100) : Math.round(priceValue);
          discountedPrice += priceInCents;
          totalPrice += priceInCents;
        }
      });
    });

    // Format price function - keep trailing zeros for add to cart button
    const formatPrice = (cents) => {
      if (window.theme && window.theme.Currency && window.theme.Currency.formatMoney) {
        const moneyFormat = window.theme.settings?.moneyFormat || '${{amount}}';
        return window.theme.Currency.formatMoney(cents, moneyFormat);
      }
      // Fallback formatting with trailing zeros
      const price = cents / 100;
      return '$' + price.toFixed(2);
    };

    const currentPriceEl = atcTotal.querySelector('.current-price');
    const discountedPriceEl = atcTotal.querySelector('.discounted-price');

    // Show original price with strikethrough if there's a discount
    if (currentPriceEl) {
      const baseDiscountedPrice = parseInt(discountedPriceCents) || 0;
      const baseTotalPrice = parseInt(totalPriceCents) || 0;
      if (baseTotalPrice > baseDiscountedPrice && baseDiscountedPrice > 0) {
        currentPriceEl.textContent = formatPrice(totalPrice);
        currentPriceEl.style.display = '';
        currentPriceEl.style.textDecoration = 'line-through';
      } else {
        currentPriceEl.style.display = 'none';
      }
    }

    // Always show discounted price
    if (discountedPriceEl) {
      discountedPriceEl.textContent = formatPrice(discountedPrice);
      discountedPriceEl.style.display = '';
    }
  };

  // Initialize after a short delay to ensure DOM and theme are ready
  const initAddToCartTotal = () => {
    updateAddToCartTotal();

    // Also listen for quantity selector changes
    const quantitySelector = document.querySelector('.custom-quantity-selector');
    if (quantitySelector) {
      quantitySelector.querySelectorAll('input[name="quantity_tier"]').forEach((radio) => {
        radio.addEventListener('change', updateAddToCartTotal);
      });
    }
  };

  // Wait a bit for theme to load, then initialize
  setTimeout(initAddToCartTotal, 100);

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

  // Initialize Rebuy Recommendations Carousel
  const rebuyContainers = document.querySelectorAll('.rebuy-recommendations-container');

  rebuyContainers.forEach((container) => {
    const rebuyDataSourceId = container.dataset.rebuyDataSourceId;
    const currentProductId = container.dataset.currentProductId;
    const rebuyApiKey = container.dataset.rebuyApiKey || "6e5aada6dd159d86183afb4ab961e8f0a794787c&format";
    const swiperWrapper = container.querySelector('.swiper-wrapper');
    const navigationContainer = container.querySelector('.swiper-navigation-container');

    if (!rebuyDataSourceId || !currentProductId || !swiperWrapper) {
      return;
    }

    // Load Swiper assets
    const loadSwiperAssets = () => {
      return new Promise((resolve, reject) => {
        if (window.Swiper) {
          resolve();
          return;
        }

        const linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = 'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css';
        document.head.appendChild(linkEl);

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Swiper'));
        document.body.appendChild(script);
      });
    };

    // Fetch Rebuy data
    fetch(`https://rebuyengine.com/api/v1/custom/id/${rebuyDataSourceId}?key=${rebuyApiKey}&pretty&shopify_product_ids=${currentProductId}&limit=100`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const products = data.data || [];

        console.log(products);

        if (!products || products.length === 0) {
          container.style.display = 'none';
          return;
        }

        // Render products
        swiperWrapper.innerHTML = products.map((product) => {
          const imageUrl = product.image?.src || product.images?.[0]?.src || '';
          const productUrl = product.url || `/products/${product.handle}`;
          const title = product.title || '';
          const variants = product.variants || [];

          // Get price - try multiple possible formats from Rebuy API
          let price = '';

          if (variants.length > 0 && variants[0].price) {
            price = variants[0].price;
          } else if (product.price_min) {
            price = product.price_min;
          } else if (product.price) {
            price = product.price;
          } else if (product.price_max) {
            price = product.price_max;
          }

          // Get compare price
          let comparePrice = '';

          if (variants.length > 0 && variants[0].compare_at_price) {
            comparePrice = variants[0].compare_at_price;
          } else if (product.compare_at_price_min) {
            comparePrice = product.compare_at_price_min;
          } else if (product.compare_at_price) {
            comparePrice = product.compare_at_price;
          }

          // Function to remove trailing zeros from price strings
          const removeTrailingZeros = (priceStr) => {
            if (!priceStr) return '';
            return priceStr.toString().replace(/\.00(\s|$|[^0-9])/g, '$1').replace(/(\d)\.(\d)0+(\s|$|[^0-9])/g, '$1.$2$3').replace(/\.00$/g, '').replace(/(\d)\.(\d)0+$/g, '$1.$2');
          };

          let variantSelect = '';
          if (variants.length > 1) {
            variantSelect = `
              <select class="rebuy-product-card__variant-select" data-product-id="${product.id}">
                ${variants.map((variant) => {
                  const variantPrice = variant.price || '';
                  const variantPriceFormatted = removeTrailingZeros(variantPrice);
                  return `
                    <option value="${variant.id}" data-price="${variantPriceFormatted}">
                      ${variant.title}
                    </option>
                  `;
                }).join('')}
              </select>
            `;
          }

          // Format price display - remove trailing zeros
          const priceDisplay = price ? removeTrailingZeros(price) : '';
          const comparePriceDisplay = comparePrice ? removeTrailingZeros(comparePrice) : '';

          return `
            <div class="swiper-slide">
              <div class="rebuy-product-card">
                <div class="rebuy-product-card__checkbox-wrapper">
                  <input type="checkbox"
                         class="rebuy-product-card__checkbox"
                         id="rebuy-product-${product.id}"
                         data-product-id="${product.id}"
                         data-product-price="${price}"
                         data-variant-id="${variants.length > 0 ? variants[0].id : ''}">
                  <label for="rebuy-product-${product.id}" class="rebuy-product-card__checkbox-label"></label>
                </div>
                <a href="${productUrl}" class="rebuy-product-card__link">
                  <div class="rebuy-product-card__image">
                    <img src="${imageUrl}" alt="${title}" loading="lazy">
                  </div>
                  <div class="rebuy-product-card__info">
                    <h3 class="rebuy-product-card__title">${title}</h3>
                    <div class="rebuy-product-card__price-container">
                      ${priceDisplay ? `<span class="rebuy-product-card__price">$${priceDisplay}</span>` : ''}
                      ${comparePriceDisplay && comparePriceDisplay !== priceDisplay ? `<span class="rebuy-product-card__compare-price">$${comparePriceDisplay}</span>` : ''}
                    </div>
                    ${variantSelect}
                  </div>
                </a>
              </div>
            </div>
          `;
        }).join('');

        // Initialize Swiper
        loadSwiperAssets().then(() => {
          if (!window.Swiper) {
            console.warn('Swiper library not loaded');
            return;
          }

          const swiperEl = container.querySelector('.rebuy-recommendations-swiper');
          const prevBtn = container.querySelector('.swiper-button-prev');
          const nextBtn = container.querySelector('.swiper-button-next');

          const swiper = new window.Swiper(swiperEl, {
            slidesPerView: 2.2,
            spaceBetween: 8,
            navigation: {
              nextEl: nextBtn,
              prevEl: prevBtn,
            },
            breakpoints: {
              640: {
                slidesPerView: 3,
                spaceBetween: 8,
              },
              769: {
                slidesPerView: 5,
                spaceBetween: 8,
              }
            }
          });

          // Show navigation if there are products
          if (products.length > 0 && navigationContainer) {
            navigationContainer.classList.add('has-products');
          }

          // Update navigation button states
          const updateNavStates = () => {
            if (prevBtn && nextBtn) {
              prevBtn.classList.toggle('swiper-button-disabled', swiper.isBeginning);
              nextBtn.classList.toggle('swiper-button-disabled', swiper.isEnd);
            }
          };

          swiper.on('slideChange', updateNavStates);
          updateNavStates();

          // Function to update rebuy checkboxes based on selected quantity
          const updateRebuyCheckboxes = () => {
            // Find quantity selector - it's a sibling or nearby element
            const quantitySelector = container.previousElementSibling?.classList.contains('custom-quantity-selector')
              ? container.previousElementSibling
              : container.parentElement?.querySelector('.custom-quantity-selector')
              || document.querySelector('.custom-quantity-selector');

            const selectedQuantityInput = quantitySelector?.querySelector('input[name="quantity_tier"]:checked');

            if (!selectedQuantityInput) return;

            const selectedQuantity = parseInt(selectedQuantityInput.value) || 0;
            const checkboxes = Array.from(container.querySelectorAll('.rebuy-product-card__checkbox'));

            checkboxes.forEach((checkbox, index) => {
              if (index < selectedQuantity) {
                checkbox.checked = true;
              } else {
                checkbox.checked = false;
              }
            });
          };

          // Update checkboxes on initial load
          updateRebuyCheckboxes();

          // Listen for quantity selector changes
          const quantitySelector = container.previousElementSibling?.classList.contains('custom-quantity-selector')
            ? container.previousElementSibling
            : container.parentElement?.querySelector('.custom-quantity-selector')
            || document.querySelector('.custom-quantity-selector');

          if (quantitySelector) {
            quantitySelector.querySelectorAll('input[name="quantity_tier"]').forEach((radio) => {
              radio.addEventListener('change', updateRebuyCheckboxes);
            });
          }

          // Handle checkbox clicks
          container.querySelectorAll('.rebuy-product-card__checkbox').forEach((checkbox) => {
            checkbox.addEventListener('change', function(e) {
              e.stopPropagation();
              // Update total when checkbox changes
              updateAddToCartTotal();
            });

            // Prevent label click from navigating
            const label = checkbox.nextElementSibling;
            if (label && label.classList.contains('rebuy-product-card__checkbox-label')) {
              label.addEventListener('click', function(e) {
                e.stopPropagation();
              });
            }
          });

          // Handle product card link clicks - toggle checkbox instead of navigating
          container.querySelectorAll('.rebuy-product-card__link').forEach((link) => {
            link.addEventListener('click', function(e) {
              e.preventDefault();
              const productCard = this.closest('.rebuy-product-card');
              const checkbox = productCard?.querySelector('.rebuy-product-card__checkbox');

              if (checkbox) {
                // Toggle checkbox
                checkbox.checked = !checkbox.checked;
                // Trigger change event
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          });

          // Handle variant selection changes
          container.querySelectorAll('.rebuy-product-card__variant-select').forEach((select) => {
            select.addEventListener('click', function(e) {
              e.stopPropagation();
            });

            select.addEventListener('change', function(e) {
              e.stopPropagation();
              const productCard = this.closest('.rebuy-product-card');
              const checkbox = productCard?.querySelector('.rebuy-product-card__checkbox');
              const priceEl = productCard?.querySelector('.rebuy-product-card__price');
              const selectedOption = this.options[this.selectedIndex];

              if (checkbox && selectedOption) {
                checkbox.setAttribute('data-variant-id', selectedOption.value);
                const variantPrice = selectedOption.getAttribute('data-price');
                if (variantPrice) {
                  checkbox.setAttribute('data-product-price', variantPrice);
                  // Update displayed price - remove trailing zeros
                  if (priceEl) {
                    const formattedPrice = variantPrice.toString().replace(/\.00(\s|$|[^0-9])/g, '$1').replace(/(\d)\.(\d)0+(\s|$|[^0-9])/g, '$1.$2$3').replace(/\.00$/g, '').replace(/(\d)\.(\d)0+$/g, '$1.$2');
                    priceEl.textContent = formattedPrice;
                  }
                  // Update total if checkbox is checked
                  if (checkbox.checked) {
                    updateAddToCartTotal();
                  }
                }
              }
            });
          });
        });
      })
      .catch((err) => {
        console.error("Rebuy Error:", err);
        container.style.display = 'none';
      });
  });
});
