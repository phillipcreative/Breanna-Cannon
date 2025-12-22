document.addEventListener("DOMContentLoaded", () => {
  // Handle adding rebuy products to cart along with main product
  const handleAddToCartWithRebuy = () => {
    const addToCartForm = document.querySelector('.product-single__form');
    const addToCartButton = document.querySelector('[data-add-to-cart]');

    if (!addToCartForm || !addToCartButton) return;

    addToCartForm.addEventListener('submit', async function(e) {
      // Get selected rebuy/upsell products from swiper
      const rebuyContainers = document.querySelectorAll('.rebuy-recommendations-container');
      const selectedRebuyProducts = [];

      rebuyContainers.forEach((container) => {
        const checkedBoxes = container.querySelectorAll('.rebuy-product-card__checkbox:checked');
        checkedBoxes.forEach((checkbox) => {
          const productId = checkbox.getAttribute('data-product-id');
          const variantId = checkbox.getAttribute('data-variant-id');
          const productCard = checkbox.closest('.rebuy-product-card');
          const productTitleEl = productCard?.querySelector('.rebuy-product-card__title');
          const productName = productTitleEl?.textContent?.trim() || 'Product';

          if (productId && variantId) {
            selectedRebuyProducts.push({
              id: variantId,
              quantity: 1,
              name: productName
            });
          }
        });
      });

      // Always intercept to check for selected upsell items, add them if any are selected
      if (selectedRebuyProducts.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        // Get main product variant ID from form
        const formData = new FormData(addToCartForm);
        const mainVariantId = formData.get('id');

        if (!mainVariantId) return;

        // Get main product name
        const mainProductTitleEl = document.querySelector('.product-single__title');
        const mainProductName = mainProductTitleEl?.textContent?.trim() || 'Product';

        // Show loading state
        addToCartButton.classList.add('btn--loading');
        addToCartButton.disabled = true;

        try {
          // Add main product first - always quantity of 1
          const mainProductData = new URLSearchParams();
          mainProductData.append('id', mainVariantId);
          mainProductData.append('quantity', 1);

          const mainResponse = await fetch(window.theme?.routes?.cartAdd || '/cart/add.js', {
            method: 'POST',
            body: mainProductData.toString(),
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });

          const mainResult = await mainResponse.json();

          if (mainResult.status === 422) {
            const errorMessage = mainResult.description || 'Failed to add product to cart';
            throw new Error(`${mainProductName}: ${errorMessage}`);
          }

          // Add rebuy products sequentially
          for (const rebuyProduct of selectedRebuyProducts) {
            const rebuyData = new URLSearchParams();
            rebuyData.append('id', rebuyProduct.id);
            rebuyData.append('quantity', rebuyProduct.quantity);

            const rebuyResponse = await fetch(window.theme?.routes?.cartAdd || '/cart/add.js', {
              method: 'POST',
              body: rebuyData.toString(),
              credentials: 'same-origin',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });

            const rebuyResult = await rebuyResponse.json();

            if (rebuyResult.status === 422) {
              const errorMessage = rebuyResult.description || 'Failed to add product to cart';
              throw new Error(`${rebuyProduct.name}: ${errorMessage}`);
            }
          }

          // Trigger cart update events
          // if (window.theme && window.theme.CartDrawer) {
          //   window.theme.CartDrawer.open();
          // }

          // Trigger Rebuy cart fetch if available
          // if (window.Rebuy && window.Rebuy.Cart) {
          //   window.Rebuy.Cart.fetchCart();
          // }

          // Reload page if on cart page
          // if (document.body.classList.contains('template-cart')) {
          //   window.scrollTo(0, 0);
          //   location.reload();
          //   return;
          // }

          // Dispatch custom event for cart update
          document.dispatchEvent(new CustomEvent('cart:updated'));

        } catch (error) {
          console.error('Error adding products to cart:', error);

          // Remove any existing error messages
          const existingErrors = addToCartForm.querySelector('.errors');
          if (existingErrors) {
            existingErrors.remove();
          }

          // Create and display error message below the buy button
          const errorDiv = document.createElement('div');
          errorDiv.classList.add('errors', 'text-center');
          errorDiv.textContent = error.description || error.message || 'There was an error adding products to cart. Please try again.';
          addToCartForm.append(errorDiv);
        } finally {
          addToCartButton.classList.remove('btn--loading');
          addToCartButton.disabled = false;
        }
      }
    }, true); // Use capture phase to intercept before theme handler
  };

  // Initialize add to cart with rebuy handler
  handleAddToCartWithRebuy();

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

          // Check availability - Rebuy API might use available, available_for_sale, or inventory_quantity
          const checkVariantAvailability = (variant) => {

            // Explicit false checks
            if (variant.available === false || variant.available === 0) return false;
            if (variant.available_for_sale === false || variant.available_for_sale === 0) return false;

            // Check inventory quantity (if tracking inventory and policy doesn't allow backorders)
            if (variant.inventory_quantity !== undefined && variant.inventory_quantity !== null) {
              if (variant.inventory_quantity <= 0 && variant.inventory_policy !== 'continue') {
                return false;
              }
            }

            // Explicit true checks
            if (variant.available === true || variant.available_for_sale === true) return true;

            // Check if available property exists and is truthy
            if (variant.available !== undefined) {
              return variant.available === true || variant.available === 1;
            }

            // If available_for_sale exists and is truthy
            if (variant.available_for_sale !== undefined) {
              return variant.available_for_sale === true || variant.available_for_sale === 1;
            }

            // Default: if we can't determine, assume available (to avoid false positives)
            return true;
          };

          // Find first available variant for initial selection
          const availableVariants = variants.filter(checkVariantAvailability);
          const firstAvailableVariant = availableVariants.length > 0 ? availableVariants[0] : variants[0];

          let variantSelect = '';
          if (variants.length > 1) {

            variantSelect = `
              <select class="rebuy-product-card__variant-select" data-product-id="${product.id}">
                ${variants.map((variant) => {
                  const variantPrice = variant.price || '';
                  const variantPriceFormatted = removeTrailingZeros(variantPrice);
                  const isAvailable = checkVariantAvailability(variant);
                  const isSelected = variant.id === firstAvailableVariant.id;
                  return `
                    <option value="${variant.id}" data-price="${variantPriceFormatted}" ${!isAvailable ? 'disabled' : ''} ${isSelected ? 'selected' : ''}>
                      ${variant.title}${!isAvailable ? ' (Sold Out)' : ''}
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
                         data-variant-id="${variants.length > 0 ? firstAvailableVariant.id : ''}">
                  <label for="rebuy-product-${product.id}" class="rebuy-product-card__checkbox-label"></label>
                </div>
                <div class="rebuy-product-card__image">
                  <img src="${imageUrl}" alt="${title}" loading="lazy">
                </div>
                <div class="rebuy-product-card__info">
                  <h3 class="rebuy-product-card__title">
                    <a href="${productUrl}" class="rebuy-product-card__link">${title}</a>
                  </h3>
                  <div class="rebuy-product-card__price-container">
                    ${priceDisplay ? `<span class="rebuy-product-card__price">$${priceDisplay}</span>` : ''}
                    ${comparePriceDisplay && comparePriceDisplay !== priceDisplay ? `<span class="rebuy-product-card__compare-price">$${comparePriceDisplay}</span>` : ''}
                  </div>
                  ${variantSelect}
                </div>
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
              // Update total when checkbox changes (if custom quantity selector is present)
              if (window.updateAddToCartTotal) {
                window.updateAddToCartTotal();
              }
            });

            // Prevent label click from navigating
            const label = checkbox.nextElementSibling;
            if (label && label.classList.contains('rebuy-product-card__checkbox-label')) {
              label.addEventListener('click', function(e) {
                e.stopPropagation();
              });
            }
          });

          // Handle product card image clicks - toggle checkbox
          container.querySelectorAll('.rebuy-product-card__image').forEach((imageContainer) => {
            imageContainer.addEventListener('click', function(e) {
              e.stopPropagation();
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
            // Stop propagation for all events to prevent link navigation
            // But don't prevent default so the select can function normally
            const stopPropagation = (e) => {
              e.stopPropagation();
            };

            select.addEventListener('click', stopPropagation);
            select.addEventListener('mousedown', stopPropagation);
            select.addEventListener('pointerdown', stopPropagation);
            select.addEventListener('focus', stopPropagation);
            select.addEventListener('focusin', stopPropagation);

            select.addEventListener('change', function(e) {
              e.stopPropagation();
              const productCard = this.closest('.rebuy-product-card');
              const checkbox = productCard?.querySelector('.rebuy-product-card__checkbox');
              const priceEl = productCard?.querySelector('.rebuy-product-card__price');
              const selectedOption = this.options[this.selectedIndex];

              if (checkbox && selectedOption) {
                checkbox.setAttribute('data-variant-id', selectedOption.value);
                const variantPriceFormatted = selectedOption.getAttribute('data-price');
                if (variantPriceFormatted) {
                  // Store the raw price for calculations (remove $ if present)
                  const rawPrice = variantPriceFormatted.toString().replace(/^\$/, '');
                  checkbox.setAttribute('data-product-price', rawPrice);

                  // Update displayed price - format to match initial display (with $ prefix, no trailing zeros)
                  // The variantPriceFormatted from data-price is already formatted with removeTrailingZeros
                  // Match the format used on initial render: $${priceDisplay}
                  if (priceEl) {
                    const displayPrice = variantPriceFormatted.toString().startsWith('$')
                      ? variantPriceFormatted
                      : `$${variantPriceFormatted}`;
                    priceEl.textContent = displayPrice;
                  }
                  // Update total if checkbox is checked (if custom quantity selector is present)
                  if (checkbox.checked && window.updateAddToCartTotal) {
                    window.updateAddToCartTotal();
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
